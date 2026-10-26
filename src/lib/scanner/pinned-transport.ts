import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Duplex } from "node:stream";
import { validateHostSafety } from "./dns-safety";

export interface PinnedEgressProxy {
  proxyUrl: string;
  close: () => Promise<void>;
  getBlockedRequests: () => Array<{ url: string; reason: string }>;
}

export interface PinnedFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  signal?: AbortSignal;
  maxBytes?: number;
  redirect?: "follow" | "manual";
  maxRedirects?: number;
}

/**
 * Creates an in-process local HTTP/HTTPS tunneling egress proxy.
 * Resolves destination hostnames via validateHostSafety and physically connects
 * TCP sockets directly to the validated pinned IP address.
 *
 * This closes the DNS-rebinding (TOCTOU) gap in Chromium by ensuring Chromium
 * cannot re-resolve hostnames to internal/private IP addresses, while preserving
 * standard TLS SNI and Host header integrity over the established TCP tunnel.
 */
export async function createPinnedEgressProxy(): Promise<PinnedEgressProxy> {
  const blockedRequests: Array<{ url: string; reason: string }> = [];
  const activeSockets = new Set<net.Socket | Duplex>();

  const server = http.createServer(async (req, res) => {
    try {
      const targetUrl = req.url?.startsWith("http")
        ? new URL(req.url)
        : new URL(`http://${req.headers.host}${req.url}`);

      const safety = await validateHostSafety(targetUrl.hostname);
      if (!safety.isSafe || !safety.resolvedIps?.length) {
        const reason = safety.rejectionReason || "SSRF destination prohibited";
        blockedRequests.push({ url: targetUrl.href, reason });
        res.writeHead(403, { "Content-Type": "text/plain", Connection: "close" }).end(reason);
        return;
      }

      const pinnedIp = safety.resolvedIps[0];
      const port = Number(targetUrl.port) || 80;

      const proxyReq = http.request(
        {
          host: pinnedIp,
          port,
          path: targetUrl.pathname + targetUrl.search,
          method: req.method,
          headers: { ...req.headers, host: targetUrl.host },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on("error", (err) => {
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "text/plain", Connection: "close" }).end(`Bad Gateway: ${err.message}`);
        }
      });

      req.pipe(proxyReq);
    } catch (err: any) {
      if (!res.headersSent) {
        res.writeHead(400, { "Content-Type": "text/plain", Connection: "close" }).end(`Invalid Request: ${err?.message}`);
      }
    }
  });

  server.on("connection", (socket) => {
    activeSockets.add(socket);
    socket.on("close", () => activeSockets.delete(socket));
  });

  server.on("connect", async (req, clientSocket, head) => {
    activeSockets.add(clientSocket);
    clientSocket.on("close", () => activeSockets.delete(clientSocket));

    try {
      const [hostname, portStr] = (req.url || "").split(":");
      const port = Number(portStr) || 443;

      const safety = await validateHostSafety(hostname);
      if (!safety.isSafe || !safety.resolvedIps?.length) {
        const reason = safety.rejectionReason || "SSRF destination prohibited";
        blockedRequests.push({ url: `https://${req.url}`, reason });
        clientSocket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        clientSocket.destroy();
        return;
      }

      const pinnedIp = safety.resolvedIps[0];
      const serverSocket = net.connect({ host: pinnedIp, port }, () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head && head.length > 0) {
          serverSocket.write(head);
        }
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });

      activeSockets.add(serverSocket);
      serverSocket.on("close", () => activeSockets.delete(serverSocket));

      serverSocket.on("error", () => {
        try {
          clientSocket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
          clientSocket.destroy();
        } catch {}
      });

      clientSocket.on("error", () => {
        serverSocket.destroy();
      });
    } catch (err: any) {
      try {
        clientSocket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
        clientSocket.destroy();
      } catch {}
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const address = server.address() as net.AddressInfo;
  const port = address.port;

  return {
    proxyUrl: `http://127.0.0.1:${port}`,
    getBlockedRequests: () => [...blockedRequests],
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of activeSockets) {
          try {
            s.destroy();
          } catch {}
        }
        server.close(() => resolve());
      }),
  };
}

/**
 * Enforces destination-pinned egress for outbound HTTP/HTTPS requests in Node.js.
 *
 * Core security properties:
 * 1. Pre-resolves and validates the target hostname against private, loopback, link-local,
 *    and reserved IP destinations via validateHostSafety.
 * 2. Physically binds and connects the TCP socket directly to the validated pinned IP address,
 *    eliminating DNS rebinding (TOCTOU) and independent resolver bypasses.
 * 3. Preserves correct HTTP Host header and HTTPS TLS SNI (servername) behavior.
 * 4. Deliberately follows redirects hop-by-hop with a bounded limit (default 5), re-validating
 *    and re-pinning every intermediate and final destination. Rejects non-HTTP(S) schemes.
 * 5. Binds response body streams with explicit byte limits, instantly destroying the underlying
 *    socket connection when the limit is reached to prevent resource exhaustion.
 */
export async function pinnedFetch(
  initialUrl: string,
  options: PinnedFetchOptions = {}
): Promise<Response> {
  let currentUrl = initialUrl;
  const redirectChain: string[] = [];
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 10000;
  const method = (options.method || "GET").toUpperCase();
  const effectiveSignal = options.signal || options.abortSignal;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (effectiveSignal?.aborted) {
      throw new Error("Request aborted by caller signal.");
    }

    const parsedUrl = new URL(currentUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error(`Prohibited URL protocol: ${parsedUrl.protocol}`);
    }

    // Validate host destination safety and resolve safe IPs
    const safety = await validateHostSafety(parsedUrl.hostname);
    if (!safety.isSafe || !safety.resolvedIps?.length) {
      throw new Error(
        `Destination safety boundary violation: ${safety.rejectionReason || "Prohibited host or IP destination"}`
      );
    }

    const pinnedIp = safety.resolvedIps[0];
    const isHttps = parsedUrl.protocol === "https:";
    const port = Number(parsedUrl.port) || (isHttps ? 443 : 80);
    const client = isHttps ? https : http;

    const reqHeaders: Record<string, string> = {
      ...(options.headers || {}),
      host: parsedUrl.host,
    };

    const reqOptions: https.RequestOptions = {
      host: pinnedIp,
      port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: reqHeaders,
      servername: isHttps ? parsedUrl.hostname : undefined,
    };

    const incoming = await new Promise<http.IncomingMessage>((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined;
      let abortHandler: (() => void) | undefined;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (options.abortSignal && abortHandler) {
          options.abortSignal.removeEventListener("abort", abortHandler);
        }
      };

      const req = client.request(reqOptions, (res) => {
        cleanup();
        resolve(res);
      });

      req.on("error", (err) => {
        cleanup();
        reject(err);
      });

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          cleanup();
          req.destroy(new Error(`Connection timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }

      if (effectiveSignal) {
        abortHandler = () => {
          cleanup();
          req.destroy(new Error("Request aborted by caller signal."));
        };
        effectiveSignal.addEventListener("abort", abortHandler, { once: true });
      }

      req.end();
    });

    const statusCode = incoming.statusCode || 200;
    const isRedirectStatus = [301, 302, 303, 307, 308].includes(statusCode);

    if (options.redirect !== "manual" && isRedirectStatus) {
      const location = incoming.headers["location"];
      if (location) {
        incoming.destroy();

        if (redirectChain.length >= maxRedirects) {
          throw new Error(`Exceeded maximum redirect limit of ${maxRedirects} hops.`);
        }

        const nextUrl = new URL(location, currentUrl).href;
        const nextParsed = new URL(nextUrl);
        if (nextParsed.protocol !== "http:" && nextParsed.protocol !== "https:") {
          throw new Error(`Prohibited redirect protocol: ${nextParsed.protocol}`);
        }

        redirectChain.push(nextUrl);
        currentUrl = nextUrl;
        continue;
      }
    }

    // Terminal response reached
    const headers = new Headers();
    for (const [key, val] of Object.entries(incoming.headers)) {
      if (val !== undefined) {
        if (Array.isArray(val)) {
          for (const v of val) headers.append(key, v);
        } else {
          headers.set(key, val);
        }
      }
    }

    // Set up transparent decompression if server returned encoded response
    let sourceStream: NodeJS.ReadableStream = incoming;
    const contentEncoding = (incoming.headers["content-encoding"] || "").toLowerCase();
    if (contentEncoding === "gzip") {
      sourceStream = incoming.pipe(zlib.createGunzip());
    } else if (contentEncoding === "deflate") {
      sourceStream = incoming.pipe(zlib.createInflate());
    } else if (contentEncoding === "br") {
      sourceStream = incoming.pipe(zlib.createBrotliDecompress());
    }

    const maxBytes = options.maxBytes;
    let bytesStreamed = 0;
    let isTruncated = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        sourceStream.on("data", (chunk: Buffer) => {
          if (maxBytes !== undefined) {
            const remaining = maxBytes - bytesStreamed;
            if (remaining <= 0) {
              isTruncated = true;
              incoming.destroy();
              try {
                controller.close();
              } catch {}
              return;
            }
            if (chunk.length > remaining) {
              controller.enqueue(new Uint8Array(chunk.subarray(0, remaining)));
              bytesStreamed += remaining;
              isTruncated = true;
              incoming.destroy();
              try {
                controller.close();
              } catch {}
              return;
            }
          }
          bytesStreamed += chunk.length;
          controller.enqueue(new Uint8Array(chunk));
        });

        sourceStream.on("end", () => {
          try {
            controller.close();
          } catch {}
        });

        sourceStream.on("error", (err) => {
          try {
            controller.error(err);
          } catch {}
        });
      },
      cancel() {
        incoming.destroy();
      },
    });

    const isNoBody = [204, 205, 304].includes(statusCode) || method === "HEAD";
    const body = isNoBody ? null : stream;

    const response = new Response(body, {
      status: statusCode,
      statusText: incoming.statusMessage || "OK",
      headers,
    });

    Object.defineProperty(response, "url", { value: currentUrl, writable: false });
    (response as any).redirectChain = redirectChain;
    (response as any).isTruncated = isTruncated;
    (response as any).bytesStreamed = bytesStreamed;

    return response;
  }

  throw new Error(`Exceeded maximum redirect limit of ${maxRedirects} hops.`);
}

/**
 * Reads only up to maxBytes directly from a response stream, then immediately
 * cancels the reader and closes the underlying socket.
 * Enforces active timeout and cancellation during chunk reading.
 */
export async function readBoundedText(
  response: Response,
  maxBytes: number,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ text: string; bytesRead: number; isTruncated: boolean }> {
  if (!response.body) {
    if (typeof response.text === "function") {
      const fullText = await response.text();
      const bytes = Buffer.byteLength(fullText, "utf8");
      if (bytes > maxBytes) {
        const sliced = fullText.slice(0, maxBytes);
        return { text: sliced, bytesRead: maxBytes, isTruncated: true };
      }
      return { text: fullText, bytesRead: bytes, isTruncated: false };
    }
    return { text: "", bytesRead: 0, isTruncated: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let isTruncated = false;

  let timeoutId: NodeJS.Timeout | undefined;
  let abortHandler: (() => void) | undefined;

  const abortPromise = new Promise<never>((_, reject) => {
    if (options?.signal?.aborted) {
      reject(new Error("Stream read aborted by signal."));
      return;
    }
    abortHandler = () => reject(new Error("Stream read aborted by signal."));
    options?.signal?.addEventListener("abort", abortHandler, { once: true });

    if (options?.timeoutMs) {
      timeoutId = setTimeout(() => {
        reject(new Error(`Stream read timed out after ${options.timeoutMs}ms.`));
      }, options.timeoutMs);
    }
  });

  try {
    while (totalBytes < maxBytes) {
      if (options?.signal?.aborted) {
        throw new Error("Stream read aborted by signal.");
      }

      const { done, value } = await Promise.race([reader.read(), abortPromise]);
      if (done || !value) break;

      const remaining = maxBytes - totalBytes;
      if (value.byteLength > remaining) {
        chunks.push(value.subarray(0, remaining));
        totalBytes += remaining;
        isTruncated = true;
        break;
      } else {
        chunks.push(value);
        totalBytes += value.byteLength;
      }
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (options?.signal && abortHandler) {
      options.signal.removeEventListener("abort", abortHandler);
    }
    try {
      await reader.cancel();
    } catch {
      // Ignore cancellation errors if reader was already cancelled
    }
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true }).decode(combined);
  return { text, bytesRead: totalBytes, isTruncated };
}

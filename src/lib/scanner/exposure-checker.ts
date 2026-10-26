import { normalizeAndValidateUrl } from "./url-validator";
import { validateUrlSafety } from "./dns-safety";
import { pinnedFetch, readBoundedText } from "./pinned-transport";

export interface ExposureCheckResult {
  executed: boolean;
  hasExposure: boolean;
  isInconclusive?: boolean;
  inconclusiveReason?: string;
  exposedPaths: string[];
  safeSummaries: string[];
  evidence: string[];
}

/**
 * Reads only a small prefix (up to maxBytes) directly from the response stream,
 * then cancels the reader immediately. Never consumes or buffers entire response bodies.
 * Uses a single properly scoped abort promise to avoid accumulating event listeners.
 */
async function readResponsePrefix(
  response: Response,
  maxBytes: number,
  signal?: AbortSignal
): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  let abortHandler: (() => void) | undefined;
  const abortPromise = new Promise<never>((_, reject) => {
    if (signal?.aborted) {
      reject(new Error("Stream read aborted by signal or timeout."));
      return;
    }
    abortHandler = () => reject(new Error("Stream read aborted by signal or timeout."));
    signal?.addEventListener("abort", abortHandler, { once: true });
  });

  try {
    while (totalBytes < maxBytes) {
      if (signal?.aborted) {
        throw new Error("Stream read aborted by signal or timeout.");
      }

      const { done, value } = await Promise.race([reader.read(), abortPromise]);
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } finally {
    if (signal && abortHandler) {
      signal.removeEventListener("abort", abortHandler);
    }
    try {
      await reader.cancel();
    } catch {
      // Cancellation errors are safely ignored
    }
  }

  const combined = new Uint8Array(Math.min(totalBytes, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const toCopy = Math.min(chunk.byteLength, maxBytes - offset);
    combined.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
    if (offset >= maxBytes) break;
  }

  return new TextDecoder("utf-8", { fatal: false, ignoreBOM: true }).decode(combined);
}

/**
 * Recognizes plausible environment-variable assignment lines (e.g. DB_PASSWORD=xxx, APP_KEY=yyy)
 * rather than arbitrary prose or math containing an equals sign.
 */
export function hasEnvFileSignature(text: string): boolean {
  const lines = text.split(/\r?\n/);
  const commonEnvKeys = [
    "DB_", "DATABASE_", "APP_", "SECRET", "PASSWORD", "KEY", "TOKEN", "AUTH_", "AWS_", "REDIS_", "NODE_ENV", "PORT"
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z0-9_]{2,})\s*=\s*(.*)$/);
    if (match) {
      const varName = match[1];
      const isUpperCaseOrCommon =
        varName === varName.toUpperCase() ||
        commonEnvKeys.some((k) => varName.toUpperCase().includes(k));
      if (isUpperCaseOrCommon) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Conducts bounded, non-destructive public exposure checks for sensitive files
 * (.env, .git/HEAD).
 *
 * Strictly adheres to security boundaries:
 * - Reads only the response prefix (max 512 bytes) from the stream and immediately cancels the stream.
 * - Keeps the timeout active throughout fetch and body stream reading.
 * - Propagates the scan AbortSignal into each active request and body read.
 * - Treats redirects, timeouts, network failures, HTTP 429/5xx, DNS failures, and unrecognized 200 bodies as inconclusive.
 * - Never prints, persists, or includes raw sensitive response content.
 * - Only reports PASS when both fixed probes produce conclusive non-exposure outcomes (e.g. 403, 404).
 */
export async function checkPublicExposure(
  targetUrl: string,
  options: {
    timeoutMs?: number;
    abortSignal?: AbortSignal;
    fetchFn?: (url: string, options?: any) => Promise<Response>;
  } = {}
): Promise<ExposureCheckResult> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const fetchImpl = options.fetchFn || pinnedFetch;
  const safeSummaries: string[] = [];
  const exposedPaths: string[] = [];
  const evidence: string[] = [];

  let baseUrl: URL;
  try {
    baseUrl = new URL(targetUrl);
  } catch {
    return {
      executed: false,
      hasExposure: false,
      exposedPaths: [],
      safeSummaries: ["Invalid target URL; public exposure checks skipped."],
      evidence: [],
    };
  }

  // Two fixed, bounded probes
  const probePaths = [
    { path: "/.env", indicator: "=", minLen: 4 },
    { path: "/.git/HEAD", indicator: "ref: refs/", minLen: 10 },
  ];

  type ProbeOutcome = "EXPOSED" | "SAFE" | "INCONCLUSIVE";
  const probeOutcomes: Array<{ path: string; outcome: ProbeOutcome; reason: string }> = [];

  for (const item of probePaths) {
    if (options.abortSignal?.aborted) {
      probeOutcomes.push({
        path: item.path,
        outcome: "INCONCLUSIVE",
        reason: "Scan canceled by user before probe executed.",
      });
      break;
    }

    const probeUrl = new URL(item.path, baseUrl.origin).toString();
    const safeCheck = normalizeAndValidateUrl(probeUrl);
    if (!safeCheck.isValid) {
      probeOutcomes.push({
        path: item.path,
        outcome: "INCONCLUSIVE",
        reason: `Probe URL failed destination normalization: ${safeCheck.errorMessage}`,
      });
      continue;
    }

    try {
      const dnsSafety = await validateUrlSafety(probeUrl);
      if (!dnsSafety.isSafe) {
        probeOutcomes.push({
          path: item.path,
          outcome: "INCONCLUSIVE",
          reason: `Probe target blocked by DNS safety check: ${dnsSafety.rejectionReason}`,
        });
        continue;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const onParentAbort = () => controller.abort();
      if (options.abortSignal) {
        if (options.abortSignal.aborted) {
          clearTimeout(timer);
          probeOutcomes.push({
            path: item.path,
            outcome: "INCONCLUSIVE",
            reason: "Scan canceled by user.",
          });
          break;
        }
        options.abortSignal.addEventListener("abort", onParentAbort, { once: true });
      }

      try {
        const res = await fetchImpl(probeUrl, {
          method: "GET",
          headers: {
            "User-Agent": "SiteIntelPulse-SecurityScan/1.0",
            Accept: "text/plain,*/*",
          },
          abortSignal: controller.signal,
          signal: controller.signal,
          redirect: "manual",
        });

        // Read small prefix directly from stream while timeout remains active
        const { text: textSlice, isTruncated } = await readBoundedText(res, 512, {
          signal: controller.signal,
          timeoutMs,
        });
        const textLower = textSlice.toLowerCase();
        const contentType = (res.headers.get("content-type") || "").toLowerCase();

        if (res.status === 200) {
          const isHtmlFallback =
            contentType.includes("text/html") ||
            textLower.includes("<!doctype html") ||
            textLower.includes("<html") ||
            textLower.includes("<head") ||
            textLower.includes("<body");

          if (isHtmlFallback) {
            probeOutcomes.push({
              path: item.path,
              outcome: "INCONCLUSIVE",
              reason: "HTTP 200 with generic HTML application fallback (SPA catch-all routing)",
            });
            evidence.push(`${item.path}: HTTP 200 OK (Generic HTML application fallback, inconclusive)`);
            continue;
          }

          let matchesExposure = false;
          if (item.path === "/.env") {
            matchesExposure = hasEnvFileSignature(textSlice);
          } else if (item.path === "/.git/HEAD") {
            matchesExposure =
              textSlice.includes(item.indicator) ||
              /^[0-9a-f]{40}/i.test(textSlice.trim());
          }

          if (matchesExposure) {
            probeOutcomes.push({
              path: item.path,
              outcome: "EXPOSED",
              reason: "HTTP 200 OK (Sensitive configuration indicator detected; content redacted)",
            });
            exposedPaths.push(item.path);
            safeSummaries.push(`Potential public exposure detected at ${item.path} (HTTP 200). Content redacted.`);
            evidence.push(`${item.path}: HTTP 200 OK (Sensitive configuration indicator detected; content redacted)`);
            continue;
          }

          // HTTP 200 without matching exposure indicator and without known safe classification is inconclusive
          const reason = isTruncated
            ? "HTTP 200 OK with truncated payload without signature; inconclusive"
            : "HTTP 200 OK with unrecognized payload; inconclusive";
          probeOutcomes.push({
            path: item.path,
            outcome: "INCONCLUSIVE",
            reason,
          });
          evidence.push(`${item.path}: HTTP 200 OK (${isTruncated ? "Truncated payload without signature" : "Unrecognized payload"}, inconclusive)`);
          continue;
        }

        // Standard blocking/non-existence status codes conclusively establish non-exposure
        if (
          res.status === 404 ||
          res.status === 403 ||
          res.status === 401 ||
          res.status === 410 ||
          res.status === 400
        ) {
          probeOutcomes.push({
            path: item.path,
            outcome: "SAFE",
            reason: `HTTP ${res.status} (Access blocked or file not found)`,
          });
          evidence.push(`${item.path}: HTTP ${res.status} (Safe)`);
          continue;
        }

        // Redirects require unverified destination inspection and are inconclusive
        if (res.status >= 300 && res.status < 400) {
          probeOutcomes.push({
            path: item.path,
            outcome: "INCONCLUSIVE",
            reason: `HTTP ${res.status} Redirect (Manual stop, unverified destination)`,
          });
          evidence.push(`${item.path}: HTTP ${res.status} Redirect (Manual stop, inconclusive)`);
          continue;
        }

        // 429 Rate limited or 5xx Server errors are inconclusive
        probeOutcomes.push({
          path: item.path,
          outcome: "INCONCLUSIVE",
          reason: `HTTP ${res.status} (Rate limited or server error, inconclusive)`,
        });
        evidence.push(`${item.path}: HTTP ${res.status} (Inconclusive)`);
      } finally {
        clearTimeout(timer);
        if (options.abortSignal) {
          options.abortSignal.removeEventListener("abort", onParentAbort);
        }
      }
    } catch (err: any) {
      const isAbort = err?.name === "AbortError" || options.abortSignal?.aborted;
      const isSsrfBlock =
        err?.message?.includes("Destination safety boundary") ||
        err?.message?.includes("Prohibited");
      const reason = isAbort
        ? "Probe request timed out or was canceled."
        : isSsrfBlock
        ? "Prohibited destination blocked by egress safety boundary."
        : `Network connection failure: ${err?.message || "Inaccessible"}`;

      probeOutcomes.push({
        path: item.path,
        outcome: "INCONCLUSIVE",
        reason,
      });
      evidence.push(`${item.path}: Inconclusive (${reason})`);
    }
  }

  // Derive final aggregate status:
  // 1. Any confirmed exposure takes precedence -> hasExposure = true
  // 2. If not exposed, any inconclusive result -> isInconclusive = true
  // 3. Only if both fixed probes are conclusively SAFE -> PASS
  const hasExposure = probeOutcomes.some((p) => p.outcome === "EXPOSED");
  const hasInconclusive = probeOutcomes.some((p) => p.outcome === "INCONCLUSIVE");
  const allSafe =
    probeOutcomes.length === probePaths.length &&
    probeOutcomes.every((p) => p.outcome === "SAFE");

  let inconclusiveReason: string | undefined;
  if (!hasExposure && hasInconclusive) {
    const reasons = probeOutcomes
      .filter((p) => p.outcome === "INCONCLUSIVE")
      .map((p) => `${p.path}: ${p.reason}`)
      .join("; ");
    inconclusiveReason = `Public exposure probe results were inconclusive (${reasons}). Absence of sensitive files cannot be conclusively verified.`;
    safeSummaries.push(inconclusiveReason);
  } else if (allSafe) {
    safeSummaries.push(
      "Bounded probes confirmed .env and .git/HEAD are blocked or not found (HTTP 403/404). No public config leaks detected."
    );
  }

  return {
    executed: probeOutcomes.length > 0,
    hasExposure,
    isInconclusive: !hasExposure && hasInconclusive,
    inconclusiveReason,
    exposedPaths,
    safeSummaries: hasExposure
      ? safeSummaries
      : !hasExposure && hasInconclusive
      ? [inconclusiveReason!]
      : safeSummaries,
    evidence,
  };
}

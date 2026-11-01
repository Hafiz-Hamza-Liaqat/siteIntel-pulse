import { NextRequest, NextResponse } from "next/server";

export type ReadJsonBodyResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Reads and parses a JSON request body with strict byte-level limits.
 *
 * Enforcement guarantees:
 * 1. Checks Content-Length for an early rejection if valid and > maxBytes.
 * 2. Independently counts actual bytes read from request.body stream.
 * 3. Immediately stops reading and cancels the reader once actual bytes exceed maxBytes.
 * 4. Decodes UTF-8 and parses JSON only once after complete body is safely read.
 * 5. Returns HTTP 413 for oversized requests and HTTP 400 for malformed JSON or invalid encoding.
 * 6. Treats missing or invalid Content-Length as untrusted and enforces stream byte limit.
 */
export async function readJsonBodyWithLimit<T = unknown>(
  request: Request | NextRequest,
  maxBytes: number
): Promise<ReadJsonBodyResult<T>> {
  // 1. Early Content-Length check (advisory pre-check, never sole enforcement)
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const declaredLength = parseInt(contentLengthHeader.trim(), 10);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: `Payload too large. Request body exceeds configured limit of ${maxBytes} bytes.`,
            code: "PAYLOAD_TOO_LARGE",
            maxBytes,
          },
          { status: 413 }
        ),
      };
    }
  }

  // 2. Stream-based byte counting and early cancellation
  if (!request.body) {
    // If request.body is null (e.g. mock or bodyless request), fallback to request.text()
    if (typeof request.text === "function") {
      let rawText = "";
      try {
        rawText = await request.text();
      } catch {
        return {
          success: false,
          response: NextResponse.json(
            { error: "Invalid JSON request body", code: "INVALID_JSON" },
            { status: 400 }
          ),
        };
      }

      if (!rawText || rawText.trim() === "") {
        return {
          success: false,
          response: NextResponse.json(
            { error: "Invalid JSON request body. Body cannot be empty.", code: "INVALID_JSON" },
            { status: 400 }
          ),
        };
      }

      const byteLength = new TextEncoder().encode(rawText).byteLength;
      if (byteLength > maxBytes) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: `Payload too large. Request body exceeds configured limit of ${maxBytes} bytes.`,
              code: "PAYLOAD_TOO_LARGE",
              maxBytes,
            },
            { status: 413 }
          ),
        };
      }

      try {
        const parsed = JSON.parse(rawText);
        return { success: true, data: parsed as T };
      } catch {
        return {
          success: false,
          response: NextResponse.json(
            { error: "Invalid JSON request body", code: "INVALID_JSON" },
            { status: 400 }
          ),
        };
      }
    }

    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON request body", code: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }

  // Active stream reading with independent byte counter
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          try {
            await reader.cancel("Payload too large");
          } catch {
            // Reader cancel errors are non-fatal
          }
          return {
            success: false,
            response: NextResponse.json(
              {
                error: `Payload too large. Request body exceeds configured limit of ${maxBytes} bytes.`,
                code: "PAYLOAD_TOO_LARGE",
                maxBytes,
              },
              { status: 413 }
            ),
          };
        }
        chunks.push(value);
      }
    }
  } catch (err: any) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Error reading request stream", code: "STREAM_READ_ERROR" },
        { status: 400 }
      ),
    };
  }

  if (totalBytes === 0) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON request body. Body cannot be empty.", code: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }

  // 3. Assemble chunks and decode UTF-8 strictly
  const combinedBuffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combinedBuffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let rawString: string;
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    rawString = decoder.decode(combinedBuffer);
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid request body encoding. Must be valid UTF-8.", code: "INVALID_ENCODING" },
        { status: 400 }
      ),
    };
  }

  // 4. Parse JSON
  try {
    const parsedData = JSON.parse(rawString);
    return { success: true, data: parsedData as T };
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON request body", code: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }
}

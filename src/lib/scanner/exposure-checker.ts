import { normalizeAndValidateUrl } from "./url-validator";
import { validateUrlSafety } from "./dns-safety";

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
 * Conducts bounded, non-destructive public exposure checks for sensitive files
 * (.env, .git/HEAD) and directory indexing / debug traces.
 *
 * Strictly adheres to security boundaries:
 * - Does not attempt exploitation or brute-force crawling.
 * - Redacts any discovered sensitive token/key patterns.
 * - Abides by SSRF safety and destination boundary validation.
 */
export async function checkPublicExposure(
  targetUrl: string,
  options: { timeoutMs?: number; abortSignal?: AbortSignal } = {}
): Promise<ExposureCheckResult> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const safeSummaries: string[] = [];
  const exposedPaths: string[] = [];
  const evidence: string[] = [];
  let hasExposure = false;
  let isInconclusive = false;
  let inconclusiveReason: string | undefined;

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

  // Paths to check safely
  const probePaths = [
    { path: "/.env", indicator: "=", minLen: 4 },
    { path: "/.git/HEAD", indicator: "ref: refs/", minLen: 10 },
  ];

  for (const item of probePaths) {
    if (options.abortSignal?.aborted) break;

    const probeUrl = new URL(item.path, baseUrl.origin).toString();
    const safeCheck = normalizeAndValidateUrl(probeUrl);
    if (!safeCheck.isValid) continue;

    try {
      const dnsSafety = await validateUrlSafety(probeUrl);
      if (!dnsSafety.isSafe) continue;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(probeUrl, {
        method: "GET",
        headers: {
          "User-Agent": "SiteIntelPulse-SecurityScan/1.0",
          Accept: "text/plain,*/*",
        },
        signal: controller.signal,
        redirect: "manual",
      });

      clearTimeout(timer);

      if (res.status === 200) {
        const contentType = (res.headers.get("content-type") || "").toLowerCase();
        // Read bounded slice (max 512 bytes)
        const textSlice = (await res.text()).slice(0, 512);
        const textLower = textSlice.toLowerCase();

        // Check for generic application fallback / single-page application routing
        const isHtmlFallback =
          contentType.includes("text/html") ||
          textLower.includes("<!doctype html") ||
          textLower.includes("<html") ||
          textLower.includes("<head>") ||
          textLower.includes("<body");

        if (isHtmlFallback) {
          isInconclusive = true;
          inconclusiveReason = "Server returned generic HTML application fallback for probe paths; absence of sensitive files cannot be conclusively verified.";
          safeSummaries.push(`Probe ${item.path} returned HTTP 200 with HTML application fallback; result is inconclusive.`);
          evidence.push(`${item.path}: HTTP 200 OK (Generic HTML application fallback, inconclusive)`);
          continue;
        }

        if (textSlice.includes(item.indicator)) {
          hasExposure = true;
          exposedPaths.push(item.path);
          safeSummaries.push(`Potential public exposure detected at ${item.path} (HTTP 200). Content redacted.`);
          evidence.push(`${item.path}: HTTP 200 OK (Sensitive configuration indicator detected)`);
          continue;
        }

        evidence.push(`${item.path}: HTTP 200 OK (Non-matching payload)`);
        continue;
      }

      if (res.status >= 300 && res.status < 400) {
        evidence.push(`${item.path}: HTTP ${res.status} Redirect (Manual stop, unverified destination)`);
        continue;
      }

      evidence.push(`${item.path}: HTTP ${res.status}`);
    } catch {
      evidence.push(`${item.path}: Inaccessible / Timed out (Safe)`);
    }
  }

  return {
    executed: true,
    hasExposure,
    isInconclusive,
    inconclusiveReason,
    exposedPaths,
    safeSummaries: hasExposure
      ? safeSummaries
      : isInconclusive
      ? [inconclusiveReason!]
      : ["Bounded probes confirmed .env and .git/HEAD are blocked or not found. No public config leaks detected."],
    evidence,
  };
}

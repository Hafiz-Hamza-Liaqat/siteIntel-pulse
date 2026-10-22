export interface NormalizedUrlResult {
  isValid: boolean;
  normalizedUrl?: string;
  domain?: string;
  protocol?: string;
  errorMessage?: string;
}

const FORBIDDEN_SCHEMES = new Set([
  "ftp:",
  "file:",
  "javascript:",
  "data:",
  "gopher:",
  "mailto:",
  "tel:",
  "ws:",
  "wss:",
]);

const ALLOWED_PORTS = new Set(["", "80", "443"]);

export function normalizeAndValidateUrl(input: string): NormalizedUrlResult {
  if (!input || typeof input !== "string") {
    return { isValid: false, errorMessage: "Target website input is empty or invalid" };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, errorMessage: "Target website input cannot be blank" };
  }

  // Pre-check for raw loopback or localhost text
  const lower = trimmed.toLowerCase();
  if (
    lower === "localhost" ||
    lower.startsWith("localhost:") ||
    lower.startsWith("http://localhost") ||
    lower.startsWith("https://localhost") ||
    lower === "127.0.0.1" ||
    lower.startsWith("http://127.0.0.1") ||
    lower.startsWith("https://127.0.0.1") ||
    lower === "::1" ||
    lower.startsWith("http://[::1]") ||
    lower.startsWith("https://[::1]")
  ) {
    return { isValid: false, errorMessage: "Localhost and loopback destinations are strictly prohibited" };
  }

  // If user entered a bare domain (e.g. naffeez.com or www.example.com), prepend https://
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    // Check if it starts with another scheme
    if (/^[a-z0-9+.-]+:/i.test(candidate)) {
      const scheme = candidate.split(":")[0].toLowerCase() + ":";
      if (FORBIDDEN_SCHEMES.has(scheme)) {
        return { isValid: false, errorMessage: `Scheme '${scheme}' is not supported. Use HTTP or HTTPS.` };
      }
    }
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { isValid: false, errorMessage: "Malformed URL syntax" };
  }

  // Reject forbidden schemes
  if (FORBIDDEN_SCHEMES.has(parsed.protocol.toLowerCase())) {
    return {
      isValid: false,
      errorMessage: `Scheme '${parsed.protocol}' is prohibited. Only HTTP and HTTPS are permitted.`,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isValid: false,
      errorMessage: `Protocol '${parsed.protocol}' is not supported. Only HTTP and HTTPS are permitted.`,
    };
  }

  // Reject embedded credentials (e.g. https://user:pass@domain.com)
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      errorMessage: "URLs containing embedded user credentials are not permitted",
    };
  }

  // Check port
  if (!ALLOWED_PORTS.has(parsed.port)) {
    return {
      isValid: false,
      errorMessage: `Port '${parsed.port}' is prohibited. Only standard web ports (80, 443) are allowed.`,
    };
  }

  // Validate hostname
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname.length < 3) {
    return { isValid: false, errorMessage: "Hostname is missing or too short" };
  }

  // Hostname must contain at least one dot unless it's an IP address
  if (!hostname.includes(".") && !hostname.includes(":")) {
    return { isValid: false, errorMessage: `Invalid domain '${hostname}'. A valid public FQDN is required.` };
  }

  // Strip dangerous characters in hostname
  if (/[\s<>'"\\^`{|}]/.test(hostname)) {
    return { isValid: false, errorMessage: "Hostname contains invalid characters" };
  }

  // Construct canonical normalized URL: standard lowercase host, remove hash fragment, clean path
  parsed.hash = "";
  parsed.searchParams.sort(); // Sort query parameters deterministically

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
    domain: hostname,
    protocol: parsed.protocol,
  };
}

import dns from "node:dns/promises";
import net from "node:net";

export interface DnsSafetyCheckResult {
  isSafe: boolean;
  resolvedIps?: string[];
  rejectionReason?: string;
}

const BLOCKED_HOST_SUFFIXES = [
  ".internal",
  ".local",
  ".corp",
  ".lan",
  ".home",
  ".intra",
  ".onion",
  ".localhost",
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "instance-data",
  "169.254.169.254",
]);

/**
 * Checks if an IPv4 address is in a private, loopback, or reserved range.
 */
export function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed is unsafe
  }

  const [b0, b1, b2, b3] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/Azure/GCP cloud metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier grade NAT / shared)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation / TEST-NET)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (b0 >= 240) return true;

  // 255.255.255.255/32 (Broadcast)
  if (b0 === 255 && b1 === 255 && b2 === 255 && b3 === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is private, loopback, or reserved.
 */
export function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 (Loopback) or :: (Unspecified)
  if (normalized === "::1" || normalized === "::") return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:xxxx:xxxx)
  if (normalized.startsWith("::ffff:") || normalized.startsWith("0:0:0:0:0:ffff:")) {
    const after = normalized.split("ffff:")[1];
    if (after && after.includes(".")) {
      return isPrivateOrReservedIpv4(after);
    }
    return true; // Be conservative
  }

  // fe80::/10 (Link-Local)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  // fc00::/7 (Unique Local Address - ULA: fc00:: through fdff::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // ff00::/8 (Multicast)
  if (normalized.startsWith("ff")) {
    return true;
  }

  // 2001:db8::/32 (Documentation)
  if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:0db8:")) {
    return true;
  }

  return false;
}

/**
 * Resolves all A and AAAA records for a host and verifies none resolve to private or cloud destinations.
 */
export async function validateHostSafety(hostname: string): Promise<DnsSafetyCheckResult> {
  const lowerHost = hostname.toLowerCase();

  // Explicit blacklisted hostnames
  if (BLOCKED_HOSTNAMES.has(lowerHost)) {
    return {
      isSafe: false,
      rejectionReason: `Hostname '${hostname}' is a prohibited or metadata destination.`,
    };
  }

  // Check suffix blacklists
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (lowerHost.endsWith(suffix)) {
      return {
        isSafe: false,
        rejectionReason: `Hostname '${hostname}' has prohibited internal suffix '${suffix}'.`,
      };
    }
  }

  // If host is a direct IP address
  const ipFamily = net.isIP(hostname);
  if (ipFamily === 4) {
    if (isPrivateOrReservedIpv4(hostname)) {
      return {
        isSafe: false,
        rejectionReason: `IP address '${hostname}' is in a private, loopback, or reserved range.`,
      };
    }
    return { isSafe: true, resolvedIps: [hostname] };
  }

  if (ipFamily === 6) {
    if (isPrivateOrReservedIpv6(hostname)) {
      return {
        isSafe: false,
        rejectionReason: `IPv6 address '${hostname}' is in a private, link-local, or reserved range.`,
      };
    }
    return { isSafe: true, resolvedIps: [hostname] };
  }

  // Resolve hostname via DNS
  let resolvedIps: string[] = [];
  try {
    const results = await dns.lookup(hostname, { all: true });
    resolvedIps = results.map((r) => r.address);
  } catch (err: any) {
    return {
      isSafe: false,
      rejectionReason: `DNS resolution failed for '${hostname}': ${err?.message || "Host not found"}`,
    };
  }

  if (!resolvedIps || resolvedIps.length === 0) {
    return {
      isSafe: false,
      rejectionReason: `No A or AAAA records found for hostname '${hostname}'.`,
    };
  }

  // Validate EVERY resolved IP address
  for (const ip of resolvedIps) {
    const family = net.isIP(ip);
    if (family === 4 && isPrivateOrReservedIpv4(ip)) {
      return {
        isSafe: false,
        rejectionReason: `DNS resolution for '${hostname}' returned prohibited IP '${ip}'.`,
        resolvedIps,
      };
    }
    if (family === 6 && isPrivateOrReservedIpv6(ip)) {
      return {
        isSafe: false,
        rejectionReason: `DNS resolution for '${hostname}' returned prohibited IPv6 '${ip}'.`,
        resolvedIps,
      };
    }
  }

  return {
    isSafe: true,
    resolvedIps,
  };
}

/**
 * Validates a target URL and its resolved destinations for SSRF safety.
 */
export async function validateUrlSafety(targetUrl: string): Promise<DnsSafetyCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { isSafe: false, rejectionReason: "Invalid URL format." };
  }

  return validateHostSafety(parsed.hostname);
}

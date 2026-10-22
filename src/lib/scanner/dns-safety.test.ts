import { describe, it, expect } from "vitest";
import {
  isPrivateOrReservedIpv4,
  isPrivateOrReservedIpv6,
  validateHostSafety,
} from "./dns-safety";

describe("dns-safety", () => {
  describe("isPrivateOrReservedIpv4", () => {
    it("flags loopback 127.0.0.1 and 127.x.x.x", () => {
      expect(isPrivateOrReservedIpv4("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIpv4("127.255.255.255")).toBe(true);
    });

    it("flags RFC 1918 private IPv4 addresses", () => {
      expect(isPrivateOrReservedIpv4("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIpv4("10.254.12.3")).toBe(true);
      expect(isPrivateOrReservedIpv4("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIpv4("172.31.255.255")).toBe(true);
      expect(isPrivateOrReservedIpv4("192.168.1.1")).toBe(true);
    });

    it("flags cloud metadata IP 169.254.169.254 and link-local", () => {
      expect(isPrivateOrReservedIpv4("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIpv4("169.254.1.1")).toBe(true);
    });

    it("flags broadcast and multicast IPs", () => {
      expect(isPrivateOrReservedIpv4("255.255.255.255")).toBe(true);
      expect(isPrivateOrReservedIpv4("224.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIpv4("0.0.0.0")).toBe(true);
    });

    it("allows valid public IPv4 addresses", () => {
      expect(isPrivateOrReservedIpv4("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIpv4("1.1.1.1")).toBe(false);
      expect(isPrivateOrReservedIpv4("93.184.216.34")).toBe(false);
    });
  });

  describe("isPrivateOrReservedIpv6", () => {
    it("flags loopback ::1 and unspecified ::", () => {
      expect(isPrivateOrReservedIpv6("::1")).toBe(true);
      expect(isPrivateOrReservedIpv6("::")).toBe(true);
    });

    it("flags unique local addresses (fc00::/7)", () => {
      expect(isPrivateOrReservedIpv6("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIpv6("fd12:3456:789a::1")).toBe(true);
    });

    it("flags link-local addresses (fe80::/10)", () => {
      expect(isPrivateOrReservedIpv6("fe80::1")).toBe(true);
      expect(isPrivateOrReservedIpv6("feb0::dead:beef")).toBe(true);
    });

    it("flags IPv4-mapped IPv6 addresses for private IPv4s", () => {
      expect(isPrivateOrReservedIpv6("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIpv6("::ffff:192.168.0.1")).toBe(true);
      expect(isPrivateOrReservedIpv6("::ffff:169.254.169.254")).toBe(true);
    });

    it("allows public IPv6 addresses", () => {
      expect(isPrivateOrReservedIpv6("2606:4700:4700::1111")).toBe(false);
      expect(isPrivateOrReservedIpv6("2001:4860:4860::8888")).toBe(false);
    });
  });

  describe("validateHostSafety", () => {
    it("blocks metadata hostnames", async () => {
      const res1 = await validateHostSafety("metadata.google.internal");
      expect(res1.isSafe).toBe(false);
      expect(res1.rejectionReason).toContain("prohibited or metadata destination");

      const res2 = await validateHostSafety("service.internal");
      expect(res2.isSafe).toBe(false);
      expect(res2.rejectionReason).toContain("prohibited internal suffix");
    });

    it("blocks direct private IP targets", async () => {
      const res1 = await validateHostSafety("127.0.0.1");
      expect(res1.isSafe).toBe(false);

      const res2 = await validateHostSafety("192.168.1.100");
      expect(res2.isSafe).toBe(false);

      const res3 = await validateHostSafety("169.254.169.254");
      expect(res3.isSafe).toBe(false);
    });
  });
});

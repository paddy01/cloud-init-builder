import { describe, expect, it } from "vitest";
import {
  isCidrv4,
  isCidrv6,
  isIpv4,
  isIpv6,
  isPositiveIntegerMetric,
} from "../../../src/validators/networkAddress.ts";

describe("networkAddress helpers", () => {
  describe("isIpv4", () => {
    it("accepts valid IPv4 addresses", () => {
      expect(isIpv4("192.0.2.1")).toBe(true);
      expect(isIpv4("10.0.0.5")).toBe(true);
    });

    it("rejects IPv6 and malformed input", () => {
      expect(isIpv4("2001:db8::1")).toBe(false);
      expect(isIpv4("nonsense")).toBe(false);
      expect(isIpv4("192.0.2.0/24")).toBe(false);
    });
  });

  describe("isIpv6", () => {
    it("accepts valid IPv6 addresses", () => {
      expect(isIpv6("2001:db8::1")).toBe(true);
      expect(isIpv6("2001:db8::53")).toBe(true);
    });

    it("rejects IPv4 and malformed input", () => {
      expect(isIpv6("192.0.2.1")).toBe(false);
      expect(isIpv6("nonsense")).toBe(false);
      expect(isIpv6("2001:db8::/64")).toBe(false);
    });
  });

  describe("isCidrv4", () => {
    it("accepts valid IPv4 CIDR", () => {
      expect(isCidrv4("192.0.2.0/24")).toBe(true);
      expect(isCidrv4("10.0.0.5/24")).toBe(true);
    });

    it("rejects IPv6 CIDR and malformed input", () => {
      expect(isCidrv4("2001:db8::/64")).toBe(false);
      expect(isCidrv4("nonsense")).toBe(false);
      expect(isCidrv4("192.0.2.1")).toBe(false);
    });
  });

  describe("isCidrv6", () => {
    it("accepts valid IPv6 CIDR", () => {
      expect(isCidrv6("2001:db8::/64")).toBe(true);
    });

    it("rejects IPv4 CIDR and malformed input", () => {
      expect(isCidrv6("192.0.2.0/24")).toBe(false);
      expect(isCidrv6("nonsense")).toBe(false);
      expect(isCidrv6("2001:db8::1")).toBe(false);
    });
  });

  describe("isPositiveIntegerMetric", () => {
    it("accepts positive integers", () => {
      expect(isPositiveIntegerMetric("1")).toBe(true);
      expect(isPositiveIntegerMetric("100")).toBe(true);
      expect(isPositiveIntegerMetric(" 42 ")).toBe(true);
    });

    it("rejects zero, negatives, and non-numeric input", () => {
      expect(isPositiveIntegerMetric("0")).toBe(false);
      expect(isPositiveIntegerMetric("-1")).toBe(false);
      expect(isPositiveIntegerMetric("abc")).toBe(false);
      expect(isPositiveIntegerMetric("")).toBe(false);
      expect(isPositiveIntegerMetric(" -1x ")).toBe(false);
    });
  });
});

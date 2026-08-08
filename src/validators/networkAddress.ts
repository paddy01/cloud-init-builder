import { z } from "zod";

const ipv4Schema = z.ipv4();
const ipv6Schema = z.ipv6();
const cidrv4Schema = z.cidrv4();
const cidrv6Schema = z.cidrv6();

export function isIpv4(value: string): boolean {
  return ipv4Schema.safeParse(value).success;
}

export function isIpv6(value: string): boolean {
  return ipv6Schema.safeParse(value).success;
}

export function isCidrv4(value: string): boolean {
  return cidrv4Schema.safeParse(value).success;
}

export function isCidrv6(value: string): boolean {
  return cidrv6Schema.safeParse(value).success;
}

export function isPositiveIntegerMetric(value: string): boolean {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) > 0;
}

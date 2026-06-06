import { describe, expect, it } from "vitest";
import { orderKeys } from "../../../src/generators/orderKeys.ts";

const CLOUD_CONFIG_ORDER = [
  "hostname",
  "fqdn",
  "prefer_fqdn_over_hostname",
  "manage_etc_hosts",
  "timezone",
  "locale",
] as const;

describe("orderKeys", () => {
  it("orders declared keys per CLOUD_CONFIG_ORDER", () => {
    const input = { locale: "en_US.UTF-8", hostname: "web01" };
    const result = orderKeys(input, CLOUD_CONFIG_ORDER);
    expect(Object.keys(result)).toEqual(["hostname", "locale"]);
  });

  it("appends unknown keys after declared keys in input order", () => {
    const input = { custom_field: "x", hostname: "web01", locale: "en_US.UTF-8" };
    const result = orderKeys(input, CLOUD_CONFIG_ORDER);
    expect(Object.keys(result)).toEqual(["hostname", "locale", "custom_field"]);
  });

  it("preserves unknown key input order among themselves", () => {
    const input = { z_extra: 1, a_extra: 2, hostname: "web01" };
    const result = orderKeys(input, CLOUD_CONFIG_ORDER);
    expect(Object.keys(result)).toEqual(["hostname", "z_extra", "a_extra"]);
  });

  it("returns empty object for empty input", () => {
    expect(orderKeys({}, CLOUD_CONFIG_ORDER)).toEqual({});
  });

  it("omits keys not present in input from output", () => {
    const input = { hostname: "web01" };
    const result = orderKeys(input, CLOUD_CONFIG_ORDER);
    expect(Object.keys(result)).toEqual(["hostname"]);
    expect(result).toEqual({ hostname: "web01" });
  });

  it("does not mutate the input object", () => {
    const input = { locale: "en_US.UTF-8", hostname: "web01" };
    const copy = { ...input };
    orderKeys(input, CLOUD_CONFIG_ORDER);
    expect(input).toEqual(copy);
  });
});

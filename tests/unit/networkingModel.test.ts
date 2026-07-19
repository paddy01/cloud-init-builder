import { describe, expect, it } from "vitest";
import {
  builderNetworkInterfaceSchema,
  createBlankNetworkInterface,
  isSemanticallyBlankNetworkInterface,
  networkingConfigSchema,
} from "../../src/models/networking.ts";

describe("networking model", () => {
  it("creates a deterministic blank name-mode interface when an ID is injected", () => {
    expect(createBlankNetworkInterface("interface-test")).toEqual({
      id: "interface-test",
      identityMode: "name",
      name: "",
      macAddress: "",
    });
  });

  it("generates nonempty opaque IDs", () => {
    expect(createBlankNetworkInterface().id).not.toBe("");
  });

  it("retains both identity drafts regardless of the active mode", () => {
    expect(
      builderNetworkInterfaceSchema.parse({
        id: "interface-1",
        identityMode: "mac",
        name: " ens18 ",
        macAddress: "AA:BB:CC:DD:EE:FF",
      }),
    ).toEqual({
      id: "interface-1",
      identityMode: "mac",
      name: " ens18 ",
      macAddress: "aa:bb:cc:dd:ee:ff",
    });
  });

  it("preserves incomplete MAC drafts for editing", () => {
    expect(
      builderNetworkInterfaceSchema.parse({
        id: "interface-1",
        identityMode: "mac",
        name: "",
        macAddress: "AA:BB:C",
      }).macAddress,
    ).toBe("AA:BB:C");
  });

  it("preserves exact device-name code units", () => {
    const composed = "caf\u00e9";
    const decomposed = "cafe\u0301";
    const parsed = networkingConfigSchema.parse({
      interfaces: [
        { id: "a", identityMode: "name", name: composed, macAddress: "" },
        { id: "b", identityMode: "name", name: decomposed, macAddress: "" },
      ],
    });

    expect(parsed.interfaces[0]?.name).toBe(composed);
    expect(parsed.interfaces[1]?.name).toBe(decomposed);
    expect(parsed.interfaces[0]?.name).not.toBe(parsed.interfaces[1]?.name);
  });

  it("uses trimmed drafts only to determine semantic blankness", () => {
    expect(
      isSemanticallyBlankNetworkInterface({
        id: "blank",
        identityMode: "name",
        name: "  ",
        macAddress: "\t",
      }),
    ).toBe(true);
    expect(
      isSemanticallyBlankNetworkInterface({
        id: "populated",
        identityMode: "name",
        name: " ens18 ",
        macAddress: "",
      }),
    ).toBe(false);
  });
});

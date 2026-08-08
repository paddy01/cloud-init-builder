import { describe, expect, it } from "vitest";
import {
  builderNetworkInterfaceSchema,
  createBlankNetworkInterface,
  createBuilderValueRow,
  createDefaultRoute,
  createDualStackDhcpExample,
  createIpv4DhcpExample,
  createSpecificRoute,
  createStaticIpv4Example,
  isSemanticallyBlankNetworkInterface,
  networkingConfigSchema,
  normalizeNetworkingSection,
} from "../../src/models/networking.ts";
import { RISK_CODES } from "../../src/models/networkingCodes.ts";

describe("networking model", () => {
  it("creates a deterministic blank name-mode interface when an ID is injected", () => {
    expect(createBlankNetworkInterface("interface-test")).toEqual({
      id: "interface-test",
      identityMode: "name",
      name: "",
      macAddress: "",
      dhcp4: false,
      dhcp6: false,
      ipv4Addresses: [],
      ipv6Addresses: [],
      ipv4Routes: [],
      ipv6Routes: [],
      nameservers: [],
      searchDomains: [],
      mtuEnabled: false,
      mtu: "",
      exampleFields: [],
      acknowledgedRiskWarnings: [],
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
        dhcp4: false,
        dhcp6: false,
        ipv4Addresses: [],
        ipv6Addresses: [],
        ipv4Routes: [],
        ipv6Routes: [],
        nameservers: [],
        searchDomains: [],
        mtuEnabled: false,
        mtu: "",
        exampleFields: [],
      }),
    ).toEqual({
      id: "interface-1",
      identityMode: "mac",
      name: " ens18 ",
      macAddress: "aa:bb:cc:dd:ee:ff",
      dhcp4: false,
      dhcp6: false,
      ipv4Addresses: [],
      ipv6Addresses: [],
      ipv4Routes: [],
      ipv6Routes: [],
      nameservers: [],
      searchDomains: [],
      mtuEnabled: false,
      mtu: "",
      exampleFields: [],
      acknowledgedRiskWarnings: [],
    });
  });

  it("preserves incomplete MAC drafts for editing", () => {
    expect(
      builderNetworkInterfaceSchema.parse({
        id: "interface-1",
        identityMode: "mac",
        name: "",
        macAddress: "AA:BB:C",
        dhcp4: false,
        dhcp6: false,
        ipv4Addresses: [],
        ipv6Addresses: [],
        ipv4Routes: [],
        ipv6Routes: [],
        nameservers: [],
        searchDomains: [],
        mtuEnabled: false,
        mtu: "",
        exampleFields: [],
      }).macAddress,
    ).toBe("AA:BB:C");
  });

  it("preserves exact device-name code units", () => {
    const composed = "caf\u00e9";
    const decomposed = "cafe\u0301";
    const parsed = networkingConfigSchema.parse({
      interfaces: [
        { ...createBlankNetworkInterface("a"), name: composed },
        { ...createBlankNetworkInterface("b"), name: decomposed },
      ],
    });

    expect(parsed.interfaces[0]?.name).toBe(composed);
    expect(parsed.interfaces[1]?.name).toBe(decomposed);
    expect(parsed.interfaces[0]?.name).not.toBe(parsed.interfaces[1]?.name);
  });

  it("uses trimmed drafts only to determine semantic blankness", () => {
    expect(
      isSemanticallyBlankNetworkInterface({
        ...createBlankNetworkInterface("blank"),
        name: "  ",
        macAddress: "\t",
      }),
    ).toBe(true);
    expect(
      isSemanticallyBlankNetworkInterface({
        ...createBlankNetworkInterface("populated"),
        name: " ens18 ",
      }),
    ).toBe(false);
  });

  it("preserves stable IDs and raw drafts in value and route factories", () => {
    expect(createBuilderValueRow("address-1", " 192.0.2. ", true)).toEqual({
      id: "address-1",
      value: " 192.0.2. ",
      isExampleValue: true,
    });
    expect(createDefaultRoute("route-default", " 192.0.2.1 ", "00", true)).toEqual({
      id: "route-default",
      kind: "default",
      gateway: " 192.0.2.1 ",
      metric: "00",
      exampleFields: ["gateway", "metric"],
    });
    expect(createSpecificRoute("route-specific", "10.0./", "", "-1")).toEqual({
      id: "route-specific",
      kind: "specific",
      destination: "10.0./",
      gateway: "",
      metric: "-1",
      exampleFields: [],
    });
  });

  it("keeps default and specific route shapes discriminated", () => {
    const blank = createBlankNetworkInterface("interface-routes");
    const parsed = builderNetworkInterfaceSchema.parse({
      ...blank,
      ipv4Routes: [
        createDefaultRoute("default", "", "nonnumeric"),
        createSpecificRoute("specific", "", "", "-20"),
      ],
    });

    expect(parsed.ipv4Routes[0]).not.toHaveProperty("destination");
    expect(parsed.ipv4Routes[1]).toMatchObject({
      kind: "specific",
      destination: "",
      gateway: "",
      metric: "-20",
    });
  });

  it("creates exactly the three portable examples with field-local provenance", () => {
    expect(createIpv4DhcpExample("example-dhcp4")).toEqual({
      ...createBlankNetworkInterface("example-dhcp4"),
      name: "ens18",
      dhcp4: true,
      exampleFields: ["name", "dhcp4"],
    });

    const staticExample = createStaticIpv4Example("example-static", {
      address: "address-example",
      route: "route-example",
      nameserver: "nameserver-example",
      searchDomain: "search-example",
    });
    expect(staticExample).toEqual({
      ...createBlankNetworkInterface("example-static"),
      name: "ens18",
      ipv4Addresses: [
        { id: "address-example", value: "192.0.2.10/24", isExampleValue: true },
      ],
      ipv4Routes: [
        {
          id: "route-example",
          kind: "default",
          gateway: "192.0.2.1",
          metric: "",
          exampleFields: ["gateway"],
        },
      ],
      nameservers: [
        { id: "nameserver-example", value: "192.0.2.53", isExampleValue: true },
      ],
      searchDomains: [
        { id: "search-example", value: "lab.example", isExampleValue: true },
      ],
      exampleFields: ["name"],
    });

    expect(createDualStackDhcpExample("example-dual")).toEqual({
      ...createBlankNetworkInterface("example-dual"),
      name: "ens18",
      dhcp4: true,
      dhcp6: true,
      exampleFields: ["name", "dhcp4", "dhcp6"],
    });
    for (const example of [
      createIpv4DhcpExample(),
      createStaticIpv4Example(),
      createDualStackDhcpExample(),
    ]) {
      expect(example).not.toHaveProperty("provider");
      expect(example).not.toHaveProperty("proxmox");
    }
  });

  it.each([
    ["DHCP4", { dhcp4: true }],
    ["DHCP6", { dhcp6: true }],
    ["an IPv4 address", { ipv4Addresses: [createBuilderValueRow("a")] }],
    ["an IPv6 address", { ipv6Addresses: [createBuilderValueRow("a")] }],
    ["an IPv4 route", { ipv4Routes: [createDefaultRoute("r")] }],
    ["an IPv6 route", { ipv6Routes: [createSpecificRoute("r")] }],
    ["a nameserver", { nameservers: [createBuilderValueRow("n")] }],
    ["a search domain", { searchDomains: [createBuilderValueRow("s")] }],
    ["enabled MTU", { mtuEnabled: true }],
    ["an MTU draft", { mtu: " 15" }],
  ])("is nonblank when it contains %s", (_label, patch) => {
    expect(
      isSemanticallyBlankNetworkInterface({
        ...createBlankNetworkInterface("populated"),
        ...patch,
      }),
    ).toBe(false);
  });

  it("defaults acknowledgedRiskWarnings to an empty list", () => {
    expect(createBlankNetworkInterface("ack-blank").acknowledgedRiskWarnings).toEqual(
      [],
    );
  });

  it("normalizes risk-warning acknowledgements with acknowledgement-specific import warnings", () => {
    const { networking, warnings } = normalizeNetworkingSection({
      interfaces: [
        {
          id: "iface-ack",
          identityMode: "name",
          name: "ens18",
          macAddress: "",
          acknowledgedRiskWarnings: [
            RISK_CODES.NET_RISK_DHCP4_STATIC_IPV4,
            "UNKNOWN_RISK_CODE",
            RISK_CODES.NET_RISK_DHCP4_STATIC_IPV4,
          ],
        },
      ],
    });

    expect(networking.interfaces[0]?.acknowledgedRiskWarnings).toEqual([
      RISK_CODES.NET_RISK_DHCP4_STATIC_IPV4,
    ]);
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "networking.interfaces.0.acknowledgedRiskWarnings.1",
          message:
            "Unsupported risk-warning acknowledgement was omitted during import.",
        }),
      ]),
    );
    expect(
      warnings.some((warning) => warning.message.includes("example provenance")),
    ).toBe(false);
  });

  it("clears non-array acknowledgedRiskWarnings with a warning", () => {
    const { networking, warnings } = normalizeNetworkingSection({
      interfaces: [
        {
          id: "iface-bad-ack",
          identityMode: "name",
          name: "ens18",
          macAddress: "",
          acknowledgedRiskWarnings: "not-an-array",
        },
      ],
    });

    expect(networking.interfaces[0]?.acknowledgedRiskWarnings).toEqual([]);
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "networking.interfaces.0.acknowledgedRiskWarnings",
          message:
            "Invalid risk-warning acknowledgement list was cleared during import.",
        }),
      ]),
    );
  });

  it("does not treat acknowledgedRiskWarnings as semantic content", () => {
    expect(
      isSemanticallyBlankNetworkInterface({
        ...createBlankNetworkInterface("ack-only"),
        acknowledgedRiskWarnings: [RISK_CODES.NET_RISK_DHCP4_STATIC_IPV4],
      }),
    ).toBe(true);
  });
});

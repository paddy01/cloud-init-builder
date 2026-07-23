import { describe, expect, it } from "vitest";
import {
  createBlankNetworkInterface,
  createNetworkDraftId,
  type NetworkingConfig,
} from "../../../src/models/networking.ts";
import { createDefaultProject } from "../../../src/models/project.ts";
import {
  NETWORKING_VALIDATION_MESSAGES,
  validateNetworking,
} from "../../../src/validators/validateNetworking.ts";
import { validateConfig } from "../../../src/validators/validateConfig.ts";
import {
  isCrossInterfaceNetworkingCode,
  isStructuralNetworkingCode,
} from "../../../src/components/networking/networkingValidationPaths.ts";
import {
  NETWORKING_CROSS_INTERFACE_CODES,
  NETWORKING_STRUCTURAL_CODES,
} from "../../../src/models/networkingCodes.ts";

function networkingConfig(
  interfaces: NetworkingConfig["interfaces"],
): NetworkingConfig {
  return { interfaces };
}

function configuredInterface(
  id: string,
  patch: Partial<NetworkingConfig["interfaces"][number]> = {},
) {
  return {
    ...createBlankNetworkInterface(id),
    name: "ens18",
    ...patch,
  };
}

describe("validateNetworking", () => {
  it("returns no issues for undefined networking", () => {
    expect(validateNetworking(undefined)).toEqual([]);
  });

  it("returns no issues for a semantically blank interface", () => {
    const entry = createBlankNetworkInterface("blank-interface");
    expect(validateNetworking(networkingConfig([entry]))).toEqual([]);
  });

  it("returns no issues for a valid positive MTU in typical range", () => {
    const entry = configuredInterface("valid-mtu", {
      mtuEnabled: true,
      mtu: "1500",
    });
    expect(validateNetworking(networkingConfig([entry]))).toEqual([]);
  });

  it.each(["0", "-1", "abc", ""])(
    "returns NET_MTU_INVALID for invalid enabled MTU %j",
    (mtu) => {
      const entry = configuredInterface(`invalid-mtu-${mtu}`, {
        mtuEnabled: true,
        mtu,
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(issues).toEqual([
        {
          path: `networking.interfaces.invalid-mtu-${mtu}.mtu`,
          code: "NET_MTU_INVALID",
          message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID,
          severity: "error",
        },
      ]);
    },
  );

  it.each([1279, 9001])(
    "returns NET_MTU_OUT_OF_RANGE warning for MTU %i outside typical range",
    (mtu) => {
      const entry = configuredInterface(`mtu-warn-${mtu}`, {
        mtuEnabled: true,
        mtu: String(mtu),
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(issues).toEqual([
        {
          path: `networking.interfaces.mtu-warn-${mtu}.mtu`,
          code: "NET_MTU_OUT_OF_RANGE",
          message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_OUT_OF_RANGE(mtu),
          severity: "warning",
        },
      ]);
    },
  );

  it("merges networking MTU issues through validateConfig", () => {
    const project = createDefaultProject("Networking validation");
    project.identity = { hostname: "web01" };
    project.networking = networkingConfig([
      configuredInterface("iface-1", {
        mtuEnabled: true,
        mtu: "0",
      }),
    ]);

    const issues = validateConfig(project);
    expect(issues).toContainEqual({
      path: "networking.interfaces.iface-1.mtu",
      code: "NET_MTU_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID,
      severity: "error",
    });
  });

  it("requires the active selector when the interface is otherwise authored", () => {
    const nameMode = configuredInterface("selector-name", {
      name: "",
      dhcp4: true,
    });
    const macMode = configuredInterface("selector-mac", {
      identityMode: "mac",
      name: "",
      macAddress: "",
      dhcp4: true,
    });

    const issues = validateNetworking(
      networkingConfig([nameMode, macMode]),
    );

    expect(issues).toContainEqual({
      path: "networking.interfaces.selector-name.name",
      code: "NET_SELECTOR_REQUIRED",
      message: NETWORKING_VALIDATION_MESSAGES.NET_SELECTOR_REQUIRED_NAME,
      severity: "error",
    });
    expect(issues).toContainEqual({
      path: "networking.interfaces.selector-mac.macAddress",
      code: "NET_SELECTOR_REQUIRED",
      message: NETWORKING_VALIDATION_MESSAGES.NET_SELECTOR_REQUIRED_MAC,
      severity: "error",
    });
  });

  it("validates device names with the locked regex", () => {
    const valid = configuredInterface("valid-name", { name: "eth0.100" });
    const invalid = configuredInterface("invalid-name", { name: "-bad" });

    expect(validateNetworking(networkingConfig([valid]))).toEqual([]);
    expect(
      validateNetworking(networkingConfig([invalid])),
    ).toContainEqual({
      path: "networking.interfaces.invalid-name.name",
      code: "NET_NAME_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_NAME_INVALID,
      severity: "error",
    });
  });

  it("validates MAC addresses via isCompleteMac", () => {
    const valid = configuredInterface("valid-mac", {
      identityMode: "mac",
      macAddress: "52:54:00:12:34:56",
    });
    const invalid = configuredInterface("invalid-mac", {
      identityMode: "mac",
      macAddress: "52:54:00",
    });

    expect(validateNetworking(networkingConfig([valid]))).toEqual([]);
    expect(
      validateNetworking(networkingConfig([invalid])),
    ).toContainEqual({
      path: "networking.interfaces.invalid-mac.macAddress",
      code: "NET_MAC_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_MAC_INVALID,
      severity: "error",
    });
  });

  it("distinguishes absent address lists from present empty rows", () => {
    const absent = configuredInterface("absent-addresses");
    const rowId = createNetworkDraftId("addr");
    const presentEmpty = configuredInterface("present-empty", {
      ipv4Addresses: [{ id: rowId, value: "", isExampleValue: false }],
    });

    expect(validateNetworking(networkingConfig([absent]))).toEqual([]);
    expect(
      validateNetworking(networkingConfig([presentEmpty])),
    ).toContainEqual({
      path: `networking.interfaces.present-empty.ipv4Addresses.${rowId}`,
      code: "NET_ADDRESS_REQUIRED",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ADDRESS_REQUIRED,
      severity: "error",
    });
  });

  it("distinguishes family mismatch from invalid CIDR on address rows", () => {
    const rowId = createNetworkDraftId("addr");
    const mismatch = configuredInterface("family-mismatch", {
      ipv4Addresses: [
        { id: rowId, value: "2001:db8::/64", isExampleValue: false },
      ],
    });
    const invalid = configuredInterface("invalid-cidr", {
      ipv4Addresses: [
        { id: rowId, value: "nonsense", isExampleValue: false },
      ],
    });

    const mismatchIssues = validateNetworking(networkingConfig([mismatch]));
    const invalidIssues = validateNetworking(networkingConfig([invalid]));

    expect(mismatchIssues).toContainEqual({
      path: `networking.interfaces.family-mismatch.ipv4Addresses.${rowId}`,
      code: "NET_ADDRESS_FAMILY_MISMATCH",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ADDRESS_FAMILY_MISMATCH("IPv4"),
      severity: "error",
    });
    expect(invalidIssues).toContainEqual({
      path: `networking.interfaces.invalid-cidr.ipv4Addresses.${rowId}`,
      code: "NET_ADDRESS_CIDR_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ADDRESS_CIDR_INVALID("IPv4"),
      severity: "error",
    });
    expect(
      mismatchIssues.find((issue) => issue.code === "NET_ADDRESS_CIDR_INVALID"),
    ).toBeUndefined();
  });

  it("requires default-route gateway and specific-route destination when present", () => {
    const defaultRouteId = createNetworkDraftId("route");
    const specificRouteId = createNetworkDraftId("route");
    const entry = configuredInterface("route-required", {
      ipv4Routes: [
        {
          id: defaultRouteId,
          kind: "default",
          gateway: "",
          metric: "",
          exampleFields: [],
        },
        {
          id: specificRouteId,
          kind: "specific",
          destination: "",
          gateway: "",
          metric: "",
          exampleFields: [],
        },
      ],
    });

    const issues = validateNetworking(networkingConfig([entry]));
    expect(issues).toContainEqual({
      path: `networking.interfaces.route-required.ipv4Routes.${defaultRouteId}.gateway`,
      code: "NET_ROUTE_GATEWAY_REQUIRED",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_GATEWAY_REQUIRED,
      severity: "error",
    });
    expect(issues).toContainEqual({
      path: `networking.interfaces.route-required.ipv4Routes.${specificRouteId}.destination`,
      code: "NET_ROUTE_DEST_REQUIRED",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_DEST_REQUIRED,
      severity: "error",
    });
  });

  it("skips optional blank specific-route gateway and route metric", () => {
    const routeId = createNetworkDraftId("route");
    const entry = configuredInterface("optional-blank", {
      ipv4Routes: [
        {
          id: routeId,
          kind: "specific",
          destination: "198.51.100.0/24",
          gateway: "",
          metric: "",
          exampleFields: [],
        },
      ],
    });

    const issues = validateNetworking(networkingConfig([entry]));
    expect(
      issues.filter((issue) => issue.path.includes(routeId)),
    ).toEqual([]);
  });

  it("validates route destination, gateway, and metric formats", () => {
    const routeId = createNetworkDraftId("route");
    const entry = configuredInterface("route-formats", {
      ipv4Routes: [
        {
          id: routeId,
          kind: "specific",
          destination: "not-a-cidr",
          gateway: "not-an-ip",
          metric: "-1",
          exampleFields: [],
        },
      ],
    });

    const issues = validateNetworking(networkingConfig([entry]));
    expect(issues).toContainEqual({
      path: `networking.interfaces.route-formats.ipv4Routes.${routeId}.destination`,
      code: "NET_ROUTE_DEST_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_DEST_INVALID("IPv4"),
      severity: "error",
    });
    expect(issues).toContainEqual({
      path: `networking.interfaces.route-formats.ipv4Routes.${routeId}.gateway`,
      code: "NET_ROUTE_GATEWAY_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_GATEWAY_INVALID("IPv4"),
      severity: "error",
    });
    expect(issues).toContainEqual({
      path: `networking.interfaces.route-formats.ipv4Routes.${routeId}.metric`,
      code: "NET_ROUTE_METRIC_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_METRIC_INVALID,
      severity: "error",
    });
  });

  it("accepts bare IPv4/IPv6 nameservers and rejects CIDR or garbage", () => {
    const validIpv4 = createNetworkDraftId("ns");
    const validIpv6 = createNetworkDraftId("ns");
    const invalidCidr = createNetworkDraftId("ns");
    const invalidGarbage = createNetworkDraftId("ns");
    const entry = configuredInterface("nameservers", {
      nameservers: [
        { id: validIpv4, value: "192.0.2.53", isExampleValue: false },
        { id: validIpv6, value: "2001:db8::53", isExampleValue: false },
        { id: invalidCidr, value: "192.0.2.0/24", isExampleValue: false },
        { id: invalidGarbage, value: "nope", isExampleValue: false },
      ],
    });

    const issues = validateNetworking(networkingConfig([entry]));
    expect(
      issues.filter((issue) => issue.code === "NET_NAMESERVER_INVALID"),
    ).toHaveLength(2);
    expect(issues).toContainEqual({
      path: `networking.interfaces.nameservers.nameservers.${invalidCidr}`,
      code: "NET_NAMESERVER_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_NAMESERVER_INVALID,
      severity: "error",
    });
  });

  it("validates search domains with lenient hostname/FQDN rules", () => {
    const valid = createNetworkDraftId("domain");
    const invalid = createNetworkDraftId("domain");
    const entry = configuredInterface("domains", {
      searchDomains: [
        { id: valid, value: "lab.example", isExampleValue: false },
        { id: invalid, value: "no dots", isExampleValue: false },
      ],
    });

    const issues = validateNetworking(networkingConfig([entry]));
    expect(issues).toContainEqual({
      path: `networking.interfaces.domains.searchDomains.${invalid}`,
      code: "NET_DOMAIN_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_DOMAIN_INVALID,
      severity: "error",
    });
    expect(
      issues.some((issue) => issue.path.endsWith(`.${valid}`)),
    ).toBe(false);
  });

  describe("structural blockers (VALD-06)", () => {
    function defaultRoute(
      id: string,
      gateway = "192.0.2.1",
      metric = "",
    ) {
      return {
        id,
        kind: "default" as const,
        gateway,
        metric,
        exampleFields: [] as const,
      };
    }

    it("flags both members of a duplicate device name (case-insensitive)", () => {
      const ifaceA = configuredInterface("dup-a", { name: "eth0" });
      const ifaceB = configuredInterface("dup-b", { name: "ETH0" });
      const issues = validateNetworking(networkingConfig([ifaceA, ifaceB]));
      const dupIssues = issues.filter((issue) => issue.code === "NET_DUP_TARGET");
      expect(dupIssues).toHaveLength(2);
      expect(dupIssues).toContainEqual({
        path: "networking.interfaces.dup-a.name",
        code: "NET_DUP_TARGET",
        message: NETWORKING_VALIDATION_MESSAGES.NET_DUP_TARGET("device name"),
        severity: "error",
      });
      expect(dupIssues).toContainEqual({
        path: "networking.interfaces.dup-b.name",
        code: "NET_DUP_TARGET",
        message: NETWORKING_VALIDATION_MESSAGES.NET_DUP_TARGET("device name"),
        severity: "error",
      });
    });

    it("flags both members of a duplicate MAC address", () => {
      const mac = "52:54:00:12:34:56";
      const ifaceA = configuredInterface("mac-a", {
        identityMode: "mac",
        macAddress: mac,
      });
      const ifaceB = configuredInterface("mac-b", {
        identityMode: "mac",
        macAddress: mac.toUpperCase(),
      });
      const issues = validateNetworking(networkingConfig([ifaceA, ifaceB]));
      const dupIssues = issues.filter((issue) => issue.code === "NET_DUP_TARGET");
      expect(dupIssues).toHaveLength(2);
      expect(dupIssues[0]?.path).toMatch(/\.macAddress$/);
      expect(dupIssues[1]?.path).toMatch(/\.macAddress$/);
    });

    it("allows distinct interface targets", () => {
      const ifaceA = configuredInterface("distinct-a", { name: "eth0" });
      const ifaceB = configuredInterface("distinct-b", { name: "eth1" });
      const issues = validateNetworking(networkingConfig([ifaceA, ifaceB]));
      expect(issues.filter((issue) => issue.code === "NET_DUP_TARGET")).toEqual(
        [],
      );
    });

    it("flags same-interface duplicate addresses on both rows", () => {
      const rowA = createNetworkDraftId("addr");
      const rowB = createNetworkDraftId("addr");
      const entry = configuredInterface("same-iface-dup", {
        ipv4Addresses: [
          { id: rowA, value: "192.0.2.10/24", isExampleValue: false },
          { id: rowB, value: "192.0.2.10/24", isExampleValue: false },
        ],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      const dupIssues = issues.filter(
        (issue) => issue.code === "NET_DUP_ADDRESS_SAME_INTERFACE",
      );
      expect(dupIssues).toHaveLength(2);
    });

    it("flags cross-interface duplicate addresses on both interfaces", () => {
      const rowA = createNetworkDraftId("addr");
      const rowB = createNetworkDraftId("addr");
      const ifaceA = configuredInterface("cross-a", {
        ipv4Addresses: [
          { id: rowA, value: "192.0.2.10/24", isExampleValue: false },
        ],
      });
      const ifaceB = configuredInterface("cross-b", {
        ipv4Addresses: [
          { id: rowB, value: "192.0.2.10/24", isExampleValue: false },
        ],
      });
      const issues = validateNetworking(networkingConfig([ifaceA, ifaceB]));
      const dupIssues = issues.filter(
        (issue) => issue.code === "NET_DUP_ADDRESS_CROSS_INTERFACE",
      );
      expect(dupIssues).toHaveLength(2);
    });

    it("detects IPv6 semantic duplicate addresses after canonicalization", () => {
      const rowA = createNetworkDraftId("addr");
      const rowB = createNetworkDraftId("addr");
      const ifaceA = configuredInterface("ipv6-a", {
        ipv6Addresses: [
          { id: rowA, value: "2001:db8::1/64", isExampleValue: false },
        ],
      });
      const ifaceB = configuredInterface("ipv6-b", {
        ipv6Addresses: [
          { id: rowB, value: "2001:0db8:0000::1/64", isExampleValue: false },
        ],
      });
      const issues = validateNetworking(networkingConfig([ifaceA, ifaceB]));
      expect(
        issues.filter((issue) => issue.code === "NET_DUP_ADDRESS_CROSS_INTERFACE"),
      ).toHaveLength(2);
    });

    it("skips malformed and blank address rows for duplicate detection", () => {
      const rowA = createNetworkDraftId("addr");
      const rowB = createNetworkDraftId("addr");
      const entry = configuredInterface("skip-dup", {
        ipv4Addresses: [
          { id: rowA, value: "", isExampleValue: false },
          { id: rowB, value: "not-a-cidr", isExampleValue: false },
        ],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(
        issues.filter((issue) => issue.code.startsWith("NET_DUP_ADDRESS")),
      ).toEqual([]);
    });

    it("emits NET_ROUTE_FAMILY_MISMATCH for opposite-family valid gateway", () => {
      const routeId = createNetworkDraftId("route");
      const entry = configuredInterface("family-mismatch", {
        ipv4Routes: [
          {
            id: routeId,
            kind: "default",
            gateway: "2001:db8::1",
            metric: "",
            exampleFields: [],
          },
        ],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(issues).toContainEqual({
        path: `networking.interfaces.family-mismatch.ipv4Routes.${routeId}.gateway`,
        code: "NET_ROUTE_FAMILY_MISMATCH",
        message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_FAMILY_MISMATCH(
          "gateway",
          "IPv4",
        ),
        severity: "error",
      });
    });

    it("does not double-flag malformed routes with structural family codes", () => {
      const routeId = createNetworkDraftId("route");
      const entry = configuredInterface("malformed-route", {
        ipv4Routes: [
          {
            id: routeId,
            kind: "default",
            gateway: "not-an-ip",
            metric: "",
            exampleFields: [],
          },
        ],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(
        issues.filter(
          (issue) =>
            issue.code === "NET_ROUTE_FAMILY_MISMATCH" ||
            issue.code === "NET_ROUTE_UNREACHABLE_FAMILY",
        ),
      ).toEqual([]);
      expect(issues).toContainEqual(
        expect.objectContaining({ code: "NET_ROUTE_GATEWAY_INVALID" }),
      );
    });

    it("emits NET_ROUTE_UNREACHABLE_FAMILY when gateway is valid but family is unaddressed", () => {
      const routeId = createNetworkDraftId("route");
      const entry = configuredInterface("unreachable", {
        dhcp4: false,
        ipv4Routes: [defaultRoute(routeId, "192.0.2.1")],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(issues).toContainEqual({
        path: `networking.interfaces.unreachable.ipv4Routes.${routeId}.gateway`,
        code: "NET_ROUTE_UNREACHABLE_FAMILY",
        message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_UNREACHABLE_FAMILY("IPv4"),
        severity: "error",
      });
    });

    it("skips unreachable-family for blank gateway", () => {
      const routeId = createNetworkDraftId("route");
      const entry = configuredInterface("blank-gateway", {
        ipv4Routes: [defaultRoute(routeId, "")],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(
        issues.some((issue) => issue.code === "NET_ROUTE_UNREACHABLE_FAMILY"),
      ).toBe(false);
    });

    it("allows reachable default route when static same-family address exists", () => {
      const routeId = createNetworkDraftId("route");
      const addrId = createNetworkDraftId("addr");
      const entry = configuredInterface("reachable-static", {
        dhcp4: false,
        ipv4Addresses: [
          { id: addrId, value: "192.0.2.10/24", isExampleValue: false },
        ],
        ipv4Routes: [defaultRoute(routeId, "192.0.2.1")],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(
        issues.filter(
          (issue) =>
            issue.code === "NET_ROUTE_UNREACHABLE_FAMILY" ||
            issue.code.startsWith("NET_DEFAULT_ROUTE_CONFLICT"),
        ),
      ).toEqual([]);
    });

    it.each([
      ["100", "200", false],
      ["100", "100", true],
      ["100", "", true],
      ["", "", true],
    ] as const)(
      "default-route metric conflict metrics %j and %j → conflict=%s",
      (metricA, metricB, shouldConflict) => {
        const routeA = createNetworkDraftId("route");
        const routeB = createNetworkDraftId("route");
        const entry = configuredInterface("metric-conflict", {
          ipv4Routes: [
            defaultRoute(routeA, "192.0.2.1", metricA),
            defaultRoute(routeB, "192.0.2.2", metricB),
          ],
        });
        const issues = validateNetworking(networkingConfig([entry]));
        const conflictIssues = issues.filter((issue) =>
          issue.code.startsWith("NET_DEFAULT_ROUTE_CONFLICT"),
        );
        if (shouldConflict) {
          expect(conflictIssues).toHaveLength(2);
          expect(conflictIssues[0]?.code).toBe(
            "NET_DEFAULT_ROUTE_CONFLICT_SAME_INTERFACE",
          );
        } else {
          expect(conflictIssues).toEqual([]);
        }
      },
    );

    it("uses cross-interface code for conflicting defaults on different interfaces", () => {
      const routeA = createNetworkDraftId("route");
      const routeB = createNetworkDraftId("route");
      const ifaceA = configuredInterface("def-a", {
        ipv4Routes: [defaultRoute(routeA, "192.0.2.1", "100")],
      });
      const ifaceB = configuredInterface("def-b", {
        ipv4Routes: [defaultRoute(routeB, "192.0.2.2", "100")],
      });
      const issues = validateNetworking(networkingConfig([ifaceA, ifaceB]));
      const conflictIssues = issues.filter(
        (issue) => issue.code === "NET_DEFAULT_ROUTE_CONFLICT_CROSS_INTERFACE",
      );
      expect(conflictIssues).toHaveLength(2);
    });

    it("allows a single default route", () => {
      const routeId = createNetworkDraftId("route");
      const entry = configuredInterface("single-default", {
        ipv4Routes: [defaultRoute(routeId, "192.0.2.1", "100")],
      });
      const issues = validateNetworking(networkingConfig([entry]));
      expect(
        issues.filter((issue) => issue.code.startsWith("NET_DEFAULT_ROUTE_CONFLICT")),
      ).toEqual([]);
    });

    it("registers structural and cross-interface code sets", () => {
      const structural = [
        "NET_DUP_TARGET",
        "NET_DUP_ADDRESS_SAME_INTERFACE",
        "NET_DUP_ADDRESS_CROSS_INTERFACE",
        "NET_ROUTE_FAMILY_MISMATCH",
        "NET_ROUTE_UNREACHABLE_FAMILY",
        "NET_DEFAULT_ROUTE_CONFLICT_SAME_INTERFACE",
        "NET_DEFAULT_ROUTE_CONFLICT_CROSS_INTERFACE",
      ];
      for (const code of structural) {
        expect(NETWORKING_STRUCTURAL_CODES.has(code)).toBe(true);
        expect(isStructuralNetworkingCode(code)).toBe(true);
      }

      const cross = [
        "NET_DUP_TARGET",
        "NET_DUP_ADDRESS_CROSS_INTERFACE",
        "NET_DEFAULT_ROUTE_CONFLICT_CROSS_INTERFACE",
      ];
      for (const code of cross) {
        expect(NETWORKING_CROSS_INTERFACE_CODES.has(code)).toBe(true);
        expect(isCrossInterfaceNetworkingCode(code)).toBe(true);
      }

      expect(isCrossInterfaceNetworkingCode("NET_DUP_ADDRESS_SAME_INTERFACE")).toBe(
        false,
      );
    });
  });
});

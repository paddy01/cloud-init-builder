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
});

import {
  isSemanticallyBlankNetworkInterface,
  isCompleteMac,
  type BuilderNetworkInterface,
  type BuilderRoute,
  type BuilderValueRow,
  type NetworkingConfig,
} from "../models/networking.ts";
import { isValidFqdn, isValidHostname } from "./hostname.ts";
import {
  isCidrv4,
  isCidrv6,
  isIpv4,
  isIpv6,
  isPositiveIntegerMetric,
} from "./networkAddress.ts";
import type { ValidationIssue } from "./validateConfig.ts";

const DEVICE_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\-_.@]{0,14}$/;
const MTU_TYPICAL_MIN = 1280;
const MTU_TYPICAL_MAX = 9000;

export const NETWORKING_VALIDATION_MESSAGES = {
  NET_MTU_INVALID: "Enter a positive whole number, e.g. 1500.",
  NET_MTU_OUT_OF_RANGE: (value: number) =>
    `MTU ${value} is unusual. Typical values are 1280–9000, but this is allowed.`,
  NET_NAME_INVALID:
    "Enter a valid interface name (letters, digits, and “-_.@”, 1–15 characters).",
  NET_MAC_INVALID: "Enter a complete MAC address, e.g. 52:54:00:12:34:56.",
  NET_SELECTOR_REQUIRED_NAME: "Enter a device name.",
  NET_SELECTOR_REQUIRED_MAC: "Enter a MAC address.",
  NET_ADDRESS_REQUIRED: "Enter a CIDR address.",
  NET_ADDRESS_CIDR_INVALID: (family: "IPv4" | "IPv6") =>
    family === "IPv4"
      ? "Enter an address in CIDR form, e.g. 192.0.2.10/24."
      : "Enter an address in CIDR form, e.g. 2001:db8::10/64.",
  NET_ADDRESS_FAMILY_MISMATCH: (family: "IPv4" | "IPv6") =>
    `Use an ${family} address in the ${family} list.`,
  NET_ROUTE_DEST_REQUIRED: "Enter a destination in CIDR form.",
  NET_ROUTE_DEST_INVALID: (family: "IPv4" | "IPv6") =>
    family === "IPv4"
      ? "Enter a destination in CIDR form, e.g. 198.51.100.0/24."
      : "Enter a destination in CIDR form, e.g. 2001:db8:1::/64.",
  NET_ROUTE_GATEWAY_REQUIRED: "Enter a gateway address.",
  NET_ROUTE_GATEWAY_INVALID: (family: "IPv4" | "IPv6") =>
    family === "IPv4"
      ? "Enter a valid IPv4 gateway address, e.g. 192.0.2.1."
      : "Enter a valid IPv6 gateway address, e.g. 2001:db8::1.",
  NET_ROUTE_METRIC_INVALID: "Enter a positive whole number.",
  NET_NAMESERVER_INVALID:
    "Enter a valid nameserver address, e.g. 192.0.2.53 or 2001:db8::53.",
  NET_DOMAIN_INVALID: "Enter a valid search domain, e.g. example.com.",
  NET_DUP_TARGET: (targetKind: "device name" | "MAC address") =>
    `Duplicate interface target. Another interface already uses this ${targetKind}.`,
  NET_DUP_ADDRESS_SAME_INTERFACE: (cidr: string) =>
    `Duplicate address. ${cidr} is already used on this interface.`,
  NET_DUP_ADDRESS_CROSS_INTERFACE: (cidr: string) =>
    `Duplicate address. ${cidr} is already used by another interface.`,
  NET_ROUTE_FAMILY_MISMATCH: (
    field: "gateway" | "destination",
    family: "IPv4" | "IPv6",
  ) =>
    `This route's ${field} is not ${family} to match its list.`,
  NET_ROUTE_UNREACHABLE_FAMILY: (family: "IPv4" | "IPv6") =>
    `Add ${family} addressing (a static address or DHCP) so this gateway is reachable.`,
  NET_DEFAULT_ROUTE_CONFLICT: (family: "IPv4" | "IPv6") =>
    `Multiple ${family} default routes conflict. Give each a distinct positive metric, or keep only one.`,
} as const;

export function networkFieldPath(interfaceId: string, field: string): string {
  return `networking.interfaces.${interfaceId}.${field}`;
}

function addressRowPath(
  interfaceId: string,
  family: "ipv4" | "ipv6",
  rowId: string,
): string {
  return `networking.interfaces.${interfaceId}.${family}Addresses.${rowId}`;
}

function routeFieldPath(
  interfaceId: string,
  family: "ipv4" | "ipv6",
  routeId: string,
  field: "destination" | "gateway" | "metric",
): string {
  return `networking.interfaces.${interfaceId}.${family}Routes.${routeId}.${field}`;
}

function familyLabel(family: "ipv4" | "ipv6"): "IPv4" | "IPv6" {
  return family === "ipv4" ? "IPv4" : "IPv6";
}

type IpFamily = "ipv4" | "ipv6";

interface TargetRef {
  interfaceId: string;
  field: "name" | "macAddress";
}

interface AddressRef {
  interfaceId: string;
  family: IpFamily;
  rowId: string;
  canonicalCidr: string;
  displayCidr: string;
}

interface DefaultRouteRef {
  interfaceId: string;
  family: IpFamily;
  routeId: string;
  metric: string;
}

function groupBy<T>(
  items: readonly T[],
  keyFn: (item: T) => string | null,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      continue;
    }
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

function classifyIp(value: string): IpFamily | "malformed" {
  const trimmed = value.trim();
  if (trimmed === "") {
    return "malformed";
  }
  if (isIpv4(trimmed)) {
    return "ipv4";
  }
  if (isIpv6(trimmed)) {
    return "ipv6";
  }
  return "malformed";
}

function canonicalizeCidr(
  value: string,
  family: IpFamily,
): { canonical: string; display: string } | null {
  const trimmed = value.trim();
  const slashIndex = trimmed.lastIndexOf("/");
  if (slashIndex === -1) {
    return null;
  }

  const addr = trimmed.slice(0, slashIndex);
  const prefix = trimmed.slice(slashIndex + 1);
  const validForFamily =
    family === "ipv4" ? isCidrv4(trimmed) : isCidrv6(trimmed);
  if (!validForFamily) {
    return null;
  }

  if (family === "ipv4") {
    return { canonical: trimmed, display: trimmed };
  }

  try {
    const hostname = new URL(`http://[${addr}]`).hostname;
    const canonical = `${hostname}/${prefix}`;
    return { canonical, display: trimmed };
  } catch {
    return null;
  }
}

function hasSameFamilyAddressing(
  entry: BuilderNetworkInterface,
  family: IpFamily,
): boolean {
  const dhcpEnabled = family === "ipv4" ? entry.dhcp4 : entry.dhcp6;
  if (dhcpEnabled) {
    return true;
  }

  const rows = family === "ipv4" ? entry.ipv4Addresses : entry.ipv6Addresses;
  return rows.some((row) => canonicalizeCidr(row.value, family) !== null);
}

function buildDuplicateTargetRefs(
  interfaces: BuilderNetworkInterface[],
): TargetRef[] {
  const refs: TargetRef[] = [];

  for (const entry of interfaces) {
    if (isSemanticallyBlankNetworkInterface(entry)) {
      continue;
    }

    if (entry.identityMode === "name") {
      const name = entry.name.trim();
      if (name !== "") {
        refs.push({ interfaceId: entry.id, field: "name" });
      }
      continue;
    }

    const mac = entry.macAddress.trim();
    if (mac !== "") {
      refs.push({ interfaceId: entry.id, field: "macAddress" });
    }
  }

  return refs;
}

function validateDuplicateTargets(
  interfaces: BuilderNetworkInterface[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const refs = buildDuplicateTargetRefs(interfaces);
  const groups = groupBy(refs, (ref) => {
    const entry = interfaces.find((iface) => iface.id === ref.interfaceId);
    if (!entry) {
      return null;
    }
    if (ref.field === "name") {
      return `name:${entry.name.trim().toLowerCase()}`;
    }
    return `mac:${entry.macAddress.trim().toLowerCase()}`;
  });

  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    const targetKind =
      group[0]?.field === "macAddress" ? "MAC address" : "device name";
    for (const ref of group) {
      issues.push({
        path: networkFieldPath(ref.interfaceId, ref.field),
        code: "NET_DUP_TARGET",
        message: NETWORKING_VALIDATION_MESSAGES.NET_DUP_TARGET(targetKind),
        severity: "error",
      });
    }
  }

  return issues;
}

function buildAddressRefs(
  interfaces: BuilderNetworkInterface[],
): AddressRef[] {
  const refs: AddressRef[] = [];

  for (const entry of interfaces) {
    if (isSemanticallyBlankNetworkInterface(entry)) {
      continue;
    }

    for (const family of ["ipv4", "ipv6"] as const) {
      const rows = family === "ipv4" ? entry.ipv4Addresses : entry.ipv6Addresses;
      for (const row of rows) {
        const canonical = canonicalizeCidr(row.value, family);
        if (!canonical) {
          continue;
        }
        refs.push({
          interfaceId: entry.id,
          family,
          rowId: row.id,
          canonicalCidr: canonical.canonical,
          displayCidr: canonical.display,
        });
      }
    }
  }

  return refs;
}

function validateDuplicateAddresses(
  interfaces: BuilderNetworkInterface[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const refs = buildAddressRefs(interfaces);
  const groups = groupBy(refs, (ref) => `${ref.family}:${ref.canonicalCidr}`);

  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    const interfaceIds = new Set(group.map((ref) => ref.interfaceId));
    const code =
      interfaceIds.size === 1
        ? "NET_DUP_ADDRESS_SAME_INTERFACE"
        : "NET_DUP_ADDRESS_CROSS_INTERFACE";

    for (const ref of group) {
      const message =
        code === "NET_DUP_ADDRESS_SAME_INTERFACE"
          ? NETWORKING_VALIDATION_MESSAGES.NET_DUP_ADDRESS_SAME_INTERFACE(
              ref.displayCidr,
            )
          : NETWORKING_VALIDATION_MESSAGES.NET_DUP_ADDRESS_CROSS_INTERFACE(
              ref.displayCidr,
            );

      issues.push({
        path: addressRowPath(ref.interfaceId, ref.family, ref.rowId),
        code,
        message,
        severity: "error",
      });
    }
  }

  return issues;
}

function pushRouteFieldStructuralIssues(
  entry: BuilderNetworkInterface,
  family: IpFamily,
  route: BuilderRoute,
  field: "gateway" | "destination",
  value: string,
  issues: ValidationIssue[],
): void {
  const trimmed = value.trim();
  if (trimmed === "") {
    return;
  }

  const classification = classifyIp(trimmed);
  const label = familyLabel(family);
  const path = routeFieldPath(entry.id, family, route.id, field);

  if (classification === "malformed") {
    return;
  }

  if (classification !== family) {
    issues.push({
      path,
      code: "NET_ROUTE_FAMILY_MISMATCH",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_FAMILY_MISMATCH(
        field,
        label,
      ),
      severity: "error",
    });
    return;
  }

  if (!hasSameFamilyAddressing(entry, family)) {
    issues.push({
      path,
      code: "NET_ROUTE_UNREACHABLE_FAMILY",
      message:
        NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_UNREACHABLE_FAMILY(label),
      severity: "error",
    });
  }
}

function validateRouteStructuralIssues(
  interfaces: BuilderNetworkInterface[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const entry of interfaces) {
    if (isSemanticallyBlankNetworkInterface(entry)) {
      continue;
    }

    for (const family of ["ipv4", "ipv6"] as const) {
      const routes = family === "ipv4" ? entry.ipv4Routes : entry.ipv6Routes;
      for (const route of routes) {
        if (route.kind === "default") {
          pushRouteFieldStructuralIssues(
            entry,
            family,
            route,
            "gateway",
            route.gateway,
            issues,
          );
          continue;
        }

        pushRouteFieldStructuralIssues(
          entry,
          family,
          route,
          "destination",
          route.destination,
          issues,
        );
        pushRouteFieldStructuralIssues(
          entry,
          family,
          route,
          "gateway",
          route.gateway,
          issues,
        );
      }
    }
  }

  return issues;
}

function buildDefaultRouteRefs(
  interfaces: BuilderNetworkInterface[],
): DefaultRouteRef[] {
  const refs: DefaultRouteRef[] = [];

  for (const entry of interfaces) {
    if (isSemanticallyBlankNetworkInterface(entry)) {
      continue;
    }

    for (const family of ["ipv4", "ipv6"] as const) {
      const routes = family === "ipv4" ? entry.ipv4Routes : entry.ipv6Routes;
      for (const route of routes) {
        if (route.kind !== "default") {
          continue;
        }
        refs.push({
          interfaceId: entry.id,
          family,
          routeId: route.id,
          metric: route.metric.trim(),
        });
      }
    }
  }

  return refs;
}

function defaultRoutesConflict(routes: DefaultRouteRef[]): boolean {
  if (routes.length <= 1) {
    return false;
  }

  const metrics = routes.map((route) => route.metric);
  const positiveMetrics = metrics.filter((metric) =>
    isPositiveIntegerMetric(metric),
  );

  if (positiveMetrics.length < routes.length) {
    return true;
  }

  return new Set(positiveMetrics).size < positiveMetrics.length;
}

function validateConflictingDefaultRoutes(
  interfaces: BuilderNetworkInterface[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const refs = buildDefaultRouteRefs(interfaces);
  const groups = groupBy(refs, (ref) => ref.family);

  for (const [family, group] of groups) {
    if (!defaultRoutesConflict(group)) {
      continue;
    }

    const interfaceIds = new Set(group.map((ref) => ref.interfaceId));
    const code =
      interfaceIds.size === 1
        ? "NET_DEFAULT_ROUTE_CONFLICT_SAME_INTERFACE"
        : "NET_DEFAULT_ROUTE_CONFLICT_CROSS_INTERFACE";
    const label = familyLabel(family);
    const message =
      NETWORKING_VALIDATION_MESSAGES.NET_DEFAULT_ROUTE_CONFLICT(label);

    for (const ref of group) {
      issues.push({
        path: routeFieldPath(ref.interfaceId, ref.family, ref.routeId, "metric"),
        code,
        message,
        severity: "error",
      });
    }
  }

  return issues;
}

function validateStructuralNetworking(
  interfaces: BuilderNetworkInterface[],
): ValidationIssue[] {
  return [
    ...validateDuplicateTargets(interfaces),
    ...validateDuplicateAddresses(interfaces),
    ...validateRouteStructuralIssues(interfaces),
    ...validateConflictingDefaultRoutes(interfaces),
  ];
}

function validateActiveSelector(
  entry: BuilderNetworkInterface,
): ValidationIssue[] {
  if (isSemanticallyBlankNetworkInterface(entry)) {
    return [];
  }

  if (entry.identityMode === "name" && entry.name.trim() === "") {
    return [
      {
        path: networkFieldPath(entry.id, "name"),
        code: "NET_SELECTOR_REQUIRED",
        message: NETWORKING_VALIDATION_MESSAGES.NET_SELECTOR_REQUIRED_NAME,
        severity: "error",
      },
    ];
  }

  if (entry.identityMode === "mac" && entry.macAddress.trim() === "") {
    return [
      {
        path: networkFieldPath(entry.id, "macAddress"),
        code: "NET_SELECTOR_REQUIRED",
        message: NETWORKING_VALIDATION_MESSAGES.NET_SELECTOR_REQUIRED_MAC,
        severity: "error",
      },
    ];
  }

  return [];
}

function validateDeviceName(entry: BuilderNetworkInterface): ValidationIssue[] {
  if (entry.identityMode !== "name") {
    return [];
  }

  const name = entry.name.trim();
  if (name === "") {
    return [];
  }

  if (DEVICE_NAME_REGEX.test(name)) {
    return [];
  }

  return [
    {
      path: networkFieldPath(entry.id, "name"),
      code: "NET_NAME_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_NAME_INVALID,
      severity: "error",
    },
  ];
}

function validateMacAddress(entry: BuilderNetworkInterface): ValidationIssue[] {
  if (entry.identityMode !== "mac") {
    return [];
  }

  const mac = entry.macAddress.trim();
  if (mac === "") {
    return [];
  }

  if (isCompleteMac(mac)) {
    return [];
  }

  return [
    {
      path: networkFieldPath(entry.id, "macAddress"),
      code: "NET_MAC_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_MAC_INVALID,
      severity: "error",
    },
  ];
}

function validateAddressRows(
  interfaceId: string,
  family: "ipv4" | "ipv6",
  rows: BuilderValueRow[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const label = familyLabel(family);

  for (const row of rows) {
    const path = addressRowPath(interfaceId, family, row.id);
    const value = row.value.trim();

    if (value === "") {
      issues.push({
        path,
        code: "NET_ADDRESS_REQUIRED",
        message: NETWORKING_VALIDATION_MESSAGES.NET_ADDRESS_REQUIRED,
        severity: "error",
      });
      continue;
    }

    const validForFamily =
      family === "ipv4" ? isCidrv4(value) : isCidrv6(value);
    if (validForFamily) {
      continue;
    }

    const otherFamilyValid =
      family === "ipv4" ? isCidrv6(value) : isCidrv4(value);
    if (otherFamilyValid) {
      issues.push({
        path,
        code: "NET_ADDRESS_FAMILY_MISMATCH",
        message:
          NETWORKING_VALIDATION_MESSAGES.NET_ADDRESS_FAMILY_MISMATCH(label),
        severity: "error",
      });
      continue;
    }

    issues.push({
      path,
      code: "NET_ADDRESS_CIDR_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ADDRESS_CIDR_INVALID(label),
      severity: "error",
    });
  }

  return issues;
}

function validateRoute(
  interfaceId: string,
  family: "ipv4" | "ipv6",
  route: BuilderRoute,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const label = familyLabel(family);

  if (route.kind === "specific") {
    const destPath = routeFieldPath(interfaceId, family, route.id, "destination");
    const destination = route.destination.trim();
    if (destination === "") {
      issues.push({
        path: destPath,
        code: "NET_ROUTE_DEST_REQUIRED",
        message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_DEST_REQUIRED,
        severity: "error",
      });
    } else {
      const validDest =
        family === "ipv4" ? isCidrv4(destination) : isCidrv6(destination);
      if (!validDest) {
        issues.push({
          path: destPath,
          code: "NET_ROUTE_DEST_INVALID",
          message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_DEST_INVALID(label),
          severity: "error",
        });
      }
    }
  }

  const gatewayPath = routeFieldPath(interfaceId, family, route.id, "gateway");
  const gateway = route.gateway.trim();
  if (route.kind === "default" && gateway === "") {
    issues.push({
      path: gatewayPath,
      code: "NET_ROUTE_GATEWAY_REQUIRED",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_GATEWAY_REQUIRED,
      severity: "error",
    });
  } else if (gateway !== "") {
    const validGateway = family === "ipv4" ? isIpv4(gateway) : isIpv6(gateway);
    if (!validGateway) {
      issues.push({
        path: gatewayPath,
        code: "NET_ROUTE_GATEWAY_INVALID",
        message:
          NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_GATEWAY_INVALID(label),
        severity: "error",
      });
    }
  }

  const metricPath = routeFieldPath(interfaceId, family, route.id, "metric");
  const metric = route.metric.trim();
  if (metric !== "" && !isPositiveIntegerMetric(metric)) {
    issues.push({
      path: metricPath,
      code: "NET_ROUTE_METRIC_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_ROUTE_METRIC_INVALID,
      severity: "error",
    });
  }

  return issues;
}

function validateNameserverRows(
  interfaceId: string,
  rows: BuilderValueRow[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const row of rows) {
    const value = row.value.trim();
    if (value === "") {
      continue;
    }

    if (isIpv4(value) || isIpv6(value)) {
      continue;
    }

    issues.push({
      path: `networking.interfaces.${interfaceId}.nameservers.${row.id}`,
      code: "NET_NAMESERVER_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_NAMESERVER_INVALID,
      severity: "error",
    });
  }

  return issues;
}

function validateSearchDomainRows(
  interfaceId: string,
  rows: BuilderValueRow[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const row of rows) {
    const value = row.value.trim();
    if (value === "") {
      continue;
    }

    if (isValidFqdn(value) || isValidHostname(value)) {
      continue;
    }

    issues.push({
      path: `networking.interfaces.${interfaceId}.searchDomains.${row.id}`,
      code: "NET_DOMAIN_INVALID",
      message: NETWORKING_VALIDATION_MESSAGES.NET_DOMAIN_INVALID,
      severity: "error",
    });
  }

  return issues;
}

function validateInterfaceMtu(entry: BuilderNetworkInterface): ValidationIssue[] {
  if (!entry.mtuEnabled) {
    return [];
  }

  if (!isPositiveIntegerMetric(entry.mtu)) {
    return [
      {
        path: networkFieldPath(entry.id, "mtu"),
        code: "NET_MTU_INVALID",
        message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_INVALID,
        severity: "error",
      },
    ];
  }

  const mtuValue = Number(entry.mtu.trim());
  if (mtuValue < MTU_TYPICAL_MIN || mtuValue > MTU_TYPICAL_MAX) {
    return [
      {
        path: networkFieldPath(entry.id, "mtu"),
        code: "NET_MTU_OUT_OF_RANGE",
        message: NETWORKING_VALIDATION_MESSAGES.NET_MTU_OUT_OF_RANGE(mtuValue),
        severity: "warning",
      },
    ];
  }

  return [];
}

function validateSingleInterface(
  entry: BuilderNetworkInterface,
): ValidationIssue[] {
  if (isSemanticallyBlankNetworkInterface(entry)) {
    return [];
  }

  const issues: ValidationIssue[] = [
    ...validateActiveSelector(entry),
    ...validateDeviceName(entry),
    ...validateMacAddress(entry),
    ...validateAddressRows(entry.id, "ipv4", entry.ipv4Addresses),
    ...validateAddressRows(entry.id, "ipv6", entry.ipv6Addresses),
    ...entry.ipv4Routes.flatMap((route) =>
      validateRoute(entry.id, "ipv4", route),
    ),
    ...entry.ipv6Routes.flatMap((route) =>
      validateRoute(entry.id, "ipv6", route),
    ),
    ...validateNameserverRows(entry.id, entry.nameservers),
    ...validateSearchDomainRows(entry.id, entry.searchDomains),
    ...validateInterfaceMtu(entry),
  ];

  return issues;
}

export function validateNetworking(
  networking: NetworkingConfig | undefined,
): ValidationIssue[] {
  if (!networking) {
    return [];
  }

  const issues: ValidationIssue[] = [];
  for (const entry of networking.interfaces) {
    issues.push(...validateSingleInterface(entry));
  }
  issues.push(...validateStructuralNetworking(networking.interfaces));
  return issues;
}

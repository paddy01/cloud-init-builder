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
  return issues;
}

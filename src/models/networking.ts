import { z } from "zod";
import {
  RISK_CODE_SET,
  riskCodeSchema,
  type RiskCode,
} from "./networkingCodes.ts";

export const networkIdentityModeSchema = z.enum(["name", "mac"]);

export const builderValueRowSchema = z.object({
  id: z.string(),
  value: z.string(),
  isExampleValue: z.boolean(),
});

const routeExampleFieldSchema = z.enum(["destination", "gateway", "metric"]);
const routeBaseShape = {
  id: z.string(),
  gateway: z.string(),
  metric: z.string(),
  exampleFields: z.array(routeExampleFieldSchema),
};

export const builderDefaultRouteSchema = z.object({
  ...routeBaseShape,
  kind: z.literal("default"),
});

export const builderSpecificRouteSchema = z.object({
  ...routeBaseShape,
  kind: z.literal("specific"),
  destination: z.string(),
});

export const builderRouteSchema = z.discriminatedUnion("kind", [
  builderDefaultRouteSchema,
  builderSpecificRouteSchema,
]);

export const networkInterfaceExampleFieldSchema = z.enum([
  "name",
  "macAddress",
  "dhcp4",
  "dhcp6",
  "mtu",
]);

const COMPLETE_MAC_ADDRESS = /^(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;

export function isCompleteMac(value: string): boolean {
  return COMPLETE_MAC_ADDRESS.test(value);
}

export function normalizeMacAddressDraft(value: string): string {
  return COMPLETE_MAC_ADDRESS.test(value) ? value.toLowerCase() : value;
}

export const builderNetworkInterfaceSchema = z.object({
  id: z.string(),
  identityMode: networkIdentityModeSchema,
  name: z.string(),
  macAddress: z.string().transform(normalizeMacAddressDraft),
  dhcp4: z.boolean(),
  dhcp6: z.boolean(),
  ipv4Addresses: z.array(builderValueRowSchema),
  ipv6Addresses: z.array(builderValueRowSchema),
  ipv4Routes: z.array(builderRouteSchema),
  ipv6Routes: z.array(builderRouteSchema),
  nameservers: z.array(builderValueRowSchema),
  searchDomains: z.array(builderValueRowSchema),
  mtuEnabled: z.boolean(),
  mtu: z.string(),
  exampleFields: z.array(networkInterfaceExampleFieldSchema),
  acknowledgedRiskWarnings: z.array(riskCodeSchema).default([]),
});

export const networkingConfigSchema = z.object({
  interfaces: z.array(builderNetworkInterfaceSchema),
});

export type NetworkIdentityMode = z.infer<typeof networkIdentityModeSchema>;
export type BuilderValueRow = z.infer<typeof builderValueRowSchema>;
export type BuilderDefaultRoute = z.infer<typeof builderDefaultRouteSchema>;
export type BuilderSpecificRoute = z.infer<typeof builderSpecificRouteSchema>;
export type BuilderRoute = z.infer<typeof builderRouteSchema>;
export type NetworkInterfaceExampleField = z.infer<
  typeof networkInterfaceExampleFieldSchema
>;
export type BuilderNetworkInterface = z.infer<
  typeof builderNetworkInterfaceSchema
>;
export type { RiskCode };
export type NetworkingConfig = z.infer<typeof networkingConfigSchema>;

export function isNetworkingConfig(value: unknown): value is NetworkingConfig {
  return networkingConfigSchema.safeParse(value).success;
}

export const DEFAULT_NETWORKING_CONFIG: NetworkingConfig = {
  interfaces: [],
};

let fallbackIdCounter = 0;

function createOpaqueId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  fallbackIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createNetworkInterfaceId(): string {
  return createOpaqueId("network-interface");
}

export function createNetworkDraftId(prefix = "network-field"): string {
  return createOpaqueId(prefix);
}

export function allocateUniqueNetworkDraftId(
  usedIds: Set<string>,
  prefix = "network-field",
): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = createNetworkDraftId(prefix);
    if (SAFE_INTERFACE_ID.test(candidate) && !usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
  }

  let suffix = usedIds.size + 1;
  let candidate = `${prefix}-${suffix}`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${prefix}-${suffix}`;
  }
  usedIds.add(candidate);
  return candidate;
}

export function createBuilderValueRow(
  id = createNetworkDraftId("network-value"),
  value = "",
  isExampleValue = false,
): BuilderValueRow {
  return { id, value, isExampleValue };
}

export function createDefaultRoute(
  id = createNetworkDraftId("network-route"),
  gateway = "",
  metric = "",
  isExampleValue = false,
): BuilderDefaultRoute {
  return {
    id,
    kind: "default",
    gateway,
    metric,
    exampleFields: isExampleValue
      ? [
          ...(gateway === "" ? [] : (["gateway"] as const)),
          ...(metric === "" ? [] : (["metric"] as const)),
        ]
      : [],
  };
}

export function createSpecificRoute(
  id = createNetworkDraftId("network-route"),
  destination = "",
  gateway = "",
  metric = "",
  isExampleValue = false,
): BuilderSpecificRoute {
  return {
    id,
    kind: "specific",
    destination,
    gateway,
    metric,
    exampleFields: isExampleValue
      ? [
          ...(destination === "" ? [] : (["destination"] as const)),
          ...(gateway === "" ? [] : (["gateway"] as const)),
          ...(metric === "" ? [] : (["metric"] as const)),
        ]
      : [],
  };
}

export function createBlankNetworkInterface(
  id = createNetworkInterfaceId(),
): BuilderNetworkInterface {
  return {
    id,
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
  };
}

export function createIpv4DhcpExample(
  id = createNetworkInterfaceId(),
): BuilderNetworkInterface {
  return {
    ...createBlankNetworkInterface(id),
    name: "ens18",
    dhcp4: true,
    exampleFields: ["name", "dhcp4"],
  };
}

export interface StaticIpv4ExampleIds {
  address: string;
  route: string;
  nameserver: string;
  searchDomain: string;
}

export function createStaticIpv4Example(
  id = createNetworkInterfaceId(),
  ids: StaticIpv4ExampleIds = {
    address: createNetworkDraftId("network-address"),
    route: createNetworkDraftId("network-route"),
    nameserver: createNetworkDraftId("network-nameserver"),
    searchDomain: createNetworkDraftId("network-search-domain"),
  },
): BuilderNetworkInterface {
  return {
    ...createBlankNetworkInterface(id),
    name: "ens18",
    ipv4Addresses: [
      createBuilderValueRow(ids.address, "192.0.2.10/24", true),
    ],
    ipv4Routes: [
      createDefaultRoute(ids.route, "192.0.2.1", "", true),
    ],
    nameservers: [
      createBuilderValueRow(ids.nameserver, "192.0.2.53", true),
    ],
    searchDomains: [
      createBuilderValueRow(ids.searchDomain, "lab.example", true),
    ],
    exampleFields: ["name"],
  };
}

export function createDualStackDhcpExample(
  id = createNetworkInterfaceId(),
): BuilderNetworkInterface {
  return {
    ...createBlankNetworkInterface(id),
    name: "ens18",
    dhcp4: true,
    dhcp6: true,
    exampleFields: ["name", "dhcp4", "dhcp6"],
  };
}

export function isSemanticallyBlankNetworkInterface(
  entry: BuilderNetworkInterface,
): boolean {
  return (
    entry.name.trim() === "" &&
    entry.macAddress.trim() === "" &&
    !entry.dhcp4 &&
    !entry.dhcp6 &&
    entry.ipv4Addresses.length === 0 &&
    entry.ipv6Addresses.length === 0 &&
    entry.ipv4Routes.length === 0 &&
    entry.ipv6Routes.length === 0 &&
    entry.nameservers.length === 0 &&
    entry.searchDomains.length === 0 &&
    !entry.mtuEnabled &&
    entry.mtu.trim() === ""
  );
}

export interface NetworkingImportWarning {
  path: string;
  message: string;
}

export interface NetworkingNormalizationResult {
  networking: NetworkingConfig;
  warnings: NetworkingImportWarning[];
}

const NETWORKING_KEYS = new Set(["interfaces"]);
const INTERFACE_KEYS = new Set([
  "id",
  "identityMode",
  "name",
  "macAddress",
  "dhcp4",
  "dhcp6",
  "ipv4Addresses",
  "ipv6Addresses",
  "ipv4Routes",
  "ipv6Routes",
  "nameservers",
  "searchDomains",
  "mtuEnabled",
  "mtu",
  "exampleFields",
  "acknowledgedRiskWarnings",
]);
const VALUE_ROW_KEYS = new Set(["id", "value", "isExampleValue"]);
const ROUTE_KEYS = new Set([
  "id",
  "kind",
  "destination",
  "gateway",
  "metric",
  "exampleFields",
]);
const SAFE_INTERFACE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addUnknownKeyWarnings(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  pathPrefix: string,
  warnings: NetworkingImportWarning[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      warnings.push({
        path: `${pathPrefix}.${key}`,
        message: "Unsupported networking field was omitted during import.",
      });
    }
  }
}

function dedupeWarnings(
  warnings: NetworkingImportWarning[],
): NetworkingImportWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.path}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function allocateUniqueInterfaceId(usedIds: Set<string>): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = createNetworkInterfaceId();
    if (SAFE_INTERFACE_ID.test(candidate) && !usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
  }

  let suffix = usedIds.size + 1;
  let candidate = `network-interface-${suffix}`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `network-interface-${suffix}`;
  }
  usedIds.add(candidate);
  return candidate;
}

function preserveOrRepairId(
  rawId: unknown,
  usedIds: Set<string>,
): string {
  if (
    typeof rawId === "string" &&
    SAFE_INTERFACE_ID.test(rawId) &&
    !usedIds.has(rawId)
  ) {
    usedIds.add(rawId);
    return rawId;
  }

  return allocateUniqueInterfaceId(usedIds);
}

function preserveOrRepairDraftId(
  rawId: unknown,
  usedIds: Set<string>,
  prefix: string,
): string {
  if (
    typeof rawId === "string" &&
    SAFE_INTERFACE_ID.test(rawId) &&
    !usedIds.has(rawId)
  ) {
    usedIds.add(rawId);
    return rawId;
  }

  return allocateUniqueNetworkDraftId(usedIds, prefix);
}

function warning(
  warnings: NetworkingImportWarning[],
  path: string,
  message: string,
): void {
  warnings.push({ path, message });
}

function normalizeBooleanDraft(
  value: unknown,
  fallback: boolean,
  path: string,
  warnings: NetworkingImportWarning[],
): boolean {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  warning(warnings, path, "Invalid networking boolean was reset during import.");
  return fallback;
}

function normalizeStringDraft(
  value: unknown,
  fallback: string,
  path: string,
  warnings: NetworkingImportWarning[],
): string {
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;
  warning(warnings, path, "Invalid networking draft was cleared during import.");
  return fallback;
}

function normalizeRiskWarningAcknowledgements(
  value: unknown,
  path: string,
  warnings: NetworkingImportWarning[],
): RiskCode[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    warning(
      warnings,
      path,
      "Invalid risk-warning acknowledgement list was cleared during import.",
    );
    return [];
  }

  const normalized: RiskCode[] = [];
  const seen = new Set<string>();
  value.forEach((code, index) => {
    if (typeof code !== "string" || !RISK_CODE_SET.has(code)) {
      warning(
        warnings,
        `${path}.${index}`,
        "Unsupported risk-warning acknowledgement was omitted during import.",
      );
      return;
    }
    if (!seen.has(code)) {
      seen.add(code);
      normalized.push(code as RiskCode);
    }
  });
  return normalized;
}

function normalizeExampleFields<T extends string>(
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
  warnings: NetworkingImportWarning[],
): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    warning(warnings, path, "Invalid example provenance was cleared during import.");
    return [];
  }

  const normalized: T[] = [];
  const seen = new Set<string>();
  value.forEach((field, index) => {
    if (typeof field !== "string" || !allowed.has(field)) {
      warning(
        warnings,
        `${path}.${index}`,
        "Unsupported example provenance field was omitted during import.",
      );
      return;
    }
    if (!seen.has(field)) {
      seen.add(field);
      normalized.push(field as T);
    }
  });
  return normalized;
}

function normalizeValueRows(
  value: unknown,
  path: string,
  idPrefix: string,
  warnings: NetworkingImportWarning[],
): BuilderValueRow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    warning(warnings, path, "Invalid networking value collection was replaced with an empty list.");
    return [];
  }

  const usedIds = new Set<string>();
  const rows: BuilderValueRow[] = [];
  value.forEach((candidate, index) => {
    const rowPath = `${path}.${index}`;
    if (!isPlainObject(candidate)) {
      warning(warnings, rowPath, "Invalid networking value row was omitted during import.");
      return;
    }
    addUnknownKeyWarnings(candidate, VALUE_ROW_KEYS, rowPath, warnings);
    if (typeof candidate.value !== "string") {
      warning(warnings, `${rowPath}.value`, "Invalid networking value draft was omitted during import.");
      return;
    }
    const isExampleValue = normalizeBooleanDraft(
      candidate.isExampleValue,
      false,
      `${rowPath}.isExampleValue`,
      warnings,
    );
    rows.push({
      id: preserveOrRepairDraftId(candidate.id, usedIds, idPrefix),
      value: candidate.value,
      isExampleValue,
    });
  });
  return rows;
}

function normalizeRoutes(
  value: unknown,
  path: string,
  warnings: NetworkingImportWarning[],
): BuilderRoute[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    warning(warnings, path, "Invalid route collection was replaced with an empty list.");
    return [];
  }

  const usedIds = new Set<string>();
  const routes: BuilderRoute[] = [];
  value.forEach((candidate, index) => {
    const routePath = `${path}.${index}`;
    if (!isPlainObject(candidate)) {
      warning(warnings, routePath, "Invalid route row was omitted during import.");
      return;
    }
    addUnknownKeyWarnings(candidate, ROUTE_KEYS, routePath, warnings);
    if (candidate.kind !== "default" && candidate.kind !== "specific") {
      warning(warnings, `${routePath}.kind`, "Invalid route kind was omitted during import.");
      return;
    }
    if (typeof candidate.gateway !== "string") {
      warning(warnings, `${routePath}.gateway`, "Invalid route gateway draft was omitted during import.");
      return;
    }
    if (typeof candidate.metric !== "string") {
      warning(warnings, `${routePath}.metric`, "Invalid route metric draft was omitted during import.");
      return;
    }

    if (candidate.kind === "default") {
      if (Object.prototype.hasOwnProperty.call(candidate, "destination")) {
        warning(
          warnings,
          `${routePath}.destination`,
          "Default-route destination draft was omitted during import.",
        );
      }
      const id = preserveOrRepairDraftId(candidate.id, usedIds, "network-route");
      routes.push({
        id,
        kind: "default",
        gateway: candidate.gateway,
        metric: candidate.metric,
        exampleFields: normalizeExampleFields<"gateway" | "metric">(
          candidate.exampleFields,
          new Set(["gateway", "metric"]),
          `${routePath}.exampleFields`,
          warnings,
        ),
      });
      return;
    }

    if (typeof candidate.destination !== "string") {
      warning(warnings, `${routePath}.destination`, "Invalid route destination draft was omitted during import.");
      return;
    }
    const id = preserveOrRepairDraftId(candidate.id, usedIds, "network-route");
    routes.push({
      id,
      kind: "specific",
      destination: candidate.destination,
      gateway: candidate.gateway,
      metric: candidate.metric,
      exampleFields: normalizeExampleFields<
        "destination" | "gateway" | "metric"
      >(
        candidate.exampleFields,
        new Set(["destination", "gateway", "metric"]),
        `${routePath}.exampleFields`,
        warnings,
      ),
    });
  });
  return routes;
}

function normalizeInterfaceEntry(
  raw: unknown,
  index: number,
  usedIds: Set<string>,
  warnings: NetworkingImportWarning[],
): BuilderNetworkInterface | undefined {
  const path = `networking.interfaces.${index}`;
  if (!isPlainObject(raw)) {
    warnings.push({
      path,
      message: "Invalid network interface was omitted during import.",
    });
    return undefined;
  }

  addUnknownKeyWarnings(raw, INTERFACE_KEYS, path, warnings);

  const hasValidMode = raw.identityMode === "name" || raw.identityMode === "mac";
  let identityMode: NetworkIdentityMode;
  if (hasValidMode) {
    identityMode = raw.identityMode as NetworkIdentityMode;
  } else {
    const hasName = typeof raw.name === "string" && raw.name.trim() !== "";
    const hasMac =
      typeof raw.macAddress === "string" && raw.macAddress.trim() !== "";
    if (hasName === hasMac) {
      warnings.push({
        path: `${path}.identityMode`,
        message: "Network interface identity mode could not be recovered; the entry was omitted.",
      });
      return undefined;
    }
    identityMode = hasName ? "name" : "mac";
  }

  const activeKey = identityMode === "name" ? "name" : "macAddress";
  const inactiveKey = identityMode === "name" ? "macAddress" : "name";
  if (typeof raw[activeKey] !== "string") {
    warnings.push({
      path: `${path}.${activeKey}`,
      message: "Network interface active identity was invalid; the entry was omitted.",
    });
    return undefined;
  }

  let inactiveValue = raw[inactiveKey];
  if (typeof inactiveValue !== "string") {
    warnings.push({
      path: `${path}.${inactiveKey}`,
      message: "Invalid inactive network identity draft was cleared during import.",
    });
    inactiveValue = "";
  }

  const name = identityMode === "name" ? raw.name : inactiveValue;
  const macAddress = identityMode === "mac" ? raw.macAddress : inactiveValue;

  const normalized = createBlankNetworkInterface(
    preserveOrRepairId(raw.id, usedIds),
  );

  return {
    ...normalized,
    identityMode,
    name: name as string,
    macAddress: normalizeMacAddressDraft(macAddress as string),
    dhcp4: normalizeBooleanDraft(
      raw.dhcp4,
      normalized.dhcp4,
      `${path}.dhcp4`,
      warnings,
    ),
    dhcp6: normalizeBooleanDraft(
      raw.dhcp6,
      normalized.dhcp6,
      `${path}.dhcp6`,
      warnings,
    ),
    ipv4Addresses: normalizeValueRows(
      raw.ipv4Addresses,
      `${path}.ipv4Addresses`,
      "network-address",
      warnings,
    ),
    ipv6Addresses: normalizeValueRows(
      raw.ipv6Addresses,
      `${path}.ipv6Addresses`,
      "network-address",
      warnings,
    ),
    ipv4Routes: normalizeRoutes(raw.ipv4Routes, `${path}.ipv4Routes`, warnings),
    ipv6Routes: normalizeRoutes(raw.ipv6Routes, `${path}.ipv6Routes`, warnings),
    nameservers: normalizeValueRows(
      raw.nameservers,
      `${path}.nameservers`,
      "network-nameserver",
      warnings,
    ),
    searchDomains: normalizeValueRows(
      raw.searchDomains,
      `${path}.searchDomains`,
      "network-search-domain",
      warnings,
    ),
    mtuEnabled: normalizeBooleanDraft(
      raw.mtuEnabled,
      normalized.mtuEnabled,
      `${path}.mtuEnabled`,
      warnings,
    ),
    mtu: normalizeStringDraft(raw.mtu, normalized.mtu, `${path}.mtu`, warnings),
    exampleFields: normalizeExampleFields<NetworkInterfaceExampleField>(
      raw.exampleFields,
      new Set(["name", "macAddress", "dhcp4", "dhcp6", "mtu"]),
      `${path}.exampleFields`,
      warnings,
    ),
    acknowledgedRiskWarnings: normalizeRiskWarningAcknowledgements(
      raw.acknowledgedRiskWarnings,
      `${path}.acknowledgedRiskWarnings`,
      warnings,
    ),
  };
}

export function normalizeNetworkingSection(
  raw: unknown,
): NetworkingNormalizationResult {
  if (raw === undefined || raw === null) {
    return {
      networking: structuredClone(DEFAULT_NETWORKING_CONFIG),
      warnings: [],
    };
  }

  const warnings: NetworkingImportWarning[] = [];
  if (!isPlainObject(raw)) {
    return {
      networking: structuredClone(DEFAULT_NETWORKING_CONFIG),
      warnings: [
        {
          path: "networking",
          message: "Invalid networking data was replaced with an empty section.",
        },
      ],
    };
  }

  addUnknownKeyWarnings(raw, NETWORKING_KEYS, "networking", warnings);

  if (raw.interfaces === undefined) {
    return {
      networking: structuredClone(DEFAULT_NETWORKING_CONFIG),
      warnings: dedupeWarnings(warnings),
    };
  }

  if (!Array.isArray(raw.interfaces)) {
    if (isPlainObject(raw.interfaces)) {
      addUnknownKeyWarnings(
        raw.interfaces,
        new Set<string>(),
        "networking.interfaces",
        warnings,
      );
    }
    warnings.push({
      path: "networking.interfaces",
      message: "Invalid network interface collection was replaced with an empty list.",
    });
    return {
      networking: structuredClone(DEFAULT_NETWORKING_CONFIG),
      warnings: dedupeWarnings(warnings),
    };
  }

  const usedIds = new Set<string>();
  const interfaces: BuilderNetworkInterface[] = [];
  raw.interfaces.forEach((entry, index) => {
    const normalized = normalizeInterfaceEntry(entry, index, usedIds, warnings);
    if (normalized) {
      interfaces.push(normalized);
    }
  });

  return {
    networking: { interfaces },
    warnings: dedupeWarnings(warnings),
  };
}

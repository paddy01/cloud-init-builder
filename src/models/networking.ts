import { z } from "zod";

export const networkIdentityModeSchema = z.enum(["name", "mac"]);

const COMPLETE_MAC_ADDRESS = /^(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;

export function normalizeMacAddressDraft(value: string): string {
  return COMPLETE_MAC_ADDRESS.test(value) ? value.toLowerCase() : value;
}

export const builderNetworkInterfaceSchema = z.object({
  id: z.string(),
  identityMode: networkIdentityModeSchema,
  name: z.string(),
  macAddress: z.string().transform(normalizeMacAddressDraft),
});

export const networkingConfigSchema = z.object({
  interfaces: z.array(builderNetworkInterfaceSchema),
});

export type NetworkIdentityMode = z.infer<typeof networkIdentityModeSchema>;
export type BuilderNetworkInterface = z.infer<
  typeof builderNetworkInterfaceSchema
>;
export type NetworkingConfig = z.infer<typeof networkingConfigSchema>;

export function isNetworkingConfig(value: unknown): value is NetworkingConfig {
  return networkingConfigSchema.safeParse(value).success;
}

export const DEFAULT_NETWORKING_CONFIG: NetworkingConfig = {
  interfaces: [],
};

let fallbackIdCounter = 0;

export function createNetworkInterfaceId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `network-interface-${globalThis.crypto.randomUUID()}`;
  }

  fallbackIdCounter += 1;
  return `network-interface-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createBlankNetworkInterface(
  id = createNetworkInterfaceId(),
): BuilderNetworkInterface {
  return {
    id,
    identityMode: "name",
    name: "",
    macAddress: "",
  };
}

export function isSemanticallyBlankNetworkInterface(
  entry: BuilderNetworkInterface,
): boolean {
  return entry.name.trim() === "" && entry.macAddress.trim() === "";
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

function allocateUniqueInterfaceId(usedIds: Set<string>): string {
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

  return {
    id: preserveOrRepairId(raw.id, usedIds),
    identityMode,
    name: name as string,
    macAddress: normalizeMacAddressDraft(macAddress as string),
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

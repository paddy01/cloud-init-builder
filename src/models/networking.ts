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

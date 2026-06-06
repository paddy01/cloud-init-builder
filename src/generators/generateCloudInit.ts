import type { IdentityConfig } from "../models/identity.ts";
import { orderKeys } from "./orderKeys.ts";
import { pruneEmpty } from "./pruneEmpty.ts";
import { writeYaml } from "./yamlWriter.ts";

export const CLOUD_CONFIG_HEADER = "#cloud-config\n";

export const CLOUD_CONFIG_ORDER = [
  "hostname",
  "fqdn",
  "prefer_fqdn_over_hostname",
  "manage_etc_hosts",
  "timezone",
  "locale",
] as const;

export interface GenerateOptions {
  includeHeader?: boolean;
}

export interface GenerateResult {
  ok: boolean;
  yaml: string;
  errors: never[];
  warnings: never[];
}

export function generateCloudInit(
  project: { identity?: IdentityConfig },
  options: GenerateOptions = {},
): GenerateResult {
  const flat = { ...(project.identity ?? {}) };
  const pruned = pruneEmpty(flat);

  const body =
    pruned === undefined ? "" : writeYaml(orderKeys(pruned, CLOUD_CONFIG_ORDER));

  const yaml =
    (options.includeHeader === false ? "" : CLOUD_CONFIG_HEADER) + body;

  return { ok: true, yaml, errors: [], warnings: [] };
}

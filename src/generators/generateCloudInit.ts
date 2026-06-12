import type { CommandsConfig } from "../models/commands.ts";
import type { IdentityConfig } from "../models/identity.ts";
import type { UsersConfig } from "../models/users.ts";
import { buildCloudInitCommands } from "./generateCommands.ts";
import { buildCloudInitUsers } from "./generateUsers.ts";
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
  "users",
  "bootcmd",
  "runcmd",
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

export interface GenerateProjectInput {
  identity?: IdentityConfig;
  users?: UsersConfig;
  commands?: CommandsConfig;
}

export function generateCloudInit(
  project: GenerateProjectInput = {},
  options: GenerateOptions = {},
): GenerateResult {
  const flat = { ...(project.identity ?? {}) };
  const pruned: Record<string, unknown> = pruneEmpty(flat) ?? {};

  if (project.users !== undefined) {
    const users = buildCloudInitUsers(project.users);
    if (project.users.preserveDefault === false || users.length > 0) {
      pruned.users = users;
    }
  }

  if (project.commands !== undefined) {
    const { bootcmd, runcmd } = buildCloudInitCommands(project.commands);
    if (bootcmd !== undefined) {
      pruned.bootcmd = bootcmd;
    }
    if (runcmd !== undefined) {
      pruned.runcmd = runcmd;
    }
  }

  const body =
    Object.keys(pruned).length === 0
      ? ""
      : writeYaml(orderKeys(pruned, CLOUD_CONFIG_ORDER));

  const yaml =
    (options.includeHeader === false ? "" : CLOUD_CONFIG_HEADER) + body;

  return { ok: true, yaml, errors: [], warnings: [] };
}

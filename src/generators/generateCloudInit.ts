import type { CommandsConfig } from "../models/commands.ts";
import type { IdentityConfig } from "../models/identity.ts";
import type { UsersConfig } from "../models/users.ts";
import {
  isSemanticallyBlankNetworkInterface,
  type BuilderRoute,
  type NetworkingConfig,
} from "../models/networking.ts";
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
  "network",
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
  networking?: NetworkingConfig;
  users?: UsersConfig;
  commands?: CommandsConfig;
}

function nonEmptyRows(rows: { value: string }[]): string[] {
  return rows.map((row) => row.value.trim()).filter((value) => value !== "");
}

function buildRoute(route: BuilderRoute): Record<string, unknown> {
  const output: Record<string, unknown> = {
    to: route.kind === "default" ? "default" : route.destination.trim(),
    via: route.gateway.trim(),
  };
  const metric = route.metric.trim();
  if (metric !== "") output.metric = Number(metric);
  return output;
}

function buildCloudInitNetworkV2(networking: NetworkingConfig): unknown {
  const ethernets: Record<string, unknown> = {};
  const usedKeys = new Set<string>();
  let macOrdinal = 0;

  for (const entry of networking.interfaces) {
    if (isSemanticallyBlankNetworkInterface(entry)) continue;

    const exactName = entry.identityMode === "name" ? entry.name.trim() : "";
    let key = exactName;
    if (key === "") {
      do {
        macOrdinal += 1;
        key = `interface${macOrdinal}`;
      } while (usedKeys.has(key));
    }
    usedKeys.add(key);

    const ethernet: Record<string, unknown> = {
      dhcp4: entry.dhcp4,
      dhcp6: entry.dhcp6,
    };

    if (entry.identityMode === "mac") {
      const mac = entry.macAddress.trim();
      if (mac !== "") ethernet.match = { macaddress: mac.toLowerCase() };
    }

    const addresses = [
      ...nonEmptyRows(entry.ipv4Addresses),
      ...nonEmptyRows(entry.ipv6Addresses),
    ];
    if (addresses.length > 0) ethernet.addresses = addresses;

    const routes = [
      ...entry.ipv4Routes.map(buildRoute),
      ...entry.ipv6Routes.map(buildRoute),
    ];
    if (routes.length > 0) ethernet.routes = routes;

    const nameservers = nonEmptyRows(entry.nameservers);
    const search = nonEmptyRows(entry.searchDomains);
    if (nameservers.length > 0 || search.length > 0) {
      ethernet.nameservers = {
        ...(nameservers.length > 0 ? { addresses: nameservers } : {}),
        ...(search.length > 0 ? { search } : {}),
      };
    }

    if (entry.mtuEnabled) {
      const mtu = Number(entry.mtu.trim());
      if (Number.isFinite(mtu) && mtu > 0) ethernet.mtu = mtu;
    }
    ethernets[key] = ethernet;
  }

  if (Object.keys(ethernets).length === 0) return undefined;
  return { version: 2, ethernets };
}

export function generateCloudInit(
  project: GenerateProjectInput = {},
  options: GenerateOptions = {},
): GenerateResult {
  // Generator callers must provide validated builder state; export/copy services
  // own blocking validation so this module stays deterministic and side-effect free.
  const flat = { ...(project.identity ?? {}) };
  const pruned: Record<string, unknown> = pruneEmpty(flat) ?? {};

  if (project.networking !== undefined) {
    const network = buildCloudInitNetworkV2(project.networking);
    if (network !== undefined) pruned.network = network;
  }

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

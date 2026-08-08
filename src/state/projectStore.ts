import { create } from "zustand";
import type { IdentityConfig } from "../models/identity.ts";
import { createDefaultProject, type ProjectFile } from "../models/project.ts";
import {
  createBlankCommand,
  createBlankCommandArgument,
  isCommandsConfig,
  type BuilderCommand,
  type CommandStage,
  type CommandsConfig,
} from "../models/commands.ts";
import {
  createBlankSshAuthorizedKey,
  createBlankUser,
  isUsersConfig,
  type BuilderUser,
  type UsersConfig,
} from "../models/users.ts";
import {
  allocateUniqueNetworkDraftId,
  allocateUniqueInterfaceId,
  createBuilderValueRow,
  createBlankNetworkInterface,
  createDefaultRoute,
  createDualStackDhcpExample,
  createIpv4DhcpExample,
  createSpecificRoute,
  createStaticIpv4Example,
  isNetworkingConfig,
  type BuilderNetworkInterface,
  type BuilderRoute,
  type BuilderValueRow,
  type NetworkingConfig,
} from "../models/networking.ts";
import { RISK_CODE_SET, type RiskCode } from "../models/networkingCodes.ts";
import type { ImportWarning } from "../services/projectService.ts";

type NetworkInterfacePatch = Partial<
  Omit<BuilderNetworkInterface, "id">
>;

export type NetworkFamily = "ipv4" | "ipv6";
export type NetworkRouteKind = BuilderRoute["kind"];
export type NetworkRouteField = "destination" | "gateway" | "metric";
export type NetworkExampleKind =
  | "ipv4-dhcp"
  | "static-ipv4"
  | "dual-stack-dhcp";

const ADDRESS_COLLECTIONS = {
  ipv4: "ipv4Addresses",
  ipv6: "ipv6Addresses",
} as const;

const ROUTE_COLLECTIONS = {
  ipv4: "ipv4Routes",
  ipv6: "ipv6Routes",
} as const;

const EMPTY_STRING_NORMALIZED_KEYS = [
  "hostname",
  "fqdn",
  "timezone",
  "locale",
] as const satisfies readonly (keyof IdentityConfig)[];

function normalizeIdentityTextField(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeIdentityEmptyStrings(
  identity: IdentityConfig,
): IdentityConfig {
  const normalized = { ...identity };

  for (const key of EMPTY_STRING_NORMALIZED_KEYS) {
    normalized[key] = normalizeIdentityTextField(normalized[key]);
  }

  return normalized;
}

export interface ProjectState {
  project: ProjectFile | null;
  lastSavedProject: ProjectFile | null;
  isDirty: boolean;
  importWarnings: ImportWarning[];
  newProject: (name: string) => void;
  loadProject: (project: ProjectFile, warnings?: ImportWarning[]) => void;
  updateMetadata: (name: string) => void;
  updateIdentity: (patch: Partial<IdentityConfig>) => void;
  setPreserveDefault: (enabled: boolean) => void;
  addUser: (id?: string) => string | undefined;
  updateUser: (id: string, patch: Partial<BuilderUser>) => void;
  removeUser: (id: string) => void;
  addSshAuthorizedKey: (userId: string, rowId?: string) => string | undefined;
  updateSshAuthorizedKey: (
    userId: string,
    rowId: string,
    value: string,
  ) => void;
  removeSshAuthorizedKey: (userId: string, rowId: string) => void;
  addNetworkInterface: (id?: string) => string | undefined;
  updateNetworkInterface: (
    id: string,
    patch: NetworkInterfacePatch,
  ) => void;
  removeNetworkInterface: (id: string) => void;
  moveNetworkInterface: (id: string, direction: "up" | "down") => void;
  setNetworkDhcp: (
    interfaceId: string,
    family: NetworkFamily,
    enabled: boolean,
  ) => void;
  acknowledgeNetworkRiskWarning: (
    interfaceId: string,
    code: RiskCode,
  ) => void;
  addNetworkAddress: (
    interfaceId: string,
    family: NetworkFamily,
    rowId?: string,
  ) => string | undefined;
  updateNetworkAddress: (
    interfaceId: string,
    family: NetworkFamily,
    rowId: string,
    value: string,
  ) => void;
  removeNetworkAddress: (
    interfaceId: string,
    family: NetworkFamily,
    rowId: string,
  ) => void;
  addNetworkRoute: (
    interfaceId: string,
    family: NetworkFamily,
    kind: NetworkRouteKind,
    rowId?: string,
  ) => string | undefined;
  updateNetworkRouteField: (
    interfaceId: string,
    family: NetworkFamily,
    rowId: string,
    field: NetworkRouteField,
    value: string,
  ) => void;
  removeNetworkRoute: (
    interfaceId: string,
    family: NetworkFamily,
    rowId: string,
  ) => void;
  addNetworkNameserver: (
    interfaceId: string,
    rowId?: string,
  ) => string | undefined;
  updateNetworkNameserver: (
    interfaceId: string,
    rowId: string,
    value: string,
  ) => void;
  removeNetworkNameserver: (interfaceId: string, rowId: string) => void;
  addNetworkSearchDomain: (
    interfaceId: string,
    rowId?: string,
  ) => string | undefined;
  updateNetworkSearchDomain: (
    interfaceId: string,
    rowId: string,
    value: string,
  ) => void;
  removeNetworkSearchDomain: (interfaceId: string, rowId: string) => void;
  setNetworkMtuEnabled: (interfaceId: string, enabled: boolean) => void;
  updateNetworkMtu: (interfaceId: string, value: string) => void;
  applyNetworkExample: (kind: NetworkExampleKind) => string | undefined;
  addCommand: (stage: CommandStage, id?: string) => string | undefined;
  updateShellCommand: (
    stage: CommandStage,
    commandId: string,
    value: string,
  ) => void;
  replaceCommand: (
    stage: CommandStage,
    commandId: string,
    nextCommand: BuilderCommand,
  ) => void;
  updateArgvExecutable: (
    stage: CommandStage,
    commandId: string,
    value: string,
  ) => void;
  addCommandArgument: (
    stage: CommandStage,
    commandId: string,
    rowId?: string,
  ) => string | undefined;
  updateCommandArgument: (
    stage: CommandStage,
    commandId: string,
    rowId: string,
    value: string,
  ) => void;
  removeCommandArgument: (
    stage: CommandStage,
    commandId: string,
    rowId: string,
  ) => void;
  removeCommand: (stage: CommandStage, commandId: string) => void;
  moveCommand: (
    stage: CommandStage,
    commandId: string,
    direction: "up" | "down",
  ) => void;
  markSaved: () => void;
  clearWarnings: () => void;
}

export function updateProjectCommands(
  set: (
    partial:
      | Partial<ProjectState>
      | ((state: ProjectState) => Partial<ProjectState>),
  ) => void,
  get: () => ProjectState,
  recipe: (commands: CommandsConfig) => CommandsConfig,
): void {
  const { project } = get();
  if (!project?.commands || !isCommandsConfig(project.commands)) return;

  const nextCommands = recipe(project.commands);
  set({
    project: {
      ...project,
      commands: nextCommands,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    },
    isDirty: true,
  });
}

export function updateProjectNetworking(
  set: (
    partial:
      | Partial<ProjectState>
      | ((state: ProjectState) => Partial<ProjectState>),
  ) => void,
  get: () => ProjectState,
  recipe: (networking: NetworkingConfig) => NetworkingConfig,
): void {
  const { project } = get();
  if (!project || !isNetworkingConfig(project.networking)) return;

  const nextNetworking = recipe(project.networking);
  if (nextNetworking === project.networking) return;

  set({
    project: {
      ...project,
      networking: nextNetworking,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    },
    isDirty: true,
  });
}

function updateNetworkInterfaceById(
  networking: NetworkingConfig,
  interfaceId: string,
  recipe: (entry: BuilderNetworkInterface) => BuilderNetworkInterface,
): NetworkingConfig {
  const index = networking.interfaces.findIndex(
    (entry) => entry.id === interfaceId,
  );
  if (index === -1) return networking;

  const current = networking.interfaces[index];
  if (!current) return networking;
  const next = recipe(current);
  if (next === current) return networking;

  const interfaces = [...networking.interfaces];
  interfaces[index] = next;
  return { ...networking, interfaces };
}

function removeExampleField<T extends string>(
  fields: readonly T[],
  field: T,
): T[] {
  return fields.includes(field) ? fields.filter((entry) => entry !== field) : [...fields];
}

function addValueRow(
  entry: BuilderNetworkInterface,
  collection: "ipv4Addresses" | "ipv6Addresses" | "nameservers" | "searchDomains",
  row: BuilderValueRow,
): BuilderNetworkInterface {
  return { ...entry, [collection]: [...entry[collection], row] };
}

function updateValueRow(
  entry: BuilderNetworkInterface,
  collection: "ipv4Addresses" | "ipv6Addresses" | "nameservers" | "searchDomains",
  rowId: string,
  value: string,
): BuilderNetworkInterface {
  const index = entry[collection].findIndex((row) => row.id === rowId);
  if (index === -1) return entry;
  const current = entry[collection][index];
  if (!current || current.value === value) return entry;

  const rows = [...entry[collection]];
  rows[index] = { ...current, value, isExampleValue: false };
  return { ...entry, [collection]: rows };
}

function removeValueRow(
  entry: BuilderNetworkInterface,
  collection: "ipv4Addresses" | "ipv6Addresses" | "nameservers" | "searchDomains",
  rowId: string,
): BuilderNetworkInterface {
  const index = entry[collection].findIndex((row) => row.id === rowId);
  if (index === -1) return entry;

  const rows = [...entry[collection]];
  rows.splice(index, 1);
  return { ...entry, [collection]: rows };
}

function prepareNestedRowId(
  get: () => ProjectState,
  interfaceId: string,
  existingIds: (entry: BuilderNetworkInterface) => string[],
  requestedId: string | undefined,
  prefix: string,
): string | undefined {
  const networking = get().project?.networking;
  if (!isNetworkingConfig(networking)) return undefined;
  const networkInterface = networking.interfaces.find(
    (entry) => entry.id === interfaceId,
  );
  if (!networkInterface) return undefined;

  const usedIds = new Set(existingIds(networkInterface));
  if (requestedId !== undefined) {
    return usedIds.has(requestedId) ? undefined : requestedId;
  }
  return allocateUniqueNetworkDraftId(usedIds, prefix);
}

function updateProjectUsers(
  set: (
    partial:
      | Partial<ProjectState>
      | ((state: ProjectState) => Partial<ProjectState>),
  ) => void,
  get: () => ProjectState,
  recipe: (users: UsersConfig) => UsersConfig,
): void {
  const { project } = get();
  if (!project?.users || !isUsersConfig(project.users)) return;

  const nextUsers = recipe(project.users);
  set({
    project: {
      ...project,
      users: nextUsers,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    },
    isDirty: true,
  });
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],

  newProject: (name) => {
    const project = createDefaultProject(name);
    set({
      project,
      lastSavedProject: null,
      isDirty: false,
      importWarnings: [],
    });
  },

  loadProject: (project, warnings = []) => {
    set({
      project,
      lastSavedProject: structuredClone(project),
      isDirty: false,
      importWarnings: warnings,
    });
  },

  updateMetadata: (name) => {
    const { project } = get();
    if (!project) return;

    set({
      project: {
        ...project,
        metadata: {
          ...project.metadata,
          name,
          updatedAt: new Date().toISOString(),
        },
      },
      isDirty: true,
    });
  },

  updateIdentity: (patch) => {
    const { project } = get();
    if (!project) return;

    const mergedIdentity = normalizeIdentityEmptyStrings({
      ...project.identity,
      ...patch,
    });

    set({
      project: {
        ...project,
        identity: mergedIdentity,
        metadata: {
          ...project.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      isDirty: true,
    });
  },

  setPreserveDefault: (enabled) => {
    const { project } = get();
    if (!project?.users || !isUsersConfig(project.users)) return;

    const users: UsersConfig = {
      ...project.users,
      preserveDefault: enabled,
    };

    set({
      project: {
        ...project,
        users,
        metadata: {
          ...project.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      isDirty: true,
    });
  },

  addUser: (id) => {
    const { project } = get();
    if (!project?.users || !isUsersConfig(project.users)) return undefined;

    const user = createBlankUser(id);
    updateProjectUsers(set, get, (users) => ({
      ...users,
      entries: [...users.entries, user],
    }));
    return user.id;
  },

  updateUser: (id, patch) => {
    updateProjectUsers(set, get, (users) => ({
      ...users,
      entries: users.entries.map((user) =>
        user.id === id ? { ...user, ...patch } : user,
      ),
    }));
  },

  removeUser: (id) => {
    updateProjectUsers(set, get, (users) => ({
      ...users,
      entries: users.entries.filter((user) => user.id !== id),
    }));
  },

  addSshAuthorizedKey: (userId, rowId) => {
    const { project } = get();
    if (!project?.users || !isUsersConfig(project.users)) return undefined;

    const row = createBlankSshAuthorizedKey(rowId);
    updateProjectUsers(set, get, (users) => ({
      ...users,
      entries: users.entries.map((user) =>
        user.id === userId
          ? {
              ...user,
              ssh_authorized_keys: [...(user.ssh_authorized_keys ?? []), row],
            }
          : user,
      ),
    }));
    return row.id;
  },

  updateSshAuthorizedKey: (userId, rowId, value) => {
    updateProjectUsers(set, get, (users) => ({
      ...users,
      entries: users.entries.map((user) =>
        user.id === userId
          ? {
              ...user,
              ssh_authorized_keys: (user.ssh_authorized_keys ?? []).map((row) =>
                row.id === rowId ? { ...row, value } : row,
              ),
            }
          : user,
      ),
    }));
  },

  removeSshAuthorizedKey: (userId, rowId) => {
    updateProjectUsers(set, get, (users) => ({
      ...users,
      entries: users.entries.map((user) =>
        user.id === userId
          ? {
              ...user,
              ssh_authorized_keys: (user.ssh_authorized_keys ?? []).filter(
                (row) => row.id !== rowId,
              ),
            }
          : user,
      ),
    }));
  },

  addNetworkInterface: (id) => {
    const { project } = get();
    if (!project || !isNetworkingConfig(project.networking)) {
      return undefined;
    }
    if (
      id !== undefined &&
      project.networking.interfaces.some((entry) => entry.id === id)
    ) {
      return undefined;
    }

    const interfaceId =
      id ??
      allocateUniqueInterfaceId(
        new Set(project.networking.interfaces.map((entry) => entry.id)),
      );
    const networkInterface = createBlankNetworkInterface(interfaceId);
    updateProjectNetworking(set, get, (networking) => ({
      ...networking,
      interfaces: [...networking.interfaces, networkInterface],
    }));
    return networkInterface.id;
  },

  updateNetworkInterface: (id, patch) => {
    updateProjectNetworking(set, get, (networking) => {
      const index = networking.interfaces.findIndex((entry) => entry.id === id);
      if (index === -1) return networking;

      const current = networking.interfaces[index];
      if (!current) return networking;

      const identityMode = patch.identityMode ?? current.identityMode;
      const name = patch.name ?? current.name;
      const macAddress = patch.macAddress ?? current.macAddress;
      const nameChanged = name !== current.name;
      const macAddressChanged = macAddress !== current.macAddress;
      if (
        identityMode === current.identityMode &&
        !nameChanged &&
        !macAddressChanged
      ) {
        return networking;
      }

      let exampleFields = current.exampleFields;
      if (nameChanged) {
        exampleFields = removeExampleField(exampleFields, "name");
      }
      if (macAddressChanged) {
        exampleFields = removeExampleField(exampleFields, "macAddress");
      }

      const interfaces = [...networking.interfaces];
      interfaces[index] = {
        ...current,
        identityMode,
        name,
        macAddress,
        exampleFields,
      };
      return { ...networking, interfaces };
    });
  },

  removeNetworkInterface: (id) => {
    updateProjectNetworking(set, get, (networking) => {
      const index = networking.interfaces.findIndex((entry) => entry.id === id);
      if (index === -1) return networking;

      const interfaces = [...networking.interfaces];
      interfaces.splice(index, 1);
      return { ...networking, interfaces };
    });
  },

  moveNetworkInterface: (id, direction) => {
    updateProjectNetworking(set, get, (networking) => {
      const index = networking.interfaces.findIndex((entry) => entry.id === id);
      if (index === -1) return networking;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= networking.interfaces.length) {
        return networking;
      }

      const interfaces = [...networking.interfaces];
      const moved = interfaces.splice(index, 1)[0];
      if (!moved) return networking;
      interfaces.splice(targetIndex, 0, moved);
      return { ...networking, interfaces };
    });
  },

  setNetworkDhcp: (interfaceId, family, enabled) => {
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) => {
        const field = family === "ipv4" ? "dhcp4" : "dhcp6";
        if (entry[field] === enabled) return entry;
        return {
          ...entry,
          [field]: enabled,
          exampleFields: removeExampleField(entry.exampleFields, field),
        };
      }),
    );
  },

  acknowledgeNetworkRiskWarning: (interfaceId, code) => {
    if (!RISK_CODE_SET.has(code)) {
      return;
    }

    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) => {
        if (entry.acknowledgedRiskWarnings.includes(code)) {
          return entry;
        }
        return {
          ...entry,
          acknowledgedRiskWarnings: [...entry.acknowledgedRiskWarnings, code],
        };
      }),
    );
  },

  addNetworkAddress: (interfaceId, family, requestedId) => {
    const collection = ADDRESS_COLLECTIONS[family];
    const rowId = prepareNestedRowId(
      get,
      interfaceId,
      (entry) => entry[collection].map((row) => row.id),
      requestedId,
      "network-address",
    );
    if (!rowId) return undefined;

    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        addValueRow(entry, collection, createBuilderValueRow(rowId)),
      ),
    );
    return rowId;
  },

  updateNetworkAddress: (interfaceId, family, rowId, value) => {
    const collection = ADDRESS_COLLECTIONS[family];
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        updateValueRow(entry, collection, rowId, value),
      ),
    );
  },

  removeNetworkAddress: (interfaceId, family, rowId) => {
    const collection = ADDRESS_COLLECTIONS[family];
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        removeValueRow(entry, collection, rowId),
      ),
    );
  },

  addNetworkRoute: (interfaceId, family, kind, requestedId) => {
    const collection = ROUTE_COLLECTIONS[family];
    const rowId = prepareNestedRowId(
      get,
      interfaceId,
      (entry) => entry[collection].map((route) => route.id),
      requestedId,
      "network-route",
    );
    if (!rowId) return undefined;
    const route =
      kind === "default"
        ? createDefaultRoute(rowId)
        : createSpecificRoute(rowId);

    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) => ({
        ...entry,
        [collection]: [...entry[collection], route],
      })),
    );
    return rowId;
  },

  updateNetworkRouteField: (
    interfaceId,
    family,
    rowId,
    field,
    value,
  ) => {
    const collection = ROUTE_COLLECTIONS[family];
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) => {
        const index = entry[collection].findIndex(
          (route) => route.id === rowId,
        );
        if (index === -1) return entry;
        const current = entry[collection][index];
        if (!current) return entry;
        if (field === "destination") {
          if (current.kind === "default" || current.destination === value) {
            return entry;
          }
        } else if (current[field] === value) {
          return entry;
        }

        const routes = [...entry[collection]];
        routes[index] =
          field === "destination" && current.kind === "specific"
            ? {
                ...current,
                destination: value,
                exampleFields: removeExampleField(
                  current.exampleFields,
                  field,
                ),
              }
            : {
                ...current,
                [field]: value,
                exampleFields: removeExampleField(
                  current.exampleFields,
                  field,
                ),
              };
        return { ...entry, [collection]: routes };
      }),
    );
  },

  removeNetworkRoute: (interfaceId, family, rowId) => {
    const collection = ROUTE_COLLECTIONS[family];
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) => {
        const index = entry[collection].findIndex(
          (route) => route.id === rowId,
        );
        if (index === -1) return entry;

        const routes = [...entry[collection]];
        routes.splice(index, 1);
        return { ...entry, [collection]: routes };
      }),
    );
  },

  addNetworkNameserver: (interfaceId, requestedId) => {
    const rowId = prepareNestedRowId(
      get,
      interfaceId,
      (entry) => entry.nameservers.map((row) => row.id),
      requestedId,
      "network-nameserver",
    );
    if (!rowId) return undefined;

    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        addValueRow(entry, "nameservers", createBuilderValueRow(rowId)),
      ),
    );
    return rowId;
  },

  updateNetworkNameserver: (interfaceId, rowId, value) => {
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        updateValueRow(entry, "nameservers", rowId, value),
      ),
    );
  },

  removeNetworkNameserver: (interfaceId, rowId) => {
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        removeValueRow(entry, "nameservers", rowId),
      ),
    );
  },

  addNetworkSearchDomain: (interfaceId, requestedId) => {
    const rowId = prepareNestedRowId(
      get,
      interfaceId,
      (entry) => entry.searchDomains.map((row) => row.id),
      requestedId,
      "network-search-domain",
    );
    if (!rowId) return undefined;

    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        addValueRow(entry, "searchDomains", createBuilderValueRow(rowId)),
      ),
    );
    return rowId;
  },

  updateNetworkSearchDomain: (interfaceId, rowId, value) => {
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        updateValueRow(entry, "searchDomains", rowId, value),
      ),
    );
  },

  removeNetworkSearchDomain: (interfaceId, rowId) => {
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) =>
        removeValueRow(entry, "searchDomains", rowId),
      ),
    );
  },

  setNetworkMtuEnabled: (interfaceId, enabled) => {
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) => {
        const mtu = enabled ? entry.mtu : "";
        if (entry.mtuEnabled === enabled && entry.mtu === mtu) return entry;
        return {
          ...entry,
          mtuEnabled: enabled,
          mtu,
          exampleFields: removeExampleField(entry.exampleFields, "mtu"),
        };
      }),
    );
  },

  updateNetworkMtu: (interfaceId, value) => {
    updateProjectNetworking(set, get, (networking) =>
      updateNetworkInterfaceById(networking, interfaceId, (entry) => {
        if (entry.mtu === value) return entry;
        return {
          ...entry,
          mtu: value,
          exampleFields: removeExampleField(entry.exampleFields, "mtu"),
        };
      }),
    );
  },

  applyNetworkExample: (kind) => {
    let interfaceId: string | undefined;
    updateProjectNetworking(set, get, (networking) => {
      if (networking.interfaces.length !== 0) return networking;

      let networkInterface: BuilderNetworkInterface | undefined;
      switch (kind) {
        case "ipv4-dhcp":
          networkInterface = createIpv4DhcpExample();
          break;
        case "static-ipv4":
          networkInterface = createStaticIpv4Example();
          break;
        case "dual-stack-dhcp":
          networkInterface = createDualStackDhcpExample();
          break;
        default:
          return networking;
      }

      interfaceId = networkInterface.id;
      return { ...networking, interfaces: [networkInterface] };
    });
    return interfaceId;
  },

  addCommand: (stage, id) => {
    const { project } = get();
    if (!project?.commands || !isCommandsConfig(project.commands)) {
      return undefined;
    }

    const command = createBlankCommand(id);
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: [...commands[stage], command],
    }));
    return command.id;
  },

  updateShellCommand: (stage, commandId, value) => {
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: commands[stage].map((command) =>
        command.id === commandId && command.form === "shell"
          ? { ...command, command: value }
          : command,
      ),
    }));
  },

  replaceCommand: (stage, commandId, nextCommand) => {
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: commands[stage].map((command) =>
        command.id === commandId ? nextCommand : command,
      ),
    }));
  },

  updateArgvExecutable: (stage, commandId, value) => {
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: commands[stage].map((command) =>
        command.id === commandId && command.form === "argv"
          ? { ...command, executable: value }
          : command,
      ),
    }));
  },

  addCommandArgument: (stage, commandId, rowId) => {
    const { project } = get();
    if (!project?.commands || !isCommandsConfig(project.commands)) {
      return undefined;
    }

    const row = createBlankCommandArgument(rowId);
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: commands[stage].map((command) =>
        command.id === commandId && command.form === "argv"
          ? {
              ...command,
              arguments: [...command.arguments, row],
            }
          : command,
      ),
    }));
    return row.id;
  },

  updateCommandArgument: (stage, commandId, rowId, value) => {
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: commands[stage].map((command) =>
        command.id === commandId && command.form === "argv"
          ? {
              ...command,
              arguments: command.arguments.map((argument) =>
                argument.id === rowId ? { ...argument, value } : argument,
              ),
            }
          : command,
      ),
    }));
  },

  removeCommandArgument: (stage, commandId, rowId) => {
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: commands[stage].map((command) =>
        command.id === commandId && command.form === "argv"
          ? {
              ...command,
              arguments: command.arguments.filter(
                (argument) => argument.id !== rowId,
              ),
            }
          : command,
      ),
    }));
  },

  removeCommand: (stage, commandId) => {
    updateProjectCommands(set, get, (commands) => ({
      ...commands,
      [stage]: commands[stage].filter((command) => command.id !== commandId),
    }));
  },

  moveCommand: (stage, commandId, direction) => {
    updateProjectCommands(set, get, (commands) => {
      const entries = [...commands[stage]];
      const index = entries.findIndex((command) => command.id === commandId);
      if (index === -1) {
        return commands;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= entries.length) {
        return commands;
      }

      const moved = entries.splice(index, 1)[0];
      if (!moved) {
        return commands;
      }
      entries.splice(targetIndex, 0, moved);

      return {
        ...commands,
        [stage]: entries,
      };
    });
  },

  markSaved: () => {
    const { project } = get();
    set({
      lastSavedProject: project ? structuredClone(project) : null,
      isDirty: false,
    });
  },

  clearWarnings: () => {
    set({ importWarnings: [] });
  },
}));

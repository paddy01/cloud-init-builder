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
import type { ImportWarning } from "../services/projectService.ts";

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

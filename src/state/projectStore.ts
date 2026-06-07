import { create } from "zustand";
import type { IdentityConfig } from "../models/identity.ts";
import { createDefaultProject, type ProjectFile } from "../models/project.ts";
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
  markSaved: () => void;
  clearWarnings: () => void;
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

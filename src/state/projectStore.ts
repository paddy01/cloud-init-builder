import { create } from "zustand";
import type { IdentityConfig } from "../models/identity.ts";
import { createDefaultProject, type ProjectFile } from "../models/project.ts";
import type { ImportWarning } from "../services/projectService.ts";

const EMPTY_STRING_NORMALIZED_KEYS = [
  "hostname",
  "fqdn",
  "timezone",
  "locale",
] as const satisfies readonly (keyof IdentityConfig)[];

function normalizeIdentityEmptyStrings(
  identity: IdentityConfig,
): IdentityConfig {
  const normalized = { ...identity };

  for (const key of EMPTY_STRING_NORMALIZED_KEYS) {
    if (normalized[key] === "") {
      normalized[key] = undefined;
    }
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
  markSaved: () => void;
  clearWarnings: () => void;
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

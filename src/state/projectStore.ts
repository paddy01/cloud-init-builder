import { create } from "zustand";
import { createDefaultProject, type ProjectFile } from "../models/project.ts";
import type { ImportWarning } from "../services/projectService.ts";

export interface ProjectState {
  project: ProjectFile | null;
  lastSavedProject: ProjectFile | null;
  isDirty: boolean;
  importWarnings: ImportWarning[];
  newProject: (name: string) => void;
  loadProject: (project: ProjectFile, warnings?: ImportWarning[]) => void;
  updateMetadata: (name: string) => void;
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

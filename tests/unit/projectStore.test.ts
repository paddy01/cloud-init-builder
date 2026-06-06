import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../src/models/project.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],
};

describe("newProject", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
  });

  it('sets project with metadata.name "Test", isDirty false, lastSavedProject null', () => {
    useProjectStore.getState().newProject("Test");

    const state = useProjectStore.getState();
    expect(state.project?.metadata.name).toBe("Test");
    expect(state.isDirty).toBe(false);
    expect(state.lastSavedProject).toBeNull();
  });
});

describe("loadProject", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
  });

  it("sets project and lastSavedProject as deep copies with isDirty false", () => {
    const project = createDefaultProject("Loaded");
    useProjectStore.getState().loadProject(project);

    const state = useProjectStore.getState();
    expect(state.project).toEqual(project);
    expect(state.lastSavedProject).toEqual(project);
    expect(state.isDirty).toBe(false);
    expect(state.project).not.toBe(state.lastSavedProject);
  });

  it("does not let project mutations affect lastSavedProject", () => {
    const project = createDefaultProject("Loaded");
    useProjectStore.getState().loadProject(project);

    const state = useProjectStore.getState();
    if (state.project) {
      state.project.metadata.name = "Mutated";
    }

    expect(useProjectStore.getState().lastSavedProject?.metadata.name).toBe(
      "Loaded",
    );
  });

  it("stores import warnings when provided", () => {
    const project = createDefaultProject("Loaded");
    const warnings = [{ path: "metadata.createdAt", message: "Required" }];
    useProjectStore.getState().loadProject(project, warnings);

    expect(useProjectStore.getState().importWarnings).toEqual(warnings);
  });
});

describe("updateMetadata", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Original");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets metadata.name to "New Name", isDirty true, and updates updatedAt', () => {
    const before = useProjectStore.getState().project?.metadata.updatedAt;
    vi.advanceTimersByTime(1000);
    useProjectStore.getState().updateMetadata("New Name");

    const state = useProjectStore.getState();
    expect(state.project?.metadata.name).toBe("New Name");
    expect(state.isDirty).toBe(true);
    expect(state.project?.metadata.updatedAt).not.toBe(before);
  });
});

describe("markSaved", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Saved");
    useProjectStore.getState().updateMetadata("Changed");
  });

  it("sets isDirty false and snapshots lastSavedProject", () => {
    useProjectStore.getState().markSaved();

    const state = useProjectStore.getState();
    expect(state.isDirty).toBe(false);
    expect(state.lastSavedProject).toEqual(state.project);
    expect(state.lastSavedProject).not.toBe(state.project);
  });
});

describe("clearWarnings", () => {
  beforeEach(() => {
    useProjectStore.setState({
      ...initialState,
      importWarnings: [{ path: "metadata.name", message: "Invalid" }],
    });
  });

  it("sets importWarnings to an empty array", () => {
    useProjectStore.getState().clearWarnings();
    expect(useProjectStore.getState().importWarnings).toEqual([]);
  });
});

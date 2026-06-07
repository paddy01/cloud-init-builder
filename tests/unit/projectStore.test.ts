import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../src/models/project.ts";
import {
  createBlankSshAuthorizedKey,
  createBlankUser,
  isSemanticallyBlankUser,
  isUsersConfig,
} from "../../src/models/users.ts";
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

describe("SSH authorized key row actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getUser(userId: string) {
    const users = useProjectStore.getState().project?.users;
    if (!isUsersConfig(users)) {
      throw new Error("expected users config");
    }
    return users.entries.find((entry) => entry.id === userId);
  }

  it("appends stable SSH rows in order and marks the project dirty", () => {
    useProjectStore.getState().addUser("user-a");
    const before = useProjectStore.getState().project?.metadata.updatedAt;
    vi.advanceTimersByTime(1000);

    const firstId = useProjectStore.getState().addSshAuthorizedKey("user-a", "key-a");
    const secondId = useProjectStore
      .getState()
      .addSshAuthorizedKey("user-a", "key-b");

    expect(firstId).toBe("key-a");
    expect(secondId).toBe("key-b");
    expect(getUser("user-a")?.ssh_authorized_keys).toEqual([
      createBlankSshAuthorizedKey("key-a"),
      createBlankSshAuthorizedKey("key-b"),
    ]);
    expect(useProjectStore.getState().isDirty).toBe(true);
    expect(useProjectStore.getState().project?.metadata.updatedAt).not.toBe(
      before,
    );
  });

  it("updates a row by stable ID without reordering siblings", () => {
    useProjectStore.getState().addUser("user-a");
    useProjectStore.getState().addSshAuthorizedKey("user-a", "key-a");
    useProjectStore.getState().addSshAuthorizedKey("user-a", "key-b");

    useProjectStore
      .getState()
      .updateSshAuthorizedKey("user-a", "key-a", "ssh-ed25519 AAAA");

    expect(getUser("user-a")?.ssh_authorized_keys).toEqual([
      { id: "key-a", value: "ssh-ed25519 AAAA" },
      createBlankSshAuthorizedKey("key-b"),
    ]);
  });

  it("removes only the requested row", () => {
    useProjectStore.getState().addUser("user-a");
    useProjectStore.getState().addSshAuthorizedKey("user-a", "key-a");
    useProjectStore.getState().addSshAuthorizedKey("user-a", "key-b");

    useProjectStore.getState().removeSshAuthorizedKey("user-a", "key-a");

    expect(getUser("user-a")?.ssh_authorized_keys).toEqual([
      createBlankSshAuthorizedKey("key-b"),
    ]);
  });

  it("keeps blank SSH rows in project state while the user stays semantically blank", () => {
    useProjectStore.getState().addUser("user-a");
    useProjectStore.getState().addSshAuthorizedKey("user-a", "key-a");

    const user = getUser("user-a");
    expect(user?.ssh_authorized_keys).toEqual([
      createBlankSshAuthorizedKey("key-a"),
    ]);
    expect(isSemanticallyBlankUser(user!)).toBe(true);
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

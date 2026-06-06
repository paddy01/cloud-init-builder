import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],
};

describe("updateIdentity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Original");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets hostname to "web01", isDirty true, and updates updatedAt', () => {
    const before = useProjectStore.getState().project?.metadata.updatedAt;
    vi.advanceTimersByTime(1000);
    useProjectStore.getState().updateIdentity({ hostname: "web01" });

    const state = useProjectStore.getState();
    expect(state.project?.identity?.hostname).toBe("web01");
    expect(state.isDirty).toBe(true);
    expect(state.project?.metadata.updatedAt).not.toBe(before);
  });

  it("normalizes empty hostname to undefined", () => {
    useProjectStore.getState().updateIdentity({ hostname: "web01" });
    useProjectStore.getState().updateIdentity({ hostname: "" });

    const state = useProjectStore.getState();
    expect(state.project?.identity?.hostname).toBeUndefined();
  });

  it("preserves manage_etc_hosts false literal", () => {
    useProjectStore.getState().updateIdentity({ manage_etc_hosts: false });

    const state = useProjectStore.getState();
    expect(state.project?.identity?.manage_etc_hosts).toBe(false);
  });

  it("is a no-op when project is null", () => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().updateIdentity({ hostname: "web01" });

    expect(useProjectStore.getState().project).toBeNull();
    expect(useProjectStore.getState().isDirty).toBe(false);
  });
});

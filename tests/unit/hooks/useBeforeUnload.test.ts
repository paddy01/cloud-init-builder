import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useBeforeUnload } from "../../../src/hooks/useBeforeUnload.ts";
import { useProjectStore } from "../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],
};

describe("useBeforeUnload", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
  });

  it("does not cancel beforeunload when project is clean", () => {
    renderHook(() => useBeforeUnload());

    const event = new Event("beforeunload", {
      cancelable: true,
    }) as BeforeUnloadEvent;

    expect(window.dispatchEvent(event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("cancels beforeunload and marks legacy returnValue when project is dirty", () => {
    useProjectStore.setState({ isDirty: true });
    renderHook(() => useBeforeUnload());

    const event = new Event("beforeunload", {
      cancelable: true,
    }) as BeforeUnloadEvent;

    expect(window.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe(false);
  });
});

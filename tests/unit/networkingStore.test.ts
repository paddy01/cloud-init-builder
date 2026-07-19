import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../src/models/project.ts";
import type { NetworkingConfig } from "../../src/models/networking.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],
};

describe("networking store actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00.000Z"));
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Networking Test");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function networking(): NetworkingConfig {
    const value = useProjectStore.getState().project?.networking;
    if (!value) {
      throw new Error("expected canonical networking config");
    }
    return value;
  }

  function expectCurrentStateUnchanged(
    projectBefore: ReturnType<typeof useProjectStore.getState>["project"],
    dirtyBefore: boolean,
    updatedAtBefore: string | undefined,
  ): void {
    const state = useProjectStore.getState();
    expect(state.project).toBe(projectBefore);
    expect(state.isDirty).toBe(dirtyBefore);
    expect(state.project?.metadata.updatedAt).toBe(updatedAtBefore);
  }

  it("appends name-mode blank interfaces in order and returns stable IDs", () => {
    const firstId = useProjectStore
      .getState()
      .addNetworkInterface("interface-a");
    const secondId = useProjectStore
      .getState()
      .addNetworkInterface("interface-b");

    expect(firstId).toBe("interface-a");
    expect(secondId).toBe("interface-b");
    expect(networking().interfaces).toEqual([
      {
        id: "interface-a",
        identityMode: "name",
        name: "",
        macAddress: "",
      },
      {
        id: "interface-b",
        identityMode: "name",
        name: "",
        macAddress: "",
      },
    ]);
  });

  it("allocates automatic IDs around collisions with loaded interfaces", () => {
    const collidingUuid = "00000000-0000-4000-8000-000000000001";
    const uniqueUuid = "00000000-0000-4000-8000-000000000002";
    const loadedId = `network-interface-${collidingUuid}`;
    const project = createDefaultProject("Loaded Networking");
    project.networking.interfaces.push({
      id: loadedId,
      identityMode: "name",
      name: "ens18",
      macAddress: "",
    });
    useProjectStore.getState().loadProject(project);
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce(collidingUuid)
      .mockReturnValueOnce(uniqueUuid);

    const addedId = useProjectStore.getState().addNetworkInterface();

    expect(addedId).toBe(`network-interface-${uniqueUuid}`);
    expect(new Set(networking().interfaces.map((entry) => entry.id)).size).toBe(2);

    useProjectStore
      .getState()
      .updateNetworkInterface(addedId!, { name: "ens19" });
    expect(networking().interfaces).toEqual([
      expect.objectContaining({ id: loadedId, name: "ens18" }),
      expect.objectContaining({ id: addedId, name: "ens19" }),
    ]);

    useProjectStore.getState().removeNetworkInterface(addedId!);
    expect(networking().interfaces).toEqual([
      expect.objectContaining({ id: loadedId, name: "ens18" }),
    ]);
  });

  it("patches only the matching stable ID and preserves both selector drafts", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().addNetworkInterface("interface-b");

    useProjectStore.getState().updateNetworkInterface("interface-a", {
      name: "eno1",
      macAddress: "AA:BB:CC:DD:EE:FF",
    });
    useProjectStore.getState().updateNetworkInterface("interface-a", {
      identityMode: "mac",
    });

    expect(networking().interfaces).toEqual([
      {
        id: "interface-a",
        identityMode: "mac",
        name: "eno1",
        macAddress: "AA:BB:CC:DD:EE:FF",
      },
      {
        id: "interface-b",
        identityMode: "name",
        name: "",
        macAddress: "",
      },
    ]);
  });

  it("moves an interface exactly one position", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().addNetworkInterface("interface-b");
    useProjectStore.getState().addNetworkInterface("interface-c");

    useProjectStore.getState().moveNetworkInterface("interface-b", "down");
    expect(networking().interfaces.map((entry) => entry.id)).toEqual([
      "interface-a",
      "interface-c",
      "interface-b",
    ]);

    useProjectStore.getState().moveNetworkInterface("interface-b", "up");
    expect(networking().interfaces.map((entry) => entry.id)).toEqual([
      "interface-a",
      "interface-b",
      "interface-c",
    ]);
  });

  it("removes only the matching stable ID", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().addNetworkInterface("interface-b");

    useProjectStore.getState().removeNetworkInterface("interface-a");

    expect(networking().interfaces.map((entry) => entry.id)).toEqual([
      "interface-b",
    ]);
  });

  it("marks real mutations dirty and updates the project timestamp", () => {
    const before = useProjectStore.getState().project?.metadata.updatedAt;
    vi.advanceTimersByTime(1_000);

    useProjectStore.getState().addNetworkInterface("interface-a");

    const state = useProjectStore.getState();
    expect(state.isDirty).toBe(true);
    expect(state.project?.metadata.updatedAt).not.toBe(before);
  });

  it("keeps unknown IDs, equal patches, repeated removal, and boundary moves as exact no-ops", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().addNetworkInterface("interface-b");
    useProjectStore.getState().markSaved();

    const assertNoOp = (action: () => void) => {
      const stateBefore = useProjectStore.getState();
      const projectBefore = stateBefore.project;
      const updatedAtBefore = projectBefore?.metadata.updatedAt;
      vi.advanceTimersByTime(1_000);

      action();

      expectCurrentStateUnchanged(
        projectBefore,
        stateBefore.isDirty,
        updatedAtBefore,
      );
    };

    assertNoOp(() =>
      useProjectStore
        .getState()
        .updateNetworkInterface("missing", { name: "eno1" }),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .updateNetworkInterface("interface-a", { name: "" }),
    );
    assertNoOp(() =>
      useProjectStore.getState().moveNetworkInterface("missing", "up"),
    );
    assertNoOp(() =>
      useProjectStore.getState().moveNetworkInterface("interface-a", "up"),
    );
    assertNoOp(() =>
      useProjectStore.getState().moveNetworkInterface("interface-b", "down"),
    );

    useProjectStore.getState().removeNetworkInterface("interface-a");
    useProjectStore.getState().markSaved();
    assertNoOp(() =>
      useProjectStore.getState().removeNetworkInterface("interface-a"),
    );
  });

  it("serializes consecutive actions against the latest Zustand state", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().addNetworkInterface("interface-b");

    const { updateNetworkInterface, moveNetworkInterface } =
      useProjectStore.getState();
    updateNetworkInterface("interface-a", { name: "eno1" });
    updateNetworkInterface("interface-b", { macAddress: "aa:bb:cc:dd:ee:ff" });
    updateNetworkInterface("interface-a", { identityMode: "mac" });
    moveNetworkInterface("interface-b", "up");

    expect(networking().interfaces).toEqual([
      {
        id: "interface-b",
        identityMode: "name",
        name: "",
        macAddress: "aa:bb:cc:dd:ee:ff",
      },
      {
        id: "interface-a",
        identityMode: "mac",
        name: "eno1",
        macAddress: "",
      },
    ]);
  });

  it("preserves code-unit-distinct composed and decomposed device names", () => {
    const composed = "caf\u00e9";
    const decomposed = "cafe\u0301";
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().addNetworkInterface("interface-b");

    useProjectStore
      .getState()
      .updateNetworkInterface("interface-a", { name: composed });
    useProjectStore
      .getState()
      .updateNetworkInterface("interface-b", { name: decomposed });

    expect(networking().interfaces[0]?.name).toBe(composed);
    expect(networking().interfaces[1]?.name).toBe(decomposed);
    expect(networking().interfaces[0]?.name).not.toBe(
      networking().interfaces[1]?.name,
    );
  });

  it("no-ops when no canonical project is loaded", () => {
    useProjectStore.setState(initialState);

    expect(
      useProjectStore.getState().addNetworkInterface("interface-a"),
    ).toBeUndefined();
    useProjectStore
      .getState()
      .updateNetworkInterface("interface-a", { name: "eno1" });
    useProjectStore.getState().removeNetworkInterface("interface-a");
    useProjectStore.getState().moveNetworkInterface("interface-a", "up");

    expect(useProjectStore.getState()).toMatchObject(initialState);
  });

  it("rejects a non-canonical networking section at the runtime boundary", () => {
    const project = createDefaultProject("Invalid Networking");
    project.networking = { interfaces: "invalid" } as unknown as NetworkingConfig;
    useProjectStore.getState().loadProject(project);
    const before = useProjectStore.getState().project;

    expect(
      useProjectStore.getState().addNetworkInterface("interface-a"),
    ).toBeUndefined();
    expect(useProjectStore.getState().project).toBe(before);
    expect(useProjectStore.getState().isDirty).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../src/models/project.ts";
import {
  createBuilderValueRow,
  createBlankNetworkInterface,
  createDefaultRoute,
  createDualStackDhcpExample,
  createIpv4DhcpExample,
  createSpecificRoute,
  createStaticIpv4Example,
  type NetworkingConfig,
} from "../../src/models/networking.ts";
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
      createBlankNetworkInterface("interface-a"),
      createBlankNetworkInterface("interface-b"),
    ]);
  });

  it("allocates automatic IDs around collisions with loaded interfaces", () => {
    const collidingUuid = "00000000-0000-4000-8000-000000000001";
    const uniqueUuid = "00000000-0000-4000-8000-000000000002";
    const loadedId = `network-interface-${collidingUuid}`;
    const project = createDefaultProject("Loaded Networking");
    project.networking.interfaces.push({
      ...createBlankNetworkInterface(loadedId),
      name: "ens18",
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
        ...createBlankNetworkInterface("interface-a"),
        identityMode: "mac",
        name: "eno1",
        macAddress: "AA:BB:CC:DD:EE:FF",
      },
      createBlankNetworkInterface("interface-b"),
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
        ...createBlankNetworkInterface("interface-b"),
        macAddress: "aa:bb:cc:dd:ee:ff",
      },
      {
        ...createBlankNetworkInterface("interface-a"),
        identityMode: "mac",
        name: "eno1",
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

  it("updates DHCP by exact interface and family while clearing only its marker", () => {
    const project = createDefaultProject("DHCP targeting");
    project.networking.interfaces = [
      {
        ...createBlankNetworkInterface("interface-a"),
        exampleFields: ["name", "dhcp4", "dhcp6"],
      },
      createBlankNetworkInterface("interface-b"),
    ];
    useProjectStore.getState().loadProject(project);

    useProjectStore
      .getState()
      .setNetworkDhcp("interface-a", "ipv4", true);

    expect(networking().interfaces).toEqual([
      {
        ...createBlankNetworkInterface("interface-a"),
        dhcp4: true,
        exampleFields: ["name", "dhcp6"],
      },
      createBlankNetworkInterface("interface-b"),
    ]);
  });

  it("adds, updates, and removes family-owned addresses by stable ID", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().addNetworkInterface("interface-b");

    expect(
      useProjectStore
        .getState()
        .addNetworkAddress("interface-a", "ipv4", "address-a"),
    ).toBe("address-a");
    expect(
      useProjectStore
        .getState()
        .addNetworkAddress("interface-a", "ipv4", "address-b"),
    ).toBe("address-b");
    expect(
      useProjectStore
        .getState()
        .addNetworkAddress("interface-a", "ipv6", "address-v6"),
    ).toBe("address-v6");

    useProjectStore
      .getState()
      .updateNetworkAddress("interface-a", "ipv4", "address-a", "192.0.2.10/24");
    useProjectStore
      .getState()
      .removeNetworkAddress("interface-a", "ipv4", "address-b");

    expect(networking().interfaces[0]).toMatchObject({
      ipv4Addresses: [
        createBuilderValueRow("address-a", "192.0.2.10/24", false),
      ],
      ipv6Addresses: [createBuilderValueRow("address-v6")],
    });
    expect(networking().interfaces[1]).toEqual(
      createBlankNetworkInterface("interface-b"),
    );
  });

  it("adds discriminated routes and edits only the requested route field", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");

    expect(
      useProjectStore
        .getState()
        .addNetworkRoute("interface-a", "ipv4", "default", "route-default"),
    ).toBe("route-default");
    expect(
      useProjectStore
        .getState()
        .addNetworkRoute("interface-a", "ipv4", "specific", "route-specific"),
    ).toBe("route-specific");

    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "interface-a",
        "ipv4",
        "route-specific",
        "destination",
        "198.51.100.0/24",
      );
    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "interface-a",
        "ipv4",
        "route-default",
        "gateway",
        "192.0.2.1",
      );
    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "interface-a",
        "ipv4",
        "route-default",
        "metric",
        "001",
      );

    expect(networking().interfaces[0]?.ipv4Routes).toEqual([
      createDefaultRoute("route-default", "192.0.2.1", "001"),
      createSpecificRoute("route-specific", "198.51.100.0/24"),
    ]);

    useProjectStore
      .getState()
      .removeNetworkRoute("interface-a", "ipv4", "route-default");
    expect(networking().interfaces[0]?.ipv4Routes.map((route) => route.id)).toEqual([
      "route-specific",
    ]);
  });

  it("targets mixed-family nameservers and search domains independently", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");

    expect(
      useProjectStore
        .getState()
        .addNetworkNameserver("interface-a", "nameserver-a"),
    ).toBe("nameserver-a");
    expect(
      useProjectStore
        .getState()
        .addNetworkSearchDomain("interface-a", "search-a"),
    ).toBe("search-a");

    useProjectStore
      .getState()
      .updateNetworkNameserver("interface-a", "nameserver-a", "2001:db8::53");
    useProjectStore
      .getState()
      .updateNetworkSearchDomain("interface-a", "search-a", "lab.example");

    expect(networking().interfaces[0]).toMatchObject({
      nameservers: [
        createBuilderValueRow("nameserver-a", "2001:db8::53", false),
      ],
      searchDomains: [
        createBuilderValueRow("search-a", "lab.example", false),
      ],
    });

    useProjectStore
      .getState()
      .removeNetworkNameserver("interface-a", "nameserver-a");
    useProjectStore
      .getState()
      .removeNetworkSearchDomain("interface-a", "search-a");
    expect(networking().interfaces[0]).toMatchObject({
      nameservers: [],
      searchDomains: [],
    });
  });

  it("preserves raw MTU drafts and clears the draft atomically when disabled", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");

    useProjectStore.getState().setNetworkMtuEnabled("interface-a", true);
    useProjectStore.getState().updateNetworkMtu("interface-a", "001500");
    expect(networking().interfaces[0]).toMatchObject({
      mtuEnabled: true,
      mtu: "001500",
    });

    useProjectStore.getState().setNetworkMtuEnabled("interface-a", false);
    expect(networking().interfaces[0]).toMatchObject({
      mtuEnabled: false,
      mtu: "",
    });
  });

  it("clears provenance locally and keeps unresolved, duplicate, and equal nested writes as no-ops", () => {
    const project = createDefaultProject("No-op networking");
    project.networking.interfaces = [
      {
        ...createBlankNetworkInterface("interface-a"),
        ipv4Addresses: [
          createBuilderValueRow("address-a", "192.0.2.10/24", true),
        ],
        ipv4Routes: [
          createSpecificRoute(
            "route-a",
            "198.51.100.0/24",
            "192.0.2.1",
            "10",
            true,
          ),
        ],
        nameservers: [
          createBuilderValueRow("nameserver-a", "192.0.2.53", true),
        ],
        searchDomains: [
          createBuilderValueRow("search-a", "lab.example", true),
        ],
        mtuEnabled: true,
        mtu: "1500",
        exampleFields: ["name", "mtu"],
      },
    ];
    useProjectStore.getState().loadProject(project);

    useProjectStore
      .getState()
      .updateNetworkAddress("interface-a", "ipv4", "address-a", "192.0.2.11/24");
    useProjectStore
      .getState()
      .updateNetworkRouteField(
        "interface-a",
        "ipv4",
        "route-a",
        "gateway",
        "192.0.2.254",
      );
    useProjectStore
      .getState()
      .updateNetworkNameserver("interface-a", "nameserver-a", "2001:db8::53");
    useProjectStore.getState().updateNetworkMtu("interface-a", "9000");

    expect(networking().interfaces[0]).toMatchObject({
      ipv4Addresses: [expect.objectContaining({ isExampleValue: false })],
      ipv4Routes: [
        expect.objectContaining({
          exampleFields: ["destination", "metric"],
        }),
      ],
      nameservers: [expect.objectContaining({ isExampleValue: false })],
      searchDomains: [expect.objectContaining({ isExampleValue: true })],
      exampleFields: ["name"],
    });
    useProjectStore.getState().markSaved();

    const assertNoOp = (action: () => unknown) => {
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
        .addNetworkAddress("interface-a", "ipv4", "address-a"),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .addNetworkRoute("interface-a", "ipv4", "default", "route-a"),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .addNetworkNameserver("interface-a", "nameserver-a"),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .addNetworkSearchDomain("interface-a", "search-a"),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .updateNetworkAddress("missing", "ipv4", "address-a", "ignored"),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .updateNetworkRouteField(
          "interface-a",
          "ipv4",
          "missing",
          "metric",
          "10",
        ),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .updateNetworkSearchDomain("interface-a", "search-a", "lab.example"),
    );
    assertNoOp(() =>
      useProjectStore.getState().updateNetworkMtu("interface-a", "9000"),
    );
    assertNoOp(() =>
      useProjectStore
        .getState()
        .updateNetworkRouteField(
          "interface-a",
          "ipv4",
          "route-a",
          "destination",
          "198.51.100.0/24",
        ),
    );
  });

  it.each([
    {
      kind: "ipv4-dhcp" as const,
      uuids: ["00000000-0000-4000-8000-000000000101"],
      expected: () =>
        createIpv4DhcpExample(
          "network-interface-00000000-0000-4000-8000-000000000101",
        ),
    },
    {
      kind: "static-ipv4" as const,
      uuids: [
        "00000000-0000-4000-8000-000000000201",
        "00000000-0000-4000-8000-000000000202",
        "00000000-0000-4000-8000-000000000203",
        "00000000-0000-4000-8000-000000000204",
        "00000000-0000-4000-8000-000000000205",
      ],
      expected: () =>
        createStaticIpv4Example(
          "network-interface-00000000-0000-4000-8000-000000000201",
          {
            address:
              "network-address-00000000-0000-4000-8000-000000000202",
            route: "network-route-00000000-0000-4000-8000-000000000203",
            nameserver:
              "network-nameserver-00000000-0000-4000-8000-000000000204",
            searchDomain:
              "network-search-domain-00000000-0000-4000-8000-000000000205",
          },
        ),
    },
    {
      kind: "dual-stack-dhcp" as const,
      uuids: ["00000000-0000-4000-8000-000000000301"],
      expected: () =>
        createDualStackDhcpExample(
          "network-interface-00000000-0000-4000-8000-000000000301",
        ),
    },
  ])("applies the $kind example as one canonical interface", ({
    kind,
    uuids,
    expected,
  }) => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => {
      const next = uuids.shift();
      if (!next) throw new Error("unexpected example ID allocation");
      return next as `${string}-${string}-${string}-${string}-${string}`;
    });
    let updates = 0;
    const unsubscribe = useProjectStore.subscribe(() => {
      updates += 1;
    });
    const before = useProjectStore.getState().project?.metadata.updatedAt;
    vi.advanceTimersByTime(1_000);

    const interfaceId = useProjectStore.getState().applyNetworkExample(kind);

    unsubscribe();
    const state = useProjectStore.getState();
    expect(interfaceId).toBe(expected().id);
    expect(networking().interfaces).toEqual([expected()]);
    expect(state.isDirty).toBe(true);
    expect(state.project?.metadata.updatedAt).not.toBe(before);
    expect(updates).toBe(1);
    expect(networking().interfaces[0]).not.toHaveProperty("provider");
    expect(networking().interfaces[0]).not.toHaveProperty("exampleType");
  });

  it("keeps nonempty and unknown example requests as exact no-ops", () => {
    useProjectStore.getState().addNetworkInterface("interface-a");
    useProjectStore.getState().markSaved();
    const projectBefore = useProjectStore.getState().project;
    const updatedAtBefore = projectBefore?.metadata.updatedAt;
    vi.advanceTimersByTime(1_000);

    expect(
      useProjectStore.getState().applyNetworkExample("ipv4-dhcp"),
    ).toBeUndefined();
    expect(
      useProjectStore
        .getState()
        .applyNetworkExample("unknown" as "ipv4-dhcp"),
    ).toBeUndefined();
    expectCurrentStateUnchanged(projectBefore, false, updatedAtBefore);
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import identityNetworkingFull from "../fixtures/identity-networking-full.yaml?raw";
import { generateCloudInit } from "../../src/generators/generateCloudInit.ts";
import { MainLayout } from "../../src/layouts/MainLayout.tsx";
import { createBlankNetworkInterface } from "../../src/models/networking.ts";
import { createDefaultProject, type ProjectFile } from "../../src/models/project.ts";
import { toGenerateInput } from "../../src/services/yamlService.ts";
import { useProjectStore } from "../../src/state/projectStore.ts";
import { validateConfig } from "../../src/validators/validateConfig.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [],
};

function row(id: string, value: string) {
  return { id, value, isExampleValue: false };
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read Blob."));
    reader.readAsText(blob);
  });
}

function validProject(): ProjectFile {
  const project = createDefaultProject("Output contract");
  project.identity = { hostname: "web01" };
  project.users = undefined;
  project.networking.interfaces = [
    {
      ...createBlankNetworkInterface("network-interface-ens18"),
      name: "ens18",
      dhcp4: true,
      ipv4Addresses: [row("v4-address", "192.0.2.10/24")],
      ipv6Addresses: [row("v6-address", "2001:db8::10/64")],
      ipv4Routes: [{ id: "v4-default", kind: "default", gateway: "192.0.2.1", metric: "100", exampleFields: [] }],
      ipv6Routes: [{ id: "v6-specific", kind: "specific", destination: "2001:db8:1::/64", gateway: "2001:db8::1", metric: "", exampleFields: [] }],
      nameservers: [row("dns-v4", "192.0.2.53"), row("dns-v6", "2001:db8::53")],
      searchDomains: [row("search", "lab.example")],
      mtuEnabled: true,
      mtu: "1500",
    },
    {
      ...createBlankNetworkInterface("network-interface-mac"),
      identityMode: "mac",
      name: "inactive-name-draft",
      macAddress: "52:54:00:12:34:56",
      dhcp6: true,
    },
  ];
  return project;
}

describe("networking output contract", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  let blob: Blob | undefined;
  let click: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.setState({ project: validProject() });
    click = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    class TestUrl extends URL {
      static createObjectURL(value: Blob) {
        blob = value;
        return "blob:output-contract";
      }

      static revokeObjectURL() {}
    }
    vi.stubGlobal("URL", TestUrl);
    click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    writeText.mockClear();
    blob = undefined;
  });

  it("keeps Preview, Clipboard, download, direct generation, and the fixture byte-identical", async () => {
    const { container } = render(<MainLayout />);
    act(() => vi.advanceTimersByTime(300));
    const project = useProjectStore.getState().project!;
    const direct = generateCloudInit(toGenerateInput(project)).yaml;

    expect(validateConfig(project).filter((issue) => issue.severity === "error")).toEqual([]);
    expect(container.querySelector("pre code")?.textContent).toBe(identityNetworkingFull);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy YAML" }));
      await Promise.resolve();
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Export YAML" }));
    });
    vi.useRealTimers();

    expect(direct).toBe(identityNetworkingFull);
    expect(writeText).toHaveBeenCalledWith(identityNetworkingFull);
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobText(blob!)).toBe(identityNetworkingFull);
    expect(click).toHaveBeenCalledOnce();
    expect(identityNetworkingFull).not.toMatch(/network-interface|inactive-name|exampleFields|disclosure/i);
  });

  it("blocks all output effects without altering the invalid snapshot while warnings remain eligible", async () => {
    const { container } = render(<MainLayout />);
    const invalid = structuredClone(useProjectStore.getState().project!);
    invalid.networking.interfaces[0]!.name = "";
    invalid.networking.interfaces[0]!.macAddress = "not-a-mac";
    invalid.networking.interfaces[0]!.identityMode = "mac";
    act(() => {
      useProjectStore.setState({ project: invalid });
    });

    expect(container.querySelectorAll("pre code")).toHaveLength(0);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy YAML" }));
      await Promise.resolve();
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Export YAML" }));
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(blob).toBeUndefined();
    expect(click).not.toHaveBeenCalled();
    expect(useProjectStore.getState().project).toEqual(invalid);

    const warning = validProject();
    warning.networking.interfaces[0]!.dhcp4 = true;
    act(() => {
      useProjectStore.setState({ project: warning });
    });
    act(() => vi.advanceTimersByTime(300));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy YAML" }));
      await Promise.resolve();
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Export YAML" }));
    });
    expect(container.querySelector("pre code")?.textContent).toBe(
      generateCloudInit(toGenerateInput(warning)).yaml,
    );
    expect(writeText).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});

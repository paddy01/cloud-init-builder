import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NetworkingSection } from "../../../../src/components/networking/NetworkingSection.tsx";
import { createDefaultProject } from "../../../../src/models/project.ts";
import type { NetworkingConfig } from "../../../../src/models/networking.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

function networking(): NetworkingConfig {
  const value = useProjectStore.getState().project?.networking;
  if (!value) throw new Error("expected canonical networking config");
  return value;
}

function seedInterface(
  id: string,
  patch: Partial<NetworkingConfig["interfaces"][number]> = {},
) {
  useProjectStore.getState().addNetworkInterface(id);
  useProjectStore.getState().updateNetworkInterface(id, patch);
}

describe("NetworkingWorkflow", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Networking Workflow");
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows one add action and focuses the appended name-mode card", () => {
    render(<NetworkingSection />);

    expect(screen.getByText("No interfaces yet")).toBeInTheDocument();
    const addButtons = screen.getAllByRole("button", { name: "Add interface" });
    expect(addButtons).toHaveLength(1);

    fireEvent.click(addButtons[0]!);

    expect(networking().interfaces).toHaveLength(1);
    expect(networking().interfaces[0]?.identityMode).toBe("name");
    expect(screen.getByRole("textbox", { name: "Device name" })).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("preserves exact selector drafts and derives the title from the active draft", () => {
    seedInterface("interface-a");
    render(<NetworkingSection />);

    fireEvent.change(screen.getByRole("textbox", { name: "Device name" }), {
      target: { value: "  ens18  " },
    });
    expect(screen.getByRole("article", { name: "ens18" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "MAC address" }));
    fireEvent.change(screen.getByRole("textbox", { name: "MAC address" }), {
      target: { value: " AA:BB:CC:DD:EE:FF " },
    });
    expect(
      screen.getByRole("article", { name: "AA:BB:CC:DD:EE:FF" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Device name" }));
    expect(screen.getByRole("textbox", { name: "Device name" })).toHaveValue(
      "  ens18  ",
    );
    expect(networking().interfaces[0]?.macAddress).toBe(
      " AA:BB:CC:DD:EE:FF ",
    );
  });

  it("moves one position, announces it, and focuses the enabled opposite control", () => {
    seedInterface("interface-a", { name: "ens18" });
    seedInterface("interface-b", { name: "ens19" });
    render(<NetworkingSection />);

    const moveDown = screen.getByRole("button", { name: "Move ens18 down" });
    fireEvent.click(moveDown);

    expect(networking().interfaces.map((entry) => entry.id)).toEqual([
      "interface-b",
      "interface-a",
    ]);
    expect(screen.getByText("Interface moved to position 2 of 2.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move ens18 up" })).toHaveFocus();
  });

  it("removes a blank card immediately and focuses Add interface", () => {
    seedInterface("interface-a");
    render(<NetworkingSection />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Interface 1" }));

    expect(networking().interfaces).toHaveLength(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add interface" })).toHaveFocus();
  });

  it("cancels populated removal and restores focus to the originating control", () => {
    seedInterface("interface-a", { name: "ens18" });
    render(<NetworkingSection />);

    const remove = screen.getByRole("button", { name: "Remove ens18" });
    fireEvent.click(remove);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Keep interface" })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(remove).toHaveFocus();
    expect(networking().interfaces).toHaveLength(1);
  });

  it("confirms populated removal and focuses the next card's active field", () => {
    seedInterface("interface-a", { name: "ens18" });
    seedInterface("interface-b", {
      identityMode: "mac",
      macAddress: "52:54:00:12:34:56",
    });
    render(<NetworkingSection />);

    fireEvent.click(screen.getByRole("button", { name: "Remove ens18" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove interface" }));

    expect(networking().interfaces.map((entry) => entry.id)).toEqual([
      "interface-b",
    ]);
    expect(screen.getByRole("textbox", { name: "MAC address" })).toHaveFocus();
  });

  it("uses native radio keyboard behavior while retaining both exact drafts", async () => {
    const user = userEvent.setup();
    seedInterface("interface-a", {
      name: " enp1s0 ",
      macAddress: "aa:bb:cc:dd:ee:ff",
    });
    render(<NetworkingSection />);

    const nameMode = screen.getByRole("radio", { name: "Device name" });
    await user.click(nameMode);
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "MAC address" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "MAC address" })).toHaveValue(
      "aa:bb:cc:dd:ee:ff",
    );

    await user.keyboard("{ArrowLeft}");
    expect(nameMode).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Device name" })).toHaveValue(
      " enp1s0 ",
    );
    expect(networking().interfaces[0]).toMatchObject({
      identityMode: "name",
      name: " enp1s0 ",
      macAddress: "aa:bb:cc:dd:ee:ff",
    });
  });

  it("keeps populated cards from both the safe action and trapped dialog focus", async () => {
    const user = userEvent.setup();
    seedInterface("interface-a", { name: "ens18" });
    render(<NetworkingSection />);

    const remove = screen.getByRole("button", { name: "Remove ens18" });
    await user.click(remove);
    const dialog = screen.getByRole("dialog");
    const keep = within(dialog).getByRole("button", { name: "Keep interface" });
    const confirm = within(dialog).getByRole("button", { name: "Remove interface" });

    expect(keep).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(confirm).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(keep).toHaveFocus();
    await user.click(keep);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(remove).toHaveFocus();
    expect(networking().interfaces).toHaveLength(1);
  });

  it("focuses the previous field, then Add interface, after confirmed removals", () => {
    seedInterface("interface-a", { name: "ens18" });
    seedInterface("interface-b", { name: "ens19" });
    render(<NetworkingSection />);

    fireEvent.click(screen.getByRole("button", { name: "Remove ens19" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove interface" }));
    expect(screen.getByRole("textbox", { name: "Device name" })).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Device name" })).toHaveValue(
      "ens18",
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove ens18" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove interface" }));
    expect(screen.getByRole("button", { name: "Add interface" })).toHaveFocus();
    expect(networking().interfaces).toHaveLength(0);
  });

  it("keeps boundary controls disabled without dirtying or announcing a no-op", () => {
    seedInterface("interface-a", { name: "ens18" });
    seedInterface("interface-b", { name: "ens19" });
    useProjectStore.getState().markSaved();
    const projectBefore = useProjectStore.getState().project;
    const updatedAtBefore = projectBefore?.metadata.updatedAt;
    render(<NetworkingSection />);

    const firstUp = screen.getByRole("button", { name: "Move ens18 up" });
    const lastDown = screen.getByRole("button", { name: "Move ens19 down" });
    expect(firstUp).toBeDisabled();
    expect(lastDown).toBeDisabled();
    fireEvent.click(firstUp);
    fireEvent.click(lastDown);

    const state = useProjectStore.getState();
    expect(state.project).toBe(projectBefore);
    expect(state.project?.metadata.updatedAt).toBe(updatedAtBefore);
    expect(state.isDirty).toBe(false);
    expect(
      screen.queryByText(/Interface moved to position/),
    ).not.toBeInTheDocument();
  });

  it("uses immediate scrolling when reduced motion is preferred", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<NetworkingSection />);

    fireEvent.click(screen.getByRole("button", { name: "Add interface" }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
  });

  it("renders no-project and invalid-runtime states without mutation controls", () => {
    useProjectStore.setState(initialState);
    const { rerender } = render(<NetworkingSection />);

    expect(screen.getByText("No project loaded")).toBeInTheDocument();
    expect(
      screen.getByText("Create or open a project to configure networking."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add interface" })).toBeNull();

    const invalidProject = createDefaultProject("Invalid networking");
    invalidProject.networking = {
      interfaces: "invalid",
    } as unknown as NetworkingConfig;
    act(() => {
      useProjectStore.setState({ project: invalidProject });
    });
    rerender(<NetworkingSection />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Networking couldn't be displayed. Reopen the project and review any import warnings.",
    );
    expect(screen.queryByRole("button", { name: "Add interface" })).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutEffect, type ReactNode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { CommandsSection } from "../../../../src/components/commands/CommandsSection.tsx";
import { PreviewPanel } from "../../../../src/components/preview/PreviewPanel.tsx";
import { isCommandsConfig } from "../../../../src/models/commands.ts";
import {
  UserValidationProvider,
  useUserValidation,
} from "../../../../src/components/users/UserValidationContext.tsx";
import { useProjectStore } from "../../../../src/state/projectStore.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

const REMOVE_CONFIRM =
  "Remove command? This removes the command from the project and changes the execution order.";

function CommandsRevealHarness({ children }: { children?: ReactNode }) {
  const { revealAllValidation } = useUserValidation();

  useLayoutEffect(() => {
    revealAllValidation();
  }, [revealAllValidation]);

  return (
    <>
      <CommandsSection />
      {children}
    </>
  );
}

describe("CommandsSection", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Test");
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function commands() {
    const project = useProjectStore.getState().project;
    expect(isCommandsConfig(project?.commands)).toBe(true);
    if (!project || !isCommandsConfig(project.commands)) {
      throw new Error("expected commands config");
    }
    return project.commands;
  }

  function shellCommandValues() {
    return screen
      .getAllByLabelText("Command")
      .map((input) => (input as HTMLTextAreaElement).value);
  }

  function runcmdLinesFromPreview(container: HTMLElement) {
    const yaml = container.querySelector("pre code")?.textContent ?? "";
    const lines = yaml.split("\n");
    const start = lines.findIndex((line) => line === "runcmd:");
    if (start === -1) {
      return [];
    }

    const entries: string[] = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (!line.startsWith("  - ")) {
        break;
      }
      entries.push(line.slice(4));
    }
    return entries;
  }

  async function advancePreviewDebounce() {
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
  }

  it("defaults to Run commands with guidance and zero counts", () => {
    render(<CommandsSection />);

    expect(
      screen.getByRole("heading", { name: "Commands" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add ordered commands for early boot or first-boot setup without writing cloud-init YAML.",
      ),
    ).toBeInTheDocument();

    const runTab = screen.getByRole("tab", { name: /Run commands/i });
    const bootTab = screen.getByRole("tab", { name: /Boot commands/i });

    expect(runTab).toHaveAttribute("aria-selected", "true");
    expect(bootTab).toHaveAttribute("aria-selected", "false");
    expect(within(runTab).getByText("0")).toBeInTheDocument();
    expect(within(bootTab).getByText("0")).toBeInTheDocument();
    expect(screen.getByText("First-boot runtime commands")).toBeInTheDocument();
    expect(
      screen.queryByText("Boot commands run early on every boot"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("No run commands yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add run command" }),
    ).toBeInTheDocument();
  });

  it("shows Boot caution copy when Boot commands tab is active", () => {
    render(<CommandsSection />);

    fireEvent.click(screen.getByRole("tab", { name: /Boot commands/i }));

    expect(
      screen.getByText("Boot commands run early on every boot"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use boot commands only for low-level, idempotent tasks. Networking, users, packages, and later cloud-init configuration may not be ready yet.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No boot commands yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add boot command" }),
    ).toBeInTheDocument();
  });

  it("supports keyboard tab navigation and updates counts per stage", () => {
    render(<CommandsSection />);

    const tablist = screen.getByRole("tablist", { name: "Command stages" });
    const runTab = within(tablist).getByRole("tab", { name: /Run commands/i });
    const bootTab = within(tablist).getByRole("tab", { name: /Boot commands/i });

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(bootTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "Add boot command" }));
    expect(within(bootTab).getByText("1")).toBeInTheDocument();
    expect(within(runTab).getByText("0")).toBeInTheDocument();

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(runTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    expect(within(runTab).getByText("2")).toBeInTheDocument();
    expect(commands().runcmd).toHaveLength(2);
    expect(commands().bootcmd).toHaveLength(1);
  });

  it("adds, removes, and reorders shell commands in the active stage", () => {
    render(<CommandsSection />);

    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    const firstCommand = screen.getByLabelText("Command");
    expect(firstCommand).toHaveFocus();
    fireEvent.change(firstCommand, {
      target: { value: "systemctl enable qemu-guest-agent" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    const commandInputs = screen.getAllByLabelText("Command");
    expect(commandInputs[1]).toHaveFocus();
    fireEvent.change(commandInputs[1]!, {
      target: { value: "apt-get update" },
    });

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Command 1")).toBeInTheDocument();
    expect(screen.getByText("Command 2")).toBeInTheDocument();

    fireEvent.click(
      within(cards[1]!).getByRole("button", { name: "Move up" }),
    );
    expect(
      commands().runcmd.map((entry) =>
        entry.form === "shell" ? entry.command : "",
      ),
    ).toEqual(["apt-get update", "systemctl enable qemu-guest-agent"]);
    expect(
      screen.getByText("Run command moved to position 1 of 2."),
    ).toBeInTheDocument();

    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(
      within(screen.getAllByRole("article")[0]!).getByRole("button", {
        name: "Remove command",
      }),
    );
    expect(window.confirm).toHaveBeenCalledWith(REMOVE_CONFIRM);
    expect(commands().runcmd).toHaveLength(1);
    const remaining = commands().runcmd[0];
    expect(remaining?.form).toBe("shell");
    if (remaining?.form === "shell") {
      expect(remaining.command).toBe("systemctl enable qemu-guest-agent");
    }
  });

  it("removes blank commands immediately without confirmation", () => {
    render(<CommandsSection />);

    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    fireEvent.click(
      within(screen.getByRole("article")).getByRole("button", {
        name: "Remove command",
      }),
    );

    expect(window.confirm).not.toHaveBeenCalled();
    expect(commands().runcmd).toHaveLength(0);
  });

  it("renders command text literally without HTML injection", () => {
    render(<CommandsSection />);

    fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
    const payload = '<img src=x onerror="alert(1)">';
    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: payload },
    });

    expect(screen.getByDisplayValue(payload)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("keeps reorder controls focused, updates visible order, and syncs preview for both directions", async () => {
    vi.useFakeTimers();

    const project = useProjectStore.getState().project;
    if (!project) {
      throw new Error("expected project");
    }
    project.identity = { hostname: "cmd-host" };
    useProjectStore.setState({ project: { ...project } });

    const { container } = render(
      <>
        <CommandsSection />
        <PreviewPanel />
      </>,
    );

    const addRunCommand = (value: string) => {
      fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
      const inputs = screen.getAllByLabelText("Command");
      fireEvent.change(inputs[inputs.length - 1]!, {
        target: { value },
      });
    };

    addRunCommand("alpha-command");
    addRunCommand("beta-command");
    addRunCommand("gamma-command");

    expect(shellCommandValues()).toEqual([
      "alpha-command",
      "beta-command",
      "gamma-command",
    ]);
    await advancePreviewDebounce();
    expect(runcmdLinesFromPreview(container)).toEqual([
      "alpha-command",
      "beta-command",
      "gamma-command",
    ]);

    const thirdCard = screen.getAllByRole("article")[2]!;
    fireEvent.click(
      within(thirdCard).getByRole("button", { name: "Move up" }),
    );

    expect(shellCommandValues()).toEqual([
      "alpha-command",
      "gamma-command",
      "beta-command",
    ]);
    expect(
      within(screen.getAllByRole("article")[1]!).getByRole("button", {
        name: "Move up",
      }),
    ).toHaveFocus();
    expect(
      screen.getByText("Run command moved to position 2 of 3."),
    ).toBeInTheDocument();
    await advancePreviewDebounce();
    expect(runcmdLinesFromPreview(container)).toEqual([
      "alpha-command",
      "gamma-command",
      "beta-command",
    ]);

    const firstCard = screen.getAllByRole("article")[0]!;
    fireEvent.click(
      within(firstCard).getByRole("button", { name: "Move down" }),
    );

    expect(shellCommandValues()).toEqual([
      "gamma-command",
      "alpha-command",
      "beta-command",
    ]);
    expect(
      within(screen.getAllByRole("article")[1]!).getByRole("button", {
        name: "Move down",
      }),
    ).toHaveFocus();
    expect(
      screen.getByText("Run command moved to position 2 of 3."),
    ).toBeInTheDocument();
    await advancePreviewDebounce();
    expect(runcmdLinesFromPreview(container)).toEqual([
      "gamma-command",
      "alpha-command",
      "beta-command",
    ]);

    vi.useRealTimers();
  });

  it("switches to Boot commands and focuses the invalid field when activating a cross-stage issue", async () => {
    render(
      <UserValidationProvider>
        <CommandsRevealHarness />
      </UserValidationProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Boot commands/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add boot command" }));

    const bootCommand = screen.getByLabelText("Command");
    fireEvent.change(bootCommand, { target: { value: "apt-get update" } });
    fireEvent.change(bootCommand, { target: { value: "" } });
    fireEvent.blur(bootCommand);

    fireEvent.click(screen.getByRole("tab", { name: /Run commands/i }));
    expect(screen.getByRole("tab", { name: /Run commands/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const issueButton = await screen.findByRole("button", {
      name: /Boot command 1: Export blocked: enter a command/i,
    });
    fireEvent.click(issueButton);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Boot commands/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByLabelText("Command")).toHaveFocus();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MainLayout } from "../../../../src/layouts/MainLayout.tsx";
import { isCommandsConfig } from "../../../../src/models/commands.ts";
import { useProjectStore } from "../../../../src/state/projectStore.ts";
import {
  ARGV_TO_SHELL_CONFIRM,
  SHELL_TO_ARGV_CONFIRM,
} from "../../../../src/utils/commandConversion.ts";

const initialState = {
  project: null,
  lastSavedProject: null,
  isDirty: false,
  importWarnings: [] as { path: string; message: string }[],
};

function commands() {
  const project = useProjectStore.getState().project;
  expect(isCommandsConfig(project?.commands)).toBe(true);
  if (!project || !isCommandsConfig(project.commands)) {
    throw new Error("expected canonical commands");
  }
  return project.commands;
}

function openCommandsSection() {
  fireEvent.click(screen.getByRole("button", { name: "Commands" }));
}

function addRunCommand() {
  fireEvent.click(screen.getByRole("button", { name: "Add run command" }));
}

function getCommandCard(index: number) {
  return screen.getAllByRole("article")[index]!;
}

function selectArgvForm(card: HTMLElement) {
  fireEvent.click(
    within(card).getByRole("radio", { name: "Executable and arguments" }),
  );
}

function selectShellForm(card: HTMLElement) {
  fireEvent.click(within(card).getByRole("radio", { name: "Shell command" }));
}

describe("CommandsWorkflow argv editing and form switching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Commands Workflow");
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("adds argv argument rows with stable IDs and literal values", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();

    const card = getCommandCard(0);
    selectArgvForm(card);

    fireEvent.change(screen.getByLabelText("Executable"), {
      target: { value: "/usr/bin/systemctl" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add argument" }));

    const argumentInput = screen.getByPlaceholderText("e.g. enable");
    expect(argumentInput).toHaveFocus();

    fireEvent.change(argumentInput, { target: { value: "enable" } });
    fireEvent.click(screen.getByRole("button", { name: "Add argument" }));
    fireEvent.change(screen.getAllByPlaceholderText("e.g. enable")[1]!, {
      target: { value: "--now" },
    });

    const stored = commands().runcmd[0];
    expect(stored?.form).toBe("argv");
    if (stored?.form !== "argv") {
      throw new Error("expected argv command");
    }

    expect(stored.executable).toBe("/usr/bin/systemctl");
    expect(stored.arguments.map((argument) => argument.value)).toEqual([
      "enable",
      "--now",
    ]);
    expect(new Set(stored.arguments.map((argument) => argument.id)).size).toBe(2);
  });

  it("auto-converts safe shell commands to argv", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();

    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "systemctl enable --now" },
    });

    selectArgvForm(getCommandCard(0));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Executable")).toHaveValue("systemctl");
    expect(screen.getAllByPlaceholderText("e.g. enable")[0]).toHaveValue("enable");
    expect(screen.getAllByPlaceholderText("e.g. enable")[1]).toHaveValue("--now");
  });

  it("focuses the executable exactly once when switching shell to argv", () => {
    const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");

    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();
    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "systemctl enable --now" },
    });
    focusSpy.mockClear();

    selectArgvForm(getCommandCard(0));

    expect(screen.getByLabelText("Executable")).toHaveFocus();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation for ambiguous shell-to-argv conversion and preserves shell on cancel", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();

    const shellValue = "curl https://example.com | sh";
    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: shellValue },
    });

    vi.mocked(window.confirm).mockReturnValue(false);
    selectArgvForm(getCommandCard(0));

    expect(window.confirm).toHaveBeenCalledWith(SHELL_TO_ARGV_CONFIRM);
    expect(screen.getByLabelText("Command")).toHaveValue(shellValue);
    expect(commands().runcmd[0]?.form).toBe("shell");
  });

  it("clears argv fields after confirming ambiguous shell-to-argv conversion", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();

    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "echo $HOME" },
    });

    vi.mocked(window.confirm).mockReturnValue(true);
    selectArgvForm(getCommandCard(0));

    expect(screen.getByLabelText("Executable")).toHaveValue("");
    expect(screen.queryAllByPlaceholderText("e.g. enable")).toHaveLength(0);

    const stored = commands().runcmd[0];
    expect(stored?.form).toBe("argv");
    if (!stored || stored.form !== "argv") {
      throw new Error("expected argv after confirmed switch");
    }
    expect(stored.executable).toBe("");
    expect(stored.arguments).toEqual([]);
  });

  it("auto-converts safe argv commands to shell", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();

    selectArgvForm(getCommandCard(0));
    fireEvent.change(screen.getByLabelText("Executable"), {
      target: { value: "/usr/bin/systemctl" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add argument" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. enable"), {
      target: { value: "enable" },
    });

    selectShellForm(getCommandCard(0));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Command")).toHaveValue(
      "/usr/bin/systemctl enable",
    );
  });

  it("requires confirmation for ambiguous argv-to-shell conversion and preserves argv on cancel", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();

    selectArgvForm(getCommandCard(0));
    fireEvent.change(screen.getByLabelText("Executable"), {
      target: { value: "printf" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add argument" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. enable"), {
      target: { value: "hello world" },
    });

    vi.mocked(window.confirm).mockReturnValue(false);
    selectShellForm(getCommandCard(0));

    expect(window.confirm).toHaveBeenCalledWith(ARGV_TO_SHELL_CONFIRM);
    expect(screen.getByLabelText("Executable")).toHaveValue("printf");
    expect(screen.getByPlaceholderText("e.g. enable")).toHaveValue("hello world");
    expect(commands().runcmd[0]?.form).toBe("argv");
  });

  it("quotes argv values after confirming ambiguous argv-to-shell conversion", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();

    selectArgvForm(getCommandCard(0));
    fireEvent.change(screen.getByLabelText("Executable"), {
      target: { value: "printf" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add argument" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. enable"), {
      target: { value: "hello world" },
    });

    vi.mocked(window.confirm).mockReturnValue(true);
    selectShellForm(getCommandCard(0));

    expect(screen.getByLabelText("Command")).toHaveValue(`'printf' 'hello world'`);
    expect(commands().runcmd[0]?.form).toBe("shell");
  });

  it("keeps form switching scoped to the selected card", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();
    addRunCommand();

    fireEvent.change(screen.getAllByLabelText("Command")[0]!, {
      target: { value: "systemctl enable" },
    });
    fireEvent.change(screen.getAllByLabelText("Command")[1]!, {
      target: { value: "apt-get update" },
    });

    selectArgvForm(getCommandCard(0));

    expect(commands().runcmd[0]?.form).toBe("argv");
    expect(commands().runcmd[1]?.form).toBe("shell");
    expect(screen.getAllByLabelText("Command")).toHaveLength(1);
    expect(screen.getByLabelText("Executable")).toHaveValue("systemctl");
  });

  it("projects argv commands through the generator without shell parsing", async () => {
    const { mapBuilderCommand } = await import(
      "../../../../src/generators/generateCommands.ts"
    );

    const projected = mapBuilderCommand({
      id: "argv-1",
      form: "argv",
      executable: "printf",
      arguments: [
        { id: "arg-1", value: "|" },
        { id: "arg-2", value: "$HOME" },
      ],
    });

    expect(projected).toEqual(["printf", "|", "$HOME"]);
  });
});

describe("CommandsWorkflow warning visibility", () => {
  beforeEach(() => {
    useProjectStore.setState(initialState);
    useProjectStore.getState().newProject("Commands Workflow");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows recursive-deletion warnings inline in Run commands without blur", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();
    const card = getCommandCard(0);

    fireEvent.change(within(card).getByLabelText("Command"), {
      target: { value: "rm -rf /" },
    });

    expect(
      within(card).getByText(
        /recursive deletion can remove more data than intended/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Command safety warnings")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Warning detection is focused and incomplete. Warnings do not block export./i,
      ),
    ).toBeInTheDocument();
    expect(within(card).getByText("1 warning")).toBeInTheDocument();
  });

  it("shows recursive-deletion warnings in Boot commands without blur", () => {
    render(<MainLayout />);
    openCommandsSection();
    fireEvent.click(screen.getByRole("tab", { name: /Boot commands/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add boot command" }));
    const card = getCommandCard(0);

    fireEvent.change(within(card).getByLabelText("Command"), {
      target: { value: "rm -rf /" },
    });

    expect(
      within(card).getByText(
        /recursive deletion can remove more data than intended/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Command safety warnings")).toBeInTheDocument();
  });

  it("shows remote-content warnings for path-qualified shells without blur", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();
    const card = getCommandCard(0);

    fireEvent.change(within(card).getByLabelText("Command"), {
      target: { value: "curl https://example.com/install.sh | /bin/bash" },
    });

    expect(
      within(card).getByText(
        /piping remote content into a shell can execute untrusted code/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Command safety warnings")).toBeInTheDocument();
  });

  it("does not show remote-content warnings for local text piped to a shell", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();
    const card = getCommandCard(0);

    fireEvent.change(within(card).getByLabelText("Command"), {
      target: { value: "echo hello | /bin/bash" },
    });

    expect(
      within(card).queryByText(
        /piping remote content into a shell can execute untrusted code/i,
      ),
    ).toBeNull();
    expect(screen.queryByText("Command safety warnings")).toBeNull();
  });

  it("keeps structural shell errors hidden until blur", () => {
    render(<MainLayout />);
    openCommandsSection();
    addRunCommand();
    const card = getCommandCard(0);
    const commandInput = within(card).getByLabelText("Command");

    fireEvent.change(commandInput, { target: { value: "apt-get update" } });
    fireEvent.change(commandInput, { target: { value: "" } });

    expect(
      within(card).queryByText(/Export blocked: enter a command/i),
    ).toBeNull();

    fireEvent.blur(commandInput);

    expect(
      within(card).getByText(/Export blocked: enter a command/i),
    ).toBeInTheDocument();
  });
});

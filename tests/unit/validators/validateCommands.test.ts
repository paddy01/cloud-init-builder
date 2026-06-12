import { describe, expect, it } from "vitest";
import {
  createBlankArgvCommand,
  createBlankCommand,
  createBlankCommandArgument,
  type CommandsConfig,
} from "../../../src/models/commands.ts";
import {
  COMMAND_VALIDATION_MESSAGES,
  validateCommands,
} from "../../../src/validators/validateCommands.ts";

function commandsConfig(
  partial: Partial<CommandsConfig> = {},
): CommandsConfig {
  return {
    bootcmd: [],
    runcmd: [],
    ...partial,
  };
}

describe("validateCommands", () => {
  it("returns no issues for undefined commands", () => {
    expect(validateCommands(undefined)).toEqual([]);
  });

  it("returns no issues for empty stages", () => {
    expect(validateCommands(commandsConfig())).toEqual([]);
  });

  it("returns COMMAND_SHELL_REQUIRED for empty shell commands", () => {
    const command = createBlankCommand("shell-empty");
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.shell-empty.command",
      code: "COMMAND_SHELL_REQUIRED",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_SHELL_REQUIRED,
      severity: "error",
    });
  });

  it("returns COMMAND_EXECUTABLE_REQUIRED for argv commands without executable", () => {
    const command = createBlankArgvCommand("argv-empty");
    const issues = validateCommands(commandsConfig({ bootcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.bootcmd.argv-empty.executable",
      code: "COMMAND_EXECUTABLE_REQUIRED",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_EXECUTABLE_REQUIRED,
      severity: "error",
    });
  });

  it("returns COMMAND_ARGUMENT_REQUIRED for blank argv rows", () => {
    const command = createBlankArgvCommand("argv-args");
    command.executable = "/usr/bin/systemctl";
    command.arguments = [
      { id: "arg-1", value: "enable" },
      createBlankCommandArgument("arg-blank"),
    ];
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.argv-args.arguments.arg-blank",
      code: "COMMAND_ARGUMENT_REQUIRED",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_ARGUMENT_REQUIRED,
      severity: "error",
    });
  });

  it("validates both stages regardless of UI tab", () => {
    const run = createBlankCommand("run-empty");
    const boot = createBlankCommand("boot-empty");
    const issues = validateCommands(
      commandsConfig({ runcmd: [run], bootcmd: [boot] }),
    );
    expect(issues.map((issue) => issue.path)).toEqual([
      "commands.runcmd.run-empty.command",
      "commands.bootcmd.boot-empty.command",
    ]);
  });

  it("orders issues by stage, card, and field", () => {
    const first = createBlankArgvCommand("first");
    first.executable = "/bin/true";
    first.arguments = [createBlankCommandArgument("blank-arg")];

    const second = createBlankCommand("second");
    second.command = "echo ok";

    const issues = validateCommands(
      commandsConfig({ runcmd: [first, second], bootcmd: [] }),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "COMMAND_ARGUMENT_REQUIRED",
    ]);
  });

  it("warns on remote content piped to shell", () => {
    const command = createBlankCommand("remote-pipe");
    command.command = "curl https://example.com/install.sh | bash";
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.remote-pipe.command",
      code: "COMMAND_REMOTE_PIPE_SHELL",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_REMOTE_PIPE_SHELL,
      severity: "warning",
    });
  });

  it("does not warn when curl output is not piped to a shell", () => {
    const command = createBlankCommand("safe-curl");
    command.command = "curl -fsSL https://example.com/file.txt -o /tmp/file.txt";
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(
      issues.some((issue) => issue.code === "COMMAND_REMOTE_PIPE_SHELL"),
    ).toBe(false);
  });

  it("warns on recursive deletion", () => {
    const command = createBlankCommand("recursive-rm");
    command.command = "rm -rf /var/tmp/build";
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.recursive-rm.command",
      code: "COMMAND_RECURSIVE_DELETE",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_RECURSIVE_DELETE,
      severity: "warning",
    });
  });

  it("warns on recursive permission changes", () => {
    const command = createBlankCommand("recursive-chmod");
    command.command = "chmod -R 755 /srv/app";
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.recursive-chmod.command",
      code: "COMMAND_PERMISSION_CHANGE",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_PERMISSION_CHANGE,
      severity: "warning",
    });
  });

  it("warns on broad chmod modes", () => {
    const command = createBlankCommand("broad-chmod");
    command.command = "chmod 777 /tmp/shared";
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.broad-chmod.command",
      code: "COMMAND_PERMISSION_CHANGE",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_PERMISSION_CHANGE,
      severity: "warning",
    });
  });

  it("warns on interactive commands", () => {
    const command = createBlankCommand("interactive");
    command.command = "passwd deploy";
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.interactive.command",
      code: "COMMAND_INTERACTIVE",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_INTERACTIVE,
      severity: "warning",
    });
  });

  it("does not treat argv metacharacters as shell operators", () => {
    const command = createBlankArgvCommand("literal-pipe");
    command.executable = "/usr/bin/tee";
    command.arguments = [{ id: "arg-1", value: "a|b" }];
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues.filter((issue) => issue.severity === "warning")).toEqual([]);
  });

  it("warns on explicit bash -c scripts", () => {
    const command = createBlankArgvCommand("bash-script");
    command.executable = "/bin/bash";
    command.arguments = [
      { id: "arg-1", value: "-c" },
      { id: "arg-2", value: "curl https://example.com/install.sh | bash" },
    ];
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues).toContainEqual({
      path: "commands.runcmd.bash-script.executable",
      code: "COMMAND_REMOTE_PIPE_SHELL",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_REMOTE_PIPE_SHELL,
      severity: "warning",
    });
  });

  it("keeps warnings non-blocking while structural errors remain errors", () => {
    const command = createBlankCommand("mixed");
    command.command = "curl https://example.com | bash";
    const issues = validateCommands(commandsConfig({ runcmd: [command] }));
    expect(issues.some((issue) => issue.severity === "warning")).toBe(true);
    expect(issues.some((issue) => issue.severity === "error")).toBe(false);
  });
});

import {
  type BuilderCommand,
  type CommandStage,
  type CommandsConfig,
} from "../models/commands.ts";
import type { ValidationIssue } from "./validateConfig.ts";

export const COMMAND_VALIDATION_MESSAGES = {
  COMMAND_SHELL_REQUIRED:
    "Export blocked: enter a command or remove this command card.",
  COMMAND_EXECUTABLE_REQUIRED:
    "Export blocked: enter an executable for this command.",
  COMMAND_ARGUMENT_REQUIRED:
    "Export blocked: enter an argument or remove this blank argument row.",
  COMMAND_REMOTE_PIPE_SHELL:
    "Review this command: piping remote content into a shell can execute untrusted code.",
  COMMAND_RECURSIVE_DELETE:
    "Review this command: recursive deletion can remove more data than intended.",
  COMMAND_PERMISSION_CHANGE:
    "Review this command: recursive or broad permission changes can weaken system security.",
  COMMAND_INTERACTIVE:
    "Review this command: interactive input may cause cloud-init to wait indefinitely.",
} as const;

const REMOTE_PIPE_SHELL =
  /\b(?:curl|wget)\b[^|\n]*\|\s*(?:sudo\s+)?(?:sh|bash|dash|zsh)\b/i;

const RECURSIVE_DELETE =
  /\brm\b[^\n;&|]*(?:\s-(?:[A-Za-z]*r[A-Za-z]*|[A-Za-z]*R[A-Za-z]*)\b|\s--recursive\b)/i;

const RECURSIVE_PERMISSION =
  /\b(?:chmod|chown)\b[^\n;&|]*(?:\s-R\b|\s--recursive\b)/i;

const BROAD_CHMOD =
  /\bchmod\b[^\n;&|]*\s(?:0?777|a\+[rwx]+)\b/i;

const INTERACTIVE_COMMAND =
  /(^|[;&|]\s*|\b(?:sudo|env)\s+)(?:passwd|read|nano|vi|vim|less|more|top)\b/i;

const SHELL_RUNNERS = new Set(["sh", "bash", "dash", "zsh"]);

function shellCommandPath(stage: CommandStage, commandId: string): string {
  return `commands.${stage}.${commandId}.command`;
}

function executablePath(stage: CommandStage, commandId: string): string {
  return `commands.${stage}.${commandId}.executable`;
}

function argumentPath(
  stage: CommandStage,
  commandId: string,
  argumentId: string,
): string {
  return `commands.${stage}.${commandId}.arguments.${argumentId}`;
}

function basename(executable: string): string {
  const trimmed = executable.trim();
  const slashIndex = trimmed.lastIndexOf("/");
  return slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : trimmed;
}

function extractArgvShellScript(command: Extract<BuilderCommand, { form: "argv" }>): string | null {
  const runner = basename(command.executable);
  if (!SHELL_RUNNERS.has(runner)) {
    return null;
  }

  const args = command.arguments.map((row) => row.value);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]?.trim() ?? "";
    if (arg === "-c" || arg === "-xc") {
      const script = args[index + 1];
      return typeof script === "string" ? script : null;
    }
  }

  return null;
}

function getEffectiveShellText(command: BuilderCommand): string | null {
  if (command.form === "shell") {
    return command.command;
  }

  return extractArgvShellScript(command);
}

function pushWarningIssues(
  stage: CommandStage,
  command: BuilderCommand,
  shellText: string,
  issues: ValidationIssue[],
): void {
  const primaryPath =
    command.form === "shell"
      ? shellCommandPath(stage, command.id)
      : executablePath(stage, command.id);

  if (REMOTE_PIPE_SHELL.test(shellText)) {
    issues.push({
      path: primaryPath,
      code: "COMMAND_REMOTE_PIPE_SHELL",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_REMOTE_PIPE_SHELL,
      severity: "warning",
    });
  }

  if (RECURSIVE_DELETE.test(shellText)) {
    issues.push({
      path: primaryPath,
      code: "COMMAND_RECURSIVE_DELETE",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_RECURSIVE_DELETE,
      severity: "warning",
    });
  }

  if (RECURSIVE_PERMISSION.test(shellText) || BROAD_CHMOD.test(shellText)) {
    issues.push({
      path: primaryPath,
      code: "COMMAND_PERMISSION_CHANGE",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_PERMISSION_CHANGE,
      severity: "warning",
    });
  }

  if (INTERACTIVE_COMMAND.test(shellText)) {
    issues.push({
      path: primaryPath,
      code: "COMMAND_INTERACTIVE",
      message: COMMAND_VALIDATION_MESSAGES.COMMAND_INTERACTIVE,
      severity: "warning",
    });
  }
}

function validateSingleCommand(
  stage: CommandStage,
  command: BuilderCommand,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (command.form === "shell") {
    if (command.command.trim() === "") {
      issues.push({
        path: shellCommandPath(stage, command.id),
        code: "COMMAND_SHELL_REQUIRED",
        message: COMMAND_VALIDATION_MESSAGES.COMMAND_SHELL_REQUIRED,
        severity: "error",
      });
    }
  } else {
    if (command.executable.trim() === "") {
      issues.push({
        path: executablePath(stage, command.id),
        code: "COMMAND_EXECUTABLE_REQUIRED",
        message: COMMAND_VALIDATION_MESSAGES.COMMAND_EXECUTABLE_REQUIRED,
        severity: "error",
      });
    }

    for (const row of command.arguments) {
      if (row.value.trim() === "") {
        issues.push({
          path: argumentPath(stage, command.id, row.id),
          code: "COMMAND_ARGUMENT_REQUIRED",
          message: COMMAND_VALIDATION_MESSAGES.COMMAND_ARGUMENT_REQUIRED,
          severity: "error",
        });
      }
    }
  }

  const shellText = getEffectiveShellText(command);
  if (shellText && shellText.trim() !== "") {
    pushWarningIssues(stage, command, shellText, issues);
  }

  return issues;
}

function validateStage(
  stage: CommandStage,
  commands: BuilderCommand[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const command of commands) {
    issues.push(...validateSingleCommand(stage, command));
  }
  return issues;
}

export function validateCommands(
  commands: CommandsConfig | undefined,
): ValidationIssue[] {
  if (!commands) {
    return [];
  }

  return [
    ...validateStage("runcmd", commands.runcmd),
    ...validateStage("bootcmd", commands.bootcmd),
  ];
}

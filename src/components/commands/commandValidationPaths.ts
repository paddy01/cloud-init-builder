import type { BuilderCommand, CommandStage, CommandsConfig } from "../../models/commands.ts";

export function isCommandIssuePath(path: string): boolean {
  return path.startsWith("commands.");
}

export function getStageFromIssuePath(path: string): CommandStage | null {
  if (path.startsWith("commands.runcmd.")) {
    return "runcmd";
  }
  if (path.startsWith("commands.bootcmd.")) {
    return "bootcmd";
  }
  return null;
}

export function getCommandIdFromIssuePath(path: string): string | null {
  const match = path.match(/^commands\.(?:runcmd|bootcmd)\.([^.]+)\./);
  return match?.[1] ?? null;
}

export function getArgumentIdFromIssuePath(path: string): string | null {
  const match = path.match(
    /^commands\.(?:runcmd|bootcmd)\.[^.]+\.arguments\.([^.]+)$/,
  );
  return match?.[1] ?? null;
}

export function pathToFocusTargetId(path: string): string | null {
  const stage = getStageFromIssuePath(path);
  const commandId = getCommandIdFromIssuePath(path);
  if (!stage || !commandId) {
    return null;
  }

  if (path.endsWith(".command")) {
    return `command-shell-${stage}-${commandId}`;
  }

  if (path.endsWith(".executable")) {
    return `command-executable-${stage}-${commandId}`;
  }

  const argumentId = getArgumentIdFromIssuePath(path);
  if (argumentId) {
    return `command-argument-${stage}-${commandId}-${argumentId}`;
  }

  return null;
}

export function getCommandPosition(
  stage: CommandStage,
  commandId: string,
  commands: CommandsConfig,
): number {
  const index = commands[stage].findIndex((entry) => entry.id === commandId);
  return index >= 0 ? index + 1 : 0;
}

export function getCommandSummaryLabel(
  stage: CommandStage,
  commandId: string,
  commands: CommandsConfig,
): string {
  const position = getCommandPosition(stage, commandId, commands);
  const prefix = stage === "runcmd" ? "Run command" : "Boot command";
  return position > 0 ? `${prefix} ${position}` : prefix;
}

export function sortCommandSummaryIssues<T extends { path: string; severity: string }>(
  issues: T[],
  activeStage: CommandStage,
  commands: CommandsConfig,
): T[] {
  const stageOrder = (path: string): number => {
    const stage = getStageFromIssuePath(path);
    if (stage === activeStage) {
      return 0;
    }
    if (stage === "runcmd") {
      return 1;
    }
    if (stage === "bootcmd") {
      return 2;
    }
    return 3;
  };

  const commandOrder = (path: string): number => {
    const stage = getStageFromIssuePath(path);
    const commandId = getCommandIdFromIssuePath(path);
    if (!stage || !commandId) {
      return Number.MAX_SAFE_INTEGER;
    }
    const index = commands[stage].findIndex((entry) => entry.id === commandId);
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
  };

  const fieldOrder = (path: string): number => {
    if (path.endsWith(".command") || path.endsWith(".executable")) {
      return 0;
    }
    if (path.includes(".arguments.")) {
      return 1;
    }
    return 2;
  };

  return [...issues].sort((left, right) => {
    const stageDiff = stageOrder(left.path) - stageOrder(right.path);
    if (stageDiff !== 0) {
      return stageDiff;
    }

    const commandDiff =
      commandOrder(left.path) - commandOrder(right.path);
    if (commandDiff !== 0) {
      return commandDiff;
    }

    const fieldDiff = fieldOrder(left.path) - fieldOrder(right.path);
    if (fieldDiff !== 0) {
      return fieldDiff;
    }

    if (left.severity === "error" && right.severity === "warning") {
      return -1;
    }
    if (left.severity === "warning" && right.severity === "error") {
      return 1;
    }

    return left.path.localeCompare(right.path);
  });
}

export function isFullyBlankCommand(command: BuilderCommand): boolean {
  if (command.form === "shell") {
    return command.command.trim() === "";
  }

  return (
    command.executable.trim() === "" &&
    command.arguments.every((argument) => argument.value.trim() === "")
  );
}

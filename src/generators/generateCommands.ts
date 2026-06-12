import type { BuilderCommand, CommandsConfig } from "../models/commands.ts";

export function mapBuilderCommand(entry: BuilderCommand): string | string[] {
  if (entry.form === "shell") {
    return entry.command;
  }

  return [entry.executable, ...entry.arguments.map((argument) => argument.value)];
}

export function buildCloudInitCommands(
  commands: CommandsConfig,
): { bootcmd?: (string | string[])[]; runcmd?: (string | string[])[] } {
  const bootcmd = commands.bootcmd.map(mapBuilderCommand);
  const runcmd = commands.runcmd.map(mapBuilderCommand);

  return {
    ...(bootcmd.length > 0 ? { bootcmd } : {}),
    ...(runcmd.length > 0 ? { runcmd } : {}),
  };
}

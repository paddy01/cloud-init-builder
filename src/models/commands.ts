import { z } from "zod";

export const commandArgumentSchema = z.object({
  id: z.string(),
  value: z.string(),
});

export const shellCommandSchema = z.object({
  id: z.string(),
  form: z.literal("shell"),
  command: z.string(),
});

export const argvCommandSchema = z.object({
  id: z.string(),
  form: z.literal("argv"),
  executable: z.string(),
  arguments: z.array(commandArgumentSchema),
});

export const builderCommandSchema = z.discriminatedUnion("form", [
  shellCommandSchema,
  argvCommandSchema,
]);

export const commandsConfigSchema = z.object({
  bootcmd: z.array(builderCommandSchema),
  runcmd: z.array(builderCommandSchema),
});

export type CommandArgument = z.infer<typeof commandArgumentSchema>;
export type CommandStage = "bootcmd" | "runcmd";
export type BuilderCommand = z.infer<typeof builderCommandSchema>;
export type CommandsConfig = z.infer<typeof commandsConfigSchema>;

export const DEFAULT_COMMANDS_CONFIG: CommandsConfig = {
  bootcmd: [],
  runcmd: [],
};

let commandIdCounter = 0;

export function createCommandId(): string {
  commandIdCounter += 1;
  return `command-${commandIdCounter}`;
}

let commandArgumentIdCounter = 0;

export function createCommandArgumentId(): string {
  commandArgumentIdCounter += 1;
  return `command-arg-${commandArgumentIdCounter}`;
}

export function createBlankCommandArgument(
  id = createCommandArgumentId(),
): CommandArgument {
  return { id, value: "" };
}

export function createBlankCommand(id = createCommandId()): BuilderCommand {
  return { id, form: "shell", command: "" };
}

export function createBlankArgvCommand(
  id = createCommandId(),
): Extract<BuilderCommand, { form: "argv" }> {
  return { id, form: "argv", executable: "", arguments: [] };
}

export function isCommandsConfig(value: unknown): value is CommandsConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as CommandsConfig).bootcmd) &&
    Array.isArray((value as CommandsConfig).runcmd)
  );
}

export interface CommandsImportWarning {
  path: string;
  message: string;
}

export interface CommandsNormalizationResult {
  commands: CommandsConfig;
  warnings: CommandsImportWarning[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupeWarnings(
  warnings: CommandsImportWarning[],
): CommandsImportWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.path}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isCanonicalArgumentRow(
  value: unknown,
): value is CommandArgument {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.value === "string"
  );
}

function normalizeArgumentRows(
  raw: unknown,
  warnings: CommandsImportWarning[],
  pathPrefix: string,
): CommandArgument[] {
  if (!Array.isArray(raw)) {
    warnings.push({
      path: pathPrefix,
      message: "Invalid command arguments were omitted during import.",
    });
    return [];
  }

  const rows: CommandArgument[] = [];

  for (const item of raw) {
    if (isCanonicalArgumentRow(item)) {
      rows.push({ id: item.id, value: item.value });
      continue;
    }

    warnings.push({
      path: pathPrefix,
      message: "Invalid command argument entry was omitted during import.",
    });
  }

  return rows;
}

function normalizeCommandEntry(
  raw: unknown,
  stage: CommandStage,
  warnings: CommandsImportWarning[],
): BuilderCommand | undefined {
  if (!isPlainObject(raw)) {
    warnings.push({
      path: `commands.${stage}`,
      message: "Invalid command entry was omitted during import.",
    });
    return undefined;
  }

  const id = typeof raw.id === "string" ? raw.id : createCommandId();

  if (raw.form === "shell") {
    if (typeof raw.command !== "string") {
      warnings.push({
        path: `commands.${stage}.${id}`,
        message: "Invalid shell command entry was omitted during import.",
      });
      return undefined;
    }

    return { id, form: "shell", command: raw.command };
  }

  if (raw.form === "argv") {
    if (typeof raw.executable !== "string") {
      warnings.push({
        path: `commands.${stage}.${id}`,
        message: "Invalid argv command entry was omitted during import.",
      });
      return undefined;
    }

    return {
      id,
      form: "argv",
      executable: raw.executable,
      arguments: normalizeArgumentRows(
        raw.arguments,
        warnings,
        `commands.${stage}.${id}.arguments`,
      ),
    };
  }

  warnings.push({
    path: `commands.${stage}.${id}`,
    message: "Invalid command entry was omitted during import.",
  });
  return undefined;
}

function normalizeStageCommands(
  raw: unknown,
  stage: CommandStage,
  warnings: CommandsImportWarning[],
): BuilderCommand[] {
  if (!Array.isArray(raw)) {
    warnings.push({
      path: `commands.${stage}`,
      message: `Invalid ${stage} data was replaced with an empty list.`,
    });
    return [];
  }

  const entries: BuilderCommand[] = [];

  for (const item of raw) {
    const normalized = normalizeCommandEntry(item, stage, warnings);
    if (normalized !== undefined) {
      entries.push(normalized);
    }
  }

  return entries;
}

export function normalizeCommandsSection(
  rawCommands: unknown,
): CommandsNormalizationResult {
  if (rawCommands === undefined || rawCommands === null) {
    return {
      commands: structuredClone(DEFAULT_COMMANDS_CONFIG),
      warnings: [],
    };
  }

  if (!isPlainObject(rawCommands)) {
    return {
      commands: structuredClone(DEFAULT_COMMANDS_CONFIG),
      warnings: [
        {
          path: "commands",
          message: "Invalid commands data was replaced with defaults.",
        },
      ],
    };
  }

  const warnings: CommandsImportWarning[] = [];

  return {
    commands: {
      bootcmd: normalizeStageCommands(rawCommands.bootcmd, "bootcmd", warnings),
      runcmd: normalizeStageCommands(rawCommands.runcmd, "runcmd", warnings),
    },
    warnings: dedupeWarnings(warnings),
  };
}

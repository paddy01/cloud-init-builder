import {
  createBlankArgvCommand,
  createBlankCommandArgument,
  createCommandArgumentId,
  type BuilderCommand,
  type CommandArgument,
} from "../models/commands.ts";

const SHELL_UNSAFE_CHARS = /['"\\$`*?\[\]{}()<>|&;!\n\r]/;
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_@%+=:,./-]+$/;

export const SHELL_TO_ARGV_CONFIRM =
  "Switch command form? This command cannot be split into an executable and arguments without changing its meaning. Switching will clear the argv fields; the original shell command will remain unchanged if you cancel.";

export const ARGV_TO_SHELL_CONFIRM =
  "Switch command form? This command cannot be converted to one shell string without choosing quoting rules. Switching will replace the current structured values only after you confirm.";

export type ShellToArgvResult =
  | {
      ok: true;
      command: Extract<BuilderCommand, { form: "argv" }>;
    }
  | { ok: false; reason: "empty" | "ambiguous" };

export type ArgvToShellResult =
  | {
      ok: true;
      command: Extract<BuilderCommand, { form: "shell" }>;
    }
  | { ok: false; reason: "ambiguous" };

export function quoteForSh(value: string): string {
  if (value === "") {
    return "''";
  }

  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function tryConvertShellToArgv(
  value: string,
  commandId: string,
  idFactories: {
    createCommandArgumentId?: () => string;
  } = {},
): ShellToArgvResult {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: false, reason: "empty" };
  }

  if (SHELL_UNSAFE_CHARS.test(trimmed)) {
    return { ok: false, reason: "ambiguous" };
  }

  const tokens = trimmed.split(/[ \t]+/).filter(Boolean);
  if (tokens.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const createArgId = idFactories.createCommandArgumentId ?? createCommandArgumentId;
  const [executable, ...rest] = tokens;
  if (!executable) {
    return { ok: false, reason: "empty" };
  }

  const argumentsList: CommandArgument[] = rest.map((token) => ({
    ...createBlankCommandArgument(createArgId()),
    value: token,
  }));

  return {
    ok: true,
    command: {
      id: commandId,
      form: "argv",
      executable,
      arguments: argumentsList,
    },
  };
}

export function tryConvertArgvToShell(
  command: Extract<BuilderCommand, { form: "argv" }>,
): ArgvToShellResult {
  const values = [
    command.executable,
    ...command.arguments.map((argument) => argument.value),
  ];

  if (values.some((value) => value.includes("\0"))) {
    return { ok: false, reason: "ambiguous" };
  }

  if (values.every((value) => value === "" || SAFE_TOKEN_PATTERN.test(value))) {
    return {
      ok: true,
      command: {
        id: command.id,
        form: "shell",
        command: values.join(" ").trim(),
      },
    };
  }

  return { ok: false, reason: "ambiguous" };
}

export function convertArgvToShellQuoted(
  command: Extract<BuilderCommand, { form: "argv" }>,
): Extract<BuilderCommand, { form: "shell" }> {
  const values = [
    command.executable,
    ...command.arguments.map((argument) => argument.value),
  ];

  return {
    id: command.id,
    form: "shell",
    command: values.map(quoteForSh).join(" "),
  };
}

export function createBlankArgvForShellSwitch(
  commandId: string,
): Extract<BuilderCommand, { form: "argv" }> {
  return createBlankArgvCommand(commandId);
}

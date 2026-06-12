import { describe, expect, it } from "vitest";
import {
  commandsConfigSchema,
  createBlankCommand,
  createBlankCommandArgument,
  DEFAULT_COMMANDS_CONFIG,
  isCommandsConfig,
  normalizeCommandsSection,
} from "../../src/models/commands.ts";

describe("commands defaults and factories", () => {
  it("seeds empty bootcmd and runcmd arrays", () => {
    expect(DEFAULT_COMMANDS_CONFIG).toEqual({
      bootcmd: [],
      runcmd: [],
    });
  });

  it("creates a blank shell command with injectable id", () => {
    expect(createBlankCommand("command-test")).toEqual({
      id: "command-test",
      form: "shell",
      command: "",
    });
  });

  it("creates a blank command argument with injectable id", () => {
    expect(createBlankCommandArgument("arg-test")).toEqual({
      id: "arg-test",
      value: "",
    });
  });
});

describe("commandsConfigSchema", () => {
  it("parses canonical shell and argv commands", () => {
    const result = commandsConfigSchema.parse({
      bootcmd: [
        {
          id: "boot-1",
          form: "shell",
          command: "echo boot",
        },
      ],
      runcmd: [
        {
          id: "run-1",
          form: "argv",
          executable: "printf",
          arguments: [{ id: "arg-1", value: "hello" }],
        },
      ],
    });

    expect(result.bootcmd).toHaveLength(1);
    expect(result.runcmd[0]).toMatchObject({
      form: "argv",
      executable: "printf",
    });
  });

  it("rejects argv commands missing executable", () => {
    const result = commandsConfigSchema.safeParse({
      bootcmd: [],
      runcmd: [
        {
          id: "run-1",
          form: "argv",
          arguments: [],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("isCommandsConfig", () => {
  it("returns true for canonical commands config", () => {
    expect(isCommandsConfig(DEFAULT_COMMANDS_CONFIG)).toBe(true);
  });

  it("returns false for non-object values", () => {
    expect(isCommandsConfig(null)).toBe(false);
    expect(isCommandsConfig([])).toBe(false);
  });
});

describe("normalizeCommandsSection", () => {
  it("returns cloned defaults for missing commands", () => {
    const result = normalizeCommandsSection(undefined);

    expect(result.commands).toEqual({
      bootcmd: [],
      runcmd: [],
    });
    expect(result.commands).not.toBe(DEFAULT_COMMANDS_CONFIG);
    expect(result.warnings).toEqual([]);
  });

  it("preserves valid imported shell and argv commands", () => {
    const result = normalizeCommandsSection({
      bootcmd: [{ id: "b1", form: "shell", command: "mount -a" }],
      runcmd: [
        {
          id: "r1",
          form: "argv",
          executable: "apt-get",
          arguments: [{ id: "a1", value: "update" }],
        },
      ],
    });

    expect(result.commands).toEqual({
      bootcmd: [{ id: "b1", form: "shell", command: "mount -a" }],
      runcmd: [
        {
          id: "r1",
          form: "argv",
          executable: "apt-get",
          arguments: [{ id: "a1", value: "update" }],
        },
      ],
    });
    expect(result.warnings).toEqual([]);
  });

  it("omits malformed entries and emits stage warnings", () => {
    const result = normalizeCommandsSection({
      bootcmd: "not-an-array",
      runcmd: [
        { id: "bad-shell", form: "shell", command: 123 },
        { id: "bad-argv", form: "argv", executable: 456, arguments: [] },
        { id: "good", form: "shell", command: "true" },
      ],
    });

    expect(result.commands.bootcmd).toEqual([]);
    expect(result.commands.runcmd).toEqual([
      { id: "good", form: "shell", command: "true" },
    ]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.path === "commands.bootcmd")).toBe(
      true,
    );
  });

  it("omits malformed argument rows while preserving valid argv commands", () => {
    const result = normalizeCommandsSection({
      bootcmd: [],
      runcmd: [
        {
          id: "r1",
          form: "argv",
          executable: "printf",
          arguments: [
            { id: "good", value: "ok" },
            { bad: "row" },
          ],
        },
      ],
    });

    expect(result.commands.runcmd).toEqual([
      {
        id: "r1",
        form: "argv",
        executable: "printf",
        arguments: [{ id: "good", value: "ok" }],
      },
    ]);
    expect(
      result.warnings.some((w) =>
        w.message.includes("Invalid command argument entry"),
      ),
    ).toBe(true);
  });

  it("replaces non-object commands with defaults", () => {
    const result = normalizeCommandsSection(["not", "commands"]);

    expect(result.commands).toEqual({
      bootcmd: [],
      runcmd: [],
    });
    expect(result.warnings).toEqual([
      {
        path: "commands",
        message: "Invalid commands data was replaced with defaults.",
      },
    ]);
  });
});

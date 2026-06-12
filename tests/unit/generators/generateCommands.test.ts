import { describe, expect, it } from "vitest";
import {
  buildCloudInitCommands,
  mapBuilderCommand,
} from "../../../src/generators/generateCommands.ts";
import {
  createBlankCommand,
  createBlankCommandArgument,
  type CommandsConfig,
} from "../../../src/models/commands.ts";

describe("mapBuilderCommand", () => {
  it("projects shell commands as scalar strings", () => {
    const command = {
      ...createBlankCommand("shell-1"),
      command: "systemctl enable --now qemu-guest-agent",
    };

    expect(mapBuilderCommand(command)).toBe(
      "systemctl enable --now qemu-guest-agent",
    );
  });

  it("projects argv commands as nested string lists with executable first", () => {
    const command = {
      id: "argv-1",
      form: "argv" as const,
      executable: "/usr/bin/systemctl",
      arguments: [
        { ...createBlankCommandArgument("arg-1"), value: "enable" },
        { ...createBlankCommandArgument("arg-2"), value: "--now" },
        { ...createBlankCommandArgument("arg-3"), value: "qemu-guest-agent" },
      ],
    };

    expect(mapBuilderCommand(command)).toEqual([
      "/usr/bin/systemctl",
      "enable",
      "--now",
      "qemu-guest-agent",
    ]);
  });

  it("preserves literal metacharacters in argv values without shell interpretation", () => {
    const command = {
      id: "argv-2",
      form: "argv" as const,
      executable: "printf",
      arguments: [
        { ...createBlankCommandArgument("arg-1"), value: "|" },
        { ...createBlankCommandArgument("arg-2"), value: "$HOME" },
        { ...createBlankCommandArgument("arg-3"), value: "" },
      ],
    };

    expect(mapBuilderCommand(command)).toEqual(["printf", "|", "$HOME", ""]);
  });

  it("does not include builder metadata in projection", () => {
    const command = {
      id: "argv-3",
      form: "argv" as const,
      executable: "echo",
      arguments: [{ ...createBlankCommandArgument("arg-1"), value: "hi" }],
    };

    const projected = mapBuilderCommand(command);
    expect(projected).toEqual(["echo", "hi"]);
    expect(projected).not.toHaveProperty("id");
    expect(projected).not.toHaveProperty("form");
  });
});

describe("buildCloudInitCommands", () => {
  it("omits empty stages and preserves configured order", () => {
    const commands: CommandsConfig = {
      bootcmd: [],
      runcmd: [
        {
          id: "run-shell",
          form: "shell",
          command: "apt-get update",
        },
        {
          id: "run-argv",
          form: "argv",
          executable: "touch",
          arguments: [{ ...createBlankCommandArgument("arg-1"), value: "/run/foo" }],
        },
      ],
    };

    expect(buildCloudInitCommands(commands)).toEqual({
      runcmd: ["apt-get update", ["touch", "/run/foo"]],
    });
  });

  it("includes bootcmd when configured", () => {
    const commands: CommandsConfig = {
      bootcmd: [
        {
          id: "boot-argv",
          form: "argv",
          executable: "/bin/true",
          arguments: [],
        },
      ],
      runcmd: [],
    };

    expect(buildCloudInitCommands(commands)).toEqual({
      bootcmd: [["/bin/true"]],
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  convertArgvToShellQuoted,
  quoteForSh,
  tryConvertArgvToShell,
  tryConvertShellToArgv,
} from "../../src/utils/commandConversion.ts";
import { createBlankCommandArgument } from "../../src/models/commands.ts";

describe("quoteForSh", () => {
  it("single-quotes values and escapes embedded apostrophes", () => {
    expect(quoteForSh("hello")).toBe("'hello'");
    expect(quoteForSh("")).toBe("''");
    expect(quoteForSh("it's fine")).toBe(`'it'"'"'s fine'`);
  });
});

describe("tryConvertShellToArgv", () => {
  it("converts unambiguous shell commands automatically", () => {
    const result = tryConvertShellToArgv(
      "systemctl enable --now qemu-guest-agent",
      "cmd-1",
      { createCommandArgumentId: () => "arg-1" },
    );

    expect(result).toEqual({
      ok: true,
      command: {
        id: "cmd-1",
        form: "argv",
        executable: "systemctl",
        arguments: [
          { ...createBlankCommandArgument("arg-1"), value: "enable" },
          { ...createBlankCommandArgument("arg-1"), value: "--now" },
          { ...createBlankCommandArgument("arg-1"), value: "qemu-guest-agent" },
        ],
      },
    });
  });

  it("rejects shell syntax that would change meaning when split", () => {
    expect(tryConvertShellToArgv("echo $HOME", "cmd-2").ok).toBe(false);
    expect(tryConvertShellToArgv("curl https://x | sh", "cmd-3").ok).toBe(false);
    expect(tryConvertShellToArgv('echo "hi"', "cmd-4").ok).toBe(false);
  });

  it("treats empty shell strings as blank argv switches", () => {
    expect(tryConvertShellToArgv("   ", "cmd-5")).toEqual({
      ok: false,
      reason: "empty",
    });
  });
});

describe("tryConvertArgvToShell", () => {
  it("joins safe tokens automatically", () => {
    const result = tryConvertArgvToShell({
      id: "cmd-6",
      form: "argv",
      executable: "/usr/bin/systemctl",
      arguments: [
        { ...createBlankCommandArgument("arg-1"), value: "enable" },
        { ...createBlankCommandArgument("arg-2"), value: "--now" },
      ],
    });

    expect(result).toEqual({
      ok: true,
      command: {
        id: "cmd-6",
        form: "shell",
        command: "/usr/bin/systemctl enable --now",
      },
    });
  });

  it("requires confirmation for values outside the safe token set", () => {
    expect(
      tryConvertArgvToShell({
        id: "cmd-7",
        form: "argv",
        executable: "printf",
        arguments: [{ ...createBlankCommandArgument("arg-1"), value: "hello world" }],
      }),
    ).toEqual({ ok: false, reason: "ambiguous" });
  });
});

describe("convertArgvToShellQuoted", () => {
  it("preserves argv boundaries with POSIX single-quote escaping", () => {
    expect(
      convertArgvToShellQuoted({
        id: "cmd-8",
        form: "argv",
        executable: "printf",
        arguments: [
          { ...createBlankCommandArgument("arg-1"), value: "hello world" },
          { ...createBlankCommandArgument("arg-2"), value: "it's" },
        ],
      }).command,
    ).toBe(`'printf' 'hello world' 'it'"'"'s'`);
  });
});

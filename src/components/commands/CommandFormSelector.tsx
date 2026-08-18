import { useLayoutEffect, useRef } from "react";
import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import {
  ARGV_TO_SHELL_CONFIRM,
  convertArgvToShellQuoted,
  createBlankArgvForShellSwitch,
  SHELL_TO_ARGV_CONFIRM,
  tryConvertArgvToShell,
  tryConvertShellToArgv,
} from "../../utils/commandConversion.ts";

const modeButtonBase =
  "min-h-10 flex-1 rounded border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-focus-offset-inset";
const modeButtonSelected =
  "border-ui-selected-border bg-ui-selected text-ui-selected-text";
const modeButtonUnselected =
  "border-transparent text-ui-muted-text hover:bg-ui-raised hover:text-ui-text";

export type CommandFormActivationOrigin =
  | "activation"
  | "radio-navigation";

interface CommandFormSelectorProps {
  stage: CommandStage;
  command: BuilderCommand;
  onFormSwitch?: (
    form: BuilderCommand["form"],
    origin: CommandFormActivationOrigin,
  ) => void;
}

export function CommandFormSelector({
  stage,
  command,
  onFormSwitch,
}: CommandFormSelectorProps) {
  const replaceCommand = useProjectStore((state) => state.replaceCommand);
  const shellRadioRef = useRef<HTMLButtonElement>(null);
  const argvRadioRef = useRef<HTMLButtonElement>(null);
  const pendingRadioFocusRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const radio = pendingRadioFocusRef.current;
    if (!radio) {
      return;
    }

    radio.focus({ preventScroll: true });
    pendingRadioFocusRef.current = null;
  }, [command.form]);

  const applySwitch = (
    nextCommand: BuilderCommand,
    nextForm: BuilderCommand["form"],
    origin: CommandFormActivationOrigin,
  ) => {
    if (origin === "radio-navigation") {
      pendingRadioFocusRef.current =
        nextForm === "shell" ? shellRadioRef.current : argvRadioRef.current;
    }
    replaceCommand(stage, command.id, nextCommand);
    onFormSwitch?.(nextForm, origin);
  };

  const switchToArgv = (origin: CommandFormActivationOrigin) => {
    if (command.form === "argv") {
      return;
    }

    const conversion = tryConvertShellToArgv(command.command, command.id);
    if (conversion.ok) {
      applySwitch(conversion.command, "argv", origin);
      return;
    }

    if (conversion.reason === "empty") {
      applySwitch(createBlankArgvForShellSwitch(command.id), "argv", origin);
      return;
    }

    if (!window.confirm(SHELL_TO_ARGV_CONFIRM)) {
      return;
    }

    applySwitch(createBlankArgvForShellSwitch(command.id), "argv", origin);
  };

  const switchToShell = (origin: CommandFormActivationOrigin) => {
    if (command.form === "shell") {
      return;
    }

    const conversion = tryConvertArgvToShell(command);
    if (conversion.ok) {
      applySwitch(conversion.command, "shell", origin);
      return;
    }

    if (!window.confirm(ARGV_TO_SHELL_CONFIRM)) {
      return;
    }

    applySwitch(convertArgvToShellQuoted(command), "shell", origin);
  };

  const handleRadioNavigation = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    let nextForm: BuilderCommand["form"] | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextForm = command.form === "shell" ? "argv" : "shell";
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextForm = command.form === "shell" ? "argv" : "shell";
    } else if (event.key === "Home") {
      nextForm = "shell";
    } else if (event.key === "End") {
      nextForm = "argv";
    }

    if (!nextForm) {
      return;
    }

    event.preventDefault();
    if (nextForm === "shell") {
      switchToShell("radio-navigation");
    } else {
      switchToArgv("radio-navigation");
    }
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-ui-text">Command form</legend>
      <div
        className="flex rounded border border-ui-border bg-ui-inset p-1"
        role="radiogroup"
        aria-label="Command form"
      >
        <button
          ref={shellRadioRef}
          type="button"
          role="radio"
          aria-checked={command.form === "shell"}
          tabIndex={command.form === "shell" ? 0 : -1}
          className={`${modeButtonBase} ${
            command.form === "shell" ? modeButtonSelected : modeButtonUnselected
          }`}
          onClick={() => switchToShell("activation")}
          onKeyDown={handleRadioNavigation}
        >
          Shell command
        </button>
        <button
          ref={argvRadioRef}
          type="button"
          role="radio"
          aria-checked={command.form === "argv"}
          tabIndex={command.form === "argv" ? 0 : -1}
          className={`${modeButtonBase} ${
            command.form === "argv" ? modeButtonSelected : modeButtonUnselected
          }`}
          onClick={() => switchToArgv("activation")}
          onKeyDown={handleRadioNavigation}
        >
          Executable and arguments
        </button>
      </div>
    </fieldset>
  );
}

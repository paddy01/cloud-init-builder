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
  "min-h-10 flex-1 rounded px-3 py-2 text-sm text-gray-700";
const modeButtonSelected =
  "bg-white text-blue-700 ring-1 ring-blue-500";
const modeButtonUnselected = "hover:bg-gray-100";

interface CommandFormSelectorProps {
  stage: CommandStage;
  command: BuilderCommand;
  onFormSwitch?: (form: BuilderCommand["form"]) => void;
}

export function CommandFormSelector({
  stage,
  command,
  onFormSwitch,
}: CommandFormSelectorProps) {
  const replaceCommand = useProjectStore((state) => state.replaceCommand);

  const applySwitch = (
    nextCommand: BuilderCommand,
    nextForm: BuilderCommand["form"],
  ) => {
    replaceCommand(stage, command.id, nextCommand);
    onFormSwitch?.(nextForm);
  };

  const switchToArgv = () => {
    if (command.form === "argv") {
      return;
    }

    const conversion = tryConvertShellToArgv(command.command, command.id);
    if (conversion.ok) {
      applySwitch(conversion.command, "argv");
      return;
    }

    if (conversion.reason === "empty") {
      applySwitch(createBlankArgvForShellSwitch(command.id), "argv");
      return;
    }

    if (!window.confirm(SHELL_TO_ARGV_CONFIRM)) {
      return;
    }

    applySwitch(createBlankArgvForShellSwitch(command.id), "argv");
  };

  const switchToShell = () => {
    if (command.form === "shell") {
      return;
    }

    const conversion = tryConvertArgvToShell(command);
    if (conversion.ok) {
      applySwitch(conversion.command, "shell");
      return;
    }

    if (!window.confirm(ARGV_TO_SHELL_CONFIRM)) {
      return;
    }

    applySwitch(convertArgvToShellQuoted(command), "shell");
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-gray-700">Command form</legend>
      <div
        className="flex rounded border border-gray-300 bg-gray-50 p-1"
        role="radiogroup"
        aria-label="Command form"
      >
        <button
          type="button"
          role="radio"
          aria-checked={command.form === "shell"}
          className={`${modeButtonBase} ${
            command.form === "shell" ? modeButtonSelected : modeButtonUnselected
          }`}
          onClick={switchToShell}
        >
          Shell command
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={command.form === "argv"}
          className={`${modeButtonBase} ${
            command.form === "argv" ? modeButtonSelected : modeButtonUnselected
          }`}
          onClick={switchToArgv}
        >
          Executable and arguments
        </button>
      </div>
    </fieldset>
  );
}

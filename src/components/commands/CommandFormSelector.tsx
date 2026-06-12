import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
import {
  createBlankArgvCommand,
  createBlankCommand,
} from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";

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

  const switchForm = (nextForm: BuilderCommand["form"]) => {
    if (command.form === nextForm) {
      return;
    }

    const nextCommand =
      nextForm === "shell"
        ? { ...createBlankCommand(command.id), command: "" }
        : createBlankArgvCommand(command.id);

    replaceCommand(stage, command.id, nextCommand);
    onFormSwitch?.(nextForm);
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
          onClick={() => switchForm("shell")}
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
          onClick={() => switchForm("argv")}
        >
          Executable and arguments
        </button>
      </div>
    </fieldset>
  );
}

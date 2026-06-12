import { forwardRef } from "react";
import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";

const textareaClassName =
  "min-h-24 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 " +
  "font-mono text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

interface ShellCommandInputProps {
  stage: CommandStage;
  command: Extract<BuilderCommand, { form: "shell" }>;
}

export const ShellCommandInput = forwardRef<
  HTMLTextAreaElement,
  ShellCommandInputProps
>(function ShellCommandInput({ stage, command }, ref) {
  const updateShellCommand = useProjectStore((state) => state.updateShellCommand);
  const inputId = `command-shell-${stage}-${command.id}`;
  const helpId = `command-shell-help-${stage}-${command.id}`;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
        Command
      </label>
      <textarea
        ref={ref}
        id={inputId}
        rows={3}
        placeholder="e.g. systemctl enable --now qemu-guest-agent"
        value={command.command}
        aria-describedby={helpId}
        onChange={(event) =>
          updateShellCommand(stage, command.id, event.target.value)
        }
        className={textareaClassName}
      />
      <p id={helpId} className="text-xs text-gray-500">
        Enter the command as cloud-init should pass it to the shell. Do not add
        YAML list markers or quotes for YAML.
      </p>
    </div>
  );
});

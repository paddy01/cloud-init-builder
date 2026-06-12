import { forwardRef, useMemo } from "react";
import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";
import { useUserValidation } from "../users/UserValidationContext.tsx";

const textareaClassName =
  "min-h-24 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 " +
  "font-mono text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const textareaErrorClassName =
  "min-h-24 w-full resize-y rounded border border-red-300 bg-white px-3 py-2 " +
  "font-mono text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const textareaWarningClassName =
  "min-h-24 w-full resize-y rounded border border-amber-300 bg-white px-3 py-2 " +
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
  const {
    markTouched,
    getVisibleIssuesForPath,
    hasVisibleErrorForPath,
    getFieldMessageId,
  } = useUserValidation();
  const path = `commands.${stage}.${command.id}.command`;
  const visibleIssues = getVisibleIssuesForPath(path);
  const errors = visibleIssues.filter((issue) => issue.severity === "error");
  const warnings = visibleIssues.filter((issue) => issue.severity === "warning");
  const hasError = hasVisibleErrorForPath(path);
  const inputId = `command-shell-${stage}-${command.id}`;
  const helpId = `command-shell-help-${stage}-${command.id}`;
  const describedBy = useMemo(
    () =>
      [helpId, ...visibleIssues.map((issue) => getFieldMessageId(path, issue.code))].join(
        " ",
      ),
    [getFieldMessageId, helpId, path, visibleIssues],
  );
  const className = hasError
    ? textareaErrorClassName
    : warnings.length > 0
      ? textareaWarningClassName
      : textareaClassName;

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
        aria-describedby={describedBy}
        aria-invalid={hasError ? true : undefined}
        onChange={(event) =>
          updateShellCommand(stage, command.id, event.target.value)
        }
        onBlur={() => markTouched(path)}
        className={className}
      />
      <p id={helpId} className="text-xs text-gray-500">
        Enter the command as cloud-init should pass it to the shell. Do not add
        YAML list markers or quotes for YAML.
      </p>
      {errors.map((issue) => (
        <FieldMessage
          key={issue.code}
          id={getFieldMessageId(path, issue.code)}
          message={issue.message}
          severity="error"
        />
      ))}
      {warnings.map((issue) => (
        <FieldMessage
          key={issue.code}
          id={getFieldMessageId(path, issue.code)}
          message={issue.message}
          severity="warning"
        />
      ))}
    </div>
  );
});

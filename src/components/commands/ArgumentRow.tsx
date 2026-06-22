import { useLayoutEffect, useRef } from "react";
import type { CommandArgument, CommandStage } from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";
import { useUserValidation } from "../users/UserValidationContext.ts";

const inputClassName =
  "min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 font-mono text-xs " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const inputErrorClassName =
  "min-w-0 flex-1 rounded border border-red-300 bg-white px-3 py-2 font-mono text-xs " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const inputWarningClassName =
  "min-w-0 flex-1 rounded border border-amber-300 bg-white px-3 py-2 font-mono text-xs " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

interface ArgumentRowProps {
  stage: CommandStage;
  commandId: string;
  row: CommandArgument;
  shouldFocus: boolean;
  onFocused?: () => void;
  onRemove: (rowId: string) => void;
}

export function ArgumentRow({
  stage,
  commandId,
  row,
  shouldFocus,
  onFocused,
  onRemove,
}: ArgumentRowProps) {
  const updateCommandArgument = useProjectStore(
    (state) => state.updateCommandArgument,
  );
  const {
    markTouched,
    getVisibleIssuesForPath,
    hasVisibleErrorForPath,
    getFieldMessageId,
  } = useUserValidation();
  const focusRef = useRef<HTMLInputElement>(null);
  const path = `commands.${stage}.${commandId}.arguments.${row.id}`;
  const visibleIssues = getVisibleIssuesForPath(path);
  const errors = visibleIssues.filter((issue) => issue.severity === "error");
  const warnings = visibleIssues.filter((issue) => issue.severity === "warning");
  const hasError = hasVisibleErrorForPath(path);
  const inputId = `command-argument-${stage}-${commandId}-${row.id}`;
  const describedBy = visibleIssues
    .map((issue) => getFieldMessageId(path, issue.code))
    .join(" ");
  const className = hasError
    ? inputErrorClassName
    : warnings.length > 0
      ? inputWarningClassName
      : inputClassName;

  useLayoutEffect(() => {
    if (!shouldFocus) {
      return;
    }

    focusRef.current?.focus({ preventScroll: true });
    onFocused?.();
  }, [onFocused, shouldFocus]);

  return (
    <div className="space-y-1 max-[480px]:space-y-2">
      <div className="flex min-w-0 items-start gap-2 max-[480px]:flex-col">
        <input
          ref={focusRef}
          id={inputId}
          type="text"
          placeholder="e.g. enable"
          value={row.value}
          aria-describedby={describedBy || undefined}
          aria-invalid={hasError ? true : undefined}
          onChange={(event) =>
            updateCommandArgument(stage, commandId, row.id, event.target.value)
          }
          onBlur={() => markTouched(path)}
          className={className}
        />
        <button
          type="button"
          className="min-h-10 shrink-0 text-sm text-red-600 hover:text-red-700 max-[480px]:self-start"
          onClick={() => onRemove(row.id)}
        >
          Remove argument
        </button>
      </div>
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
}

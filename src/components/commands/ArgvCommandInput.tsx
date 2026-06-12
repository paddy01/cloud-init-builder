import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";
import { useUserValidation } from "../users/UserValidationContext.tsx";
import { ArgumentRow } from "./ArgumentRow.tsx";

const inputClassName =
  "w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2 font-mono text-xs " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const inputErrorClassName =
  "w-full min-w-0 rounded border border-red-300 bg-white px-3 py-2 font-mono text-xs " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const inputWarningClassName =
  "w-full min-w-0 rounded border border-amber-300 bg-white px-3 py-2 font-mono text-xs " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

export interface ArgvCommandInputHandle {
  focusExecutable: () => void;
}

interface ArgvCommandInputProps {
  stage: CommandStage;
  command: Extract<BuilderCommand, { form: "argv" }>;
  shouldFocusExecutable?: boolean;
  onFocused?: () => void;
}

export const ArgvCommandInput = forwardRef<
  ArgvCommandInputHandle,
  ArgvCommandInputProps
>(function ArgvCommandInput(
  { stage, command, shouldFocusExecutable = false, onFocused },
  ref,
) {
  const updateArgvExecutable = useProjectStore(
    (state) => state.updateArgvExecutable,
  );
  const addCommandArgument = useProjectStore(
    (state) => state.addCommandArgument,
  );
  const removeCommandArgument = useProjectStore(
    (state) => state.removeCommandArgument,
  );
  const executableRef = useRef<HTMLInputElement>(null);
  const [pendingFocusRowId, setPendingFocusRowId] = useState<string | null>(
    null,
  );

  const {
    markTouched,
    getVisibleIssuesForPath,
    hasVisibleErrorForPath,
    getFieldMessageId,
  } = useUserValidation();
  const executablePath = `commands.${stage}.${command.id}.executable`;
  const executableIssues = getVisibleIssuesForPath(executablePath);
  const executableErrors = executableIssues.filter(
    (issue) => issue.severity === "error",
  );
  const executableWarnings = executableIssues.filter(
    (issue) => issue.severity === "warning",
  );
  const hasExecutableError = hasVisibleErrorForPath(executablePath);
  const executableId = `command-executable-${stage}-${command.id}`;
  const executableHelpId = `command-executable-help-${stage}-${command.id}`;
  const argumentsHelpId = `command-arguments-help-${stage}-${command.id}`;
  const executableDescribedBy = useMemo(
    () =>
      [
        executableHelpId,
        ...executableIssues.map((issue) =>
          getFieldMessageId(executablePath, issue.code),
        ),
      ].join(" "),
    [executableHelpId, executableIssues, executablePath, getFieldMessageId],
  );
  const executableClassName = hasExecutableError
    ? inputErrorClassName
    : executableWarnings.length > 0
      ? inputWarningClassName
      : inputClassName;

  useImperativeHandle(ref, () => ({
    focusExecutable: () => {
      executableRef.current?.focus({ preventScroll: true });
    },
  }));

  const clearPendingFocus = () => setPendingFocusRowId(null);

  useLayoutEffect(() => {
    if (!shouldFocusExecutable) {
      return;
    }

    executableRef.current?.focus({ preventScroll: true });
    onFocused?.();
  }, [onFocused, shouldFocusExecutable]);

  const handleAddArgument = () => {
    const rowId = addCommandArgument(stage, command.id);
    if (rowId) {
      setPendingFocusRowId(rowId);
    }
  };

  const handleRemoveArgument = (rowId: string) => {
    const index = command.arguments.findIndex((argument) => argument.id === rowId);

    removeCommandArgument(stage, command.id, rowId);

    const remaining = command.arguments.filter((argument) => argument.id !== rowId);
    const nextRow = remaining[index];
    const previousRow = remaining[index - 1];

    if (nextRow) {
      setPendingFocusRowId(nextRow.id);
      return;
    }
    if (previousRow) {
      setPendingFocusRowId(previousRow.id);
      return;
    }

    queueMicrotask(() => {
      executableRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor={executableId} className="text-sm font-semibold text-gray-700">
          Executable
        </label>
        <input
          ref={executableRef}
          id={executableId}
          type="text"
          placeholder="e.g. /usr/bin/systemctl"
          value={command.executable}
          aria-describedby={executableDescribedBy}
          aria-invalid={hasExecutableError ? true : undefined}
          onChange={(event) =>
            updateArgvExecutable(stage, command.id, event.target.value)
          }
          onBlur={() => markTouched(executablePath)}
          className={executableClassName}
        />
        <p id={executableHelpId} className="text-xs text-gray-500">
          Use the executable name or path. Add each argument separately below.
        </p>
        {executableErrors.map((issue) => (
          <FieldMessage
            key={issue.code}
            id={getFieldMessageId(executablePath, issue.code)}
            message={issue.message}
            severity="error"
          />
        ))}
        {executableWarnings.map((issue) => (
          <FieldMessage
            key={issue.code}
            id={getFieldMessageId(executablePath, issue.code)}
            message={issue.message}
            severity="warning"
          />
        ))}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-700">Arguments</p>
          <p id={argumentsHelpId} className="text-xs text-gray-500">
            Arguments are passed in the order shown. Enter values only; do not add
            YAML brackets or commas.
          </p>
        </div>

        {command.arguments.length > 0 ? (
          <div className="space-y-2">
            {command.arguments.map((row) => (
              <ArgumentRow
                key={row.id}
                stage={stage}
                commandId={command.id}
                row={row}
                shouldFocus={row.id === pendingFocusRowId}
                onFocused={clearPendingFocus}
                onRemove={handleRemoveArgument}
              />
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="min-h-10 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={handleAddArgument}
        >
          Add argument
        </button>
      </div>
    </div>
  );
});

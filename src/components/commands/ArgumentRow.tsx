import { useLayoutEffect, useRef } from "react";
import type { CommandArgument, CommandStage } from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";

const inputClassName =
  "min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 font-mono text-xs " +
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
  const focusRef = useRef<HTMLInputElement>(null);
  const inputId = `command-argument-${stage}-${commandId}-${row.id}`;

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
          onChange={(event) =>
            updateCommandArgument(stage, commandId, row.id, event.target.value)
          }
          className={inputClassName}
        />
        <button
          type="button"
          className="min-h-10 shrink-0 text-sm text-red-600 hover:text-red-700 max-[480px]:self-start"
          onClick={() => onRemove(row.id)}
        >
          Remove argument
        </button>
      </div>
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import type { BuilderCommand, CommandStage } from "../../models/commands.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { useUserValidation } from "../users/UserValidationContext.ts";
import { CommandCard } from "./CommandCard.tsx";

const EMPTY_STATE = {
  runcmd: {
    heading: "No run commands yet",
    body: "Add a command for first-boot setup. Commands run in the order shown.",
    addLabel: "Add run command",
  },
  bootcmd: {
    heading: "No boot commands yet",
    body: "Add an early-boot command only when the task must run before normal cloud-init setup.",
    addLabel: "Add boot command",
  },
} as const;

const STAGE_LABEL = {
  runcmd: "Run command",
  bootcmd: "Boot command",
} as const;

interface CommandCardListProps {
  stage: CommandStage;
  commands: BuilderCommand[];
  onFocusRequestHandled?: () => void;
}

export function CommandCardList({
  stage,
  commands,
  onFocusRequestHandled,
}: CommandCardListProps) {
  const { consumeFocusRequest } = useUserValidation();
  const addCommand = useProjectStore((state) => state.addCommand);
  const removeCommand = useProjectStore((state) => state.removeCommand);
  const moveCommand = useProjectStore((state) => state.moveCommand);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [pendingReorderFocus, setPendingReorderFocus] = useState<{
    commandId: string;
    direction: "up" | "down";
  } | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const clearPendingFocus = useCallback(() => setPendingFocusId(null), []);
  const clearPendingReorderFocus = useCallback(
    () => setPendingReorderFocus(null),
    [],
  );
  const handleFocusRequestHandled = useCallback(() => {
    consumeFocusRequest();
    onFocusRequestHandled?.();
  }, [consumeFocusRequest, onFocusRequestHandled]);
  const copy = EMPTY_STATE[stage];

  const handleAdd = () => {
    const id = addCommand(stage);
    if (id) {
      setPendingFocusId(id);
    }
  };

  const handleRemove = (commandId: string) => {
    const index = commands.findIndex((command) => command.id === commandId);
    removeCommand(stage, commandId);

    const remaining = commands.filter((command) => command.id !== commandId);
    const nextCommand = remaining[index];
    const previousCommand = remaining[index - 1];

    if (nextCommand) {
      setPendingFocusId(nextCommand.id);
      return;
    }
    if (previousCommand) {
      setPendingFocusId(previousCommand.id);
      return;
    }

    queueMicrotask(() => {
      addButtonRef.current?.focus({ preventScroll: true });
    });
  };

  const handleMove = (commandId: string, direction: "up" | "down") => {
    moveCommand(stage, commandId, direction);
    const currentIndex = commands.findIndex((command) => command.id === commandId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const position = targetIndex + 1;
    const count = commands.length;
    setMoveAnnouncement(
      `${STAGE_LABEL[stage]} moved to position ${position} of ${count}.`,
    );
    setPendingReorderFocus({ commandId, direction });
  };

  return (
    <div className="space-y-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {moveAnnouncement}
      </div>

      {commands.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ui-border bg-ui-raised p-6 text-left">
          <p className="text-sm font-semibold text-ui-text">{copy.heading}</p>
          <p className="text-sm text-ui-muted-text">{copy.body}</p>
        </div>
      ) : (
        commands.map((command, index) => (
          <CommandCard
            key={command.id}
            stage={stage}
            command={command}
            position={index + 1}
            total={commands.length}
            shouldFocusCommand={
              pendingFocusId === command.id && pendingReorderFocus === null
            }
            reorderFocusDirection={
              pendingReorderFocus?.commandId === command.id
                ? pendingReorderFocus.direction
                : null
            }
            onFocused={clearPendingFocus}
            onReorderFocused={clearPendingReorderFocus}
            onFocusRequestHandled={handleFocusRequestHandled}
            onRemove={handleRemove}
            onMove={handleMove}
          />
        ))
      )}

      <button
        ref={addButtonRef}
        type="button"
        className="mt-6 min-h-10 rounded border border-ui-action bg-ui-action px-4 py-2 text-sm text-ui-action-contrast hover:bg-ui-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-focus-offset-canvas"
        onClick={handleAdd}
      >
        {copy.addLabel}
      </button>
    </div>
  );
}

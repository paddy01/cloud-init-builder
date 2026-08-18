import { useCallback, type KeyboardEvent } from "react";
import type { CommandStage } from "../../models/commands.ts";
import { COMMAND_STAGES } from "./commandStageTabs.ts";

interface CommandStageTabsProps {
  activeStage: CommandStage;
  counts: Record<CommandStage, number>;
  onStageChange: (stage: CommandStage) => void;
}

export function CommandStageTabs({
  activeStage,
  counts,
  onStageChange,
}: CommandStageTabsProps) {
  const activeIndex = COMMAND_STAGES.findIndex((stage) => stage.id === activeStage);

  const selectStageByIndex = useCallback(
    (index: number) => {
      const stage = COMMAND_STAGES[index];
      if (stage) {
        onStageChange(stage.id);
      }
    },
    [onStageChange],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (activeIndex === -1) {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        selectStageByIndex(Math.max(0, activeIndex - 1));
        break;
      case "ArrowRight":
        event.preventDefault();
        selectStageByIndex(Math.min(COMMAND_STAGES.length - 1, activeIndex + 1));
        break;
      case "Home":
        event.preventDefault();
        selectStageByIndex(0);
        break;
      case "End":
        event.preventDefault();
        selectStageByIndex(COMMAND_STAGES.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Command stages"
      className="mt-6 flex border-b border-ui-border bg-ui-inset"
      onKeyDown={handleKeyDown}
    >
      {COMMAND_STAGES.map((stage) => {
        const isActive = activeStage === stage.id;
        const count = counts[stage.id];

        return (
          <button
            key={stage.id}
            type="button"
            role="tab"
            id={`command-stage-tab-${stage.id}`}
            aria-selected={isActive}
            aria-controls={stage.panelId}
            tabIndex={isActive ? 0 : -1}
            className={
              isActive
                ? "flex items-center gap-2 border-b-2 border-ui-selected-border bg-ui-selected px-4 py-3 text-sm font-semibold text-ui-selected-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-inset)]"
                : "flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm text-ui-muted-text hover:bg-ui-raised hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-inset)]"
            }
            onClick={() => onStageChange(stage.id)}
          >
            <span>{stage.label}</span>
            <span
              className={
                isActive
                  ? "rounded-full border border-ui-selected-border bg-ui-selected px-2 py-0.5 text-xs text-ui-selected-text"
                  : "rounded-full border border-ui-border bg-ui-raised px-2 py-0.5 text-xs text-ui-text"
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

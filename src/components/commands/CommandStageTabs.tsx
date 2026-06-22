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
      className="mt-6 flex border-b border-gray-200"
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
                ? "flex items-center gap-2 border-b-2 border-blue-600 px-4 py-3 text-sm font-semibold text-blue-700"
                : "flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm text-gray-600 hover:text-gray-900"
            }
            onClick={() => onStageChange(stage.id)}
          >
            <span>{stage.label}</span>
            <span
              className={
                isActive
                  ? "rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                  : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
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

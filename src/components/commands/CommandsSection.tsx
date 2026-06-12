import { useEffect, useState } from "react";
import { isCommandsConfig } from "../../models/commands.ts";
import type { CommandStage } from "../../models/commands.ts";
import { useUserValidation } from "../users/UserValidationContext.tsx";
import { useProjectStore } from "../../state/projectStore.ts";
import { CommandCardList } from "./CommandCardList.tsx";
import {
  CommandStageTabs,
  getCommandStagePanelId,
} from "./CommandStageTabs.tsx";
import { CommandStageGuidance } from "./CommandStageGuidance.tsx";
import { CommandValidationSummary } from "./CommandValidationSummary.tsx";
import { getStageFromIssuePath } from "./commandValidationPaths.ts";

export function CommandsSection() {
  const commands = useProjectStore((state) => state.project?.commands);
  const { focusRequestPath } = useUserValidation();
  const [activeStage, setActiveStage] = useState<CommandStage>("runcmd");

  useEffect(() => {
    if (!focusRequestPath || !focusRequestPath.startsWith("commands.")) {
      return;
    }

    const stage = getStageFromIssuePath(focusRequestPath);
    if (stage) {
      setActiveStage(stage);
    }
  }, [focusRequestPath]);

  if (!commands || !isCommandsConfig(commands)) {
    return null;
  }

  const counts = {
    runcmd: commands.runcmd.length,
    bootcmd: commands.bootcmd.length,
  };

  return (
    <section className="space-y-8 p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Commands</h2>
        <p className="text-sm text-gray-500">
          Add ordered commands for early boot or first-boot setup without writing
          cloud-init YAML.
        </p>
      </div>

      <CommandStageTabs
        activeStage={activeStage}
        counts={counts}
        onStageChange={setActiveStage}
      />

      <div
        role="tabpanel"
        id={getCommandStagePanelId(activeStage)}
        aria-labelledby={`command-stage-tab-${activeStage}`}
      >
        <div className="mb-6 mt-6 space-y-6">
          <CommandStageGuidance stage={activeStage} />
          <CommandValidationSummary
            activeStage={activeStage}
            onStageChange={setActiveStage}
          />
        </div>

        <CommandCardList
          stage={activeStage}
          commands={commands[activeStage]}
        />
      </div>
    </section>
  );
}

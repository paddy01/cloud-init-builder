import type { CommandStage } from "../../models/commands.ts";

export const COMMAND_STAGES: {
  id: CommandStage;
  label: string;
  panelId: string;
}[] = [
  { id: "runcmd", label: "Run commands", panelId: "command-stage-panel-runcmd" },
  { id: "bootcmd", label: "Boot commands", panelId: "command-stage-panel-bootcmd" },
];

export function getCommandStagePanelId(stage: CommandStage): string {
  return stage === "runcmd"
    ? "command-stage-panel-runcmd"
    : "command-stage-panel-bootcmd";
}

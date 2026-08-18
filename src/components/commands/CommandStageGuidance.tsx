import type { CommandStage } from "../../models/commands.ts";

interface CommandStageGuidanceProps {
  stage: CommandStage;
}

export function CommandStageGuidance({ stage }: CommandStageGuidanceProps) {
  if (stage === "runcmd") {
    return (
      <div className="rounded-lg border border-ui-border bg-ui-inset px-4 py-3 text-ui-text">
        <p className="text-sm font-semibold">First-boot runtime commands</p>
        <p className="text-xs">
          Run commands execute once on the instance&apos;s first boot, after most
          cloud-init configuration. Use them for setup, service enablement, and
          final provisioning steps.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ui-warning-border bg-ui-warning px-4 py-3 text-ui-warning-text">
      <p className="text-sm font-semibold">Boot commands run early on every boot</p>
      <p className="text-xs">
        Use boot commands only for low-level, idempotent tasks. Networking, users,
        packages, and later cloud-init configuration may not be ready yet.
      </p>
    </div>
  );
}

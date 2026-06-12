import { useMemo } from "react";
import {
  CLOUD_CONFIG_HEADER,
  generateCloudInit,
} from "../../generators/generateCloudInit.ts";
import { isCommandsConfig } from "../../models/commands.ts";
import { isUsersConfig } from "../../models/users.ts";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { validateConfig } from "../../validators/validateConfig.ts";
import { PreviewBanner } from "./PreviewBanner.tsx";

export function PreviewPanel() {
  const project = useProjectStore((s) => s.project);
  const debouncedProject = useDebouncedValue(project, 300);
  const issues = useMemo(() => validateConfig(project), [project]);
  const blockingErrors = useMemo(
    () => issues.filter((issue) => issue.severity === "error"),
    [issues],
  );
  const result = useMemo(
    () =>
      generateCloudInit({
        identity: debouncedProject?.identity,
        users: isUsersConfig(debouncedProject?.users)
          ? debouncedProject.users
          : undefined,
        commands: isCommandsConfig(debouncedProject?.commands)
          ? debouncedProject.commands
          : undefined,
      }),
    [debouncedProject],
  );

  if (!project) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm font-semibold text-gray-900">No project loaded</p>
        <p className="text-sm text-gray-500">
          Create or open a project to preview cloud-init YAML.
        </p>
      </div>
    );
  }

  if (result.yaml === CLOUD_CONFIG_HEADER) {
    return (
      <>
        <PreviewBanner issues={blockingErrors} />
        <div className="p-4 text-center">
          <p className="text-sm font-semibold text-gray-900">No identity yet</p>
          <p className="text-sm text-gray-500">
            Add a hostname on the left to see your cloud-init YAML appear here.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            No users section will be emitted until the default user is preserved
            or a custom user is added.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewBanner issues={blockingErrors} />
      <pre className="overflow-auto px-4 py-3">
        <code className="font-mono text-xs leading-5 whitespace-pre text-gray-900">
          {result.yaml}
        </code>
      </pre>
    </>
  );
}

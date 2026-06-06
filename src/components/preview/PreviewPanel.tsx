import { useMemo } from "react";
import {
  CLOUD_CONFIG_HEADER,
  generateCloudInit,
} from "../../generators/generateCloudInit.ts";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { validateIdentity } from "../../validators/validateConfig.ts";
import { PreviewBanner } from "./PreviewBanner.tsx";

export function PreviewPanel() {
  const project = useProjectStore((s) => s.project);
  const identity = project?.identity;
  const debouncedIdentity = useDebouncedValue(identity, 300);
  const issues = useMemo(() => validateIdentity(identity), [identity]);
  const result = useMemo(
    () => generateCloudInit({ identity: debouncedIdentity }),
    [debouncedIdentity],
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
        <PreviewBanner issues={issues} />
        <div className="p-4 text-center">
          <p className="text-sm font-semibold text-gray-900">No identity yet</p>
          <p className="text-sm text-gray-500">
            Add a hostname on the left to see your cloud-init YAML appear here.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewBanner issues={issues} />
      <pre className="overflow-auto px-4 py-3">
        <code className="font-mono text-xs leading-5 whitespace-pre text-gray-900">
          {result.yaml}
        </code>
      </pre>
    </>
  );
}

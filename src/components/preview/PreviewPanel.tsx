import { useMemo } from "react";
import { CLOUD_CONFIG_HEADER, generateCloudInit } from "../../generators/generateCloudInit.ts";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.ts";
import { toGenerateInput } from "../../services/yamlService.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { useValidation } from "../validation/validationContext.ts";
import { PreviewBanner } from "./PreviewBanner.tsx";
import { isNetworkingConfig, isSemanticallyBlankNetworkInterface } from "../../models/networking.ts";
import { NetworkingOutputDisclosure } from "../networking/NetworkingOutputDisclosure.tsx";

export interface PreviewPanelProps {
  onShowEditor?: (path?: string) => void;
}

export function PreviewPanel({ onShowEditor }: PreviewPanelProps = {}) {
  const project = useProjectStore((s) => s.project);
  const debouncedProject = useDebouncedValue(project, 300);
  const { blockingErrors, mergedIssues } = useValidation();
  const warnings = mergedIssues.filter((issue) => issue.severity === "warning");
  const hasNetworkingOutput = isNetworkingConfig(project?.networking) && project.networking.interfaces.some((entry) => !isSemanticallyBlankNetworkInterface(entry));
  const result = useMemo(
    () =>
      generateCloudInit(debouncedProject ? toGenerateInput(debouncedProject) : {}),
    [debouncedProject],
  );

  if (!project) {
    return (
      <section aria-label="YAML preview" className="p-4 text-center text-ui-text">
        <p className="text-sm font-semibold">No project loaded</p>
        <p className="text-sm text-ui-muted-text">Create or open a project to preview cloud-init YAML.</p>
      </section>
    );
  }

  if (blockingErrors.length > 0) {
    return (
      <section aria-label="YAML preview">
        {hasNetworkingOutput && <NetworkingOutputDisclosure variant="preview" />}
        <PreviewBanner issues={blockingErrors} onShowEditor={onShowEditor} />
      </section>
    );
  }

  if (result.yaml === CLOUD_CONFIG_HEADER) {
    return (
      <section aria-label="YAML preview">
        {hasNetworkingOutput && <NetworkingOutputDisclosure variant="preview" />}
        <PreviewBanner issues={blockingErrors} warnings={warnings} onShowEditor={onShowEditor} />
        <div className="p-4 text-center text-ui-text">
          <p className="text-sm font-semibold">No identity yet</p>
          <p className="text-sm text-ui-muted-text">
            Add a hostname on the left to see your cloud-init YAML appear here.
          </p>
          <p className="mt-2 text-xs text-ui-muted-text">
            No users section will be emitted until the default user is preserved
            or a custom user is added.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="YAML preview">
      {hasNetworkingOutput && <NetworkingOutputDisclosure variant="preview" />}
      <PreviewBanner issues={blockingErrors} warnings={warnings} onShowEditor={onShowEditor} />
      <div className="border border-ui-terminal-border bg-ui-terminal px-4 py-3 text-ui-terminal-text">
        <div className="max-w-full overflow-x-auto overflow-y-hidden">
          <pre className="min-w-max whitespace-pre font-mono text-xs leading-5">
            <code>{result.yaml}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

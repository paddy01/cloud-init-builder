import { useEffect, useMemo, useRef, useState } from "react";
import { COMMANDS_VALIDATION_SUMMARY_HEADING_ID } from "../components/commands/CommandValidationSummary.tsx";
import { useUserValidation } from "../components/users/UserValidationContext.ts";
import { USERS_VALIDATION_SUMMARY_HEADING_ID } from "../components/users/UserValidationSummary.tsx";
import { exportProject, importProject } from "../services/projectService.ts";
import { copyCloudInitYaml, exportCloudInitYaml } from "../services/yamlService.ts";
import { useProjectStore } from "../state/projectStore.ts";
import { useEditorNavigation } from "./editorNavigation.ts";

function isUserIssue(path: string): boolean {
  return path.startsWith("users.");
}

function isCommandIssue(path: string): boolean {
  return path.startsWith("commands.");
}

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const project = useProjectStore((state) => state.project);
  const isDirty = useProjectStore((state) => state.isDirty);
  const importWarnings = useProjectStore((state) => state.importWarnings);
  const newProject = useProjectStore((state) => state.newProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const markSaved = useProjectStore((state) => state.markSaved);
  const clearWarnings = useProjectStore((state) => state.clearWarnings);
  const { setActiveSection } = useEditorNavigation();
  const {
    blockingErrors,
    revealAllValidation,
    requestFocus,
    getFirstBlockingIssueSection,
  } = useUserValidation();

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const exportBlocked = blockingErrors.length > 0;
  const noProject = project === null;
  const nativeExportDisabled = noProject;
  const userErrors = blockingErrors.filter((issue) => isUserIssue(issue.path));
  const commandErrors = blockingErrors.filter((issue) => isCommandIssue(issue.path));
  const userErrorCount = userErrors.length;
  const commandErrorCount = commandErrors.length;
  const hasUserErrors = userErrorCount > 0;
  const hasCommandErrors = commandErrorCount > 0;

  const exportTooltipText = useMemo(() => {
    if (noProject) {
      return "Open a project or click New to start.";
    }
    if (hasUserErrors) {
      if (userErrorCount === 1) {
        return "Cannot export yet. 1 user validation error prevents export. Review the Users validation summary.";
      }
      return `Cannot export yet. ${userErrorCount} user validation errors prevent export. Review the Users validation summary.`;
    }
    if (hasCommandErrors) {
      if (commandErrorCount === 1) {
        return "Cannot export yet. 1 command validation error prevents export. Review the Commands validation summary.";
      }
      return `Cannot export yet. ${commandErrorCount} command validation errors prevent export. Review the Commands validation summary.`;
    }
    const identityErrorCount = blockingErrors.length;
    if (identityErrorCount === 1) {
      return "Cannot export yet. 1 validation error prevents export. Fix the highlighted field below.";
    }
    if (identityErrorCount > 1) {
      return `Cannot export yet. ${identityErrorCount} validation errors prevent export. Fix the highlighted fields below.`;
    }
    return "";
  }, [
    blockingErrors.length,
    commandErrorCount,
    hasCommandErrors,
    hasUserErrors,
    noProject,
    userErrorCount,
  ]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const scheduleClearCopyFeedback = (ms: number) => {
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      copyFeedbackTimeoutRef.current = null;
    }, ms);
  };

  const handleBlockedExport = () => {
    revealAllValidation();

    const section = getFirstBlockingIssueSection();
    if (section === "users") {
      setActiveSection("users");
      requestFocus(USERS_VALIDATION_SUMMARY_HEADING_ID);
      return;
    }
    if (section === "commands") {
      setActiveSection("commands");
      requestFocus(COMMANDS_VALIDATION_SUMMARY_HEADING_ID);
      return;
    }
    setActiveSection("identity");
  };

  const handleNew = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Create a new project anyway?")) {
      return;
    }
    newProject("Untitled Project");
  };

  const handleSave = () => {
    if (!project) return;
    const dispatched = exportProject(project, project.metadata.name);
    if (dispatched) {
      markSaved();
    }
  };

  const handleExportYaml = () => {
    if (!project || nativeExportDisabled) return;
    if (exportBlocked) {
      handleBlockedExport();
      return;
    }
    exportCloudInitYaml(project);
  };

  const handleExportKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if (!exportBlocked || nativeExportDisabled) {
      return;
    }
    event.preventDefault();
    handleBlockedExport();
  };

  const handleCopyYaml = async () => {
    if (!project) return;
    const ok = await copyCloudInitYaml(project);
    if (ok) {
      setCopyFeedback("Copied YAML to clipboard.");
      scheduleClearCopyFeedback(2000);
    } else {
      setCopyFeedback("Couldn't copy. Select the preview text and copy manually.");
      scheduleClearCopyFeedback(4000);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDirty && !window.confirm("You have unsaved changes. Open another project anyway?")) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importProject(file);
      loadProject(result.project, result.warnings);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import project file.";
      window.alert(message);
    } finally {
      event.target.value = "";
    }
  };

  const exportButtonClassName =
    exportBlocked && !nativeExportDisabled
      ? "rounded bg-blue-600 px-3 py-1.5 text-sm text-white opacity-50 cursor-not-allowed"
      : "rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  const exportYamlButton = (
    <button
      type="button"
      onClick={handleExportYaml}
      onKeyDown={handleExportKeyDown}
      disabled={nativeExportDisabled}
      aria-disabled={exportBlocked && !nativeExportDisabled ? true : undefined}
      className={exportButtonClassName}
    >
      Export YAML
    </button>
  );

  return (
    <div className="border-b border-gray-200 bg-white">
      <header className="flex h-14 items-center gap-3 px-4">
        <h1 className="text-lg font-semibold text-gray-900">Cloud-Init Builder</h1>
        <div className="h-6 border-l border-gray-300" />
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <span>{project?.metadata.name ?? "No Project"}</span>
          {isDirty && (
            <span className="text-amber-500" title="Unsaved changes">
              *
            </span>
          )}
        </div>
        {copyFeedback && (
          <span className="text-xs text-gray-600">{copyFeedback}</span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleNew}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          New
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Open
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={project === null}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleCopyYaml}
          disabled={project === null}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy YAML
        </button>
        {exportBlocked && !nativeExportDisabled ? (
          <span title={exportTooltipText}>{exportYamlButton}</span>
        ) : (
          exportYamlButton
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".cib.json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </header>
      {importWarnings.length > 0 && (
        <div className="flex items-start justify-between gap-3 border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <div className="flex-1">
            <p>
              {importWarnings.length} import warning
              {importWarnings.length === 1 ? "" : "s"}: some fields were invalid and
              defaults were applied.
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {importWarnings.slice(0, 3).map((warning, index) => (
                <li key={`${warning.path}-${index}`}>
                  <code className="font-mono">{warning.path || "(root)"}</code> —{" "}
                  {warning.message}
                </li>
              ))}
              {importWarnings.length > 3 && (
                <li className="italic">…and {importWarnings.length - 3} more</li>
              )}
            </ul>
          </div>
          <button
            type="button"
            onClick={clearWarnings}
            className="shrink-0 rounded border border-amber-300 px-2 py-1 text-xs hover:bg-amber-100"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

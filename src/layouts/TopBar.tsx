import { useRef } from "react";
import { exportProject, importProject } from "../services/projectService.ts";
import { useProjectStore } from "../state/projectStore.ts";

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const project = useProjectStore((state) => state.project);
  const isDirty = useProjectStore((state) => state.isDirty);
  const importWarnings = useProjectStore((state) => state.importWarnings);
  const newProject = useProjectStore((state) => state.newProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const markSaved = useProjectStore((state) => state.markSaved);
  const clearWarnings = useProjectStore((state) => state.clearWarnings);

  const handleNew = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Create a new project anyway?")) {
      return;
    }
    newProject("Untitled Project");
  };

  const handleSave = () => {
    if (!project) return;
    exportProject(project, project.metadata.name);
    markSaved();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="border-b border-gray-200 bg-white">
      <header className="flex h-14 items-center gap-3 px-4">
        <h1 className="text-lg font-bold text-gray-900">Cloud-Init Builder</h1>
        <div className="h-6 border-l border-gray-300" />
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <span>{project?.metadata.name ?? "No Project"}</span>
          {isDirty && (
            <span className="text-amber-500" title="Unsaved changes">
              *
            </span>
          )}
        </div>
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".cib.json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </header>
      {importWarnings.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <p>
            {importWarnings.length} import warning
            {importWarnings.length === 1 ? "" : "s"}: some fields were invalid and
            defaults were applied.
          </p>
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

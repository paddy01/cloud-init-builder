import {
  CURRENT_FORMAT_VERSION,
  createDefaultProject,
  projectFileSchema,
  type ProjectFile,
} from "../models/project.ts";
import { getExportFilename } from "../utils/slugify.ts";

export interface ImportWarning {
  path: string;
  message: string;
}

export interface ImportResult {
  project: ProjectFile;
  warnings: ImportWarning[];
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

function migrateProject(raw: Record<string, unknown>): Record<string, unknown> {
  const version =
    typeof raw.formatVersion === "number" ? raw.formatVersion : 0;

  if (version > CURRENT_FORMAT_VERSION) {
    throw new Error(
      `Project file requires format version ${version}, but this app only supports up to ${CURRENT_FORMAT_VERSION}. Please update the application.`,
    );
  }

  const migrated = { ...raw };

  // Future: add migration steps here
  // if (version < 2) migrated = migrateV1toV2(migrated);

  migrated.formatVersion = CURRENT_FORMAT_VERSION;
  return migrated;
}

export function exportProject(project: ProjectFile, projectName: string): boolean {
  try {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getExportFilename(projectName);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);

    return true;
  } catch {
    return false;
  }
}

export async function importProject(file: File): Promise<ImportResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${file.size} bytes). Maximum allowed size is ${MAX_FILE_SIZE} bytes.`,
    );
  }

  let raw: unknown;
  try {
    const text = await file.text();
    raw = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse project file as JSON.");
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Project file must be a JSON object.");
  }

  const migrated = migrateProject(raw as Record<string, unknown>);
  const result = projectFileSchema.safeParse(migrated);

  if (result.success) {
    return { project: result.data, warnings: [] };
  }

  const warnings: ImportWarning[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  const rawMetadata =
    typeof migrated.metadata === "object" &&
    migrated.metadata !== null &&
    !Array.isArray(migrated.metadata)
      ? (migrated.metadata as Record<string, unknown>)
      : undefined;

  const fallbackName =
    typeof rawMetadata?.name === "string" ? rawMetadata.name : "Untitled Project";

  const defaults = createDefaultProject(fallbackName);
  const rawMeta = rawMetadata ?? {};

  return {
    project: {
      ...defaults,
      ...migrated,
      formatVersion: CURRENT_FORMAT_VERSION,
      metadata: {
        ...defaults.metadata,
        ...(typeof rawMeta.name === "string" ? { name: rawMeta.name } : {}),
        ...(typeof rawMeta.createdAt === "string"
          ? { createdAt: rawMeta.createdAt }
          : {}),
        ...(typeof rawMeta.updatedAt === "string"
          ? { updatedAt: rawMeta.updatedAt }
          : {}),
        ...(typeof rawMeta.appVersion === "string"
          ? { appVersion: rawMeta.appVersion }
          : {}),
      },
    } as ProjectFile,
    warnings,
  };
}

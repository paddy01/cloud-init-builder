import {
  CURRENT_FORMAT_VERSION,
  createDefaultProject,
  projectFileSchema,
  type ProjectFile,
} from "../models/project.ts";
import { identitySchema } from "../models/identity.ts";
import { normalizeCommandsSection } from "../models/commands.ts";
import { normalizeUsersSection } from "../models/users.ts";
import {
  DEFAULT_NETWORKING_CONFIG,
  normalizeNetworkingSection,
} from "../models/networking.ts";
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

function normalizeImportedProjectName(value: unknown): string {
  if (typeof value !== "string") {
    return "Untitled Project";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Untitled Project";
}

function normalizeIdentitySection(rawIdentity: unknown): {
  identity: ProjectFile["identity"];
  warnings: ImportWarning[];
} {
  if (rawIdentity === undefined) {
    return { identity: undefined, warnings: [] };
  }

  const result = identitySchema.safeParse(rawIdentity);
  if (result.success) {
    return { identity: result.data, warnings: [] };
  }

  return {
    identity: undefined,
    warnings: [
      {
        path: "identity",
        message: "Invalid identity data was omitted during import.",
      },
    ],
  };
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

function migrateProject(
  raw: Record<string, unknown>,
): { migrated: Record<string, unknown>; warnings: ImportWarning[] } {
  const version =
    typeof raw.formatVersion === "number" ? raw.formatVersion : 0;

  if (version > CURRENT_FORMAT_VERSION) {
    throw new Error(
      `Project file requires format version ${version}, but this app only supports up to ${CURRENT_FORMAT_VERSION}. Please update the application.`,
    );
  }

  const migrated = { ...raw };
  const identityNormalization = normalizeIdentitySection(raw.identity);
  if (identityNormalization.identity === undefined) {
    delete migrated.identity;
  } else {
    migrated.identity = identityNormalization.identity;
  }

  const usersNormalization = normalizeUsersSection(raw.users);
  migrated.users = usersNormalization.users;

  const commandsNormalization = normalizeCommandsSection(raw.commands);
  migrated.commands = commandsNormalization.commands;

  let networkingNormalization;
  if (version < 2) {
    networkingNormalization = {
      networking: structuredClone(DEFAULT_NETWORKING_CONFIG),
      warnings: Object.prototype.hasOwnProperty.call(raw, "networking")
        ? [
            {
              path: "networking",
              message:
                "Networking data from a pre-networking project format was omitted during import.",
            },
          ]
        : [],
    };
  } else {
    networkingNormalization = normalizeNetworkingSection(raw.networking);
  }
  migrated.networking = networkingNormalization.networking;

  // Future: add migration steps here
  // if (version < 2) migrated = migrateV1toV2(migrated);

  migrated.formatVersion = CURRENT_FORMAT_VERSION;
  return {
    migrated,
    warnings: [
      ...identityNormalization.warnings,
      ...usersNormalization.warnings,
      ...commandsNormalization.warnings,
      ...networkingNormalization.warnings,
    ],
  };
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
    const text = await readFileText(file);
    raw = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse project file as JSON.");
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Project file must be a JSON object.");
  }

  const { migrated, warnings: migrationWarnings } = migrateProject(
    raw as Record<string, unknown>,
  );
  const result = projectFileSchema.safeParse(migrated);

  if (result.success) {
    const normalizedName = normalizeImportedProjectName(result.data.metadata.name);
    return {
      project: {
        ...result.data,
        metadata: {
          ...result.data.metadata,
          name: normalizedName,
        },
      },
      warnings: migrationWarnings,
    };
  }

  const warnings: ImportWarning[] = [
    ...migrationWarnings,
    ...result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  ];

  const rawMetadata =
    typeof migrated.metadata === "object" &&
    migrated.metadata !== null &&
    !Array.isArray(migrated.metadata)
      ? (migrated.metadata as Record<string, unknown>)
      : undefined;

  const fallbackName = normalizeImportedProjectName(rawMetadata?.name);

  const defaults = createDefaultProject(fallbackName);
  const rawMeta = rawMetadata ?? {};

  return {
    project: {
      ...defaults,
      ...migrated,
      formatVersion: CURRENT_FORMAT_VERSION,
      metadata: {
        ...defaults.metadata,
        name: fallbackName,
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

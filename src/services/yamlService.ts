import {
  generateCloudInit,
  type GenerateProjectInput,
} from "../generators/generateCloudInit.ts";
import type { ProjectFile } from "../models/project.ts";
import { isUsersConfig } from "../models/users.ts";
import { slugify } from "../utils/slugify.ts";
import { validateIdentity } from "../validators/validateConfig.ts";

function toGenerateInput(project: ProjectFile): GenerateProjectInput {
  return {
    identity: project.identity,
    users: isUsersConfig(project.users) ? project.users : undefined,
  };
}

export function exportCloudInitYaml(project: ProjectFile): boolean {
  const issues = validateIdentity(project.identity);
  if (issues.some((issue) => issue.severity === "error")) {
    return false;
  }

  try {
    const result = generateCloudInit(toGenerateInput(project));
    const blob = new Blob([result.yaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const hostname = project.identity?.hostname?.trim();
    const filename = hostname
      ? `${slugify(hostname)}.yaml`
      : `${slugify(project.metadata.name) || "untitled"}.yaml`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);

    return true;
  } catch {
    return false;
  }
}

export async function copyCloudInitYaml(project: ProjectFile): Promise<boolean> {
  const result = generateCloudInit(toGenerateInput(project));

  try {
    await navigator.clipboard.writeText(result.yaml);
    return true;
  } catch {
    return false;
  }
}

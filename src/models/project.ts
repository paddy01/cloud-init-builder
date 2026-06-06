import { z } from "zod";
import { APP_VERSION } from "../utils/version.ts";

export const projectMetadataSchema = z.object({
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  appVersion: z.string(),
});

export const projectFileSchema = z.looseObject({
  formatVersion: z.number().int(),
  metadata: projectMetadataSchema,
});

export type ProjectFile = z.infer<typeof projectFileSchema>;
export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

export const CURRENT_FORMAT_VERSION = 1;

export function createDefaultProject(name: string): ProjectFile {
  const now = new Date().toISOString();

  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    metadata: {
      name,
      createdAt: now,
      updatedAt: now,
      appVersion: APP_VERSION,
    },
  };
}

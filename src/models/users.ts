import { z } from "zod";

const sudoSchema = z.union([
  z.string(),
  z.array(z.union([z.string(), z.null()])),
  z.null(),
  z.boolean(),
]);

export const builderUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  gecos: z.string().optional(),
  groups: z.array(z.string()).optional(),
  shell: z.string().optional(),
  sudo: sudoSchema.optional(),
  primary_group: z.string().optional(),
  no_create_home: z.boolean().optional(),
  homedir: z.string().optional(),
  system: z.boolean().optional(),
});

export const usersConfigSchema = z.object({
  preserveDefault: z.boolean(),
  entries: z.array(builderUserSchema),
});

export type BuilderUser = z.infer<typeof builderUserSchema>;
export type UsersConfig = z.infer<typeof usersConfigSchema>;

export const DEFAULT_USERS_CONFIG: UsersConfig = {
  preserveDefault: true,
  entries: [],
};

let userIdCounter = 0;

export function createUserId(): string {
  userIdCounter += 1;
  return `user-${userIdCounter}`;
}

export function createBlankUser(id = createUserId()): BuilderUser {
  return { id, shell: "/bin/bash" };
}

export function isUsersConfig(value: unknown): value is UsersConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "preserveDefault" in value &&
    typeof (value as UsersConfig).preserveDefault === "boolean" &&
    Array.isArray((value as UsersConfig).entries)
  );
}

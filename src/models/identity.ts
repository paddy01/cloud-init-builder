import { z } from "zod";

export const MANAGE_ETC_HOSTS_VALUES = [true, false, "localhost"] as const;

export const identitySchema = z.object({
  hostname: z.string().optional(),
  fqdn: z.string().optional(),
  prefer_fqdn_over_hostname: z.boolean().optional(),
  manage_etc_hosts: z.union([z.boolean(), z.literal("localhost")]).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

export type IdentityConfig = z.infer<typeof identitySchema>;

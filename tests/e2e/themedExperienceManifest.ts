export type ThemedExperienceGroup =
  | "surface"
  | "layout"
  | "responsive"
  | "navigation"
  | "workflow";

export type ThemedExperienceCase = {
  id: string;
  group: ThemedExperienceGroup;
  theme: "light" | "dark";
  viewport: { width: number; height: number };
  tag: "@surface" | "@layout-band" | "@responsive" | "@repository-nav" | "@workflow";
  timeout: number;
};

export const THEMED_EXPERIENCE_CASE_MANIFEST: readonly ThemedExperienceCase[] = [
  { id: "surface-light-phone", group: "surface", theme: "light", viewport: { width: 390, height: 844 }, tag: "@surface", timeout: 60_000 },
  { id: "surface-dark-phone", group: "surface", theme: "dark", viewport: { width: 390, height: 844 }, tag: "@surface", timeout: 60_000 },
  { id: "surface-light-desktop", group: "surface", theme: "light", viewport: { width: 1440, height: 1024 }, tag: "@surface", timeout: 60_000 },
  { id: "surface-dark-desktop", group: "surface", theme: "dark", viewport: { width: 1440, height: 1024 }, tag: "@surface", timeout: 60_000 },
  { id: "layout-lg-inflow-1024", group: "layout", theme: "light", viewport: { width: 1024, height: 900 }, tag: "@layout-band", timeout: 45_000 },
  { id: "responsive-inflow-1279", group: "responsive", theme: "light", viewport: { width: 1279, height: 900 }, tag: "@responsive", timeout: 45_000 },
  { id: "responsive-corner-1280", group: "responsive", theme: "dark", viewport: { width: 1280, height: 900 }, tag: "@responsive", timeout: 45_000 },
  { id: "repository-same-tab", group: "navigation", theme: "light", viewport: { width: 1280, height: 900 }, tag: "@repository-nav", timeout: 30_000 },
  { id: "workflow-light-phone", group: "workflow", theme: "light", viewport: { width: 390, height: 844 }, tag: "@workflow", timeout: 120_000 },
  { id: "workflow-dark-desktop", group: "workflow", theme: "dark", viewport: { width: 1440, height: 1024 }, tag: "@workflow", timeout: 120_000 },
] as const;

import { describe, expect, it } from "vitest";
import { THEMED_EXPERIENCE_CASE_MANIFEST } from "../e2e/themedExperienceManifest.ts";

describe("THEMED_EXPERIENCE_CASE_MANIFEST", () => {
  it("locks the exact browser evidence inventory", () => {
    expect(
      THEMED_EXPERIENCE_CASE_MANIFEST.map((entry) => ({
        id: entry.id,
        group: entry.group,
        theme: entry.theme,
        viewport: entry.viewport,
        tag: entry.tag,
        timeout: entry.timeout,
      })),
    ).toEqual([
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
    ]);
  });

  it("keeps every title tag independently runnable", () => {
    expect(THEMED_EXPERIENCE_CASE_MANIFEST).toHaveLength(10);
    expect(new Set(THEMED_EXPERIENCE_CASE_MANIFEST.map((entry) => entry.id))).toHaveLength(10);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "surface")).toHaveLength(4);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "layout")).toHaveLength(1);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "responsive")).toHaveLength(2);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "navigation")).toHaveLength(1);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "workflow")).toHaveLength(2);
  });
});

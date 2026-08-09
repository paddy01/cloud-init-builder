import { expect, test } from "@playwright/test";

const compatibilityPairs = {
  "--theme-canvas": "--ui-canvas",
  "--theme-surface": "--ui-raised",
  "--theme-text": "--ui-text",
  "--theme-muted-text": "--ui-muted-text",
  "--theme-border": "--ui-border",
  "--theme-accent": "--ui-action",
} as const;

for (const [theme, expectedFocus] of [["light", "#2563EB"], ["dark", "#60A5FA"]] as const) {
  test(`@token-tracer resolves ${theme} semantic and compatibility roles in the production shell`, async ({ page }) => {
    await page.goto("/");
    await page.evaluate((resolvedTheme) => {
      document.documentElement.dataset.theme = resolvedTheme;
    }, theme);

    const properties = await page.evaluate((pairs) => {
      const styles = getComputedStyle(document.documentElement);
      return Object.fromEntries([
        ...Object.keys(pairs),
        ...Object.values(pairs),
        "--ui-focus",
      ].map((property) => [property, styles.getPropertyValue(property).trim()]));
    }, compatibilityPairs);

    expect(properties["--ui-canvas"]).not.toBe("");
    expect(properties["--ui-focus"].toLowerCase()).toBe(expectedFocus.toLowerCase());
    for (const [legacy, canonical] of Object.entries(compatibilityPairs)) {
      expect(properties[legacy]).toBe(properties[canonical]);
    }
    await expect(page.getByRole("heading", { name: "Cloud-Init Builder" })).toBeVisible();
  });
}

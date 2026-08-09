import { expect, test } from "@playwright/test";

type ThemeCase = {
  name: string;
  storedPreference?: "light" | "dark";
  osDark: boolean;
  expected: "light" | "dark";
};

const cases: ThemeCase[] = [
  { name: "saved Light", storedPreference: "light", osDark: true, expected: "light" },
  { name: "saved Dark", storedPreference: "dark", osDark: false, expected: "dark" },
  { name: "System with OS Dark", osDark: true, expected: "dark" },
];

for (const themeCase of cases) {
  test(`sets ${themeCase.name} before the application module hydrates`, async ({ page }) => {
    test.setTimeout(60_000);
    let releaseModule!: () => void;
    const moduleReleased = new Promise<void>((resolve) => {
      releaseModule = resolve;
    });

    await page.addInitScript(({ storedPreference, osDark }) => {
      localStorage.clear();
      if (storedPreference) localStorage.setItem("cloud-init-builder.theme", storedPreference);
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: (query: string) => ({
          media: query,
          matches: query === "(prefers-color-scheme: dark)" ? osDark : false,
          addEventListener() {},
          removeEventListener() {},
        }),
      });
    }, themeCase);
    await page.route("**/assets/*.js", async (route) => {
      await moduleReleased;
      await route.continue();
    });

    await page.goto("/", { waitUntil: "commit" });
    await expect.poll(async () => page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      root: document.querySelector("#root")?.innerHTML,
    }))).toEqual({ theme: themeCase.expected, colorScheme: themeCase.expected, root: "" });

    releaseModule();
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect.poll(async () => page.evaluate(() => [
      document.documentElement.dataset.theme,
      getComputedStyle(document.documentElement).colorScheme,
    ])).toEqual([themeCase.expected, themeCase.expected]);
  });
}

test("uses bounded post-startup color motion and disables it for reduced motion", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.dataset.themeTransitions = "enabled";
    const colorProbe = document.createElement("button");
    colorProbe.dataset.themeTransition = "colors";
    colorProbe.textContent = "color probe";
    document.body.append(colorProbe);
    const focusProbe = document.createElement("button");
    focusProbe.dataset.themeTransitionFocus = "";
    focusProbe.textContent = "focus probe";
    document.body.append(focusProbe);
    focusProbe.focus();
  });
  await expect(page.locator("[data-theme-transition='colors']")).toHaveCSS("transition-duration", /0\.15s/);
  await expect(page.locator("[data-theme-transition='colors']")).toHaveCSS("transition-timing-function", /ease-out/);
  await expect(page.locator("[data-theme-transition-focus]")).toHaveCSS("transition-property", /box-shadow/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-theme-transition='colors']")).toHaveCSS("transition-duration", "0s");
});

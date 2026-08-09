import { expect, test } from "@playwright/test";

const REPOSITORY_URL = "https://github.com/paddy01/cloud-init-builder";
const REPOSITORY_LINK_NAME = "Open Cloud-Init Builder repository on GitHub";
const LONG_PROJECT_NAME = "Homelab Proxmox Template With A Very Long Descriptive Project Name";

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

async function createLongInvalidProject(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "New" }).click();
  await page.getByRole("button", { name: "Rename project" }).click();
  await page.getByRole("textbox", { name: "Project name" }).fill(LONG_PROJECT_NAME);
  await page.getByRole("button", { name: "Save project name" }).click();
  await page.getByRole("button", { name: "Copy YAML" }).click({ force: true });
  await expect(
    page.getByText("Copy blocked. Fix validation errors before copying YAML."),
  ).toBeVisible();
}

function rectanglesIntersect(
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number },
) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

for (const width of [1279, 1280] as const) {
  test(`@repository-tracer protects TopBar geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await createLongInvalidProject(page);

    const repositoryLink = page.getByRole("link", { name: REPOSITORY_LINK_NAME });
    await expect(repositoryLink).toHaveCount(1);
    await expect(repositoryLink).toHaveAttribute("href", REPOSITORY_URL);
    await expect(repositoryLink).not.toHaveAttribute("target");
    await expect(repositoryLink).toContainText("GitHub");
    await repositoryLink.focus();
    await expect(repositoryLink).toBeFocused();

    const geometry = await page.evaluate(() => {
      const toRect = (element: Element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const getRect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return toRect(element);
      };
      const link = document.querySelector<HTMLAnchorElement>(
        'a[aria-label="Open Cloud-Init Builder repository on GitHub"]',
      );
      const header = document.querySelector<HTMLElement>('[data-testid="top-bar-header"]');
      const shell = document.querySelector<HTMLElement>('[data-testid="top-bar-shell"]');
      const title = document.querySelector<HTMLElement>('[title="Homelab Proxmox Template With A Very Long Descriptive Project Name"]');
      const feedback = Array.from(document.querySelectorAll<HTMLElement>("span")).find(
        (element) => element.textContent === "Copy blocked. Fix validation errors before copying YAML.",
      );
      if (!link || !header || !shell || !title || !feedback) throw new Error("Missing TopBar geometry target");

      return {
        linkPosition: getComputedStyle(link).position,
        offsetParent: (link.offsetParent as HTMLElement | null)?.dataset.testid ?? null,
        insideUtilities: document.querySelector('[data-testid="top-bar-utilities"]')?.contains(link) ?? false,
        headerPaddingRight: getComputedStyle(header).paddingRight,
        titleMaxWidth: getComputedStyle(title).maxWidth,
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
        repository: getRect('a[aria-label="Open Cloud-Init Builder repository on GitHub"]'),
        projectIdentity: getRect('[title="Homelab Proxmox Template With A Very Long Descriptive Project Name"]'),
        appearance: getRect('fieldset[aria-label="Appearance"]'),
        utilityActions: ["New", "Open", "Save", "Copy YAML", "Export YAML"].map((name) => {
          const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
            (element) => element.textContent === name,
          );
          if (!button) throw new Error(`Missing utility action ${name}`);
          return toRect(button);
        }),
        feedback: toRect(feedback),
      };
    });

    expect(geometry.documentOverflow).toBe(false);
    expect(geometry.repository.width).toBeGreaterThanOrEqual(40);
    expect(geometry.repository.height).toBeGreaterThanOrEqual(40);
    expect(geometry.projectIdentity.right).toBeLessThanOrEqual(width);
    expect(geometry.appearance.right).toBeLessThanOrEqual(width);
    for (const action of geometry.utilityActions) {
      expect(action.right).toBeLessThanOrEqual(width);
      expect(action.bottom).toBeLessThanOrEqual(900);
    }
    expect(geometry.feedback.right).toBeLessThanOrEqual(width);

    if (width === 1279) {
      expect(geometry.linkPosition).toBe("static");
      expect(geometry.insideUtilities).toBe(true);
    } else {
      expect(geometry.linkPosition).toBe("absolute");
      expect(geometry.offsetParent).toBe("top-bar-shell");
      expect(geometry.headerPaddingRight).toBe("144px");
      expect(geometry.titleMaxWidth).toBe("192px");
    }

    for (const target of [
      geometry.projectIdentity,
      geometry.appearance,
      geometry.feedback,
      ...geometry.utilityActions,
    ]) {
      expect(rectanglesIntersect(geometry.repository, target)).toBe(false);
    }
  });
}

test("@repository-tracer activates the fixed native link in the current tab", async ({ page }) => {
  await page.route(REPOSITORY_URL, (route) => route.fulfill({ body: "Repository reached" }));
  await page.goto("/");

  const repositoryLink = page.getByRole("link", { name: REPOSITORY_LINK_NAME });
  await repositoryLink.focus();
  await repositoryLink.press("Enter");
  await expect(page).toHaveURL(REPOSITORY_URL);
  await expect(page.getByText("Repository reached")).toBeVisible();
});

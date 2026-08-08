import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Locator } from "@playwright/test";

const LONG_DEVICE_NAME =
  "homelab-uplink0";
const FIRST_MAC_DRAFT = "52:54:00:12:34:56";
const SECOND_NAME_DRAFT = "ens18";
const SECOND_MAC_DRAFT = "02:42:ac:11:00:02";

interface SavedNetworkingProject {
  formatVersion: number;
  networking: {
    interfaces: Array<{
      id: string;
      identityMode: "name" | "mac";
      name: string;
      macAddress: string;
    }>;
  };
}

async function downloadText(download: Download): Promise<string> {
  const path = await download.path();
  if (!path) {
    throw new Error("expected Playwright to materialize the download");
  }
  return readFile(path, "utf-8");
}

async function expectFortyPixelSquare(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width).toBe(40);
  expect(box?.height).toBe(40);
}

test.describe("networking foundation", () => {
  test("builds, saves, reopens, and embeds networking in YAML", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator("#identity-hostname").fill("networking-e2e");

    const navigation = page.getByRole("navigation");
    await expect(navigation.locator("li")).toHaveText([
      "Identity",
      "Users",
      "Networking",
      "Commands",
      "Export",
    ]);
    await navigation
      .getByRole("button", { name: "Networking", exact: true })
      .click();
    await expect(
      navigation.getByRole("button", { name: "Networking", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { name: "Start your network configuration" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add blank interface" }),
    ).toHaveCount(1);

    const navBox = await navigation.boundingBox();
    const previewBox = await page.locator("aside").boundingBox();
    expect(navBox?.width).toBe(224);
    expect(previewBox?.width).toBe(320);

    await page.setViewportSize({ width: 390, height: 844 });
    for (const label of [
      "Use IPv4 DHCP",
      "Use static IPv4",
      "Use dual-stack DHCP",
    ]) {
      const buttonBox = await page
        .getByRole("button", { name: label })
        .boundingBox();
      expect(buttonBox?.x).toBeGreaterThanOrEqual(0);
      expect((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0)).toBeLessThanOrEqual(
        390,
      );
    }
    await page.screenshot({
      path: testInfo.outputPath("networking-empty-mobile-390x844.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.getByRole("button", { name: "Add blank interface" }).click();
    const firstCard = page.getByRole("article").first();
    const firstNameInput = firstCard.getByRole("textbox", {
      name: "Device name",
    });
    await expect(firstNameInput).toBeFocused();
    await firstNameInput.fill(LONG_DEVICE_NAME);
    await firstNameInput.blur();
    await firstCard
      .getByRole("radio", { name: "MAC address" })
      .check({ force: true });
    const firstMacInput = firstCard.getByRole("textbox", {
      name: "MAC address",
    });
    await firstMacInput.fill(FIRST_MAC_DRAFT);
    await firstMacInput.blur();
    await firstCard
      .getByRole("radio", { name: "Device name" })
      .check({ force: true });
    await expect(firstNameInput).toHaveValue(LONG_DEVICE_NAME);

    await page.getByRole("button", { name: "Add blank interface" }).click();
    const secondCard = page.getByRole("article").nth(1);
    await secondCard
      .getByRole("textbox", { name: "Device name" })
      .fill(SECOND_NAME_DRAFT);
    await secondCard.getByRole("textbox", { name: "Device name" }).blur();
    await secondCard
      .getByRole("radio", { name: "MAC address" })
      .check({ force: true });
    await secondCard
      .getByRole("textbox", { name: "MAC address" })
      .fill(SECOND_MAC_DRAFT);
    await secondCard
      .getByRole("button", { name: `Move ${SECOND_MAC_DRAFT} up` })
      .click();

    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAccessibleName(SECOND_MAC_DRAFT);
    await expect(cards.nth(1)).toHaveAccessibleName(LONG_DEVICE_NAME);
    await expect(page.locator("article article")).toHaveCount(0);

    const ipv6Routes = cards.nth(0).getByRole("group", {
      name: "IPv6 routes",
    });
    await cards.nth(0).getByRole("button", { name: "Add IPv6 address" }).click();
    await cards
      .nth(0)
      .getByRole("textbox", {
        name: `IPv6 address 1 for ${SECOND_MAC_DRAFT}`,
      })
      .fill("2001:db8:ffff:ffff:ffff:ffff:ffff:10/64");
    await ipv6Routes
      .getByRole("button", { name: "Add specific route" })
      .click();
    await ipv6Routes
      .getByRole("textbox", {
        name: `Destination for IPv6 specific route 1 for ${SECOND_MAC_DRAFT}`,
      })
      .fill("2001:db8:1::/64");
    await ipv6Routes
      .getByRole("textbox", {
        name: `Gateway (optional) for IPv6 specific route 1 for ${SECOND_MAC_DRAFT}`,
      })
      .fill("2001:db8::1");
    await ipv6Routes
      .getByRole("button", {
        name: `Advanced for IPv6 specific route 1 for ${SECOND_MAC_DRAFT}`,
      })
      .click();
    await ipv6Routes
      .getByRole("textbox", {
        name: `Metric (optional) for IPv6 specific route 1 for ${SECOND_MAC_DRAFT}`,
      })
      .fill("100");

    const ipv4Routes = cards.nth(1).getByRole("group", {
      name: "IPv4 routes",
    });
    await cards.nth(1).getByRole("button", { name: "Add IPv4 address" }).click();
    await cards
      .nth(1)
      .getByRole("textbox", {
        name: `IPv4 address 1 for ${LONG_DEVICE_NAME}`,
      })
      .fill("192.0.2.10/24");
    await ipv4Routes
      .getByRole("button", { name: "Add default route" })
      .click();
    await ipv4Routes
      .getByRole("textbox", {
        name: `Gateway for IPv4 default route 1 for ${LONG_DEVICE_NAME}`,
      })
      .fill("192.0.2.1");
    await ipv4Routes
      .getByRole("button", {
        name: `Advanced for IPv4 default route 1 for ${LONG_DEVICE_NAME}`,
      })
      .click();
    await ipv4Routes
      .getByRole("textbox", {
        name: `Metric (optional) for IPv4 default route 1 for ${LONG_DEVICE_NAME}`,
      })
      .fill("200");

    await page.screenshot({
      path: testInfo.outputPath("networking-desktop-1440x900.png"),
      fullPage: true,
    });

    const projectDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const projectDownload = await projectDownloadPromise;
    const projectText = await downloadText(projectDownload);
    const saved = JSON.parse(projectText) as SavedNetworkingProject;
    expect(saved.formatVersion).toBe(2);
    expect(saved.networking.interfaces).toHaveLength(2);
    expect(saved.networking.interfaces).toEqual([
      expect.objectContaining({
        identityMode: "mac",
        name: SECOND_NAME_DRAFT,
        macAddress: SECOND_MAC_DRAFT,
      }),
      expect.objectContaining({
        identityMode: "name",
        name: LONG_DEVICE_NAME,
        macAddress: FIRST_MAC_DRAFT,
      }),
    ]);
    const savedIds = saved.networking.interfaces.map((entry) => entry.id);
    expect(new Set(savedIds).size).toBe(2);

    const projectPath = await projectDownload.path();
    if (!projectPath) {
      throw new Error("expected Playwright to materialize the project download");
    }
    await page.getByRole("button", { name: "Open" }).click();
    await page.locator('input[type="file"]').setInputFiles(projectPath);
    await expect(page.getByRole("status")).toHaveCount(0);
    await navigation
      .getByRole("button", { name: "Networking", exact: true })
      .click();

    const reopenedCards = page.getByRole("article");
    await expect(reopenedCards).toHaveCount(2);
    await expect(reopenedCards.nth(0)).toHaveAccessibleName(SECOND_MAC_DRAFT);
    await expect(reopenedCards.nth(1)).toHaveAccessibleName(LONG_DEVICE_NAME);
    await expect(
      reopenedCards.nth(0).getByRole("radio", { name: "MAC address" }),
    ).toBeChecked();
    await expect(
      reopenedCards.nth(0).getByRole("textbox", { name: "MAC address" }),
    ).toHaveValue(SECOND_MAC_DRAFT);
    await reopenedCards
      .nth(0)
      .getByRole("radio", { name: "Device name" })
      .check({ force: true });
    await expect(
      reopenedCards.nth(0).getByRole("textbox", { name: "Device name" }),
    ).toHaveValue(SECOND_NAME_DRAFT);
    await reopenedCards
      .nth(0)
      .getByRole("radio", { name: "MAC address" })
      .check({ force: true });
    await reopenedCards
      .nth(1)
      .getByRole("radio", { name: "MAC address" })
      .check({ force: true });
    await expect(
      reopenedCards.nth(1).getByRole("textbox", { name: "MAC address" }),
    ).toHaveValue(FIRST_MAC_DRAFT);
    await reopenedCards
      .nth(1)
      .getByRole("radio", { name: "Device name" })
      .check({ force: true });
    await expect(
      reopenedCards.nth(1).getByRole("textbox", { name: "Device name" }),
    ).toHaveValue(LONG_DEVICE_NAME);

    const reopenedLabelIds = await reopenedCards.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-labelledby") ?? ""),
    );
    expect(reopenedLabelIds).toEqual(
      savedIds.map((id) => `network-interface-title-${id}`),
    );

    const yamlDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export YAML" }).click();
    const yaml = await downloadText(await yamlDownloadPromise);
    expect(yaml.startsWith("#cloud-config\n")).toBe(true);
    expect(yaml).toMatch(/^network:/m);
    for (const id of savedIds) {
      expect(yaml).not.toContain(id);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("tab", { name: "Editor" })).toBeVisible();
    const mobileNavBox = await navigation.boundingBox();
    expect(mobileNavBox?.width).toBe(390);
    await expect(reopenedCards).toHaveCount(2);

    const longTitle = reopenedCards.nth(1).getByRole("heading", {
      name: LONG_DEVICE_NAME,
    });
    const longTitleBox = await longTitle.boundingBox();
    const actionGroup = reopenedCards.nth(1).getByRole("group", {
      name: `Reorder ${LONG_DEVICE_NAME}`,
    });
    const actionGroupBox = await actionGroup.boundingBox();
    expect(actionGroupBox?.y).toBeGreaterThan(
      (longTitleBox?.y ?? 0) + (longTitleBox?.height ?? 0),
    );

    const deviceSegment = reopenedCards.nth(1).getByText("Device name", {
      exact: true,
    }).first();
    const macSegment = reopenedCards.nth(1).getByText("MAC address", {
      exact: true,
    }).first();
    const deviceSegmentBox = await deviceSegment.boundingBox();
    const macSegmentBox = await macSegment.boundingBox();
    expect(deviceSegmentBox?.y).toBe(macSegmentBox?.y);
    expect(Math.abs((deviceSegmentBox?.width ?? 0) - (macSegmentBox?.width ?? 0))).toBeLessThan(2);

    await expectFortyPixelSquare(
      reopenedCards.nth(1).getByRole("button", {
        name: `Move ${LONG_DEVICE_NAME} up`,
      }),
    );
    await expectFortyPixelSquare(
      reopenedCards.nth(1).getByRole("button", {
        name: `Remove ${LONG_DEVICE_NAME}`,
      }),
    );

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(0);
    expect(overflow.body).toBeLessThanOrEqual(0);

    await reopenedCards
      .nth(1)
      .getByRole("button", { name: `Remove ${LONG_DEVICE_NAME}` })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Keep interface" }),
    ).toBeFocused();
    await expect(
      dialog.getByRole("button", { name: "Remove interface" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Keep interface" }).click();
    await expect(
      reopenedCards.nth(1).getByRole("button", {
        name: `Remove ${LONG_DEVICE_NAME}`,
      }),
    ).toBeFocused();

    await page.screenshot({
      path: testInfo.outputPath("networking-mobile-390x844.png"),
      fullPage: true,
    });
  });

  test("wraps long recovered import-warning paths on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const longUnknownKey = `unknown-${"network-property-".repeat(20)}tail`;
    const importedProject = {
      formatVersion: 2,
      metadata: {
        name: "Recovered networking warning",
        createdAt: "2026-07-19T10:00:00.000Z",
        updatedAt: "2026-07-19T10:00:00.000Z",
        appVersion: "0.1.0",
      },
      users: { preserveDefault: true, entries: [] },
      commands: { bootcmd: [], runcmd: [] },
      networking: {
        interfaces: [
          {
            id: "network-interface-warning",
            identityMode: "name",
            name: "ens18",
            macAddress: "",
            [longUnknownKey]: true,
          },
        ],
      },
    };

    await page.locator('input[type="file"]').setInputFiles({
      name: "recovered-networking-warning.cib.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importedProject)),
    });

    const status = page.getByRole("status");
    const warningPath = status.locator("code");
    const dismiss = status.getByRole("button", {
      name: "Dismiss import warnings",
    });
    await expect(warningPath).toHaveText(
      `networking.interfaces.0.${longUnknownKey}`,
    );
    await expect(warningPath).toBeVisible();
    await expect(dismiss).toBeVisible();

    const warningBox = await warningPath.boundingBox();
    const dismissBox = await dismiss.boundingBox();
    expect(warningBox?.x).toBeGreaterThanOrEqual(0);
    expect((warningBox?.x ?? 0) + (warningBox?.width ?? 0)).toBeLessThanOrEqual(
      390,
    );
    expect((dismissBox?.x ?? 0) + (dismissBox?.width ?? 0)).toBeLessThanOrEqual(
      390,
    );

    const overflow = await page.evaluate(() => ({
      document:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(0);
    expect(overflow.body).toBeLessThanOrEqual(0);
  });
});

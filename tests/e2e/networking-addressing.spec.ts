import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Locator, type Page } from "@playwright/test";

interface SavedNetworkingProject {
  networking: {
    interfaces: Array<{
      id: string;
      name: string;
      dhcp4: boolean;
      dhcp6: boolean;
      ipv4Addresses: Array<{ id: string; value: string; isExampleValue: boolean }>;
      ipv6Addresses: Array<{ id: string; value: string; isExampleValue: boolean }>;
      ipv4Routes: Array<{
        id: string;
        kind: "default" | "specific";
        destination: string;
        gateway: string;
        metric: string;
        exampleFields: string[];
      }>;
      ipv6Routes: Array<{
        id: string;
        kind: "default" | "specific";
        destination: string;
        gateway: string;
        metric: string;
        exampleFields: string[];
      }>;
      nameservers: Array<{ id: string; value: string; isExampleValue: boolean }>;
      searchDomains: Array<{ id: string; value: string; isExampleValue: boolean }>;
      mtuEnabled: boolean;
      mtu: string;
      exampleFields: string[];
    }>;
  };
}

async function downloadText(download: Download): Promise<string> {
  const path = await download.path();
  if (!path) throw new Error("expected Playwright to materialize the download");
  return readFile(path, "utf-8");
}

async function activateWithKeyboard(page: Page, control: Locator) {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press("Enter");
}

async function expectNoHorizontalPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(0);
  expect(overflow.body).toBeLessThanOrEqual(0);
}

test.describe("network addressing, routes, DNS, and link settings", () => {
  test("authors a complete portable interface and reopens every nested field", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Networking" }).click();

    await activateWithKeyboard(
      page,
      page.getByRole("button", { name: "Use static IPv4" }),
    );
    const card = page.getByRole("article").first();
    const name = card.getByRole("textbox", { name: "Device name" });
    await expect(name).toBeFocused();
    await expect(card.getByText("Example value—replace for your network")).toHaveCount(5);

    const exampleAddress = card.getByRole("textbox", {
      name: "IPv4 address 1 for ens18",
    });
    const untouchedGateway = card.getByRole("textbox", {
      name: "Gateway for IPv4 default route 1 for ens18",
    });
    expect(await exampleAddress.getAttribute("aria-describedby")).toBeTruthy();
    const gatewayMarker = await untouchedGateway.getAttribute("aria-describedby");
    expect(gatewayMarker).toBeTruthy();
    await exampleAddress.fill("192.0.2.25/24");
    await expect(exampleAddress).not.toHaveAttribute("aria-describedby", /.+/);
    await expect(untouchedGateway).toHaveAttribute("aria-describedby", gatewayMarker!);
    await expect(card.getByText("Example value—replace for your network")).toHaveCount(4);

    const dhcp4 = card.getByRole("checkbox", { name: "Enable DHCP4" });
    const dhcp6 = card.getByRole("checkbox", { name: "Enable DHCP6" });
    await dhcp4.focus();
    await page.keyboard.press("Space");
    await dhcp6.focus();
    await page.keyboard.press("Space");
    await expect(dhcp4).toBeChecked();
    await expect(dhcp6).toBeChecked();

    const addIpv6 = card.getByRole("button", { name: "Add IPv6 address" });
    await activateWithKeyboard(page, addIpv6);
    const ipv6Address = card.getByRole("textbox", {
      name: "IPv6 address 1 for ens18",
    });
    await expect(ipv6Address).toBeFocused();
    await ipv6Address.fill("2001:db8::25/64");

    const ipv4Routes = card.getByRole("group", { name: "IPv4 routes" });
    const ipv4Advanced = ipv4Routes.getByRole("button", {
      name: "Advanced for IPv4 default route 1 for ens18",
    });
    await activateWithKeyboard(page, ipv4Advanced);
    await ipv4Routes
      .getByRole("textbox", {
        name: "Metric (optional) for IPv4 default route 1 for ens18",
      })
      .fill("100");

    const ipv6Routes = card.getByRole("group", { name: "IPv6 routes" });
    await activateWithKeyboard(
      page,
      ipv6Routes.getByRole("button", { name: "Add specific route" }),
    );
    const destination = ipv6Routes.getByRole("textbox", {
      name: "Destination for IPv6 specific route 1 for ens18",
    });
    await expect(destination).toBeFocused();
    await destination.fill("2001:db8:1::/64");
    await ipv6Routes
      .getByRole("textbox", {
        name: "Gateway (optional) for IPv6 specific route 1 for ens18",
      })
      .fill("2001:db8::1");
    await activateWithKeyboard(
      page,
      ipv6Routes.getByRole("button", {
        name: "Advanced for IPv6 specific route 1 for ens18",
      }),
    );
    await ipv6Routes
      .getByRole("textbox", {
        name: "Metric (optional) for IPv6 specific route 1 for ens18",
      })
      .fill("200");

    const addNameserver = card.getByRole("button", { name: "Add nameserver" });
    await activateWithKeyboard(page, addNameserver);
    const secondNameserver = card.getByRole("textbox", {
      name: "Nameserver 2 for ens18",
    });
    await expect(secondNameserver).toBeFocused();
    await secondNameserver.fill("2001:db8::53");
    await activateWithKeyboard(
      page,
      card.getByRole("button", { name: "Remove nameserver 2 for ens18" }),
    );
    await expect(
      card.getByRole("textbox", { name: "Nameserver 1 for ens18" }),
    ).toBeFocused();

    const mtuToggle = card.getByRole("checkbox", { name: "Set custom MTU" });
    await mtuToggle.focus();
    await page.keyboard.press("Space");
    const mtu = card.getByRole("textbox", { name: "MTU" });
    await expect(mtu).toBeFocused();
    await mtu.fill("1450");
    await mtuToggle.focus();
    await page.keyboard.press("Space");
    await expect(mtu).toHaveCount(0);
    await page.keyboard.press("Space");
    await expect(card.getByRole("textbox", { name: "MTU" })).toHaveValue("");
    await card.getByRole("textbox", { name: "MTU" }).fill("1450");

    const saveEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const projectDownload = await saveEvent;
    const saved = JSON.parse(await downloadText(projectDownload)) as SavedNetworkingProject;
    expect(saved.networking.interfaces).toHaveLength(1);
    expect(saved.networking.interfaces[0]).toMatchObject({
      name: "ens18",
      dhcp4: true,
      dhcp6: true,
      mtuEnabled: true,
      mtu: "1450",
      ipv4Addresses: [{ value: "192.0.2.25/24", isExampleValue: false }],
      ipv6Addresses: [{ value: "2001:db8::25/64", isExampleValue: false }],
      nameservers: [{ value: "192.0.2.53", isExampleValue: true }],
      searchDomains: [{ value: "lab.example", isExampleValue: true }],
    });
    expect(saved.networking.interfaces[0]?.ipv4Routes[0]).toMatchObject({
      kind: "default",
      gateway: "192.0.2.1",
      metric: "100",
      exampleFields: ["gateway"],
    });
    expect(saved.networking.interfaces[0]?.ipv6Routes[0]).toMatchObject({
      kind: "specific",
      destination: "2001:db8:1::/64",
      gateway: "2001:db8::1",
      metric: "200",
    });

    const projectPath = await projectDownload.path();
    if (!projectPath) throw new Error("expected downloaded project path");
    await page.getByRole("button", { name: "Open" }).click();
    await page.locator('input[type="file"]').setInputFiles(projectPath);
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.getByRole("button", { name: "Networking" }).click();

    const reopened = page.getByRole("article").first();
    await expect(
      reopened.getByRole("textbox", { name: "IPv4 address 1 for ens18" }),
    ).toHaveValue("192.0.2.25/24");
    await expect(
      reopened.getByRole("textbox", { name: "IPv6 address 1 for ens18" }),
    ).toHaveValue("2001:db8::25/64");
    await reopened
      .getByRole("textbox", { name: "IPv6 address 1 for ens18" })
      .fill("2001:db8::26/64");

    await page.getByRole("button", { name: "Add blank interface" }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await page
      .getByRole("article")
      .nth(1)
      .getByRole("textbox", { name: "Device name" })
      .fill("ens19");
    await expect(page.locator("article article")).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("networking-addressing-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 320, height: 720 });
    await expectNoHorizontalPageOverflow(page);
    for (const control of [
      page.getByRole("button", { name: "Add blank interface" }),
      reopened.getByRole("button", { name: "Add IPv4 address" }),
      reopened.getByRole("button", { name: "Add nameserver" }),
      reopened.getByRole("checkbox", { name: "Set custom MTU" }),
    ]) {
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    }
    await page.screenshot({
      path: testInfo.outputPath("networking-addressing-mobile-320.png"),
      fullPage: true,
    });

    const removeSecond = page.getByRole("article").nth(1).getByRole("button", {
      name: "Remove ens19",
    });
    await activateWithKeyboard(page, removeSecond);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Keep interface" })).toBeFocused();
    await activateWithKeyboard(
      page,
      dialog.getByRole("button", { name: "Keep interface" }),
    );
    await expect(removeSecond).toBeFocused();
    await activateWithKeyboard(page, removeSecond);
    await activateWithKeyboard(
      page,
      dialog.getByRole("button", { name: "Remove interface" }),
    );
    await expect(page.getByRole("article")).toHaveCount(1);
  });
});

async function openOutputContractProject(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "output-contract.cib.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        formatVersion: 2,
        metadata: {
          name: "Output contract",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
          appVersion: "0.1.0",
        },
        identity: { hostname: "web01" },
        users: { preserveDefault: false, entries: [] },
        commands: { bootcmd: [], runcmd: [] },
        networking: {
          interfaces: [
            { id: "network-interface-ens18", identityMode: "name", name: "ens18", macAddress: "", dhcp4: true, dhcp6: false },
            { id: "network-interface-mac", identityMode: "mac", name: "inactive-name-draft", macAddress: "52:54:00:12:34:56", dhcp4: false, dhcp6: true },
          ],
        },
      }),
    ),
  });
  await page.getByRole("button", { name: "Networking" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
}

test.describe("embedded networking output contract", () => {
  test("embedded network output contract", async ({ page }) => {
    test.setTimeout(90_000);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openOutputContractProject(page);

    await expect(page.getByRole("heading", { name: "Networking output needs platform delivery" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Read cloud-init network configuration guidance" })).toHaveAttribute(
      "href",
      "https://docs.cloud-init.io/en/latest/topics/network-config.html",
    );
    const preview = page.locator("aside pre code");
    await expect(preview).toContainText("network:");
    const previewText = await preview.textContent();
    await page.getByRole("button", { name: "Copy YAML" }).click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export YAML" }).click();
    const downloadedText = await downloadText(await downloadEvent);
    expect(clipboardText).toBe(previewText);
    expect(downloadedText).toBe(previewText);
    expect(previewText).toContain("version: 2");
    expect(previewText).toContain("interface0:");
    expect(previewText).not.toMatch(/network-interface|inactive-name|authoring output|networking output needs platform/i);
    await expect(page.locator("aside").getByRole("link", { name: "Learn why" })).toBeVisible();

    const firstCard = page.getByRole("article").first();
    await firstCard.getByRole("textbox", { name: "Device name" }).fill("");
    await expect(page.locator("aside pre code")).toHaveCount(0);
    const copy = page.getByRole("button", { name: "Copy YAML" });
    const exportYaml = page.getByRole("button", { name: "Export YAML" });
    await expect(copy).toHaveAttribute("aria-disabled", "true");
    await expect(exportYaml).toHaveAttribute("aria-disabled", "true");
    await page.evaluate(() => navigator.clipboard.writeText("blocked-output-sentinel"));
    await activateWithKeyboard(page, copy);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("blocked-output-sentinel");
    const blockedDownload = Promise.race([
      page.waitForEvent("download").then(() => "download"),
      page.waitForTimeout(350).then(() => "none"),
    ]);
    await activateWithKeyboard(page, exportYaml);
    expect(await blockedDownload).toBe("none");
    await page.getByRole("button", { name: /Networking.*Enter a device name/ }).click();
    await firstCard.getByRole("textbox", { name: "Device name" }).fill("ens18");
    await firstCard.getByRole("button", { name: "Add IPv4 address" }).click();
    await firstCard.getByRole("textbox", { name: "IPv4 address 1 for ens18" }).fill("192.0.2.10/24");
    await expect(page.locator("aside").getByRole("heading", { name: "Networking safety warnings" })).toBeVisible();
    await expect(preview).toContainText("192.0.2.10/24");
    const warningPreview = await preview.textContent();
    await page.getByRole("button", { name: "Copy YAML" }).click();
    const warningClipboard = await page.evaluate(() => navigator.clipboard.readText());
    const warningDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export YAML" }).click();
    expect(warningClipboard).toBe(warningPreview);
    expect(await downloadText(await warningDownload)).toBe(warningPreview);
  });

  test("embedded network output contract responsive", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 320, height: 720 });
    await openOutputContractProject(page);
    const firstCard = page.getByRole("article").first();
    await firstCard.getByRole("button", { name: "Add search domain" }).click();
    await firstCard.getByRole("textbox", { name: "Search domain 1 for ens18" }).fill(
      `${"a".repeat(63)}.${"b".repeat(63)}.example.com`,
    );
    const previewTab = page.getByRole("tab", { name: "Preview" });
    await activateWithKeyboard(page, previewTab);
    await expect(previewTab).toHaveAttribute("aria-selected", "true");
    for (const control of [
      page.getByRole("tab", { name: "Editor" }),
      previewTab,
      page.getByRole("button", { name: "Copy YAML" }),
      page.getByRole("button", { name: "Export YAML" }),
      page.getByRole("link", { name: "Learn why" }),
    ]) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeVisible();
      await control.focus();
      await expect(control).toBeFocused();
      expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(40);
    }
    await expectNoHorizontalPageOverflow(page);
    const mobilePre = page.getByRole("main").locator("pre");
    await expect(mobilePre).toBeVisible();
    expect(await mobilePre.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);

    await page.getByRole("tab", { name: "Editor" }).click();
    await firstCard.getByRole("textbox", { name: "Device name" }).fill("");
    await activateWithKeyboard(page, page.getByRole("tab", { name: "Preview" }));
    const recovery = page.getByRole("button", { name: /Networking.*Enter a device name/ });
    await recovery.click();
    await expect(page.getByRole("tab", { name: "Editor" })).toHaveAttribute("aria-selected", "true");
    await expect(firstCard.getByRole("textbox", { name: "Device name" })).toBeFocused();
  });
});

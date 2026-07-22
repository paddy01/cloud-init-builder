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

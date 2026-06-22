import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

const SYNTHETIC_SSH_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z e2e@example.test";

test.describe("quality workflows", () => {
  test("exports valid identity, user, and command data as YAML", async ({
    page,
  }) => {
    await page.goto("/");

    await page.locator("#identity-hostname").fill("e2e-host");
    await page.getByRole("button", { name: "Users" }).click();
    await page.getByRole("button", { name: "Add user" }).click();
    await page.getByLabel("Username").fill("deploy");
    await page.getByRole("button", { name: "Add SSH key" }).click();
    await page
      .getByPlaceholder("ssh-ed25519 AAAA... user@host")
      .fill(SYNTHETIC_SSH_KEY);

    await page.getByRole("button", { name: "Commands" }).click();
    await page.getByRole("button", { name: "Add run command" }).click();
    await page
      .getByRole("tabpanel", { name: /Run commands/i })
      .getByRole("textbox", { name: "Command" })
      .fill("apt-get update");
    await page.getByRole("tab", { name: /Boot commands/i }).click();
    await page.getByRole("button", { name: "Add boot command" }).click();
    await page
      .getByRole("tabpanel", { name: /Boot commands/i })
      .getByRole("textbox", { name: "Command" })
      .fill("mkdir -p /run/e2e-cloud-init");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export YAML" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("e2e-host.yaml");

    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error("expected Playwright to materialize the download");
    }

    const yaml = await readFile(downloadPath, "utf-8");
    expect(yaml.startsWith("#cloud-config\n")).toBe(true);
    expect(yaml).toContain("hostname: e2e-host");
    expect(yaml).toContain("name: deploy");
    expect(yaml).toContain("apt-get update");
    expect(yaml).toContain("mkdir -p /run/e2e-cloud-init");
  });

  test("blocks export for invalid boot command and recovers after correction", async ({
    page,
  }) => {
    await page.goto("/");

    await page.locator("#identity-hostname").fill("e2e-recover");
    await page.getByRole("button", { name: "Commands" }).click();
    await page.getByRole("tab", { name: /Boot commands/i }).click();
    await page.getByRole("button", { name: "Add boot command" }).click();
    const bootCommand = page
      .getByRole("tabpanel", { name: /Boot commands/i })
      .getByRole("textbox", { name: "Command" });
    await bootCommand.fill("mkdir -p /run/e2e-recover");
    await bootCommand.fill("");
    await bootCommand.blur();

    await page.getByRole("tab", { name: /Run commands/i }).click();
    await expect(
      page.getByRole("tab", { name: /Run commands/i }),
    ).toHaveAttribute("aria-selected", "true");

    await page
      .getByRole("button", { name: "Export YAML" })
      .click({ force: true });

    await expect(page.getByText("Commands need attention")).toBeVisible();

    await page
      .getByRole("button", {
        name: /Boot command 1: Export blocked: enter a command/i,
      })
      .click();

    await expect(
      page.getByRole("tab", { name: /Boot commands/i }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page
        .getByRole("tabpanel", { name: /Boot commands/i })
        .getByRole("textbox", { name: "Command" }),
    ).toBeFocused();

    await page
      .getByRole("tabpanel", { name: /Boot commands/i })
      .getByRole("textbox", { name: "Command" })
      .fill("mkdir -p /run/e2e-recover");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export YAML" }).click();
    const download = await downloadPromise;

    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error("expected Playwright to materialize the download");
    }

    const yaml = await readFile(downloadPath, "utf-8");
    expect(yaml).toContain("hostname: e2e-recover");
    expect(yaml).toContain("mkdir -p /run/e2e-recover");
  });
});

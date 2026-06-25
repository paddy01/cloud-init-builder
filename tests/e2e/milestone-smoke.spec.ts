import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

const PROJECT_NAME = "Milestone Smoke";
const HOSTNAME = "milestone-host";
const USERNAME = "deploy";
const RUNCMD = "apt-get update";
const BOOTCMD = "mkdir -p /run/milestone-smoke";
const SYNTHETIC_SSH_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOTGkHwfcOs9I6YuKoGkqNgUvX7Z e2e@example.test";

async function renameProject(page: Page, name: string) {
  await page.getByRole("button", { name: "Rename project" }).click();
  const input = page.getByRole("textbox", { name: "Project name" });
  await input.fill(name);
  await page.getByRole("button", { name: "Save project name" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function configureRepresentativeProject(page: Page) {
  await page.locator("#identity-hostname").fill(HOSTNAME);

  await page.getByRole("button", { name: "Users" }).click();
  await page.getByRole("button", { name: "Add user" }).click();
  await page.getByLabel("Username").fill(USERNAME);
  await page.getByRole("button", { name: "Add SSH key" }).click();
  await page
    .getByPlaceholder("ssh-ed25519 AAAA... user@host")
    .fill(SYNTHETIC_SSH_KEY);

  await page.getByRole("button", { name: "Commands" }).click();
  await page.getByRole("button", { name: "Add run command" }).click();
  await page
    .getByRole("tabpanel", { name: /Run commands/i })
    .getByRole("textbox", { name: "Command" })
    .fill(RUNCMD);
  await page.getByRole("tab", { name: /Boot commands/i }).click();
  await page.getByRole("button", { name: "Add boot command" }).click();
  await page
    .getByRole("tabpanel", { name: /Boot commands/i })
    .getByRole("textbox", { name: "Command" })
    .fill(BOOTCMD);
}

function assertRepresentativeYaml(yaml: string) {
  expect(yaml.startsWith("#cloud-config\n")).toBe(true);
  expect(yaml).toContain(`hostname: ${HOSTNAME}`);
  expect(yaml).toContain(`name: ${USERNAME}`);
  expect(yaml).toContain(SYNTHETIC_SSH_KEY);
  expect(yaml).toContain(RUNCMD);
  expect(yaml).toContain(BOOTCMD);
}

function assertRepresentativeProjectJson(project: Record<string, unknown>) {
  const metadata = project.metadata as Record<string, unknown>;
  expect(metadata.name).toBe(PROJECT_NAME);

  const identity = project.identity as Record<string, unknown>;
  expect(identity.hostname).toBe(HOSTNAME);

  const users = project.users as {
    entries: Array<{
      name?: string;
      ssh_authorized_keys?: Array<{ value: string }>;
    }>;
  };
  const deployUser = users.entries.find((entry) => entry.name === USERNAME);
  expect(deployUser).toBeDefined();
  expect(
    deployUser?.ssh_authorized_keys?.some((key) => key.value === SYNTHETIC_SSH_KEY),
  ).toBe(true);

  const commands = project.commands as {
    bootcmd: Array<{ command?: string }>;
    runcmd: Array<{ command?: string }>;
  };
  expect(commands.bootcmd.some((entry) => entry.command === BOOTCMD)).toBe(true);
  expect(commands.runcmd.some((entry) => entry.command === RUNCMD)).toBe(true);
}

async function readDownloadText(download: { path: () => Promise<string | null> }) {
  const downloadPath = await download.path();
  if (!downloadPath) {
    throw new Error("expected Playwright to materialize the download");
  }
  return readFile(downloadPath, "utf-8");
}

test.describe("milestone smoke", () => {
  test("covers rename, configure, export YAML, save JSON, reopen, and export again", async ({
    page,
  }) => {
    await page.goto("/");

    await renameProject(page, PROJECT_NAME);
    await configureRepresentativeProject(page);

    const firstYamlDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export YAML" }).click();
    const firstYamlDownload = await firstYamlDownloadPromise;

    expect(firstYamlDownload.suggestedFilename()).toBe(`${HOSTNAME}.yaml`);
    const firstYaml = await readDownloadText(firstYamlDownload);
    assertRepresentativeYaml(firstYaml);

    const jsonDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const jsonDownload = await jsonDownloadPromise;

    expect(jsonDownload.suggestedFilename()).toBe("milestone-smoke.cib.json");
    const jsonText = await readDownloadText(jsonDownload);
    const savedProject = JSON.parse(jsonText) as Record<string, unknown>;
    assertRepresentativeProjectJson(savedProject);

    const jsonPath = await jsonDownload.path();
    if (!jsonPath) {
      throw new Error("expected Playwright to materialize the project JSON download");
    }

    await page.getByRole("button", { name: "Open" }).click();
    await page.locator('input[type="file"]').setInputFiles(jsonPath);
    await expect(page.getByText(PROJECT_NAME)).toBeVisible();
    await page.getByRole("button", { name: "Identity" }).click();
    await expect(page.locator("#identity-hostname")).toHaveValue(HOSTNAME);

    const secondYamlDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export YAML" }).click();
    const secondYamlDownload = await secondYamlDownloadPromise;

    expect(secondYamlDownload.suggestedFilename()).toBe(`${HOSTNAME}.yaml`);
    const secondYaml = await readDownloadText(secondYamlDownload);
    assertRepresentativeYaml(secondYaml);
  });
});

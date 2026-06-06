export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getExportFilename(projectName: string): string {
  const slug = slugify(projectName) || "untitled";
  return `${slug}.cib.json`;
}

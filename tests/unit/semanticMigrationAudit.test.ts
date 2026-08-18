// @vitest-environment node
// @ts-expect-error Vitest executes this source-inspection test in Node.
import { readFile, readdir } from "node:fs/promises";
import type { OutputAsset } from "rollup";
import ts from "typescript";
import { build } from "vite";
import { describe, expect, it, vi } from "vitest";
import { THEMED_EXPERIENCE_CASE_MANIFEST } from "../e2e/themedExperienceManifest.ts";

export const SEMANTIC_MIGRATION_FILES = [
  "src/components/navigation/RepositoryLink.tsx",
  "src/components/theme/ThemeControl.tsx",
  "src/layouts/TopBar.tsx",
  "src/layouts/MainLayout.tsx",
  "src/layouts/Sidebar.tsx",
  "src/components/preview/EditorPreviewTabs.tsx",
  "src/components/preview/PreviewPanel.tsx",
  "src/components/preview/PreviewBanner.tsx",
  "src/components/networking/NetworkingOutputDisclosure.tsx",
  "src/components/identity/FieldError.tsx",
  "src/components/identity/IdentityAdvanced.tsx",
  "src/components/identity/IdentityForm.tsx",
  "src/components/users/UsersSection.tsx",
  "src/components/users/UserCard.tsx",
  "src/components/users/UserCardList.tsx",
  "src/components/users/AdvancedUserOptions.tsx",
  "src/components/users/GroupsInput.tsx",
  "src/components/users/PasswordHashField.tsx",
  "src/components/users/ShellSelector.tsx",
  "src/components/users/SshAuthorizedKeysInput.tsx",
  "src/components/users/SudoRuleSelector.tsx",
  "src/components/users/FieldMessage.tsx",
  "src/components/users/UserAuthStatus.tsx",
  "src/components/users/UserValidationSummary.tsx",
  "src/components/networking/NetworkingSection.tsx",
  "src/components/networking/NetworkInterfaceCard.tsx",
  "src/components/networking/NetworkInterfaceCardList.tsx",
  "src/components/networking/NetworkIdentitySelector.tsx",
  "src/components/networking/NetworkingExamples.tsx",
  "src/components/networking/AddressingPanel.tsx",
  "src/components/networking/DnsPanel.tsx",
  "src/components/networking/LinkSettingsPanel.tsx",
  "src/components/networking/RoutesPanel.tsx",
  "src/components/networking/NetworkingValidationSummary.tsx",
  "src/components/networking/ConfirmRemoveInterfaceDialog.tsx",
  "src/components/commands/CommandsSection.tsx",
  "src/components/commands/CommandStageTabs.tsx",
  "src/components/commands/CommandStageGuidance.tsx",
  "src/components/commands/CommandCardList.tsx",
  "src/components/commands/CommandCard.tsx",
  "src/components/commands/CommandFormSelector.tsx",
  "src/components/commands/ShellCommandInput.tsx",
  "src/components/commands/ArgvCommandInput.tsx",
  "src/components/commands/ArgumentRow.tsx",
  "src/components/commands/CommandValidationSummary.tsx",
] as const;

type FindingKind = "palette" | "opacity" | "unresolved";

type Finding = {
  kind: FindingKind;
  file: string;
  line: number;
  column: number;
  property: string;
  value: string;
  syntaxKind?: string;
};

type OpacityAllowlistEntry = Pick<Finding, "file" | "line" | "column" | "value"> & {
  rationale: string;
};

type ScanContext = {
  file: string;
  source: ts.SourceFile;
  constants: Map<string, ts.Expression>;
  findings: Finding[];
};

const FIXTURE_DIRECTORY = "tests/fixtures/semantic-migration-audit";
const fixture = (name: string) => `${FIXTURE_DIRECTORY}/${name}.tsx`;

const LEGACY_PALETTE = /^(?:bg|text|border|ring|outline|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-|$)/;
const ARBITRARY_PALETTE = /^(?:bg|text|border|ring|outline|fill|stroke)-\[(.+)\]$/;
export const UI_CUSTOM_PROPERTY_PATTERN = /var\((--ui-[a-z0-9-]+)\)/g;
export const FOCUS_OFFSET_UTILITY_PATTERN = /^(?:(?:focus|focus-visible|focus-within):)?ring-offset-ui-focus-offset-(canvas|raised|inset|selected|error|warning|terminal)$/;
const FOCUS_OFFSET_ROLES = [
  "canvas",
  "raised",
  "inset",
  "selected",
  "error",
  "warning",
  "terminal",
] as const;
const STYLE_COLOR_PROPERTIES = new Set([
  "color",
  "backgroundColor",
  "borderColor",
  "outlineColor",
  "fill",
  "stroke",
]);

function location(source: ts.SourceFile, position: number) {
  const point = source.getLineAndCharacterOfPosition(position);
  return { line: point.line + 1, column: point.character + 1 };
}

function report(context: ScanContext, node: ts.Node, finding: Omit<Finding, "file" | "line" | "column">) {
  const point = location(context.source, node.getStart(context.source));
  context.findings.push({ ...finding, file: context.file, ...point });
}

function isSupportedLiteral(expression: ts.Expression): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression);
}

function staticFragments(expression: ts.Expression, context: ScanContext, visited = new Set<string>()): string[] {
  if (isSupportedLiteral(expression)) return [expression.text];

  if (ts.isParenthesizedExpression(expression)) {
    return staticFragments(expression.expression, context, visited);
  }

  if (ts.isConditionalExpression(expression)) {
    return [
      ...staticFragments(expression.whenTrue, context, visited),
      ...staticFragments(expression.whenFalse, context, visited),
    ];
  }

  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    // The left operand controls reachability; only the right operand can contribute
    // class text in the common `condition && "classes"` JSX pattern.
    return staticFragments(expression.right, context, visited);
  }

  if (ts.isBinaryExpression(expression) && (
    expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
    || expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  )) {
    return [
      ...staticFragments(expression.left, context, visited),
      ...staticFragments(expression.right, context, visited),
    ];
  }

  if (ts.isTemplateExpression(expression)) {
    const chunks = [expression.head.text];
    for (const span of expression.templateSpans) {
      chunks.push(...staticFragments(span.expression, context, visited));
      chunks.push(span.literal.text);
    }
    return chunks;
  }

  if (ts.isIdentifier(expression)) {
    const initializer = context.constants.get(expression.text);
    if (initializer && !visited.has(expression.text)) {
      const nextVisited = new Set(visited);
      nextVisited.add(expression.text);
      return staticFragments(initializer, context, nextVisited);
    }
  }

  report(context, expression, {
    kind: "unresolved",
    property: "expression",
    value: expression.getText(context.source),
    syntaxKind: ts.SyntaxKind[expression.kind],
  });
  return [];
}

function isPaletteClass(value: string): boolean {
  if (LEGACY_PALETTE.test(value)) return true;
  const arbitrary = value.match(ARBITRARY_PALETTE);
  return arbitrary !== null && !/^(?:var\(--ui-[^)]+\)|transparent|currentColor|inherit|none)$/.test(arbitrary[1] ?? "");
}

function classTokenNode(source: ts.SourceFile, expression: ts.Expression, token: string): ts.Node {
  const start = expression.getStart(source);
  const index = source.text.indexOf(token, start);
  return index >= start ? { ...expression, getStart: () => index } : expression;
}

function scanClassExpression(expression: ts.Expression, context: ScanContext) {
  const fragments = staticFragments(expression, context);
  for (const fragment of fragments) {
    const classes = fragment.split(/\s+/).filter(Boolean);
    for (const className of classes) {
      if (isPaletteClass(className)) {
        report(context, classTokenNode(context.source, expression, className), {
          kind: "palette",
          property: "className",
          value: className,
        });
      }
    }

    const opacityClasses = classes.filter((className) => /(?:^|:)opacity-\d+$/.test(className));
    for (const opacityClass of opacityClasses) {
      report(context, classTokenNode(context.source, expression, opacityClass), {
        kind: "opacity",
        property: "className",
        value: opacityClass,
      });
    }
  }
}

function scanStyleExpression(expression: ts.Expression, context: ScanContext) {
  if (!ts.isObjectLiteralExpression(expression)) {
    report(context, expression, {
      kind: "unresolved",
      property: "style",
      value: expression.getText(context.source),
      syntaxKind: ts.SyntaxKind[expression.kind],
    });
    return;
  }

  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : undefined;
    if (!name || !STYLE_COLOR_PROPERTIES.has(name)) continue;
    for (const value of staticFragments(property.initializer, context)) {
      if (!/^(?:var\(--ui-[^)]+\)|transparent|currentColor|inherit|none)$/.test(value)) {
        report(context, property.initializer, {
          kind: "palette",
          property: name,
          value,
        });
      }
    }
  }
}

function collectClassNameFragments(source: ts.SourceFile, file: string): string[] {
  const context: ScanContext = {
    file,
    source,
    constants: collectSameFileConstants(source),
    findings: [],
  };
  const fragments: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxAttribute(node)
      && node.name.getText(source) === "className"
      && node.initializer
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        fragments.push(...staticFragments(node.initializer, context));
      } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        fragments.push(...staticFragments(node.initializer.expression, context));
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return fragments;
}

export async function collectReferencedFocusOffsetUtilities(files = SEMANTIC_MIGRATION_FILES): Promise<Set<string>> {
  const utilities = new Set<string>();
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const fragment of collectClassNameFragments(source, file)) {
      for (const token of fragment.split(/\s+/).filter(Boolean)) {
        if (FOCUS_OFFSET_UTILITY_PATTERN.test(token)) utilities.add(token);
      }
    }
  }
  return utilities;
}

function parseDeclarations(css: string, selector: string): Map<string, string[]> {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g"))];
  expect(matches, `Expected exactly one ${selector} block`).toHaveLength(1);
  const body = matches[0]?.[1];
  if (body === undefined) throw new Error(`Missing ${selector} block`);

  const declarations = new Map<string, string[]>();
  for (const declaration of body.split(";")) {
    const [property, ...value] = declaration.split(":");
    if (!property || value.length === 0) continue;
    const name = property.trim();
    declarations.set(name, [...(declarations.get(name) ?? []), value.join(":").trim()]);
  }
  return declarations;
}

function escapeCssClassToken(token: string): string {
  return token.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

function focusOffsetProperty(role: string): string {
  return ["--ui-focus", "offset", role].join("-");
}

export function parseThemeCustomProperties(css: string, theme: "light" | "dark"): Set<string> {
  return new Set([...parseDeclarations(css, `html[data-theme="${theme}"]`).keys()]
    .filter((property) => property.startsWith("--ui-")));
}

type ReferencedUiProperty = {
  file: string;
  property: string;
};

function collectUiProperties(value: string): string[] {
  return [...value.matchAll(UI_CUSTOM_PROPERTY_PATTERN)].map((match) => match[1]).filter((property): property is string => property !== undefined);
}

export async function collectReferencedUiProperties(files = SEMANTIC_MIGRATION_FILES): Promise<ReferencedUiProperty[]> {
  const references: ReferencedUiProperty[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const context: ScanContext = {
      file,
      source,
      constants: collectSameFileConstants(source),
      findings: [],
    };
    const addProperties = (values: string[]) => {
      for (const value of values) {
        for (const property of collectUiProperties(value)) references.push({ file, property });
      }
    };
    const visit = (node: ts.Node): void => {
      if (ts.isJsxAttribute(node) && node.initializer) {
        const attributeName = node.name.getText(source);
        if (attributeName === "className") {
          if (ts.isStringLiteral(node.initializer)) addProperties(staticFragments(node.initializer, context));
          else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
            addProperties(staticFragments(node.initializer.expression, context));
          }
        }
        if (
          attributeName === "style"
          && ts.isJsxExpression(node.initializer)
          && node.initializer.expression
          && ts.isObjectLiteralExpression(node.initializer.expression)
        ) {
          for (const assignment of node.initializer.expression.properties) {
            if (!ts.isPropertyAssignment(assignment)) continue;
            const name = ts.isIdentifier(assignment.name) || ts.isStringLiteral(assignment.name)
              ? assignment.name.text
              : undefined;
            if (name && STYLE_COLOR_PROPERTIES.has(name)) addProperties(staticFragments(assignment.initializer, context));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return references;
}

export async function buildProductionCss(): Promise<string> {
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const warning = args.map(String).join(" ");
    if (!warning.includes(".ring-offset-\\[var\\(--ui-focus-offset-\\*\\)")) {
      throw new Error(`Unexpected console.warn during Vite CSS build: ${warning}`);
    }
  });
  const output = await build({
    configFile: "vite.config.ts",
    logLevel: "silent",
    build: { write: false },
  });
  const bundles = Array.isArray(output) ? output : [output];
  const cssAssets = bundles.flatMap((bundle) => {
    if (!("output" in bundle)) throw new Error("Vite build unexpectedly returned a watcher");
    return bundle.output.filter((asset): asset is OutputAsset & { source: string } => (
      asset.type === "asset" && asset.fileName.endsWith(".css") && typeof asset.source === "string"
    ));
  });
  expect(cssAssets.length, "Vite production build must emit an in-memory CSS asset").toBeGreaterThan(0);
  return cssAssets.map((asset) => asset.source).join("\n");
}

function collectSameFileConstants(source: ts.SourceFile): Map<string, ts.Expression> {
  const constants = new Map<string, ts.Expression>();
  const duplicateNames = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const declarationList = node.parent;
      if (ts.isVariableDeclarationList(declarationList) && (declarationList.flags & ts.NodeFlags.Const)) {
        if (constants.has(node.name.text)) duplicateNames.add(node.name.text);
        else constants.set(node.name.text, node.initializer);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const name of duplicateNames) constants.delete(name);
  return constants;
}

async function inspectFile(file: string): Promise<Finding[]> {
  const text = await readFile(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const context: ScanContext = {
    file,
    source,
    constants: collectSameFileConstants(source),
    findings: [],
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && node.initializer) {
      const attributeName = node.name.getText(context.source);
      if (attributeName === "className") {
        if (ts.isStringLiteral(node.initializer)) {
          scanClassExpression(node.initializer, context);
        } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          scanClassExpression(node.initializer.expression, context);
        }
      }
      if (attributeName === "style" && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        scanStyleExpression(node.initializer.expression, context);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return context.findings;
}

const FIXTURE_OPACITY_RATIONALE = "Decorative status dot is intentionally non-interactive.";

function assertExactOpacityAllowlist(findings: readonly Finding[], allowlist: readonly OpacityAllowlistEntry[]) {
  const opacity = findings.filter((finding) => finding.kind === "opacity");
  const consumed = new Set<number>();

  for (const finding of opacity) {
    const index = allowlist.findIndex((entry, candidate) => (
      !consumed.has(candidate)
      && entry.file === finding.file
      && entry.line === finding.line
      && entry.column === finding.column
      && entry.value === finding.value
    ));
    if (index < 0) {
      throw new Error(`Unallowlisted opacity: ${finding.file}:${finding.line}:${finding.column} ${finding.value}`);
    }
    if (allowlist[index]?.rationale !== FIXTURE_OPACITY_RATIONALE) {
      throw new Error(`Opacity rationale mismatch: ${finding.file}:${finding.line}:${finding.column}`);
    }
    consumed.add(index);
  }

  const stale = allowlist.filter((_entry, index) => !consumed.has(index));
  if (stale.length > 0) {
    throw new Error(`Stale opacity allowlist record: ${stale.map((entry) => `${entry.file}:${entry.line}:${entry.column} ${entry.value}`).join(", ")}`);
  }
}

async function allProductionSourceFiles(directory = "src"): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }) as Array<{
    name: string;
    isDirectory(): boolean;
  }>;
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return allProductionSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

const EXPECTED_MANIFEST_IDS = [
  "surface-light-phone",
  "surface-dark-phone",
  "surface-light-desktop",
  "surface-dark-desktop",
  "layout-lg-inflow-1024",
  "responsive-inflow-1279",
  "responsive-corner-1280",
  "repository-same-tab",
  "workflow-light-phone",
  "workflow-dark-desktop",
] as const;

describe("semantic migration audit", () => {
  it("uses an explicit complete phase-owned production inventory with no broad glob", async () => {
    expect(SEMANTIC_MIGRATION_FILES).toEqual(expect.arrayContaining([
      "src/components/navigation/RepositoryLink.tsx",
      "src/components/theme/ThemeControl.tsx",
      "src/layouts/TopBar.tsx",
      "src/components/commands/CommandValidationSummary.tsx",
    ]));
    expect(new Set(SEMANTIC_MIGRATION_FILES).size).toBe(SEMANTIC_MIGRATION_FILES.length);
    expect(SEMANTIC_MIGRATION_FILES.every((file) => file.startsWith("src/") && file.endsWith(".tsx"))).toBe(true);
    await expect(Promise.all(SEMANTIC_MIGRATION_FILES.map((file) => readFile(file, "utf8")))).resolves.toHaveLength(SEMANTIC_MIGRATION_FILES.length);
  });

  it("requires every supported phase-owned UI property reference in both exact theme blocks", async () => {
    const css = await readFile("src/assets/styles.css", "utf8");
    const lightProperties = parseThemeCustomProperties(css, "light");
    const darkProperties = parseThemeCustomProperties(css, "dark");
    const references = await collectReferencedUiProperties();
    const missing = references.filter(({ property }) => !lightProperties.has(property) || !darkProperties.has(property));

    expect(missing, missing.map(({ file, property }) => `${file}: ${property}`).join("\n")).toEqual([]);
  });

  it("maps every raw focus-offset role to its same-suffix Tailwind alias in both themes", async () => {
    const css = await readFile("src/assets/styles.css", "utf8");
    const theme = parseDeclarations(css, "@theme inline");

    for (const selector of ['html[data-theme="light"]', 'html[data-theme="dark"]']) {
      const declarations = parseDeclarations(css, selector);
      for (const role of FOCUS_OFFSET_ROLES) {
        const property = focusOffsetProperty(role);
        expect(declarations.get(property), `${selector} must declare ${property} exactly once`).toHaveLength(1);
      }
    }

    for (const role of FOCUS_OFFSET_ROLES) {
      const alias = `--color-ui-focus-offset-${role}`;
      expect(theme.get(alias), `${alias} must be declared exactly once`).toEqual([`var(${focusOffsetProperty(role)})`]);
    }
  });

  it("derives production focus-offset utilities and verifies their emitted Vite CSS bindings", async () => {
    const utilities = await collectReferencedFocusOffsetUtilities();
    expect(utilities.size, "Production source must reference at least one semantic focus-offset utility").toBeGreaterThan(0);

    const css = await buildProductionCss();
    for (const utility of utilities) {
      const role = utility.match(FOCUS_OFFSET_UTILITY_PATTERN)?.[1];
      if (!role) throw new Error(`Unable to derive focus-offset role from ${utility}`);
      const selector = `.${escapeCssClassToken(utility)}`;
      const selectorIndex = css.indexOf(selector);
      expect(selectorIndex, `Missing emitted selector for ${utility}`).toBeGreaterThanOrEqual(0);
      const rule = css.slice(selectorIndex, css.indexOf("}", selectorIndex) + 1);
      expect(rule, `${utility} must bind its matching surface role`).toContain(`--tw-ring-offset-color:var(${focusOffsetProperty(role)})`);
    }
  }, 15_000);

  it("accepts only bounded semantic static forms and reports exact legacy palette diagnostics", async () => {
    const passFindings = await inspectFile(fixture("semantic-pass"));
    expect(passFindings.filter((finding) => finding.kind === "palette")).toEqual([]);
    expect(passFindings.filter((finding) => finding.kind === "unresolved")).toEqual([]);

    const legacyFindings = await inspectFile(fixture("legacy-palette"));
    expect(legacyFindings).toContainEqual(expect.objectContaining({
      kind: "palette",
      file: fixture("legacy-palette"),
      property: "className",
      value: "bg-slate-100",
      line: 2,
      column: 26,
    }));
    expect(legacyFindings).toContainEqual(expect.objectContaining({
      kind: "palette",
      file: fixture("legacy-palette"),
      property: "color",
      value: "#123456",
      line: 2,
    }));
  });

  it("reports unsupported runtime portions while retaining directly static template fragments", async () => {
    const findings = await inspectFile(fixture("dynamic-class"));
    const unresolved = findings.filter((finding) => finding.kind === "unresolved");

    expect(findings.filter((finding) => finding.kind === "palette")).toEqual([]);
    expect(unresolved.map((finding) => finding.syntaxKind)).toEqual(expect.arrayContaining([
      "CallExpression",
      "PropertyAccessExpression",
      "ElementAccessExpression",
    ]));
    expect(unresolved.every((finding) => finding.file === fixture("dynamic-class") && finding.line > 0 && finding.column > 0)).toBe(true);
  });

  it("requires each opacity exception to match its exact file, line, column, value, and rationale tuple", async () => {
    const decorativeFindings = await inspectFile(fixture("semantic-pass"));
    const decorativeAllowlist: OpacityAllowlistEntry[] = [{
      file: fixture("semantic-pass"),
      line: 14,
      column: 24,
      value: "opacity-60",
      rationale: FIXTURE_OPACITY_RATIONALE,
    }];
    expect(() => assertExactOpacityAllowlist(decorativeFindings, decorativeAllowlist)).not.toThrow();
    const decorative = decorativeAllowlist[0];
    if (!decorative) throw new Error("Expected one decorative opacity allowlist record");

    for (const altered of [
      { ...decorative, file: "other.tsx" },
      { ...decorative, line: 15 },
      { ...decorative, column: 25 },
      { ...decorative, value: "opacity-50" },
      { ...decorative, rationale: "Changed rationale" },
    ]) {
      expect(() => assertExactOpacityAllowlist(decorativeFindings, [altered])).toThrow(/Unallowlisted opacity|Opacity rationale mismatch/);
    }

    const interactiveFindings = await inspectFile(fixture("state-opacity"));
    expect(() => assertExactOpacityAllowlist(interactiveFindings, decorativeAllowlist)).toThrow(/Unallowlisted opacity/);
    expect(() => assertExactOpacityAllowlist(decorativeFindings, [...decorativeAllowlist, { ...decorative }])).toThrow(/Stale opacity allowlist record/);
  });

  it("rejects legacy palette and unavailable opacity in the complete production migration scope", async () => {
    const findings = (await Promise.all(SEMANTIC_MIGRATION_FILES.map(inspectFile))).flat();
    const failures = findings.filter((finding) => finding.kind === "palette" || finding.kind === "opacity");
    expect(failures, failures.map((finding) => `${finding.file}:${finding.line}:${finding.column} ${finding.property}=${finding.value}`).join("\n")).toEqual([]);
  });

  it("pins the sole fixed repository owner and exact manifest IDs and group counts", async () => {
    const productionFiles = await allProductionSourceFiles();
    const owners = await Promise.all(productionFiles.map(async (file) => ({
      file,
      source: await readFile(file, "utf8"),
    })));
    expect(owners.filter(({ source }) => source.includes("https://github.com/paddy01/cloud-init-builder")).map(({ file }) => file)).toEqual([
      "src/components/navigation/RepositoryLink.tsx",
    ]);

    expect(THEMED_EXPERIENCE_CASE_MANIFEST.map((entry) => entry.id)).toEqual(EXPECTED_MANIFEST_IDS);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST).toHaveLength(10);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "surface")).toHaveLength(4);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "layout")).toHaveLength(1);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "responsive")).toHaveLength(2);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "navigation")).toHaveLength(1);
    expect(THEMED_EXPERIENCE_CASE_MANIFEST.filter((entry) => entry.group === "workflow")).toHaveLength(2);
  });
});

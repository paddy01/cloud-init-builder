````md
# Export Engine Specification

## Goal

Define the export engine interfaces for generating, validating, importing, and exporting Cloud-Init Builder configurations.

The engine must generate valid `#cloud-config` YAML, support JSON project import/export, and keep UI state separate from generated cloud-init output.

Reference source: current cloud-init documentation, especially module reference, examples, and boot-stage behavior. Cloud-init applies network configuration early in the local stage, while most config modules run later by stage/frequency. :contentReference[oaicite:0]{index=0}

---

## Core Principles

1. The internal project format is JSON.
2. The generated cloud-init output is YAML.
3. Empty sections must be omitted.
4. Validation must run before generation.
5. Generator output must be deterministic.
6. Import must never silently discard unknown fields.
7. Cloud-init YAML must start with:

```yaml
#cloud-config
````

8. Network config may be exported separately when needed, because some platforms treat `user-data` and `network-config` as separate inputs. ([Ubuntu Documentation][1])

---

## Main Interfaces

```ts
export function generateCloudInit(
  config: CloudInitProject,
  options?: GenerateOptions
): GenerateResult;

export function validateConfig(
  config: unknown,
  options?: ValidationOptions
): ValidationResult;

export function importConfig(
  input: string | object,
  options?: ImportOptions
): ImportResult;

export function exportProject(
  config: CloudInitProject,
  options?: ProjectExportOptions
): ProjectExportResult;
```

---

## Type Definitions

```ts
export interface CloudInitProject {
  version: string;
  metadata: ProjectMetadata;
  identity?: IdentityConfig;
  users?: UserConfig[];
  ssh?: SshConfig;
  packages?: PackageConfig;
  network?: NetworkConfig;
  storage?: StorageConfig;
  files?: WriteFileConfig[];
  commands?: CommandConfig;
  advanced?: AdvancedConfig;
}

export interface ProjectMetadata {
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  generatorVersion?: string;
}

export interface GenerateOptions {
  format?: "cloud-config" | "network-config" | "multi-part";
  includeHeader?: boolean;
  sortKeys?: boolean;
  omitEmpty?: boolean;
  comments?: boolean;
  target?: "generic" | "proxmox" | "lxd" | "nocloud";
}

export interface GenerateResult {
  ok: boolean;
  yaml?: string;
  files?: GeneratedFile[];
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

export interface GeneratedFile {
  filename: string;
  contentType: string;
  content: string;
}

export interface ValidationOptions {
  strict?: boolean;
  target?: "generic" | "proxmox" | "lxd" | "nocloud";
}

export interface ValidationResult {
  ok: boolean;
  normalized?: CloudInitProject;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ImportOptions {
  inputFormat?: "auto" | "project-json" | "cloud-config-yaml";
  preserveUnknown?: boolean;
}

export interface ImportResult {
  ok: boolean;
  project?: CloudInitProject;
  raw?: unknown;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ProjectExportOptions {
  pretty?: boolean;
}

export interface ProjectExportResult {
  filename: string;
  contentType: "application/json";
  content: string;
}
```

---

## Generator Functions

### `generateCloudInit()`

Responsible for converting a validated project object into cloud-init YAML.

Required behavior:

```ts
const result = generateCloudInit(project, {
  format: "cloud-config",
  includeHeader: true,
  sortKeys: true,
  omitEmpty: true,
});
```

Must:

* validate input before YAML generation
* normalize values before output
* omit undefined, null, and empty arrays/objects
* preserve explicit booleans, including `false`
* emit stable key order
* return warnings and errors, not throw for user data problems
* throw only for programmer errors

Default cloud-config key order:

```ts
const CLOUD_CONFIG_ORDER = [
  "hostname",
  "fqdn",
  "manage_etc_hosts",
  "users",
  "groups",
  "ssh_pwauth",
  "disable_root",
  "ssh_authorized_keys",
  "package_update",
  "package_upgrade",
  "packages",
  "write_files",
  "bootcmd",
  "runcmd",
  "power_state",
];
```

---

## Validation Function

### `validateConfig()`

Responsible for structural and semantic validation.

Validation layers:

1. JSON shape validation with Zod.
2. Field-level validation.
3. Cross-field validation.
4. Target/platform warnings.
5. Cloud-init compatibility warnings.

Example:

```ts
const validation = validateConfig(project, {
  strict: true,
  target: "proxmox",
});
```

Must validate:

* hostname
* FQDN
* usernames
* SSH public keys
* package names
* file paths
* file permissions
* command arrays
* CIDR notation
* gateway addresses
* DNS server addresses
* storage mount paths
* duplicate users
* duplicate file paths

Must warn when:

* password authentication is enabled
* root login is enabled
* commands rely on packages that are not installed
* network config may need separate export
* target platform may not support selected fields

---

## Import Function

### `importConfig()`

Responsible for importing either:

1. Cloud Init Builder JSON project files.
2. Existing `#cloud-config` YAML.
3. Future shared URL payloads.

Example:

```ts
const imported = importConfig(fileContent, {
  inputFormat: "auto",
  preserveUnknown: true,
});
```

Import behavior:

* detect JSON vs YAML automatically
* validate after parsing
* preserve unsupported cloud-init keys under `advanced.rawCloudConfig`
* never silently drop unknown fields
* return warnings for partially supported imports
* normalize imported data to current project schema

Unsupported YAML example:

```yaml
phone_home:
  url: https://example.com
```

Should become:

```ts
advanced: {
  rawCloudConfig: {
    phone_home: {
      url: "https://example.com"
    }
  }
}
```

---

## Project Export Function

### `exportProject()`

Responsible for exporting the internal builder state as portable JSON.

Example:

```ts
const exported = exportProject(project, {
  pretty: true,
});
```

Output:

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "ubuntu-webserver"
  },
  "users": [],
  "packages": {}
}
```

Must:

* include schema version
* include metadata
* preserve UI-relevant settings
* preserve unknown imported fields
* produce stable JSON output

---

## Export Modes

### 1. Single Cloud-Config YAML

Produces one file:

```text
cloud-init.yaml
```

Example:

```yaml
#cloud-config
hostname: node01
package_update: true
packages:
  - qemu-guest-agent
```

---

### 2. Split Export

Produces multiple files:

```text
user-data
network-config
meta-data
```

Used for NoCloud, Proxmox, LXD, and similar workflows.

---

### 3. Project JSON

Produces:

```text
cloud-init-builder.project.json
```

Used for editing, sharing, and later re-import.

---

### 4. Combined ZIP

Future option.

Produces:

```text
cloud-init-export.zip
```

Containing:

```text
project.json
user-data
network-config
meta-data
```

---

## Error Handling

Generator functions must return structured errors:

```ts
{
  ok: false,
  errors: [
    {
      path: "users[0].name",
      code: "invalid_username",
      message: "Username must start with a lowercase letter.",
      severity: "error"
    }
  ],
  warnings: []
}
```

Do not throw for:

* invalid user input
* malformed YAML
* unsupported cloud-init fields
* failed validation

Throw only for:

* missing internal schema
* impossible generator state
* programming errors

---

## YAML Generation Rules

YAML writer must:

* use 2-space indentation
* avoid anchors and aliases
* preserve multiline file content using block scalars
* quote strings only when needed
* output arrays in block style
* output deterministic key order
* omit empty sections

Example:

```yaml
#cloud-config
write_files:
  - path: /etc/motd
    permissions: "0644"
    content: |
      Managed by Cloud Init Builder
```

---

## Security Rules

The generator must warn about dangerous settings.

Warnings:

```ts
[
  "Password SSH authentication is enabled.",
  "Root login is enabled.",
  "A write_files entry writes to /etc/sudoers. Validate syntax manually.",
  "A command uses curl piped into shell."
]
```

The generator must not:

* execute commands
* fetch remote URLs
* validate private key correctness by exposing content externally
* send project data to external services

---

## Recommended File Layout

```text
src/
 ├─ generators/
 │   ├─ generateCloudInit.ts
 │   ├─ generateNetworkConfig.ts
 │   ├─ generateProjectJson.ts
 │   └─ yamlWriter.ts
 ├─ validators/
 │   ├─ validateConfig.ts
 │   ├─ validateUsers.ts
 │   ├─ validateNetwork.ts
 │   └─ validateFiles.ts
 ├─ importers/
 │   ├─ importConfig.ts
 │   ├─ importProjectJson.ts
 │   └─ importCloudConfigYaml.ts
 ├─ schemas/
 │   ├─ project.schema.ts
 │   ├─ cloudInit.schema.ts
 │   └─ network.schema.ts
 └─ types/
     └─ generator.types.ts
```

---

## Initial Implementation Tasks

1. Define TypeScript interfaces.
2. Define Zod project schema.
3. Implement `validateConfig()`.
4. Implement `generateCloudInit()`.
5. Implement `exportProject()`.
6. Implement `importConfig()` for project JSON.
7. Add YAML import later.
8. Add unit tests for each MVP module.

---

## Codex/Cursor Handoff

Codex/Cursor should take over after this specification.

First implementation prompt:

```text
Implement the export engine described in GENERATOR-SPEC.md.

Create:
- src/types/generator.types.ts
- src/schemas/project.schema.ts
- src/validators/validateConfig.ts
- src/generators/generateCloudInit.ts
- src/generators/generateProjectJson.ts
- src/importers/importConfig.ts

Use TypeScript, Zod, and a deterministic YAML serializer.
Do not build UI components yet.
Add unit tests for validation and generation.
```

---

## Acceptance Criteria

M3.3 is complete when:

* `GENERATOR-SPEC.md` exists
* generator interfaces are defined
* import/export behavior is specified
* validation behavior is specified
* YAML generation rules are specified
* error handling is specified
* Codex/Cursor handoff prompt is included

```

::contentReference[oaicite:2]{index=2}
```

[1]: https://documentation.ubuntu.com/lxd/latest/cloud-init "How to use cloud-init - LXD documentation 6.8"

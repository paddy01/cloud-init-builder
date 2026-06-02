# Cloud Init Builder Research

## Project Goal

Create a modern web-based Cloud-Init configuration builder that allows users to visually construct valid cloud-init configurations and export production-ready YAML.

Target users include:

* Homelab users
* Proxmox users
* Sysadmins
* Cloud engineers
* DevOps practitioners

The primary objective is simplicity, discoverability, and correctness.

---

# Existing Solutions

## Canonical Cloud-Init Documentation

The official documentation provides extensive examples and module references but does not provide a complete visual configuration builder.

Strengths:

* Official source
* Comprehensive documentation
* Accurate examples

Weaknesses:

* Steep learning curve
* YAML editing required
* Difficult to discover available options

---

## Cloud-Init Schema Validation

Cloud-init ships with official JSON schemas used for validation and documentation generation.

Strengths:

* Machine-readable
* Maintained by upstream
* Suitable for automatic UI generation

Weaknesses:

* Raw schema does not provide a good user experience
* Complex modules remain difficult to understand

---

## Existing Community Builders

Several community projects and online generators exist.

Common limitations:

* Limited cloud-init coverage
* Often outdated
* Usually focused on one platform
* Rarely schema-driven
* Poor support for advanced modules

---

# Gap Analysis

Current solutions generally fall into two categories:

1. Documentation and examples
2. Simple YAML generators

There is a clear gap for:

* A schema-aware visual builder
* Automatic adaptation to future cloud-init releases
* Validation during editing
* User-friendly workflows for common tasks
* A single-page application requiring no backend

---

# Project Positioning

Cloud Init Builder aims to become:

> A schema-driven visual editor for cloud-init that automatically tracks upstream schema changes while providing curated workflows for common infrastructure tasks.

Key differentiators:

* Official schema as source of truth
* Automatic form generation where possible
* Custom workflows where usability matters
* Instant YAML generation
* No server-side dependency required
* Ready for localization

---

# Cloud-Init Schema Investigation (M0.2.1)

## Objective

Determine how much of the UI can be generated automatically from the official cloud-init schema and how much requires custom React components.

---

## Findings

### Overall Assessment

Most of the application can be generated directly from the official cloud-init schema.

However, several areas benefit significantly from purpose-built UI components.

Estimated split:

* 70–80% schema-generated
* 20–30% custom React components

---

## Schema-Generated Areas

The schema is well suited for:

### Primitive Fields

* Strings
* Numbers
* Booleans
* Enums

### Arrays

* String arrays
* Object arrays

### Validation

* Required fields
* Types
* Enumerations
* Constraints
* Default values

### Documentation

* Field descriptions
* Examples
* Deprecation warnings

### Advanced Options

Less common settings can be exposed automatically through schema rendering.

---

## Areas Requiring Custom Components

### User Management

Cloud-init user definitions are powerful but complex.

Custom UI should provide:

* User wizard
* SSH key assignment
* Sudo helpers
* Group selection
* Password options

Estimated custom UI requirement:

* High

---

### SSH Key Management

Schema support exists but user experience benefits from:

* Key validation
* Fingerprint display
* Import helpers
* Duplicate detection

Estimated custom UI requirement:

* Medium

---

### Package Management

Schema supports package lists.

Custom UI should provide:

* Add/remove package controls
* Version selectors
* Bulk paste support

Estimated custom UI requirement:

* Low

---

### Run Commands

Schema supports commands but not workflow.

Custom UI should provide:

* Command list editor
* Shell mode
* Array mode
* Reordering

Estimated custom UI requirement:

* Medium

---

### Write Files

Schema supports all required properties.

Custom UI should provide:

* Multi-line editor
* Permissions helper
* Encoding helper
* Syntax highlighting

Estimated custom UI requirement:

* Medium

---

### Network Configuration

Cloud-init network v2 is highly capable.

Features include:

* DHCP
* Static IPs
* VLANs
* Bridges
* Bonds
* Routes
* Nameservers

While schema coverage is excellent, raw form generation produces poor usability.

Custom UI should provide:

* Interface cards
* Network topology views
* Route editors
* Validation helpers

Estimated custom UI requirement:

* High

---

### Storage Configuration

Cloud-init storage configuration includes:

* Disk setup
* Partitioning
* Filesystems
* Mounts

Schema can describe the data model but not the workflow.

Custom UI should provide:

* Disk visualizations
* Partition editors
* Filesystem helpers
* Mount editors

Estimated custom UI requirement:

* High

---

# Recommended Architecture

## Layer 1: Schema Ingestion

Responsibilities:

* Load official cloud-init schema
* Resolve references
* Normalize schema definitions
* Track schema version

Result:

Internal metadata representation used by the UI renderer.

---

## Layer 2: Generic Form Renderer

Automatically render:

* Strings
* Numbers
* Booleans
* Enums
* Arrays
* Objects

Provide:

* Validation
* Help text
* Defaults
* Advanced sections

---

## Layer 3: Component Overrides

Certain schema paths should map to purpose-built React components.

Example:

```typescript
{
  users: UserListEditor,
  ssh_keys: SSHKeysEditor,
  packages: PackageListEditor,
  runcmd: CommandListEditor,
  write_files: WriteFilesEditor,
  network: NetworkConfigEditor,
  disk_setup: DiskSetupEditor,
  fs_setup: FilesystemEditor,
  mounts: MountsEditor
}
```

The renderer should fall back to generic schema rendering whenever no override exists.

---

# Recommendation

Do not manually maintain a complete form model.

Instead:

1. Use the official cloud-init schema as the authoritative source.
2. Generate the majority of the UI automatically.
3. Override critical workflows with custom React components.
4. Allow future cloud-init releases to automatically expose newly added fields.
5. Keep the architecture backend-free whenever possible.

This approach minimizes maintenance burden while maximizing long-term compatibility with upstream cloud-init.

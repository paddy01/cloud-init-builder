# Sharing Specification

## Purpose

Define how Cloud Init Builder configurations are saved, exchanged, versioned, and restored.

The project should support:

* Saving work-in-progress projects
* Sharing configurations between users
* Version-safe upgrades
* Generating cloud-init YAML independently from project storage

---

# Design Principles

## Source of Truth

The application state is stored as a JSON project document.

Generated cloud-init YAML is considered a build artifact.

```text
Project JSON
      ↓
Generator
      ↓
cloud-init YAML
```

Users should never edit generated YAML as the primary configuration source.

---

# Supported Export Formats

## 1. Project File (Recommended)

Extension:

```text
.cloudinit-builder.json
```

Purpose:

* Save work
* Share projects
* Import into builder
* Future editing

Example:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "ubuntu-webserver",
    "created": "2026-06-02T20:00:00Z"
  },
  "config": {
    ...
  }
}
```

Advantages:

* Complete fidelity
* Editable
* Versionable
* Git-friendly

---

## 2. Generated Cloud-Init YAML

Extension:

```text
.yaml
```

Purpose:

* Deployment
* Proxmox snippets
* NoCloud ISOs
* Public cloud usage

Example:

```yaml
#cloud-config

users:
  - name: admin

packages:
  - htop
```

Advantages:

* Native cloud-init format
* Deployment-ready

Limitations:

* Not guaranteed to re-import cleanly
* May lose UI-specific metadata

---

# URL Sharing

## Optional Feature

Small projects may be embedded into a URL.

Example:

```text
https://builder.example/#<compressed-data>
```

Implementation:

1. Serialize JSON
2. Compress (LZ-string)
3. Base64URL encode
4. Store in URL fragment

Benefits:

* No backend required
* Easy sharing

Limitations:

* Browser URL length limits
* Unsuitable for large configurations

---

# Import Formats

Supported:

| Format          | Import         |
| --------------- | -------------- |
| Project JSON    | Full           |
| Cloud-init YAML | Future/Partial |

Version 1 should only guarantee:

```text
Project JSON → Import
```

YAML import can be considered a future enhancement.

---

# Project Schema

## Top-Level Structure

```json
{
  "version": "1.0",
  "metadata": {},
  "config": {}
}
```

---

## Version Field

Mandatory.

Example:

```json
{
  "version": "1.0"
}
```

Purpose:

* Migration support
* Backward compatibility
* Future schema evolution

---

## Metadata Section

Example:

```json
{
  "metadata": {
    "name": "ubuntu-server",
    "description": "Example deployment",
    "created": "2026-06-02T20:00:00Z",
    "updated": "2026-06-02T20:10:00Z"
  }
}
```

Used only by the builder.

Never emitted into cloud-init YAML.

---

## Config Section

Contains all builder data.

Example:

```json
{
  "config": {
    "identity": {},
    "users": [],
    "ssh": {},
    "packages": [],
    "network": {},
    "storage": {},
    "files": [],
    "commands": []
  }
}
```

This structure maps directly to the internal UI state.

---

# Local Storage

For convenience, the application should auto-save.

Key:

```text
cloudinit-builder-project
```

Behavior:

```text
Edit
 ↓
Debounced save
 ↓
Browser Local Storage
```

Benefits:

* Prevent accidental data loss
* No backend required

---

# Sharing Workflow

## Save Project

```text
User
 ↓
Export Project
 ↓
.cloudinit-builder.json
```

---

## Open Project

```text
User
 ↓
Import Project
 ↓
JSON Validation
 ↓
Load UI State
```

---

## Deploy

```text
User
 ↓
Generate YAML
 ↓
Download .yaml
```

---

# Future Extensions

Potential future export targets:

* GitHub Gist
* Pastebin
* Shareable permalink service
* QR-code encoded URLs
* Direct Proxmox snippet export
* Terraform cloud-init resources

These are out of scope for MVP.

---

# MVP Recommendation

Version 1 should implement:

✓ Project JSON export/import

✓ Generated cloud-init YAML download

✓ Local Storage auto-save

Optional:

✓ URL-compressed sharing

No backend required.

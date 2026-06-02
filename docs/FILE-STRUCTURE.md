# Information Architecture

## Design Principles

* Single-page application (SPA)
* Progressive disclosure of complexity
* Beginner-friendly defaults
* Advanced options expandable per section
* Schema-driven form generation where possible
* Live YAML preview available globally
* Validation visible in real time

---

# Sitemap

```text
Cloud-Init Builder
│
├─ Dashboard
│
├─ Identity
│   ├─ Hostname
│   ├─ FQDN
│   └─ Locale & Timezone
│
├─ Users & Access
│   ├─ Users
│   ├─ Groups
│   ├─ Passwords
│   ├─ Sudo Rules
│   └─ SSH Keys
│
├─ Software
│   ├─ Packages
│   ├─ Package Repositories
│   ├─ Package Updates
│   └─ Snaps
│
├─ Network
│   ├─ Interfaces
│   ├─ DNS
│   ├─ Routes
│   └─ Netplan YAML
│
├─ Storage
│   ├─ Disks
│   ├─ Partitions
│   ├─ Filesystems
│   ├─ Mount Points
│   └─ Swap
│
├─ Files
│   ├─ Write Files
│   ├─ Templates
│   └─ File Permissions
│
├─ Commands
│   ├─ Boot Commands
│   ├─ Run Commands
│   └─ Final Commands
│
├─ Advanced
│   ├─ Cloud-Init Modules
│   ├─ Raw YAML
│   └─ Custom Sections
│
├─ Validation
│   ├─ Schema Validation
│   ├─ Warnings
│   └─ Errors
│
└─ Export
    ├─ cloud-config YAML
    ├─ Multi-Part MIME
    ├─ Download File
    ├─ Copy to Clipboard
    └─ Shareable JSON
```

---

# Navigation Model

## Primary Navigation

Vertical navigation panel:

```text
Identity
Users & Access
Software
Network
Storage
Files
Commands
Advanced
Export
```

Each item expands into a configuration panel.

---

## Secondary Navigation

Within each section:

```text
Section Header
├─ Basic
├─ Advanced
└─ Raw Schema
```

Example:

```text
Network
├─ Basic
│   ├─ DHCP
│   ├─ Static IP
│   └─ DNS
│
├─ Advanced
│   ├─ Routes
│   ├─ MTU
│   └─ VLANs
│
└─ Raw Schema
```

---

## Persistent Side Panels

### Left

Navigation Tree

### Center

Configuration Forms

### Right

Live Generated YAML

```text
+--------------------+
| YAML Preview       |
+--------------------+
| #cloud-config      |
| hostname: vm01     |
| users:             |
| ...                |
+--------------------+
```

Updates immediately as users modify settings.

---

# Recommended Internal Frontend Structure

```text
src/
│
├─ app/
│
├─ pages/
│   └─ BuilderPage.tsx
│
├─ components/
│   ├─ layout/
│   │   ├─ Sidebar.tsx
│   │   ├─ TopBar.tsx
│   │   └─ PreviewPanel.tsx
│   │
│   ├─ sections/
│   │   ├─ IdentitySection.tsx
│   │   ├─ UsersSection.tsx
│   │   ├─ SSHSection.tsx
│   │   ├─ PackagesSection.tsx
│   │   ├─ NetworkSection.tsx
│   │   ├─ StorageSection.tsx
│   │   ├─ FilesSection.tsx
│   │   ├─ CommandsSection.tsx
│   │   └─ ExportSection.tsx
│   │
│   └─ schema/
│       ├─ AutoForm.tsx
│       ├─ FieldRenderer.tsx
│       └─ ValidationPanel.tsx
│
├─ schema/
│   ├─ cloud-init-schema.json
│   ├─ generated/
│   └─ mappings/
│
├─ state/
│   ├─ configStore.ts
│   └─ validationStore.ts
│
├─ services/
│   ├─ yamlGenerator.ts
│   ├─ validator.ts
│   └─ schemaLoader.ts
│
└─ types/
```

---

# M1.1 Exit Criteria

* Complete sitemap defined
* Navigation hierarchy approved
* YAML preview placement decided
* Export workflow defined
* Internal component structure documented
* Ready for M1.2 Wireframes

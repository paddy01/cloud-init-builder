# Cloud-Init Builder Architecture

## Goals

The project should remain:

* Single-page application (SPA)
* Client-side only
* No backend required
* Easy to extend when cloud-init adds modules
* Ready for localization
* Testable and maintainable
* Compatible with Vite + React + TypeScript

---

# Repository Layout

```text
cloud-init-builder/
│
├─ public/
│   ├─ locales/
│   │   ├─ en/
│   │   └─ sv/
│   └─ favicon.ico
│
├─ src/
│   │
│   ├─ app/
│   │   ├─ App.tsx
│   │   ├─ Router.tsx
│   │   └─ Providers.tsx
│   │
│   ├─ pages/
│   │   ├─ HomePage.tsx
│   │   └─ NotFoundPage.tsx
│   │
│   ├─ layouts/
│   │   ├─ MainLayout.tsx
│   │   ├─ Sidebar.tsx
│   │   └─ Header.tsx
│   │
│   ├─ sections/
│   │   ├─ Identity/
│   │   ├─ Users/
│   │   ├─ SSH/
│   │   ├─ Packages/
│   │   ├─ Network/
│   │   ├─ Storage/
│   │   ├─ Files/
│   │   ├─ Commands/
│   │   └─ Export/
│   │
│   ├─ components/
│   │   ├─ common/
│   │   ├─ forms/
│   │   ├─ editors/
│   │   ├─ dialogs/
│   │   └─ preview/
│   │
│   ├─ schemas/
│   │   ├─ cloudinit/
│   │   ├─ generated/
│   │   └─ loaders/
│   │
│   ├─ generators/
│   │   ├─ yaml/
│   │   ├─ serializers/
│   │   └─ exporters/
│   │
│   ├─ validators/
│   │   ├─ hostname.ts
│   │   ├─ cidr.ts
│   │   ├─ ssh.ts
│   │   └─ users.ts
│   │
│   ├─ state/
│   │   ├─ projectStore.ts
│   │   ├─ uiStore.ts
│   │   └─ selectors/
│   │
│   ├─ models/
│   │   ├─ project.ts
│   │   ├─ cloudinit.ts
│   │   └─ export.ts
│   │
│   ├─ services/
│   │   ├─ schemaService.ts
│   │   ├─ yamlService.ts
│   │   └─ projectService.ts
│   │
│   ├─ hooks/
│   │   ├─ useProject.ts
│   │   ├─ useExport.ts
│   │   └─ useValidation.ts
│   │
│   ├─ i18n/
│   │   ├─ index.ts
│   │   └─ resources.ts
│   │
│   ├─ utils/
│   │   ├─ yaml.ts
│   │   ├─ json.ts
│   │   ├─ ids.ts
│   │   └─ strings.ts
│   │
│   ├─ assets/
│   │
│   └─ main.tsx
│
├─ tests/
│   ├─ unit/
│   ├─ integration/
│   └─ fixtures/
│
├─ docs/
│   ├─ RESEARCH.md
│   ├─ SCOPE.md
│   ├─ FIELD-MAPPING.md
│   ├─ COMPONENTS.md
│   ├─ VALIDATION.md
│   ├─ ARCHITECTURE.md
│   └─ TECH-STACK.md
│
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ eslint.config.js
└─ README.md
```

---

# Directory Responsibilities

## app/

Application bootstrap and global providers.

Examples:

* Routing
* Theme providers
* State providers
* Error boundaries

---

## pages/

Top-level pages.

Current MVP:

```text
HomePage
```

Potential future:

```text
DocumentationPage
ExamplesPage
```

---

## layouts/

Application shell.

Contains:

* Header
* Navigation
* Responsive sidebar
* Content layout

---

## sections/

Business-oriented feature sections.

Each section maps directly to a cloud-init area.

Example:

```text
Users/
 ├─ UsersSection.tsx
 ├─ UserEditor.tsx
 └─ UserList.tsx
```

This keeps the UI organized around cloud-init concepts.

---

## components/

Reusable UI components.

Examples:

```text
TextInput
CodeEditor
YamlPreview
ArrayEditor
ConfirmationDialog
```

No cloud-init business logic should live here.

---

## schemas/

Schema-driven architecture foundation.

Contains:

### cloudinit/

Raw imported cloud-init schemas.

### generated/

Normalized schema format used by UI.

### loaders/

Schema parsing and transformation logic.

Purpose:

Allow future automatic form generation.

---

## generators/

Converts internal project model into cloud-init output.

Responsibilities:

* YAML generation
* JSON export
* Download packaging

No UI logic.

---

## validators/

All custom validation rules.

Examples:

* Hostname validation
* Username validation
* CIDR validation
* SSH public key validation

Implemented with Zod.

---

## state/

Zustand stores.

Main stores:

### projectStore

Entire cloud-init configuration.

### uiStore

UI preferences and editor state.

---

## models/

Application data structures.

Examples:

```typescript
Project
User
NetworkConfig
StorageConfig
```

Provides type safety across the application.

---

## services/

Business logic layer.

Examples:

* Schema loading
* YAML generation
* Project import/export

Acts as boundary between UI and generators.

---

## hooks/

React hooks.

Examples:

```typescript
useProject()
useValidation()
useYamlPreview()
```

Encapsulates reusable behavior.

---

## i18n/

Localization framework.

Initial language:

```text
en
```

Prepared for:

```text
sv
de
fr
```

All visible strings must be translatable.

---

## utils/

Pure helper functions.

Examples:

* YAML formatting
* String normalization
* UUID generation

No React code.

---

## tests/

Testing structure.

```text
unit/
integration/
fixtures/
```

Fixtures should contain cloud-init examples from official documentation.

---

# Architectural Principles

## 1. Schema-Driven First

UI should consume normalized schema metadata whenever possible.

Goal:

```text
Cloud-Init Schema
        ↓
Normalized Schema
        ↓
Generated Form
```

Custom React components only where automatic generation is insufficient.

Examples:

* SSH key editor
* Network editor
* Storage editor
* File editor

---

## 2. Separation of Concerns

```text
UI
 ↓
State
 ↓
Services
 ↓
Generators
 ↓
YAML
```

Each layer has one responsibility.

---

## 3. Backend-Free

Everything runs in browser:

* Validation
* Generation
* Import/export

No database required.

---

## 4. Portable Projects

Projects saved as JSON.

```text
project.json
```

Generated output:

```text
cloud-init.yaml
```

---

## 5. Future Plugin Capability

Future modules can be added by:

```text
New Schema
+
New Section
```

without major architecture changes.

---

# Recommended Folder Growth Strategy

MVP should initially implement only:

```text
sections/
 ├─ Identity
 ├─ Users
 ├─ SSH
 ├─ Packages
 ├─ Files
 ├─ Commands
 └─ Export
```

Network and Storage can remain feature-flagged until M4+.

This minimizes complexity while preserving the final architecture.

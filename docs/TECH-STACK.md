# Cloud-Init Builder Technology Stack

Version: MVP (v1)

---

# Goals

The technology stack should:

- Be simple to maintain
- Allow rapid development with AI-assisted coding (Codex/Cursor)
- Require no backend for MVP
- Support future localization
- Support future schema-driven UI generation
- Produce a static deployable application

---

# Frontend

## React

Reason:

- Large ecosystem
- Excellent TypeScript support
- Strong compatibility with AI coding tools
- Easy component composition

## TypeScript

Reason:

- Strong typing
- Better maintainability
- Improves AI-generated code quality
- Enables schema-driven form generation

---

# Build System

## Vite

Reason:

- Fast development startup
- Minimal configuration
- Static build output
- Excellent React integration

Deployment Targets:

- GitHub Pages
- Netlify
- Vercel
- Static web server

---

# UI Framework

## shadcn/ui

Reason:

- Modern appearance
- Accessible components
- Not a runtime dependency
- Full source ownership
- Easy customization

Used For:

- Forms
- Dialogs
- Tabs
- Tables
- Buttons
- Navigation
- Toast notifications

---

# Styling

## Tailwind CSS

Reason:

- Works natively with shadcn/ui
- Fast UI development
- Easy theme customization
- Excellent responsive support

Future:

- Light/Dark mode support
- Localization-friendly layouts

---

# State Management

## Zustand

Reason:

- Lightweight
- Minimal boilerplate
- TypeScript-friendly
- Easy persistence support

State Responsibilities:

- Current project
- Generated YAML
- Validation state
- Undo/redo history
- UI preferences

---

# Form Management

## React Hook Form

Reason:

- Excellent performance
- Native TypeScript support
- Integrates with Zod
- Handles large dynamic forms

Used For:

- All configuration editors
- Dynamic cloud-init modules
- Schema-generated forms

---

# Validation

## Zod

Reason:

- Type-safe validation
- TypeScript-first
- Generates inferred types
- Integrates with React Hook Form

Validation Layers:

### UI Validation

Examples:

- Hostname
- Username
- File paths
- CIDR blocks
- Package names

### Project Validation

Examples:

- Duplicate users
- Invalid network combinations
- Missing required fields

### Export Validation

Examples:

- Valid cloud-init structure
- Schema conformance

---

# YAML Generation

## yaml

Package:

```text
yaml
````

Reason:

* Reliable serialization
* Good multiline support
* Maintained project
* Supports comments if needed later

Responsibilities:

* cloud-config generation
* network-config generation
* storage-config generation

---

# Schema Handling

## JSON Schema

Primary Source:

Official cloud-init schema

Reference:

[https://docs.cloud-init.io/en/latest/reference/json-schema.html](https://docs.cloud-init.io/en/latest/reference/json-schema.html)

Purpose:

* Auto-generated forms
* Validation generation
* Future module discovery

---

# Routing

## React Router

Reason:

* Industry standard
* Future-proof

MVP Usage:

* Single-page application
* Route support reserved for future expansion

Example:

```text
/
```

Future:

```text
/projects
/project/:id
/import
/docs
```

---

# Internationalization

## react-i18next

Reason:

* Industry standard
* Lazy-loaded translations
* Works well with React

Initial Language:

* English

Future Languages:

* Swedish
* German
* French
* Spanish

---

# Persistence

## Browser Local Storage

Reason:

* No backend required
* Simple implementation

Stored Data:

* Current project
* Preferences
* Recent exports

Future:

* IndexedDB for large projects

---

# Sharing Format

## JSON Project File

Extension:

```text
.cloudinit-builder.json
```

Purpose:

* Import/export
* Versioning
* Sharing

---

# Testing

## Vitest

Reason:

* Native Vite integration
* Fast execution

Coverage:

* YAML generation
* Validation
* State management

## Testing Library

Packages:

```text
@testing-library/react
@testing-library/user-event
```

Coverage:

* UI components
* Form behavior
* Generated forms

---

# Code Quality

## ESLint

Purpose:

* Static analysis
* Consistent code quality

## Prettier

Purpose:

* Formatting
* AI-generated code consistency

---

# Documentation

## Markdown

Documentation Location:

```text
/docs
```

Examples:

* ARCHITECTURE.md
* COMPONENTS.md
* VALIDATION.md
* FIELD-MAPPING.md

---

# Deployment

## Static Site

No backend required.

Supported Platforms:

* GitHub Pages
* Netlify
* Vercel
* Cloudflare Pages

Build Output:

```text
dist/
```

---

# Future Backend (Not MVP)

Possible Options:

* Cloudflare Workers
* FastAPI
* Node.js

Potential Features:

* Shared URLs
* Team collaboration
* Config repository
* User accounts

Not included in MVP.

---

# AI Development Stack

## Codex

Primary Usage:

* Component generation
* Validation implementation
* YAML generation
* Test generation

## Cursor

Primary Usage:

* Large refactors
* Multi-file changes
* Spec-driven implementation

---

# Final Stack Decision

Frontend

* React
* TypeScript
* Vite

UI

* shadcn/ui
* Tailwind CSS

Forms

* React Hook Form

Validation

* Zod

State

* Zustand

YAML

* yaml

Schema

* Official cloud-init JSON Schema

Persistence

* Local Storage

Testing

* Vitest
* Testing Library

Localization

* react-i18next

Deployment

* Static Hosting

```

### Codex/Cursor handoff point

After M3.1 is approved, implementation work can begin:

- M3.2 Project folder structure
- M3.3 State architecture
- M3.4 Schema ingestion design
- M3.5 YAML engine architecture

Those are still specification tasks. Actual code generation should start after M3 is complete and architecture is frozen.
```

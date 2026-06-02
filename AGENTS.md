<!-- GSD:project-start source:PROJECT.md -->

## Project

**Cloud-Init Builder**

Cloud-Init Builder is a guided visual builder for cloud-init configuration. It is aimed first at homelab users on Proxmox and sysadmins preparing reusable server templates who usually hand-write cloud-init YAML today. The first usable version focuses on helping them build common configurations through a UI and export both deployable `#cloud-config` YAML and a reopenable builder project JSON file.

**Core Value:** Generate correct cloud-init configuration with high confidence that the exported YAML is valid.

### Constraints

- **Product scope**: v1 supports only identity, users, and commands — keeping the first release narrow reduces complexity and increases the chance of a polished guided workflow.
- **Architecture**: Client-side SPA only, no backend required — this keeps deployment simple and matches the documented MVP direction.
- **Output model**: Export both deployable `#cloud-config` YAML and builder project JSON — users need one artifact for deployment and one for reopening/editing later.
- **Quality bar**: Correctness and confidence in validity take priority over breadth — tradeoffs should favor validation and reliable output over adding more sections quickly.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.x | UI composition for the SPA | Matches the documented architecture, supports component-driven forms well, and keeps the app fully client-side. |
| TypeScript | 5.x | Type-safe domain and UI modeling | Important for schema-aware generation, safer YAML/export logic, and maintainable AI-assisted development. |
| Vite | 7.x | Development/build toolchain | Fast local iteration, static deploy output, and aligns with the documented MVP stack. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` | 7.x | Form state for dynamic editors | Use for identity, users, and commands editors where nested inputs and repeatable items are common. |
| `zod` | 4.x | Runtime validation and typed schemas | Use for project validation, field validation, and export-time validation before YAML generation. |
| `zustand` | 5.x | App/project state management | Use for project state, preview state, validation state, and import/export coordination. |
| `yaml` | 2.x | Deterministic YAML serialization | Use for `#cloud-config` generation with stable output and correct multiline handling. |
| Tailwind CSS | 4.x | Styling system | Use if the team keeps the documented shadcn/ui + Tailwind direction for rapid UI iteration. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit/integration testing | Good fit for generator, validator, and normalization logic. |
| Playwright | End-to-end verification | Useful for checking the guided builder flow and export behavior across real browser interactions. |
| ESLint | Code quality enforcement | Keep rules strong around types, React patterns, and unsafe serialization paths. |

## Installation

# Core

# Supporting

# Dev dependencies

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React + RHF | Schema-only renderer | Use later for broader module coverage once the guided UX for core workflows is solid. |
| Zustand | Redux Toolkit | Use only if state complexity grows enough to justify heavier ceremony. |
| Zod | AJV-only validation | Use AJV later if direct JSON Schema execution becomes a bigger requirement than typed app-level validation. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Backend-first architecture | Adds deployment and persistence complexity that the MVP explicitly does not need | Client-side SPA with project JSON export/import |
| YAML-as-source editing as the main workflow | Reintroduces the exact hand-authored error surface the product is trying to remove | Structured project JSON plus guided form inputs |
| Premature full-schema auto-rendering for v1 | Risks a generic, confusing UX before the core workflows are proven | Guided custom flows for identity, users, and commands |

## Stack Patterns by Variant

- Favor handcrafted section editors with shared primitives
- Because correctness and confidence matter more than maximum module breadth
- Add a hybrid schema-driven renderer with targeted UI overrides
- Because the docs already point toward a 70-80% generated / 20-30% custom split

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `react@19.x` | `vite@7.x` | Modern React SPA baseline |
| `react-hook-form@7.x` | `zod@4.x` | Common typed form-validation pairing |
| `yaml@2.x` | TypeScript 5.x | Good fit for deterministic serialization helpers |

## Sources

- `docs/TECH-STACK.md` — baseline stack direction
- `docs/ARCHITECTURE.md` — repository architecture and SPA constraints
- `docs/RESEARCH.md` — schema-driven vs guided UX split

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

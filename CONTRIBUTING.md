# Contributing

Thanks for considering a contribution to Cloud-Init Builder. This project is a
client-side React/Vite app for generating validated cloud-init YAML and
reopenable builder project files.

## Project Scope

The current v1 scope is intentionally narrow:

- Identity fields
- Users
- Boot and run commands
- YAML export
- Builder project JSON save/open

Avoid expanding into packages, networking, storage, `write_files`, backend
persistence, collaboration, or full cloud-init module coverage unless the
maintainers have accepted that scope first.

## Development Setup

Prerequisite: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Typecheck and build the production app. |
| `npm run lint` | Run ESLint with zero warnings allowed. |
| `npm test` | Run Vitest unit and integration tests. |
| `npx playwright test` | Run end-to-end tests. |

Install the Chromium browser for Playwright before running e2e tests for the
first time:

```bash
npx playwright install chromium
```

## Contribution Guidelines

- Keep changes focused and small enough to review.
- Prefer existing patterns in `src/models/`, `src/validators/`,
  `src/generators/`, `src/services/`, and `src/components/`.
- Add or update tests for behavior changes.
- Keep validation and YAML correctness ahead of feature breadth.
- Do not introduce a backend or server dependency for v1 behavior.
- Do not emit invalid cloud-init YAML from export paths.
- Keep generated YAML deterministic where possible.
- Update documentation when user-facing behavior, setup, or project scope
  changes.

## Pull Request Checklist

Before opening a pull request, run:

```bash
npm run build
npm run lint
npm test
```

Run Playwright when the change affects user workflows, export behavior, import
behavior, navigation, or validation messaging:

```bash
npx playwright test
```

In the pull request description, include:

- What changed
- Why it changed
- How it was tested
- Any known limitations or follow-up work

## Reporting Bugs

When reporting a bug, include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and operating system, if UI-related
- Example `.cib.json` or generated YAML when relevant

Do not include real passwords, private SSH keys, production hostnames, or other
sensitive infrastructure details.

## Code of Conduct

All project participation is covered by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

# Code Review Report

Review date: 2026-07-12

Scope: full local review of the current React/Vite SPA, focused on the v1
contract: guided identity, users, and commands editing; valid `#cloud-config`
YAML export; and reopenable builder project JSON. The worktree was clean before
the review. The application was reported as mostly generated with Cursor
Composer 2, so the review emphasized integration seams, validation bypasses,
browser behavior, and generated-code hygiene.

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | ESLint completed with `--max-warnings 0`. |
| `npm test` | Pass | 43 test files and 487 tests passed. |
| `npm run build` | Pass | TypeScript project build and Vite production build completed. |
| `npm run test:e2e` | Pass | 3 Chromium e2e tests passed, including export, save, reopen, and blocked command recovery. |
| `npm run verify` | Pass | Combined lint, Vitest, build, and Playwright verification completed. |

## Executive Summary

The core v1 functionality is in good shape: generator output, validation,
project import/export, and the main UI workflows have broad unit and e2e
coverage. The issues found in this report have been addressed in quick task
`260712-vc4`, with the generator contract intentionally kept
validator-independent and documented by tests.

## Findings

### High: CI lint gate currently fails (resolved)

Location: `package.json:10`, `src/layouts/TopBar.tsx:125`,
`src/layouts/TopBar.tsx:134`, `src/layouts/TopBar.tsx:146`

`TopBar` creates a fresh `tooltipDeps` object on every render and closes over
it inside two `useMemo` callbacks, but the dependency arrays list individual
fields instead of `tooltipDeps`. ESLint reports two
`react-hooks/exhaustive-deps` warnings, and `npm run lint` exits non-zero
because the script treats warnings as failures.

Impact before fix: CI or pre-merge quality gates that run the documented lint
command failed even though tests and production build passed.

Resolution: the intermediate object was removed from the memo closures, and
`npm run lint` now passes with `--max-warnings 0`.

### Medium: Dirty-page unload protection is incomplete across browsers (resolved)

Location: `src/hooks/useBeforeUnload.ts:10`

The `beforeunload` handler calls `event.preventDefault()`, but it does not set
`event.returnValue`. Modern browser behavior is inconsistent here; assigning
`returnValue` remains the most compatible way to request a native navigation
confirmation prompt.

Impact before fix: users with unsaved project changes may not reliably receive
a warning before closing or navigating away.

Resolution: the hook now assigns `event.returnValue = ""`, with focused tests
covering clean and dirty unload behavior.

### Medium: Lenient import fallback can return non-canonical project shapes (resolved)

Location: `src/services/projectService.ts:154`, `src/services/projectService.ts:157`,
`src/services/projectService.ts:172`, `src/components/preview/PreviewPanel.tsx:19`

When schema parsing fails, the fallback project is built as
`{ ...defaults, ...migrated, ... } as ProjectFile`. Users and commands are
normalized before this point, but identity is not. A malformed imported
`identity` value can therefore override the default with a non-canonical shape,
then flow into the store and preview generation. Export/copy still re-run
validation, so this is not a confirmed YAML download corruption path, but the
app is no longer holding a trustworthy `ProjectFile` after fallback import.

Impact before fix: malformed project JSON could produce misleading preview
output or brittle state behavior after import, undermining the product's "high
confidence" output bar.

Resolution: identity is normalized during import migration; invalid identity
data is omitted with an import warning, matching users/commands fallback style.

### Low: Command generation still depends on caller-side validation (accepted contract)

Location: `src/generators/generateCloudInit.ts:55`,
`src/generators/generateCommands.ts:3`

The YAML export and clipboard services call `validateConfig()` before
generation, which protects the main user-facing output paths. The lower-level
generator still always returns `ok: true` and directly projects command strings,
executables, and arguments from the builder model. Direct callers can produce
YAML containing blank or otherwise invalid commands if they bypass the service
contract.

Impact before clarification: future code could accidentally bypass export gating
and emit weak command YAML from the generator API.

Resolution: the existing validator-independent generator design is preserved
and documented in code, with a regression test pinning the direct-caller
contract.

### Low: Browser e2e coverage is not wired into npm scripts (resolved)

Location: `package.json:6`, `package.json:11`, `playwright.config.ts:1`

The repository has meaningful Playwright coverage, and it passed when run
directly. However, `npm test` runs only Vitest, and there is no `test:e2e` or
combined verification script in `package.json`.

Impact before fix: reviewers or CI jobs that only ran documented npm scripts
could miss the browser-level save/open/export coverage.

Resolution: `test:e2e` and `verify` npm scripts were added and documented in
`README.md`.

## Fix Plan Status

1. Restore the required quality gate.
   - Complete.

2. Harden browser data-loss protection.
   - Complete.

3. Canonicalize fallback imports.
   - Complete.

4. Clarify generator boundaries.
   - Complete; the validator-independent generator contract was retained.

5. Make full verification discoverable.
   - Complete.

## Positive Coverage Notes

- YAML export and clipboard paths block output when validation contains errors.
- Identity validators cover hostname, FQDN, timezone, locale, and
  `manage_etc_hosts` values.
- User validation covers reserved and duplicate usernames, password hash
  safety, SSH key validity, duplicate keys, and authentication requirements.
- Command validation covers blank entries and common risk patterns such as
  remote-content shell pipes, recursive deletion, broad permission changes, and
  interactive commands.
- Import handling has compatibility behavior for legacy user arrays, malformed
  users/commands sections, oversized files, invalid JSON, and future format
  versions.
- Unit, integration, and e2e tests cover the main identity, users, commands,
  preview, save/open, export, and round-trip workflows.

## Residual Risk

This review did not include a manual visual audit in a real browser. The
automated e2e suite passed, but responsive layout, keyboard polish beyond tested
paths, and visual regressions should still be checked manually before release.

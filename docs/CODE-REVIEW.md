# Code Review Report

Review date: 2026-06-26

Scope: local review of the React/Vite SPA source, focused on project models,
validators, cloud-init generators, import/export services, UI workflow wiring,
and existing automated tests. The project was reported as mainly generated with
Cursor Composer 2.5, so the review emphasized integration risks, validation
gaps, and generated-code hygiene.

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build` | Pass | TypeScript and Vite production build completed. |
| `npm test` | Pass | 42 test files and 482 tests passed. |
| `npx playwright test` | Pass | 3 Chromium tests passed after allowing local server binding. |
| `npm run lint` | Fail | ESLint found two hook dependency warnings; `--max-warnings 0` makes this a failing gate. |

The first Playwright run failed in the sandbox because the preview server could
not bind to `127.0.0.1:4173` (`listen EPERM`). Re-running with local server
binding allowed completed successfully.

## Findings

### High: CI lint gate currently fails

Location: `src/layouts/TopBar.tsx:125`, `src/layouts/TopBar.tsx:134`,
`src/layouts/TopBar.tsx:146`

`TopBar` creates a `tooltipDeps` object on every render and captures that object
inside two `useMemo` callbacks, but the dependency arrays list the individual
fields instead of `tooltipDeps`. ESLint reports `react-hooks/exhaustive-deps`
warnings at lines 136 and 148, and the configured lint command exits non-zero
because `package.json` uses `eslint . --max-warnings 0`.

Impact: CI or pre-merge checks that run `npm run lint` fail even though the app
builds and tests pass.

Recommended fix: remove the intermediate `tooltipDeps` object and pass the
fields inline to `buildBlockedYamlTooltip`, or memoize `tooltipDeps` and use the
memoized object as the hook dependency.

### Medium: Dirty-page unload protection is incomplete across browsers

Location: `src/hooks/useBeforeUnload.ts:10`

The `beforeunload` handler calls `event.preventDefault()`, but it does not set
`event.returnValue`. Some browser behavior still depends on assigning
`returnValue` for the navigation confirmation prompt to appear consistently.

Impact: users with unsaved project changes may not reliably receive a browser
warning before closing or navigating away.

Recommended fix: set `event.returnValue = ""` after `event.preventDefault()`.
Add a focused hook test that dispatches `beforeunload` while `isDirty` is true
and verifies the event is canceled.

### Low: Command generation relies on callers to validate before emitting

Location: `src/generators/generateCommands.ts:3`

`mapBuilderCommand` emits shell commands, executables, and arguments exactly as
stored in the builder model. Current export and copy paths call
`validateConfig()` first, so this is not a confirmed user-facing export bug, but
direct generator callers can still produce YAML containing blank or padded
command values.

Impact: future code that calls the generator directly could bypass the UI/export
validation contract and emit weak command output.

Recommended fix: either document that generators require validated input, or
normalize command strings inside the generator and add direct generator tests
for blank and padded command values.

## Positive Coverage Notes

- Import handling has explicit compatibility behavior for legacy users,
  malformed sections, oversized files, invalid JSON, and future format
  versions.
- YAML export and clipboard paths block output when validation contains errors.
- User validation covers duplicate names, reserved names, SSH key validity,
  password hash safety, and authentication requirements.
- Command validation covers blank commands plus common risk patterns such as
  remote-content shell pipes, recursive deletion, broad permission changes, and
  interactive commands.
- Existing unit, integration, and e2e tests cover the main identity, users,
  commands, preview, save/open, export, and round-trip workflows.

## Residual Risk

This review did not include a manual visual pass in a real browser. The
automated Playwright smoke coverage passed, but responsive layout polish and
visual regressions should still be reviewed manually before release.

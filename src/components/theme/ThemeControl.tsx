import { setThemePreference } from "../../theme/themeLifecycle.ts";
import { useThemeStore } from "../../theme/themeStore.ts";

type ThemeOption = "system" | "light" | "dark";

const options: readonly ThemeOption[] = ["system", "light", "dark"];

function ThemeIcon({ option }: { option: ThemeOption }) {
  if (option === "system") {
    return (
      <svg data-theme-icon aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="4" width="14" height="10" rx="1" />
        <path d="M7 17h6M10 14v3" />
      </svg>
    );
  }

  if (option === "light") {
    return (
      <svg data-theme-icon aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="10" cy="10" r="3.25" />
        <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M16 4l-1.4 1.4M5.4 14.6L4 16M16 16l-1.4-1.4M5.4 5.4L4 4" />
      </svg>
    );
  }

  return (
    <svg data-theme-icon aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M16.7 12.4A7 7 0 0 1 7.6 3.3a7 7 0 1 0 9.1 9.1Z" />
    </svg>
  );
}

export function ThemeControl() {
  const preference = useThemeStore((state) => state.preference);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const storageWarningVisible = useThemeStore((state) => state.storageWarningVisible);
  const systemResult = resolvedTheme === "dark" ? "Dark" : "Light";

  return (
    <div className="min-w-0">
      <fieldset className="min-w-0" aria-label="Appearance">
        <legend className="sr-only">Appearance</legend>
        <div
          data-testid="theme-control-track"
          data-theme-transition="colors"
          className="flex min-w-0 gap-1 rounded border border-ui-border bg-ui-inset p-1"
        >
          {options.map((option) => {
            const checked = preference === option;
            const accessibleName = option === "system" ? `System (currently ${systemResult})` : option[0]!.toUpperCase() + option.slice(1);
            const visibleLabel = option === "system" ? `System (${systemResult})` : accessibleName;
            const segmentClass = checked
              ? "border-ui-selected-border bg-ui-selected text-ui-selected-text font-semibold shadow-[inset_0_0_0_1px_currentColor] focus-within:ring-offset-ui-focus-offset-selected"
              : "border-transparent bg-ui-raised text-ui-text hover:bg-ui-inset focus-within:ring-offset-ui-focus-offset-raised";

            return (
              <label
                key={option}
                data-theme-segment
                data-theme-transition="colors"
                data-theme-transition-focus
                className={`group relative flex min-h-10 min-w-10 flex-1 items-center justify-center rounded border px-2 text-sm focus-within:ring-2 focus-within:ring-ui-focus focus-within:ring-offset-2 ${segmentClass}`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="appearance"
                  value={option}
                  checked={checked}
                  aria-label={accessibleName}
                  onChange={() => setThemePreference(option)}
                />
                <ThemeIcon option={option} />
                <span className="hidden sm:inline">{visibleLabel}</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-max max-w-56 -translate-x-1/2 rounded border border-ui-border bg-ui-text px-2 py-1 text-xs text-ui-canvas group-focus-within:block group-hover:block sm:hidden"
                >
                  {option === "system" ? `${accessibleName} — follows your device setting.` : accessibleName}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {storageWarningVisible ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-1 max-w-80 break-words rounded border border-ui-warning-border bg-ui-warning px-2 py-1 text-xs text-ui-warning-text"
        >
          Appearance set for this session only. Your browser could not save it, so it will reset after reload.
        </p>
      ) : null}
    </div>
  );
}

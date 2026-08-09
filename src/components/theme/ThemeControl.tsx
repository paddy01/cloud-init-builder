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
  const systemResult = resolvedTheme === "dark" ? "Dark" : "Light";

  return (
    <div className="min-w-0">
      <fieldset className="min-w-0" aria-label="Appearance">
        <legend className="sr-only">Appearance</legend>
        <div
          data-testid="theme-control-track"
          data-theme-transition="colors"
          className="flex min-w-0 gap-1 rounded border p-1"
          style={{
            backgroundColor: "var(--theme-surface)",
            borderColor: "var(--theme-border)",
          }}
        >
          {options.map((option) => {
            const checked = preference === option;
            const accessibleName = option === "system" ? `System (currently ${systemResult})` : option[0]!.toUpperCase() + option.slice(1);
            const visibleLabel = option === "system" ? `System (${systemResult})` : accessibleName;
            const selectedClass = checked ? "ring-1 font-semibold" : "hover:opacity-80";

            return (
              <label
                key={option}
                data-theme-segment
                data-theme-transition="colors"
                data-theme-transition-focus
                className={`group relative flex min-h-10 min-w-10 flex-1 items-center justify-center rounded px-2 text-sm focus-within:ring-2 focus-within:ring-offset-2 ${selectedClass}`}
                style={{
                  backgroundColor: checked ? "var(--theme-canvas)" : "var(--theme-surface)",
                  borderColor: checked ? "var(--theme-accent)" : "transparent",
                  color: checked ? "var(--theme-accent)" : "var(--theme-text)",
                  boxShadow: checked ? "0 0 0 1px var(--theme-accent)" : undefined,
                }}
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
                  className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-max max-w-56 -translate-x-1/2 rounded px-2 py-1 text-xs text-white group-focus-within:block group-hover:block sm:hidden"
                  style={{ backgroundColor: "var(--theme-text)", color: "var(--theme-canvas)" }}
                >
                  {option === "system" ? `${accessibleName} — follows your device setting.` : accessibleName}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

import {
  SHELL_PRESETS,
  getShellChoice,
  isShellPreset,
} from "../../models/users.ts";

const inputClassName =
  "rounded border border-ui-border bg-ui-raised px-3 py-2 text-sm text-ui-text " +
  "focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-focus-offset-raised focus:border-ui-focus";

interface ShellSelectorProps {
  shellId: string;
  customShellId: string;
  shell: string | undefined;
  onChange: (shell: string | undefined) => void;
}

export function ShellSelector({
  shellId,
  customShellId,
  shell,
  onChange,
}: ShellSelectorProps) {
  const choice = getShellChoice(shell);
  const showCustom = choice === "other";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor={shellId} className="text-sm font-semibold text-ui-text">
          Shell
        </label>
        <select
          id={shellId}
          value={choice}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "other") {
              onChange(isShellPreset(shell) ? "" : shell);
              return;
            }
            onChange(next);
          }}
          className={inputClassName}
        >
          {SHELL_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
          <option value="other">Other</option>
        </select>
        <p className="text-xs text-ui-muted-text">
          Choose a common login shell or pick Other to enter a custom path.
        </p>
      </div>

      {showCustom ? (
        <div className="space-y-1">
          <label
            htmlFor={customShellId}
            className="text-sm font-semibold text-ui-text"
          >
            Custom shell path
          </label>
          <input
            id={customShellId}
            type="text"
            placeholder="e.g. /usr/local/bin/fish"
            value={shell ?? ""}
            onChange={(event) => onChange(event.target.value)}
            className={inputClassName}
          />
        </div>
      ) : null}
    </div>
  );
}

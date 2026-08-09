import {
  SUDO_PASSWORDLESS,
  SUDO_REQUIRE_PASSWORD,
  getSudoPresetChoice,
} from "../../models/users.ts";
import type { BuilderUser } from "../../models/users.ts";

const inputClassName =
  "rounded border border-ui-border bg-ui-raised px-3 py-2 text-sm text-ui-text " +
  "focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-focus-offset-raised focus:border-ui-focus";

interface SudoRuleSelectorProps {
  id: string;
  sudo: BuilderUser["sudo"];
  onChange: (sudo: BuilderUser["sudo"]) => void;
}

export function SudoRuleSelector({ id, sudo, onChange }: SudoRuleSelectorProps) {
  const choice = getSudoPresetChoice(sudo);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-semibold text-ui-text">
        Sudo rule
      </label>
      <select
        id={id}
        value={choice}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "none") {
            onChange(undefined);
            return;
          }
          if (next === "passwordless") {
            onChange(SUDO_PASSWORDLESS);
            return;
          }
          if (next === "require-password") {
            onChange(SUDO_REQUIRE_PASSWORD);
            return;
          }
        }}
        className={inputClassName}
      >
        <option value="none">No sudo</option>
        <option value="passwordless">Passwordless sudo</option>
        <option value="require-password">Require password</option>
        {choice === "custom" ? (
          <option value="custom" disabled>
            Custom sudo preserved
          </option>
        ) : null}
      </select>
      <p className="text-xs text-ui-muted-text">
        Use a guided preset for the common cloud-init sudo patterns in this
        phase.
      </p>
      {choice === "custom" ? (
        <p className="rounded border border-ui-warning-border bg-ui-warning px-2 py-1 text-xs text-ui-warning-text">
          Imported custom sudo value preserved. Choose a preset to replace it.
        </p>
      ) : null}
    </div>
  );
}

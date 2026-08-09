import { useState } from "react";

const chipClassName =
  "inline-flex items-center gap-1 rounded-full border border-ui-border bg-ui-inset px-2 py-1 text-xs text-ui-text";

function mergeGroups(existing: string[], incoming: string[]): string[] {
  const result = [...existing];
  for (const group of incoming) {
    if (!result.includes(group)) {
      result.push(group);
    }
  }
  return result;
}

interface GroupsInputProps {
  id: string;
  groups: string[];
  onChange: (groups: string[]) => void;
}

export function GroupsInput({ id, groups, onChange }: GroupsInputProps) {
  const [draft, setDraft] = useState("");

  const commitDraft = (text: string) => {
    const tokens = text
      .split(",")
      .map((group) => group.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      return;
    }
    onChange(mergeGroups(groups, tokens));
    setDraft("");
  };

  const removeGroup = (group: string) => {
    onChange(groups.filter((entry) => entry !== group));
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-semibold text-ui-text">
        Additional groups
      </label>
      <div
        className={
          "flex flex-wrap items-center gap-2 rounded border border-ui-border bg-ui-raised px-3 py-2 text-ui-text " +
          "focus-within:ring-2 focus-within:ring-ui-focus focus-within:ring-offset-2 focus-within:ring-offset-ui-focus-offset-raised focus-within:border-ui-focus"
        }
      >
        {groups.map((group) => (
          <span key={group} className={chipClassName}>
            {group}
            <button
              type="button"
              className="rounded text-ui-muted-text hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-focus-offset-inset"
              aria-label={`Remove group ${group}`}
              onClick={() => removeGroup(group)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          placeholder="Type a group and press Enter"
          className="min-w-[12rem] flex-1 border-0 bg-transparent p-0 text-sm text-ui-text focus:outline-none focus:ring-0"
          onChange={(event) => {
            const value = event.target.value;
            if (value.includes(",")) {
              commitDraft(value);
              return;
            }
            setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitDraft(draft);
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (!pasted.includes(",")) {
              return;
            }
            event.preventDefault();
            commitDraft(pasted);
          }}
          onBlur={() => commitDraft(draft)}
        />
      </div>
      <p className="text-xs text-ui-muted-text">
        Add one group per tag. Pasting comma-separated values creates multiple
        tags.
      </p>
    </div>
  );
}

import { useState } from "react";

const chipClassName =
  "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700";

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
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        Additional groups
      </label>
      <div
        className={
          "flex flex-wrap items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 " +
          "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        }
      >
        {groups.map((group) => (
          <span key={group} className={chipClassName}>
            {group}
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700"
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
          className="min-w-[12rem] flex-1 border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
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
      <p className="text-xs text-gray-500">
        Add one group per tag. Pasting comma-separated values creates multiple
        tags.
      </p>
    </div>
  );
}

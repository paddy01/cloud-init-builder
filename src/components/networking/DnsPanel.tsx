import { useLayoutEffect, useRef, useState } from "react";
import type {
  BuilderNetworkInterface,
  BuilderValueRow,
} from "../../models/networking.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { useValidation } from "../validation/validationContext.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";

const inputClass =
  "min-h-10 min-w-0 w-full rounded border border-ui-border bg-ui-raised px-4 py-2 font-mono text-sm text-ui-text focus:border-ui-focus focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-inset";
const addButtonClass =
  "min-h-10 rounded border border-ui-border bg-ui-raised px-3 py-2 text-sm text-ui-text hover:bg-ui-inset focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-inset";
const removeButtonClass =
  "min-h-10 shrink-0 rounded border border-ui-error-border bg-ui-raised px-3 py-2 text-sm text-ui-error-text hover:bg-ui-error focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 focus:ring-offset-ui-inset sm:w-auto";

function interfaceTitle(entry: BuilderNetworkInterface): string {
  const activeDraft =
    entry.identityMode === "name" ? entry.name : entry.macAddress;
  return activeDraft.trim() || "interface";
}

interface DnsListProps {
  entry: BuilderNetworkInterface;
  kind: "nameserver" | "search-domain";
  rows: BuilderValueRow[];
  onAdd: () => string | undefined;
  onChange: (rowId: string, value: string) => void;
  onRemove: (rowId: string) => void;
}

function DnsList({
  entry,
  kind,
  rows,
  onAdd,
  onChange,
  onRemove,
}: DnsListProps) {
  const {
    getVisibleIssuesForPath,
    getFieldMessageId,
    markTouched,
  } = useValidation();
  const [focusTarget, setFocusTarget] = useState<
    { kind: "row"; id: string } | { kind: "add" } | null
  >(null);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const addRef = useRef<HTMLButtonElement>(null);
  const isNameserver = kind === "nameserver";
  const heading = isNameserver ? "Nameserver addresses" : "Search domains";
  const singular = isNameserver ? "Nameserver" : "Search domain";
  const addLabel = isNameserver ? "Add nameserver" : "Add search domain";
  const emptyCopy = isNameserver
    ? "No nameserver addresses added."
    : "No search domains added.";
  const title = interfaceTitle(entry);
  const headingId = `network-${entry.id}-${kind}-heading`;

  useLayoutEffect(() => {
    if (!focusTarget) return;
    const target =
      focusTarget.kind === "row"
        ? inputRefs.current.get(focusTarget.id)
        : addRef.current;
    if (!target) return;
    target.focus({ preventScroll: true });
    setFocusTarget(null);
  }, [focusTarget, rows]);

  const handleAdd = () => {
    const rowId = onAdd();
    if (rowId) setFocusTarget({ kind: "row", id: rowId });
  };

  const handleRemove = (rowId: string) => {
    const index = rows.findIndex((row) => row.id === rowId);
    if (index === -1) return;
    const nextTarget = rows[index + 1]?.id ?? rows[index - 1]?.id;
    onRemove(rowId);
    setFocusTarget(
      nextTarget ? { kind: "row", id: nextTarget } : { kind: "add" },
    );
  };

  return (
    <div className="space-y-2" role="group" aria-labelledby={headingId}>
      <p id={headingId} className="text-sm font-semibold text-ui-text">
        {heading}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-ui-muted-text">{emptyCopy}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const position = index + 1;
            const accessibleName = `${singular} ${position} for ${title}`;
            const inputId = `network-${entry.id}-${kind}-${row.id}`;
            const markerId = `${inputId}-example`;
            const fieldKey = isNameserver ? "nameservers" : "searchDomains";
            const path = `networking.interfaces.${entry.id}.${fieldKey}.${row.id}`;
            const issues = getVisibleIssuesForPath(path);
            const messageIds = issues.map((issue) =>
              getFieldMessageId(path, issue.code),
            );
            const describedBy = [row.isExampleValue ? markerId : null, ...messageIds]
              .filter((value): value is string => value !== null)
              .join(" ");
            return (
              <div
                key={row.id}
                className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                role="group"
                aria-label={accessibleName}
              >
                <div className="min-w-0 space-y-1">
                  <label
                    htmlFor={inputId}
                    className="flex flex-wrap items-baseline gap-1 text-sm font-semibold text-ui-text"
                  >
                    <span>{singular}</span>
                    {row.isExampleValue ? (
                      <span
                        id={markerId}
                        className="text-xs font-normal text-ui-warning-text"
                      >
                        Example value—replace for your network
                      </span>
                    ) : null}
                  </label>
                  <input
                    ref={(node) => {
                      if (node) inputRefs.current.set(row.id, node);
                      else inputRefs.current.delete(row.id);
                    }}
                    id={inputId}
                    type="text"
                    inputMode="text"
                    spellCheck={false}
                    className={inputClass}
                    aria-label={accessibleName}
                    aria-describedby={describedBy || undefined}
                    placeholder={
                      isNameserver
                        ? "192.0.2.53 or 2001:db8::53"
                        : "lab.example"
                    }
                    value={row.value}
                    onChange={(event) => onChange(row.id, event.target.value)}
                    onBlur={() => markTouched(path)}
                  />
                  {issues.map((issue) => (
                    <FieldMessage
                      key={issue.code}
                      id={getFieldMessageId(path, issue.code)}
                      message={issue.message}
                      severity={issue.severity}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className={removeButtonClass}
                  aria-label={`Remove ${kind === "nameserver" ? "nameserver" : "search domain"} ${position} for ${title}`}
                  onClick={() => handleRemove(row.id)}
                >
                  Remove {kind === "nameserver" ? "nameserver" : "search domain"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <button
        ref={addRef}
        type="button"
        className={addButtonClass}
        onClick={handleAdd}
      >
        {addLabel}
      </button>
    </div>
  );
}

interface DnsPanelProps {
  entry: BuilderNetworkInterface;
}

export function DnsPanel({ entry }: DnsPanelProps) {
  const addNetworkNameserver = useProjectStore(
    (state) => state.addNetworkNameserver,
  );
  const updateNetworkNameserver = useProjectStore(
    (state) => state.updateNetworkNameserver,
  );
  const removeNetworkNameserver = useProjectStore(
    (state) => state.removeNetworkNameserver,
  );
  const addNetworkSearchDomain = useProjectStore(
    (state) => state.addNetworkSearchDomain,
  );
  const updateNetworkSearchDomain = useProjectStore(
    (state) => state.updateNetworkSearchDomain,
  );
  const removeNetworkSearchDomain = useProjectStore(
    (state) => state.removeNetworkSearchDomain,
  );
  const headingId = `network-${entry.id}-dns`;

  return (
    <section
      className="min-w-0 space-y-4 rounded-lg border border-ui-border bg-ui-inset p-4"
      aria-labelledby={headingId}
    >
      <h4 id={headingId} className="text-lg font-semibold text-ui-text">
        DNS
      </h4>
      <DnsList
        entry={entry}
        kind="nameserver"
        rows={entry.nameservers}
        onAdd={() => addNetworkNameserver(entry.id)}
        onChange={(rowId, value) =>
          updateNetworkNameserver(entry.id, rowId, value)
        }
        onRemove={(rowId) => removeNetworkNameserver(entry.id, rowId)}
      />
      <DnsList
        entry={entry}
        kind="search-domain"
        rows={entry.searchDomains}
        onAdd={() => addNetworkSearchDomain(entry.id)}
        onChange={(rowId, value) =>
          updateNetworkSearchDomain(entry.id, rowId, value)
        }
        onRemove={(rowId) => removeNetworkSearchDomain(entry.id, rowId)}
      />
    </section>
  );
}

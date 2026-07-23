import { useLayoutEffect, useRef, useState } from "react";
import type {
  BuilderNetworkInterface,
  BuilderValueRow,
} from "../../models/networking.ts";
import {
  useProjectStore,
  type NetworkFamily,
} from "../../state/projectStore.ts";
import { useValidation } from "../validation/validationContext.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";

const inputClass =
  "min-h-10 min-w-0 w-full rounded border border-gray-300 bg-white px-4 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
const addButtonClass =
  "min-h-10 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
const removeButtonClass =
  "min-h-10 shrink-0 rounded border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto";

function interfaceTitle(entry: BuilderNetworkInterface): string {
  const activeDraft =
    entry.identityMode === "name" ? entry.name : entry.macAddress;
  return activeDraft.trim() || "interface";
}

interface AddressFamilyFieldsetProps {
  entry: BuilderNetworkInterface;
  family: NetworkFamily;
}

function AddressFamilyFieldset({
  entry,
  family,
}: AddressFamilyFieldsetProps) {
  const setNetworkDhcp = useProjectStore((state) => state.setNetworkDhcp);
  const addNetworkAddress = useProjectStore(
    (state) => state.addNetworkAddress,
  );
  const updateNetworkAddress = useProjectStore(
    (state) => state.updateNetworkAddress,
  );
  const removeNetworkAddress = useProjectStore(
    (state) => state.removeNetworkAddress,
  );
  const [focusTarget, setFocusTarget] = useState<
    { kind: "row"; id: string } | { kind: "add" } | null
  >(null);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const addRef = useRef<HTMLButtonElement>(null);

  const isIpv4 = family === "ipv4";
  const familyLabel = isIpv4 ? "IPv4" : "IPv6";
  const rows = isIpv4 ? entry.ipv4Addresses : entry.ipv6Addresses;
  const dhcpField = isIpv4 ? "dhcp4" : "dhcp6";
  const dhcpLabel = isIpv4 ? "Enable DHCP4" : "Enable DHCP6";
  const dhcpMarkerId = `network-${entry.id}-${dhcpField}-example`;

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
    const rowId = addNetworkAddress(entry.id, family);
    if (rowId) setFocusTarget({ kind: "row", id: rowId });
  };

  const handleRemove = (rowId: string) => {
    const index = rows.findIndex((row) => row.id === rowId);
    if (index === -1) return;
    const nextTarget = rows[index + 1]?.id ?? rows[index - 1]?.id;
    removeNetworkAddress(entry.id, family, rowId);
    setFocusTarget(
      nextTarget ? { kind: "row", id: nextTarget } : { kind: "add" },
    );
  };

  return (
    <fieldset className="min-w-0 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">
        {familyLabel}
      </legend>

      <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          className="size-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          checked={entry[dhcpField]}
          aria-describedby={
            entry.exampleFields.includes(dhcpField) ? dhcpMarkerId : undefined
          }
          onChange={(event) =>
            setNetworkDhcp(entry.id, family, event.target.checked)
          }
        />
        <span>{dhcpLabel}</span>
        {entry.exampleFields.includes(dhcpField) ? (
          <span
            id={dhcpMarkerId}
            className="text-xs font-normal text-amber-700"
          >
            Example value—replace for your network
          </span>
        ) : null}
      </label>

      <div
        className="space-y-2"
        role="group"
        aria-labelledby={`network-${entry.id}-${family}-addresses-heading`}
      >
        <p
          id={`network-${entry.id}-${family}-addresses-heading`}
          className="text-sm font-semibold text-gray-700"
        >
          Static {familyLabel} addresses
        </p>

        {rows.length === 0 ? (
          <p className="text-xs text-gray-500">
            No static {familyLabel} addresses added.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <AddressRow
                key={row.id}
                entry={entry}
                family={family}
                row={row}
                position={index + 1}
                inputRef={(node) => {
                  if (node) inputRefs.current.set(row.id, node);
                  else inputRefs.current.delete(row.id);
                }}
                onChange={(value) =>
                  updateNetworkAddress(entry.id, family, row.id, value)
                }
                onRemove={() => handleRemove(row.id)}
              />
            ))}
          </div>
        )}

        <button
          ref={addRef}
          type="button"
          className={addButtonClass}
          onClick={handleAdd}
        >
          Add {familyLabel} address
        </button>
      </div>
    </fieldset>
  );
}

interface AddressRowProps {
  entry: BuilderNetworkInterface;
  family: NetworkFamily;
  row: BuilderValueRow;
  position: number;
  inputRef: (node: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onRemove: () => void;
}

function AddressRow({
  entry,
  family,
  row,
  position,
  inputRef,
  onChange,
  onRemove,
}: AddressRowProps) {
  const {
    getVisibleIssuesForPath,
    getFieldMessageId,
    markTouched,
  } = useValidation();
  const familyLabel = family === "ipv4" ? "IPv4" : "IPv6";
  const title = interfaceTitle(entry);
  const inputId = `network-${entry.id}-${family}-address-${row.id}`;
  const markerId = `${inputId}-example`;
  const accessibleName = `${familyLabel} address ${position} for ${title}`;
  const path = `networking.interfaces.${entry.id}.${family}Addresses.${row.id}`;
  const issues = getVisibleIssuesForPath(path);
  const messageIds = issues.map((issue) => getFieldMessageId(path, issue.code));
  const describedBy = [row.isExampleValue ? markerId : null, ...messageIds]
    .filter((value): value is string => value !== null)
    .join(" ");

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      role="group"
      aria-label={accessibleName}
    >
      <div className="min-w-0 space-y-1">
        <label
          htmlFor={inputId}
          className="flex flex-wrap items-baseline gap-1 text-sm font-semibold text-gray-700"
        >
          <span>CIDR address</span>
          {row.isExampleValue ? (
            <span id={markerId} className="text-xs font-normal text-amber-700">
              Example value—replace for your network
            </span>
          ) : null}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="text"
          spellCheck={false}
          className={inputClass}
          aria-label={accessibleName}
          aria-describedby={describedBy || undefined}
          placeholder={
            family === "ipv4" ? "192.0.2.10/24" : "2001:db8::10/64"
          }
          value={row.value}
          onChange={(event) => onChange(event.target.value)}
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
        aria-label={`Remove ${familyLabel} address ${position} for ${title}`}
        onClick={onRemove}
      >
        Remove {familyLabel} address
      </button>
    </div>
  );
}

interface AddressingPanelProps {
  entry: BuilderNetworkInterface;
}

export function AddressingPanel({ entry }: AddressingPanelProps) {
  return (
    <section className="space-y-4" aria-labelledby={`network-${entry.id}-addressing`}>
      <h4
        id={`network-${entry.id}-addressing`}
        className="text-lg font-semibold text-gray-900"
      >
        Addressing
      </h4>
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <AddressFamilyFieldset entry={entry} family="ipv4" />
        <AddressFamilyFieldset entry={entry} family="ipv6" />
      </div>
    </section>
  );
}

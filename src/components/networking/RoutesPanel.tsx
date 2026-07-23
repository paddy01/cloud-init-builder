import { useLayoutEffect, useRef, useState } from "react";
import type {
  BuilderNetworkInterface,
  BuilderRoute,
} from "../../models/networking.ts";
import {
  useProjectStore,
  type NetworkFamily,
  type NetworkRouteField,
  type NetworkRouteKind,
} from "../../state/projectStore.ts";
import { useValidation } from "../validation/validationContext.ts";
import { FieldMessage } from "../users/FieldMessage.tsx";

function routeFieldPath(
  interfaceId: string,
  family: NetworkFamily,
  routeId: string,
  field: NetworkRouteField,
): string {
  return `networking.interfaces.${interfaceId}.${family}Routes.${routeId}.${field}`;
}

function describedByIds(
  markerId: string | null,
  path: string,
  issues: { code: string }[],
  getFieldMessageId: (path: string, code: string) => string,
): string | undefined {
  const messageIds = issues.map((issue) => getFieldMessageId(path, issue.code));
  const ids = [markerId, ...messageIds].filter(
    (value): value is string => value !== null && value !== "",
  );
  return ids.length > 0 ? ids.join(" ") : undefined;
}

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

function routeTitle(route: BuilderRoute): "Default route" | "Specific route" {
  return route.kind === "default" ? "Default route" : "Specific route";
}

interface RouteRowProps {
  entry: BuilderNetworkInterface;
  family: NetworkFamily;
  route: BuilderRoute;
  position: number;
  isExpanded: boolean;
  firstFieldRef: (node: HTMLInputElement | null) => void;
  onChange: (field: NetworkRouteField, value: string) => void;
  onToggleExpanded: () => void;
  onRemove: () => void;
}

function RouteRow({
  entry,
  family,
  route,
  position,
  isExpanded,
  firstFieldRef,
  onChange,
  onToggleExpanded,
  onRemove,
}: RouteRowProps) {
  const {
    getVisibleIssuesForPath,
    getFieldMessageId,
    markTouched,
  } = useValidation();
  const familyLabel = family === "ipv4" ? "IPv4" : "IPv6";
  const title = interfaceTitle(entry);
  const visibleTitle = routeTitle(route);
  const intent = route.kind === "default" ? "default" : "specific";
  const rowName = `${visibleTitle} ${position} for ${title}`;
  const destinationId = `network-${entry.id}-${family}-route-${route.id}-destination`;
  const gatewayId = `network-${entry.id}-${family}-route-${route.id}-gateway`;
  const metricId = `network-${entry.id}-${family}-route-${route.id}-metric`;
  const destinationMarkerId = `${destinationId}-example`;
  const gatewayMarkerId = `${gatewayId}-example`;
  const metricMarkerId = `${metricId}-example`;
  const advancedPanelId = `network-${entry.id}-${family}-route-${route.id}-advanced`;
  const destinationPath = routeFieldPath(
    entry.id,
    family,
    route.id,
    "destination",
  );
  const gatewayPath = routeFieldPath(entry.id, family, route.id, "gateway");
  const metricPath = routeFieldPath(entry.id, family, route.id, "metric");
  const destinationIssues = getVisibleIssuesForPath(destinationPath);
  const gatewayIssues = getVisibleIssuesForPath(gatewayPath);
  const metricIssues = getVisibleIssuesForPath(metricPath);
  const marker = (id: string) => (
    <span id={id} className="text-xs font-normal text-amber-700">
      Example value—replace for your network
    </span>
  );

  return (
    <div
      className="min-w-0 space-y-3 rounded border border-gray-200 bg-white p-4"
      role="group"
      aria-label={rowName}
    >
      <p className="text-sm font-semibold text-gray-900">{visibleTitle}</p>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 space-y-3">
          {route.kind === "specific" ? (
            <div className="min-w-0 space-y-1">
              <label
                htmlFor={destinationId}
                className="flex flex-wrap items-baseline gap-1 text-sm font-semibold text-gray-700"
              >
                <span>Destination</span>
                {route.exampleFields.includes("destination") ? (
                  marker(destinationMarkerId)
                ) : null}
              </label>
              <input
                ref={firstFieldRef}
                id={destinationId}
                type="text"
                inputMode="text"
                spellCheck={false}
                className={inputClass}
                aria-label={`Destination for ${familyLabel} ${intent} route ${position} for ${title}`}
                aria-describedby={describedByIds(
                  route.exampleFields.includes("destination")
                    ? destinationMarkerId
                    : null,
                  destinationPath,
                  destinationIssues,
                  getFieldMessageId,
                )}
                placeholder={
                  family === "ipv4"
                    ? "198.51.100.0/24"
                    : "2001:db8:1::/64"
                }
                value={route.destination}
                onChange={(event) =>
                  onChange("destination", event.target.value)
                }
                onBlur={() => markTouched(destinationPath)}
              />
              {destinationIssues.map((issue) => (
                <FieldMessage
                  key={issue.code}
                  id={getFieldMessageId(destinationPath, issue.code)}
                  message={issue.message}
                  severity={issue.severity}
                />
              ))}
            </div>
          ) : null}

          <div className="min-w-0 space-y-1">
            <label
              htmlFor={gatewayId}
              className="flex flex-wrap items-baseline gap-1 text-sm font-semibold text-gray-700"
            >
              <span>
                {route.kind === "default" ? "Gateway" : "Gateway (optional)"}
              </span>
              {route.exampleFields.includes("gateway") ? (
                marker(gatewayMarkerId)
              ) : null}
            </label>
            <input
              ref={route.kind === "default" ? firstFieldRef : undefined}
              id={gatewayId}
              type="text"
              inputMode="text"
              spellCheck={false}
              className={inputClass}
              aria-label={`${route.kind === "default" ? "Gateway" : "Gateway (optional)"} for ${familyLabel} ${intent} route ${position} for ${title}`}
              aria-describedby={describedByIds(
                route.exampleFields.includes("gateway") ? gatewayMarkerId : null,
                gatewayPath,
                gatewayIssues,
                getFieldMessageId,
              )}
              placeholder={family === "ipv4" ? "192.0.2.1" : "2001:db8::1"}
              value={route.gateway}
              onChange={(event) => onChange("gateway", event.target.value)}
              onBlur={() => markTouched(gatewayPath)}
            />
            {gatewayIssues.map((issue) => (
              <FieldMessage
                key={issue.code}
                id={getFieldMessageId(gatewayPath, issue.code)}
                message={issue.message}
                severity={issue.severity}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          className={removeButtonClass}
          aria-label={`Remove ${intent} route ${position} for ${title}`}
          onClick={onRemove}
        >
          Remove {intent} route
        </button>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="min-h-10 rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Advanced for ${familyLabel} ${intent} route ${position} for ${title}`}
          aria-expanded={isExpanded}
          aria-controls={advancedPanelId}
          onClick={onToggleExpanded}
        >
          Advanced
        </button>
        {isExpanded ? (
          <div id={advancedPanelId} className="min-w-0 space-y-1">
            <label
              htmlFor={metricId}
              className="flex flex-wrap items-baseline gap-1 text-sm font-semibold text-gray-700"
            >
              <span>Metric (optional)</span>
              {route.exampleFields.includes("metric") ? (
                marker(metricMarkerId)
              ) : null}
            </label>
            <input
              id={metricId}
              type="text"
              inputMode="numeric"
              spellCheck={false}
              className={inputClass}
              aria-label={`Metric (optional) for ${familyLabel} ${intent} route ${position} for ${title}`}
              aria-describedby={describedByIds(
                route.exampleFields.includes("metric") ? metricMarkerId : null,
                metricPath,
                metricIssues,
                getFieldMessageId,
              )}
              placeholder="100"
              value={route.metric}
              onChange={(event) => onChange("metric", event.target.value)}
              onBlur={() => markTouched(metricPath)}
            />
            {metricIssues.map((issue) => (
              <FieldMessage
                key={issue.code}
                id={getFieldMessageId(metricPath, issue.code)}
                message={issue.message}
                severity={issue.severity}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface RouteFamilyGroupProps {
  entry: BuilderNetworkInterface;
  family: NetworkFamily;
}

function RouteFamilyGroup({ entry, family }: RouteFamilyGroupProps) {
  const addNetworkRoute = useProjectStore((state) => state.addNetworkRoute);
  const updateNetworkRouteField = useProjectStore(
    (state) => state.updateNetworkRouteField,
  );
  const removeNetworkRoute = useProjectStore(
    (state) => state.removeNetworkRoute,
  );
  const { focusRequestPath } = useValidation();
  const [focusTarget, setFocusTarget] = useState<
    { kind: "row"; id: string } | { kind: "add-default" } | null
  >(null);
  const [expandedRouteIds, setExpandedRouteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const firstFieldRefs = useRef(new Map<string, HTMLInputElement>());
  const addDefaultRef = useRef<HTMLButtonElement>(null);
  const familyLabel = family === "ipv4" ? "IPv4" : "IPv6";
  const routes = family === "ipv4" ? entry.ipv4Routes : entry.ipv6Routes;
  const headingId = `network-${entry.id}-${family}-routes-heading`;
  const metricFocusRouteId = (() => {
    if (!focusRequestPath) {
      return null;
    }
    const metricMatch = focusRequestPath.match(
      new RegExp(
        `^networking\\.interfaces\\.${entry.id}\\.${family}Routes\\.([^.]+)\\.metric$`,
      ),
    );
    return metricMatch?.[1] ?? null;
  })();

  useLayoutEffect(() => {
    if (!metricFocusRouteId || expandedRouteIds.has(metricFocusRouteId)) {
      return;
    }

  // Focus-driven disclosure must persist after consumeFocusRequest clears the path.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot expand for metric focus
    setExpandedRouteIds((current) => {
      if (current.has(metricFocusRouteId)) {
        return current;
      }
      const next = new Set(current);
      next.add(metricFocusRouteId);
      return next;
    });
  }, [expandedRouteIds, metricFocusRouteId]);

  useLayoutEffect(() => {
    if (!focusTarget) return;
    const target =
      focusTarget.kind === "row"
        ? firstFieldRefs.current.get(focusTarget.id)
        : addDefaultRef.current;
    if (!target) return;
    target.focus({ preventScroll: true });
    setFocusTarget(null);
  }, [focusTarget, routes]);

  const handleAdd = (kind: NetworkRouteKind) => {
    const rowId = addNetworkRoute(entry.id, family, kind);
    if (rowId) setFocusTarget({ kind: "row", id: rowId });
  };

  const handleRemove = (rowId: string) => {
    const index = routes.findIndex((route) => route.id === rowId);
    if (index === -1) return;
    const nextTarget = routes[index + 1]?.id ?? routes[index - 1]?.id;
    removeNetworkRoute(entry.id, family, rowId);
    setExpandedRouteIds((current) => {
      if (!current.has(rowId)) return current;
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
    setFocusTarget(
      nextTarget
        ? { kind: "row", id: nextTarget }
        : { kind: "add-default" },
    );
  };

  return (
    <div
      className="min-w-0 space-y-3"
      role="group"
      aria-labelledby={headingId}
    >
      <h5 id={headingId} className="text-sm font-semibold text-gray-900">
        {familyLabel} routes
      </h5>

      {routes.length === 0 ? (
        <p className="text-xs text-gray-500">
          No {familyLabel} routes added.
        </p>
      ) : (
        <div className="space-y-3">
          {routes.map((route, index) => (
            <RouteRow
              key={route.id}
              entry={entry}
              family={family}
              route={route}
              position={index + 1}
              isExpanded={
                expandedRouteIds.has(route.id) ||
                route.id === metricFocusRouteId
              }
              firstFieldRef={(node) => {
                if (node) firstFieldRefs.current.set(route.id, node);
                else firstFieldRefs.current.delete(route.id);
              }}
              onChange={(field, value) =>
                updateNetworkRouteField(
                  entry.id,
                  family,
                  route.id,
                  field,
                  value,
                )
              }
              onToggleExpanded={() =>
                setExpandedRouteIds((current) => {
                  const next = new Set(current);
                  if (next.has(route.id)) next.delete(route.id);
                  else next.add(route.id);
                  return next;
                })
              }
              onRemove={() => handleRemove(route.id)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          ref={addDefaultRef}
          type="button"
          className={addButtonClass}
          onClick={() => handleAdd("default")}
        >
          Add default route
        </button>
        <button
          type="button"
          className={addButtonClass}
          onClick={() => handleAdd("specific")}
        >
          Add specific route
        </button>
      </div>
    </div>
  );
}

interface RoutesPanelProps {
  entry: BuilderNetworkInterface;
}

export function RoutesPanel({ entry }: RoutesPanelProps) {
  return (
    <section
      className="space-y-4"
      aria-labelledby={`network-${entry.id}-routes`}
    >
      <h4
        id={`network-${entry.id}-routes`}
        className="text-lg font-semibold text-gray-900"
      >
        Routes
      </h4>
      <div className="space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <RouteFamilyGroup entry={entry} family="ipv4" />
        <div aria-hidden="true" className="border-t border-gray-200" />
        <RouteFamilyGroup entry={entry} family="ipv6" />
      </div>
    </section>
  );
}

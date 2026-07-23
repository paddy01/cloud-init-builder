import { useLayoutEffect, useRef } from "react";
import { isNetworkingConfig } from "../../models/networking.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import type { ValidationIssue } from "../../validators/validateConfig.ts";
import { useUserValidation } from "../users/UserValidationContext.ts";
import {
  getInterfaceIdFromIssuePath,
  getNetworkInterfaceSummaryLabel,
} from "./networkingValidationPaths.ts";

export const NETWORKING_VALIDATION_SUMMARY_HEADING_ID =
  "networking-validation-summary-heading";

function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollElementIntoView(element: HTMLElement) {
  if (typeof element.scrollIntoView !== "function") {
    return;
  }
  element.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

export function NetworkingValidationSummary() {
  const project = useProjectStore((state) => state.project);
  const {
    focusRequestPath,
    consumeFocusRequest,
    getVisibleNetworkingSummaryIssues,
    markTouched,
    requestFocus,
  } = useUserValidation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  const visibleNetworkingIssues = getVisibleNetworkingSummaryIssues();
  const errors = visibleNetworkingIssues.filter(
    (issue) => issue.severity === "error",
  );
  const warnings = visibleNetworkingIssues.filter(
    (issue) => issue.severity === "warning",
  );

  useLayoutEffect(() => {
    if (focusRequestPath !== NETWORKING_VALIDATION_SUMMARY_HEADING_ID) {
      return;
    }

    const path = consumeFocusRequest();
    if (path !== NETWORKING_VALIDATION_SUMMARY_HEADING_ID) {
      return;
    }

    const heading = headingRef.current;
    const container = summaryRef.current;
    if (container) {
      scrollElementIntoView(container);
    } else if (heading) {
      scrollElementIntoView(heading);
    }
    heading?.focus({ preventScroll: true });
  }, [consumeFocusRequest, focusRequestPath]);

  if (visibleNetworkingIssues.length === 0) {
    return null;
  }

  const networking = project?.networking;
  const interfaces =
    networking && isNetworkingConfig(networking) ? networking.interfaces : [];

  const hasErrors = errors.length > 0;
  const heading = hasErrors
    ? "Networking needs attention"
    : warnings.length > 0
      ? "Networking safety warnings"
      : "Networking needs attention";

  const containerClassName = hasErrors
    ? "mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900"
    : "mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900";

  const errorCountLabel =
    errors.length === 1
      ? "1 validation error"
      : `${errors.length} validation errors`;
  const warningCountLabel =
    warnings.length === 1 ? "1 warning" : `${warnings.length} warnings`;

  const labelForIssue = (issue: ValidationIssue): string => {
    const interfaceId = getInterfaceIdFromIssuePath(issue.path);
    if (!interfaceId) {
      return "Interface";
    }
    return getNetworkInterfaceSummaryLabel(interfaceId, interfaces);
  };

  const handleIssueActivate = (issue: ValidationIssue) => {
    markTouched(issue.path);
    requestFocus(issue.path);
  };

  return (
    <section
      ref={summaryRef}
      className={containerClassName}
      aria-labelledby={NETWORKING_VALIDATION_SUMMARY_HEADING_ID}
      aria-live="polite"
    >
      <h3
        ref={headingRef}
        id={NETWORKING_VALIDATION_SUMMARY_HEADING_ID}
        tabIndex={-1}
        className="text-sm font-semibold"
      >
        {heading}
      </h3>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
        {errors.length > 0 ? <span>{errorCountLabel}</span> : null}
        {warnings.length > 0 ? <span>{warningCountLabel}</span> : null}
      </div>
      <p className="mt-2 text-xs">
        Select an issue to move to the affected networking field.
      </p>
      <ul className="mt-2 space-y-1">
        {visibleNetworkingIssues.map((issue, index) => (
          <li key={`${issue.path}-${issue.code}-${index}`}>
            <button
              type="button"
              className="min-h-10 w-full break-words text-left text-sm text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => handleIssueActivate(issue)}
            >
              {labelForIssue(issue)}: {issue.message}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

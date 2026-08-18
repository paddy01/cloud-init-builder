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

  const renderIssueList = (
    issues: ValidationIssue[],
    tone: "error" | "warning",
  ) => (
    <ul className="mt-2 space-y-1">
      {issues.map((issue, index) => (
        <li key={`${issue.path}-${issue.code}-${index}`}>
          <button
            type="button"
            className={`min-h-10 w-full break-words text-left text-sm underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 ${
              tone === "error"
                ? "text-ui-error-text focus:ring-offset-ui-error"
                : "text-ui-warning-text focus:ring-offset-ui-warning"
            }`}
            onClick={() => handleIssueActivate(issue)}
          >
            {labelForIssue(issue)}: {issue.message}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      ref={summaryRef}
      className="mb-6 space-y-3"
      aria-live="polite"
    >
      {hasErrors ? (
        <section
          className="rounded-lg border border-ui-error-border bg-ui-error px-4 py-3 text-ui-error-text"
          aria-labelledby={NETWORKING_VALIDATION_SUMMARY_HEADING_ID}
        >
          <h3
            ref={headingRef}
            id={NETWORKING_VALIDATION_SUMMARY_HEADING_ID}
            tabIndex={-1}
            className="text-sm font-semibold"
          >
            Networking needs attention
          </h3>
          <div className="mt-1 text-xs font-semibold">{errorCountLabel}</div>
          <p className="mt-2 text-xs">
            Select an issue to move to the affected networking field.
          </p>
          {renderIssueList(errors, "error")}
        </section>
      ) : null}
      {warnings.length > 0 ? (
        <section
          className="rounded-lg border border-ui-warning-border bg-ui-warning px-4 py-3 text-ui-warning-text"
          aria-labelledby={
            hasErrors
              ? "networking-validation-summary-warning-heading"
              : NETWORKING_VALIDATION_SUMMARY_HEADING_ID
          }
        >
          <h3
            ref={hasErrors ? undefined : headingRef}
            id={
              hasErrors
                ? "networking-validation-summary-warning-heading"
                : NETWORKING_VALIDATION_SUMMARY_HEADING_ID
            }
            tabIndex={-1}
            className="text-sm font-semibold"
          >
            Networking safety warnings
          </h3>
          <div className="mt-1 text-xs font-semibold">{warningCountLabel}</div>
          <p className="mt-2 text-xs">
            Select an issue to review the affected networking warning.
          </p>
          {renderIssueList(warnings, "warning")}
        </section>
      ) : null}
    </section>
  );
}

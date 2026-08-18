import { useLayoutEffect, useRef } from "react";
import type { ValidationIssue } from "../../validators/validateConfig.ts";
import {
  getUserIdFromIssuePath,
  getUserLabel,
} from "./userValidationPaths.ts";
import { useUserValidation } from "./UserValidationContext.ts";
import { isUsersConfig } from "../../models/users.ts";
import { useProjectStore } from "../../state/projectStore.ts";

export const USERS_VALIDATION_SUMMARY_HEADING_ID =
  "users-validation-summary-heading";

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

export function UserValidationSummary() {
  const project = useProjectStore((state) => state.project);
  const {
    focusRequestPath,
    consumeFocusRequest,
    getVisibleUserSummaryIssues,
    markTouched,
    markAuthTouched,
    requestFocus,
  } = useUserValidation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  const visibleUserIssues = getVisibleUserSummaryIssues();
  const errors = visibleUserIssues.filter((issue) => issue.severity === "error");
  const warnings = visibleUserIssues.filter(
    (issue) => issue.severity === "warning",
  );

  useLayoutEffect(() => {
    if (focusRequestPath !== USERS_VALIDATION_SUMMARY_HEADING_ID) {
      return;
    }

    const path = consumeFocusRequest();
    if (path !== USERS_VALIDATION_SUMMARY_HEADING_ID) {
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

  if (visibleUserIssues.length === 0) {
    return null;
  }

  const users = project?.users;
  const entries =
    users && isUsersConfig(users) ? users.entries : [];

  const hasErrors = errors.length > 0;
  const heading = hasErrors
    ? "Users need attention"
    : warnings.length > 0
      ? "User safety warnings"
      : "Users need attention";

  const containerClassName = hasErrors
    ? "mb-6 rounded-lg border border-ui-error-border bg-ui-error px-4 py-3 text-ui-error-text"
    : "mb-6 rounded-lg border border-ui-warning-border bg-ui-warning px-4 py-3 text-ui-warning-text";
  const issueFocusOffsetClassName = hasErrors
    ? "focus:ring-offset-ui-focus-offset-error"
    : "focus:ring-offset-ui-focus-offset-warning";

  const errorCountLabel =
    errors.length === 1
      ? "1 export-blocking error"
      : `${errors.length} export-blocking errors`;
  const warningCountLabel =
    warnings.length === 1 ? "1 warning" : `${warnings.length} warnings`;

  const labelForIssue = (issue: ValidationIssue): string => {
    const userId = getUserIdFromIssuePath(issue.path);
    if (!userId) {
      return "User";
    }
    const index = entries.findIndex((entry) => entry.id === userId);
    const user = entries[index];
    if (!user) {
      return "User";
    }
    return getUserLabel(user, index + 1);
  };

  const handleIssueActivate = (issue: ValidationIssue) => {
    if (issue.path.includes(".authentication")) {
      const userId = getUserIdFromIssuePath(issue.path);
      if (userId) {
        markAuthTouched(userId);
      }
    } else {
      markTouched(issue.path);
    }
    requestFocus(issue.path);
  };

  return (
    <section
      ref={summaryRef}
      className={containerClassName}
      aria-labelledby={USERS_VALIDATION_SUMMARY_HEADING_ID}
      aria-live="polite"
    >
      <h3
        ref={headingRef}
        id={USERS_VALIDATION_SUMMARY_HEADING_ID}
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
        Select an issue to move to the affected user field.
      </p>
      <ul className="mt-2 space-y-1">
        {visibleUserIssues.map((issue, index) => (
          <li key={`${issue.path}-${issue.code}-${index}`}>
            <button
              type="button"
              className={`min-h-10 w-full text-left text-sm text-ui-selected-text underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ui-focus focus:ring-offset-2 ${issueFocusOffsetClassName}`}
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

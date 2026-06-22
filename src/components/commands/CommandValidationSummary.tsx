import { useLayoutEffect, useRef } from "react";
import { isCommandsConfig } from "../../models/commands.ts";
import type { CommandStage } from "../../models/commands.ts";
import type { ValidationIssue } from "../../validators/validateConfig.ts";
import { useProjectStore } from "../../state/projectStore.ts";
import { useUserValidation } from "../users/UserValidationContext.ts";
import {
  getCommandSummaryLabel,
  getStageFromIssuePath,
} from "./commandValidationPaths.ts";

export const COMMANDS_VALIDATION_SUMMARY_HEADING_ID =
  "commands-validation-summary-heading";

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

interface CommandValidationSummaryProps {
  activeStage: CommandStage;
  onStageChange: (stage: CommandStage) => void;
  onFocusRequestHandled?: () => void;
}

export function CommandValidationSummary({
  activeStage,
  onStageChange,
  onFocusRequestHandled,
}: CommandValidationSummaryProps) {
  const project = useProjectStore((state) => state.project);
  const {
    focusRequestPath,
    consumeFocusRequest,
    getVisibleCommandSummaryIssues,
    markTouched,
    requestFocus,
  } = useUserValidation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  const visibleCommandIssues = getVisibleCommandSummaryIssues(activeStage);
  const errors = visibleCommandIssues.filter(
    (issue) => issue.severity === "error",
  );
  const warnings = visibleCommandIssues.filter(
    (issue) => issue.severity === "warning",
  );

  useLayoutEffect(() => {
    if (focusRequestPath !== COMMANDS_VALIDATION_SUMMARY_HEADING_ID) {
      return;
    }

    const path = consumeFocusRequest();
    if (path !== COMMANDS_VALIDATION_SUMMARY_HEADING_ID) {
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
    onFocusRequestHandled?.();
  }, [consumeFocusRequest, focusRequestPath, onFocusRequestHandled]);

  if (visibleCommandIssues.length === 0) {
    return null;
  }

  const commands =
    project?.commands && isCommandsConfig(project.commands)
      ? project.commands
      : { bootcmd: [], runcmd: [] };

  const hasErrors = errors.length > 0;
  const heading = hasErrors
    ? "Commands need attention"
    : warnings.length > 0
      ? "Command safety warnings"
      : "Commands need attention";

  const containerClassName = hasErrors
    ? "mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900"
    : "mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900";

  const errorCountLabel =
    errors.length === 1
      ? "1 export-blocking error"
      : `${errors.length} export-blocking errors`;
  const warningCountLabel =
    warnings.length === 1 ? "1 warning" : `${warnings.length} warnings`;

  const labelForIssue = (issue: ValidationIssue): string => {
    const stage = getStageFromIssuePath(issue.path);
    const commandId = issue.path.match(/^commands\.(?:runcmd|bootcmd)\.([^.]+)\./)?.[1];
    if (!stage || !commandId) {
      return "Command";
    }
    return getCommandSummaryLabel(stage, commandId, commands);
  };

  const handleIssueActivate = (issue: ValidationIssue) => {
    const stage = getStageFromIssuePath(issue.path);
    if (stage && stage !== activeStage) {
      onStageChange(stage);
    }
    markTouched(issue.path);
    requestFocus(issue.path);
  };

  return (
    <section
      ref={summaryRef}
      className={containerClassName}
      aria-labelledby={COMMANDS_VALIDATION_SUMMARY_HEADING_ID}
      aria-live="polite"
    >
      <h3
        ref={headingRef}
        id={COMMANDS_VALIDATION_SUMMARY_HEADING_ID}
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
        Select an issue to move to the affected command field.
      </p>
      {!hasErrors && warnings.length > 0 ? (
        <p className="mt-2 text-xs">
          Warning detection is focused and incomplete. Warnings do not block
          export.
        </p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {visibleCommandIssues.map((issue, index) => (
          <li key={`${issue.path}-${issue.code}-${index}`}>
            <button
              type="button"
              className="min-h-10 w-full text-left text-sm text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
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

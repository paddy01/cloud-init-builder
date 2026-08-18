/* eslint-disable react-refresh/only-export-components */
import type { ValidationIssue } from "../../validators/validateConfig.ts";

export function formatPreviewIssueLabel(path: string): string {
  const last = path.split(".")[path.split(".").length - 1] ?? path;
  if (path.startsWith("identity.")) return path.slice(9);
  if (path.startsWith("users.entries.")) return last;
  if (path.startsWith("commands.")) return last;
  if (path.startsWith("networking.interfaces.")) return `Networking · ${last}`;
  return path;
}

export interface PreviewBannerProps {
  issues: ValidationIssue[];
  warnings?: ValidationIssue[];
  onShowEditor?: (path?: string) => void;
}

export function PreviewBanner({ issues, warnings = [], onShowEditor }: PreviewBannerProps) {
  if (issues.length === 0 && warnings.length === 0) return null;

  if (issues.length > 0) {
    const errorWord = issues.length === 1 ? "error" : "errors";
    return (
      <section aria-live="polite" className="border-b border-ui-error-border bg-ui-error px-4 py-3 text-sm text-ui-error-text">
        <h2 className="font-semibold">YAML preview is unavailable</h2>
        <span className="sr-only">{issues.length} validation {errorWord}</span>
        <p>{issues.length} validation {errorWord}. Fix the highlighted issues before generating YAML.</p>
        <button type="button" onClick={() => onShowEditor?.(issues[0]?.path)} className="mt-2 min-h-10 rounded border border-ui-error-border px-3 py-2 font-semibold hover:bg-ui-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-error)]">
          Fix {issues.length} {errorWord} to enable YAML output.
        </button>
        <ul className="mt-2 space-y-1">
          {issues.map((issue, index) => (
            <li key={`${issue.path}-${index}`}>
              <button type="button" onClick={() => onShowEditor?.(issue.path)} className="min-h-10 w-full break-words rounded px-2 py-2 text-left hover:bg-ui-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-error)]">
                <span className="font-semibold">{formatPreviewIssueLabel(issue.path)}:</span> {issue.message}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-live="polite" className="border-b border-ui-warning-border bg-ui-warning px-4 py-3 text-sm text-ui-warning-text">
      <h2 className="font-semibold">Networking safety warnings</h2>
      <p>Warnings do not block YAML output.</p>
      <ul className="mt-1 list-disc pl-5">
        {warnings.map((warning, index) => <li key={`${warning.path}-${index}`}>{warning.message}</li>)}
      </ul>
    </section>
  );
}

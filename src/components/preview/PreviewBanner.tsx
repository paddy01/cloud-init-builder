import type { ValidationIssue } from "../../validators/validateConfig.ts";

function pathSuffix(path: string): string {
  return path.startsWith("identity.") ? path.slice("identity.".length) : path;
}

export function PreviewBanner({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  const errorWord = issues.length === 1 ? "error" : "errors";

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
      <p className="text-sm font-semibold">
        {issues.length} validation {errorWord}
      </p>
      <p>
        Export is blocked. Fix the issues below to enable Export YAML.
      </p>
      <ul className="mt-1 list-disc pl-5 text-xs">
        {issues.slice(0, 3).map((issue, index) => (
          <li key={`${issue.path}-${index}`} role="alert">
            {pathSuffix(issue.path)}: {issue.message}
          </li>
        ))}
        {issues.length > 3 && (
          <li className="italic">…and {issues.length - 3} more</li>
        )}
      </ul>
    </div>
  );
}

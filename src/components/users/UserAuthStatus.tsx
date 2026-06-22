import { useUserValidation } from "./UserValidationContext.ts";

interface UserAuthStatusProps {
  userId: string;
}

export function UserAuthStatus({ userId }: UserAuthStatusProps) {
  const { getVisibleIssuesForPath, shouldShowAuthStatus, getFieldMessageId } =
    useUserValidation();
  const authPath = `users.entries.${userId}.authentication`;

  if (!shouldShowAuthStatus(userId)) {
    return null;
  }

  const issues = getVisibleIssuesForPath(authPath).filter(
    (issue) => issue.severity === "error",
  );
  const error = issues[0];
  if (!error) {
    return null;
  }

  return (
    <div
      id={`user-auth-${userId}`}
      tabIndex={-1}
      data-field-message-id={getFieldMessageId(authPath, error.code)}
      className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span id={getFieldMessageId(authPath, error.code)} role="alert">
        {error.message}
      </span>
    </div>
  );
}

import { useUserValidation } from "./UserValidationContext.tsx";

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
      id={getFieldMessageId(authPath, error.code)}
      role="alert"
      className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
    >
      {error.message}
    </div>
  );
}

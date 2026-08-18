interface FieldMessageProps {
  message: string;
  severity: "error" | "warning";
  id?: string;
}

export function FieldMessage({ message, severity, id }: FieldMessageProps) {
  if (severity === "error") {
    return (
      <p
        id={id}
        role="alert"
        className="mt-1 rounded border border-ui-error-border bg-ui-error px-2 py-1 text-xs text-ui-error-text"
      >
        {message}
      </p>
    );
  }

  return (
    <p
      id={id}
      className="mt-1 rounded border border-ui-warning-border bg-ui-warning px-2 py-1 text-xs text-ui-warning-text"
    >
      Warning: {message}
    </p>
  );
}

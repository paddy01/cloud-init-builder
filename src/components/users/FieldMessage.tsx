interface FieldMessageProps {
  message: string;
  severity: "error" | "warning";
  id?: string;
}

export function FieldMessage({ message, severity, id }: FieldMessageProps) {
  if (severity === "error") {
    return (
      <p id={id} role="alert" className="mt-1 text-xs text-red-600">
        {message}
      </p>
    );
  }

  return (
    <p id={id} className="mt-1 text-xs text-amber-800">
      Warning: {message}
    </p>
  );
}

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

function formatUnexpectedConsole(
  method: "console.warn" | "console.error",
  args: unknown[],
): string {
  const message = args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");

  return `Unexpected ${method} during test: ${message}`;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    throw new Error(formatUnexpectedConsole("console.warn", args));
  });
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    throw new Error(formatUnexpectedConsole("console.error", args));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

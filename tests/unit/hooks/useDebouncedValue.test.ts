import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../../../src/hooks/useDebouncedValue.ts";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately on first render", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("keeps the prior value before delayMs has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: "first", delayMs: 300 } },
    );

    rerender({ value: "next", delayMs: 300 });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("first");
  });

  it("returns the new value after delayMs has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: "first", delayMs: 300 } },
    );

    rerender({ value: "next", delayMs: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("next");
  });

  it("resets the timer on rapid sequential updates", () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: "start", delayMs: 300 } },
    );

    rerender({ value: "a", delayMs: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "b", delayMs: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "c", delayMs: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("c");
  });

  it("preserves generic type without widening to unknown", () => {
    const initial = { x: 1 };
    const { result, rerender } = renderHook(
      ({ value, delayMs }: { value: { x: number }; delayMs: number }) =>
        useDebouncedValue(value, delayMs),
      { initialProps: { value: initial, delayMs: 300 } },
    );

    expect(result.current.x).toBe(1);

    rerender({ value: { x: 42 }, delayMs: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.x).toBe(42);
  });
});

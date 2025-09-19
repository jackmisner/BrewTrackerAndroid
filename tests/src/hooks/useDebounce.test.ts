import { renderHook, act } from "@testing-library/react-native";
import { useDebounce } from "@src/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 1000));

    expect(result.current).toBe("initial");
  });

  it("should debounce string values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 1000 },
      }
    );

    expect(result.current).toBe("initial");

    // Change the value
    rerender({ value: "changed", delay: 1000 });

    // Should still be the initial value before debounce delay
    expect(result.current).toBe("initial");

    // Fast-forward time to complete the delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe("changed");
  });

  it("should debounce numeric values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 500 },
      }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42, delay: 500 });
    expect(result.current).toBe(0);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe(42);
  });

  it("should reset debounce timer on rapid value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 1000 },
      }
    );

    // Change value multiple times rapidly
    rerender({ value: "change1", delay: 1000 });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe("initial");

    rerender({ value: "change2", delay: 1000 });

    // Advance by 500ms more (total 1000ms since change1, but only 500ms since change2)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe("initial"); // Should still be initial

    // Advance by 500ms more to complete change2's delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe("change2");
  });

  it("should handle different delay values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "test", delay: 100 },
      }
    );

    rerender({ value: "changed", delay: 100 });

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("changed");

    // Change delay and value
    rerender({ value: "new", delay: 500 });

    // Old delay wouldn't be enough
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("changed");

    // New delay should work
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe("new");
  });

  it("should handle zero delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 0 },
      }
    );

    expect(result.current).toBe("initial");

    rerender({ value: "immediate", delay: 0 });
    expect(result.current).toBe("initial");

    // Even with zero delay, it should use setTimeout
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(result.current).toBe("immediate");
  });

  it("should handle null and undefined values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: null as string | null, delay: 100 },
      }
    );

    expect(result.current).toBeNull();

    rerender({ value: "not null", delay: 100 });

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("not null");

    rerender({ value: null, delay: 100 });

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBeNull();
  });

  it("should clean up timeout on unmount", () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");

    const { rerender, unmount } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 1000 },
      }
    );

    rerender({ value: "changed", delay: 1000 });

    // Unmount before timeout completes
    unmount();

    // clearTimeout should have been called
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it("should handle boolean values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: false, delay: 300 },
      }
    );

    expect(result.current).toBe(false);

    rerender({ value: true, delay: 300 });
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true);

    rerender({ value: false, delay: 300 });
    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe(false);
  });

  it("should handle object values", () => {
    const initialObj = { id: 1, name: "initial" };
    const changedObj = { id: 2, name: "changed" };

    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 300 },
      }
    );

    expect(result.current).toBe(initialObj);

    rerender({ value: changedObj, delay: 300 });
    expect(result.current).toBe(initialObj);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe(changedObj);
  });

  it("should handle the same value being set multiple times", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "test", delay: 1000 },
      }
    );

    expect(result.current).toBe("test");

    // Set the same value again
    rerender({ value: "test", delay: 1000 });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should still be the same value
    expect(result.current).toBe("test");
  });

  it("should work with very short delays", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 1 },
      }
    );

    rerender({ value: "quick", delay: 1 });
    expect(result.current).toBe("initial");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("quick");
  });

  it("should handle delay changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: any; delay: number }) =>
        useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 100 },
      }
    );

    // Change both value and delay
    rerender({ value: "changed", delay: 500 });

    // After original delay (100ms), should not have updated yet
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("initial");

    // After new delay (500ms total), should be updated
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe("changed");
  });
});

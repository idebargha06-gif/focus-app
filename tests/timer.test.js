import { describe, expect, it } from "vitest";
import { getNextPomodoroPhase, getPreciseTimeLeft } from "../src/utils/timer.js";

describe("timer helpers", () => {
  it("moves pomodoro work phases into break phases", () => {
    expect(getNextPomodoroPhase("work", 0)).toEqual({
      phase: "break",
      cycle: 1,
      totalTime: 300,
      label: "Break 1"
    });
  });

  it("derives precise time left from a start timestamp", () => {
    const now = Date.now();
    expect(getPreciseTimeLeft(now - 5000, 25)).toBe(20);
  });
});

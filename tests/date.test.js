import { describe, expect, it } from "vitest";
import { normalizeDayCollection, normalizeDayValue, toIsoDayKey } from "../src/utils/date.js";

describe("date normalization", () => {
  it("keeps iso values intact", () => {
    expect(normalizeDayValue("2026-03-26")).toBe("2026-03-26");
  });

  it("converts legacy toDateString values to iso keys", () => {
    expect(normalizeDayValue("Thu Mar 26 2026")).toBe("2026-03-26");
  });

  it("deduplicates normalized day collections", () => {
    expect(normalizeDayCollection(["2026-03-26", "Thu Mar 26 2026"])).toEqual(["2026-03-26"]);
  });

  it("generates current iso format with year-month-day", () => {
    expect(toIsoDayKey(new Date("2026-03-26T10:20:30"))).toBe("2026-03-26");
  });
});

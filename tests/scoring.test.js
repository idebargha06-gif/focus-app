import { describe, expect, it } from "vitest";
import {
  calculateDistractionPenalty,
  calculateFocusPercentage,
  calculateSessionScore,
  checkBadges
} from "../src/utils/scoring.js";

describe("scoring helpers", () => {
  it("calculates distraction penalties by mode and recent count", () => {
    expect(calculateDistractionPenalty("normal", 15, 1)).toBe(23);
    expect(calculateDistractionPenalty("deep", 15, 4)).toBe(76);
  });

  it("calculates focus percentage and session score safely", () => {
    expect(calculateSessionScore(1500, 40)).toBe(1460);
    expect(calculateSessionScore(10, 40)).toBe(0);
    expect(calculateFocusPercentage(1500, 75)).toBe(95);
  });

  it("unlocks badges based on accumulated stats", () => {
    const badges = checkBadges({
      totalSessions: 10,
      totalMinutes: 620,
      streak: 8,
      lastDistractions: 0,
      nightSession: true
    });

    expect(badges).toContain("ten_sessions");
    expect(badges).toContain("clean_focus");
    expect(badges).toContain("night_owl");
    expect(badges).toContain("legend");
  });
});

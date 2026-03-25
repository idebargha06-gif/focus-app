import { BADGES, LEVELS, SESSION_MODES } from "./constants.js";

export function calculateDistractionPenalty(sessionMode, awaySeconds = 0, recentCount = 1) {
  const config = SESSION_MODES[sessionMode] || SESSION_MODES.normal;
  const durationBonus = Math.floor(Math.max(0, awaySeconds) / 5);
  const multiplier = recentCount > 3 ? 2 : 1;
  return (config.penalty + durationBonus) * multiplier;
}

export function calculateSessionScore(timeSpentSeconds, penaltyTotal) {
  return Math.max(0, Math.floor(timeSpentSeconds) - Math.floor(penaltyTotal));
}

export function calculateFocusPercentage(timeSpentSeconds, penaltyTotal) {
  if (timeSpentSeconds <= 0) {
    return 100;
  }

  return Math.max(0, Math.round(((timeSpentSeconds - penaltyTotal) / timeSpentSeconds) * 100));
}

export function getLevelInfo(totalMinutes) {
  return [...LEVELS].reverse().find((level) => totalMinutes >= level.min) || LEVELS[0];
}

export function checkBadges(stats) {
  return BADGES.filter((badge) => badge.check(stats)).map((badge) => badge.id);
}

export function getFeedbackBucket(distractionCount) {
  if (distractionCount === 0) {
    return "clean";
  }

  if (distractionCount <= 3) {
    return "steady";
  }

  return "rough";
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatCompactMinutes(minutes) {
  if (minutes >= 1000) {
    return `${(minutes / 1000).toFixed(1)}k`;
  }

  return String(minutes);
}

export function formatHoursFromMinutes(minutes) {
  return `${(minutes / 60).toFixed(1)}h`;
}

export function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function getInitials(name = "") {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return "U";
  }

  return tokens.slice(0, 2).map((token) => token[0].toUpperCase()).join("");
}

export function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

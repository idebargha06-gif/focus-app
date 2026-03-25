export function toIsoDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLegacyDayString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toDateString();
}

export function normalizeDayValue(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toIsoDayKey(parsed);
}

export function normalizeDayCollection(values = []) {
  return [...new Set(values.map(normalizeDayValue).filter(Boolean))].sort();
}

export function getRelativeIsoDay(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toIsoDayKey(date);
}

export function getTodayIsoDay() {
  return toIsoDayKey(new Date());
}

export function formatSessionDateLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function getLastTwentyEightDays() {
  const days = [];

  for (let offset = 27; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    days.push({
      iso: toIsoDayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
      dayNumber: date.getDate()
    });
  }

  return days;
}

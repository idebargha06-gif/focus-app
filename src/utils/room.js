const ROOM_CODE_LENGTH = 8;
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ROOM_NAME_ADJECTIVES = [
  "Focused",
  "Quiet",
  "Steady",
  "Sharp",
  "Calm",
  "Bright",
  "Deep",
  "Swift"
];
const ROOM_NAME_NOUNS = [
  "Sprint",
  "Studio",
  "Session",
  "Lab",
  "Desk",
  "Hub",
  "Crew",
  "Pod"
];

export const URL_ROOM_ID = sanitizeRoomId(new URLSearchParams(window.location.search).get("room") || "");

export function sanitizeRoomId(value = "") {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function createRoomId() {
  let code = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function sanitizeRoomName(value = "") {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function createRoomName() {
  const adjective = ROOM_NAME_ADJECTIVES[Math.floor(Math.random() * ROOM_NAME_ADJECTIVES.length)];
  const noun = ROOM_NAME_NOUNS[Math.floor(Math.random() * ROOM_NAME_NOUNS.length)];
  return `${adjective} ${noun}`;
}

export function getRoomIdFromUrl() {
  return URL_ROOM_ID;
}

export function writeRoomIdToUrl(roomId) {
  const nextRoomId = sanitizeRoomId(roomId);
  const url = new URL(window.location.href);

  if (nextRoomId) {
    url.searchParams.set("room", nextRoomId);
  } else {
    url.searchParams.delete("room");
  }

  window.history.replaceState({ roomId: nextRoomId }, "", url);
}

export function clearRoomIdFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState({}, "", url);
}

export function getRoomInviteUrl(roomId) {
  const nextRoomId = sanitizeRoomId(roomId);
  const url = new URL(window.location.href);
  url.search = "";
  if (nextRoomId) {
    url.searchParams.set("room", nextRoomId);
  }
  return url.toString();
}

export function isValidRoomCode(value = "") {
  return /^[A-Z0-9]{8}$/i.test(value.trim());
}

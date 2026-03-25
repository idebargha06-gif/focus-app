export function sanitizeRoomId(value = "") {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function createRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getRoomIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return sanitizeRoomId(params.get("room") || "");
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

export function getRoomInviteUrl(roomId) {
  const nextRoomId = sanitizeRoomId(roomId);
  const url = new URL(window.location.href);
  url.search = "";
  if (nextRoomId) {
    url.searchParams.set("room", nextRoomId);
  }
  return url.toString();
}

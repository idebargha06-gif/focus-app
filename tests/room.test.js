import { describe, expect, it } from "vitest";
import { createRoomId, sanitizeRoomId } from "../src/utils/room.js";

describe("room helpers", () => {
  it("sanitizes arbitrary room input into 8-char alphanumeric codes", () => {
    expect(sanitizeRoomId("ab 12-cd!98")).toBe("AB12CD98");
  });

  it("limits room ids to eight characters", () => {
    expect(sanitizeRoomId("abcdefghijklmnop")).toBe("ABCDEFGH");
  });

  it("creates 8-character room codes", () => {
    const roomId = createRoomId();
    expect(roomId).toMatch(/^[A-Z0-9]{8}$/);
  });
});

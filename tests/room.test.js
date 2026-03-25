import { describe, expect, it } from "vitest";
import { sanitizeRoomId } from "../src/utils/room.js";

describe("room helpers", () => {
  it("sanitizes arbitrary room input into shareable codes", () => {
    expect(sanitizeRoomId("ab 12-cd!")).toBe("AB12CD");
  });

  it("limits room ids to twelve characters", () => {
    expect(sanitizeRoomId("abcdefghijklmnop")).toBe("ABCDEFGHIJKL");
  });
});

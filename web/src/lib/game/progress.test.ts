import { describe, expect, it } from "vitest";
import {
  isLevelUnlocked,
  type ProgressState,
} from "./progress";

describe("progress helpers", () => {
  it("unlocks next level after completing prior", () => {
    const afterLevel1: ProgressState = { maxUnlockedLevel: 2 };
    expect(isLevelUnlocked(1, afterLevel1)).toBe(true);
    expect(isLevelUnlocked(2, afterLevel1)).toBe(true);
    expect(isLevelUnlocked(3, afterLevel1)).toBe(false);
  });

  it("initial progress only opens level 1", () => {
    const initial: ProgressState = { maxUnlockedLevel: 1 };
    expect(isLevelUnlocked(1, initial)).toBe(true);
    expect(isLevelUnlocked(2, initial)).toBe(false);
  });
});

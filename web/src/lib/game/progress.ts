const STORAGE_KEY = "pbb.progress.v1";

export type ProgressState = {
  maxUnlockedLevel: number;
};

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") {
    return { maxUnlockedLevel: 1 };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { maxUnlockedLevel: 1 };
    }
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const maxUnlockedLevel = Math.max(
      1,
      Math.floor(Number(parsed.maxUnlockedLevel) || 1),
    );
    return { maxUnlockedLevel };
  } catch {
    return { maxUnlockedLevel: 1 };
  }
}

export function saveProgress(state: ProgressState): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Call when level `levelId` is completed; unlocks `levelId + 1`. */
export function completeLevel(levelId: number): ProgressState {
  const prev = loadProgress();
  const nextMax = Math.max(prev.maxUnlockedLevel, levelId + 1);
  const next: ProgressState = { maxUnlockedLevel: nextMax };
  saveProgress(next);
  return next;
}

export function isLevelUnlocked(levelId: number, progress: ProgressState): boolean {
  return levelId <= progress.maxUnlockedLevel;
}

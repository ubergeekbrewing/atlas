import type { TrackerSnapshot } from "./types";
import { defaultProfile } from "./types";

const STORAGE_KEY = "atlas-tracker-v1";

export function loadSnapshot(): TrackerSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (!o.profile || typeof o.profile !== "object") return null;
    return {
      profile: { ...defaultProfile, ...(o.profile as object) } as TrackerSnapshot["profile"],
      meals: Array.isArray(o.meals) ? (o.meals as TrackerSnapshot["meals"]) : [],
      workouts: Array.isArray(o.workouts) ? (o.workouts as TrackerSnapshot["workouts"]) : [],
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(data: TrackerSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

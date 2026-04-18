"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadSnapshot, saveSnapshot } from "@/lib/persist";
import type { MealEntry, Profile, WorkoutEntry } from "@/lib/types";
import { defaultProfile } from "@/lib/types";

type TrackerContextValue = {
  hydrated: boolean;
  profile: Profile;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  setProfile: (p: Profile) => void;
  addMeal: (m: Omit<MealEntry, "id">) => void;
  removeMeal: (id: string) => void;
  addWorkout: (w: Omit<WorkoutEntry, "id">) => void;
  removeWorkout: (id: string) => void;
  importSnapshot: (json: string) => boolean;
  exportSnapshot: () => string;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfileState] = useState<Profile>(defaultProfile);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      const snap = loadSnapshot();
      if (snap) {
        setProfileState({ ...defaultProfile, ...snap.profile });
        setMeals(snap.meals);
        setWorkouts(snap.workouts);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSnapshot({ profile, meals, workouts });
  }, [hydrated, profile, meals, workouts]);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
  }, []);

  const addMeal = useCallback((m: Omit<MealEntry, "id">) => {
    setMeals((prev) => [{ ...m, id: newId() }, ...prev]);
  }, []);

  const removeMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addWorkout = useCallback((w: Omit<WorkoutEntry, "id">) => {
    setWorkouts((prev) => [{ ...w, id: newId() }, ...prev]);
  }, []);

  const removeWorkout = useCallback((id: string) => {
    setWorkouts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const exportSnapshot = useCallback(() => {
    return JSON.stringify({ profile, meals, workouts }, null, 2);
  }, [profile, meals, workouts]);

  const importSnapshot = useCallback((json: string) => {
    try {
      const o = JSON.parse(json) as Record<string, unknown>;
      if (!o.profile || typeof o.profile !== "object") return false;
      setProfileState({ ...defaultProfile, ...(o.profile as object) } as Profile);
      setMeals(Array.isArray(o.meals) ? (o.meals as MealEntry[]) : []);
      setWorkouts(Array.isArray(o.workouts) ? (o.workouts as WorkoutEntry[]) : []);
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<TrackerContextValue>(
    () => ({
      hydrated,
      profile,
      meals,
      workouts,
      setProfile,
      addMeal,
      removeMeal,
      addWorkout,
      removeWorkout,
      importSnapshot,
      exportSnapshot,
    }),
    [
      hydrated,
      profile,
      meals,
      workouts,
      setProfile,
      addMeal,
      removeMeal,
      addWorkout,
      removeWorkout,
      importSnapshot,
      exportSnapshot,
    ],
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used within TrackerProvider");
  return ctx;
}

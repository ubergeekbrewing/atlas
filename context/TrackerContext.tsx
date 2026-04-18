"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AuthScreen from "@/components/AuthScreen";
import { loadSnapshot, saveSnapshot } from "@/lib/persist";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  deleteLabAbnormalRemote,
  deleteMealRemote,
  deleteWorkoutRemote,
  fetchUserTracker,
  insertLabAbnormalRemote,
  insertMealRemote,
  insertWorkoutRemote,
  migrateLocalToRemote,
  replaceRemoteWithSnapshot,
  shouldMigrateLocal,
  upsertProfileRemote,
} from "@/lib/supabase/remote";
import type { LabAbnormalEntry, MealEntry, Profile, WorkoutEntry } from "@/lib/types";
import { defaultProfile } from "@/lib/types";

type TrackerContextValue = {
  hydrated: boolean;
  cloudSync: boolean;
  userEmail: string | null;
  syncError: string | null;
  clearSyncError: () => void;
  profile: Profile;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  labAbnormals: LabAbnormalEntry[];
  setProfile: (p: Profile) => Promise<void>;
  addMeal: (m: Omit<MealEntry, "id">) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  addWorkout: (w: Omit<WorkoutEntry, "id">) => Promise<void>;
  removeWorkout: (id: string) => Promise<void>;
  addLabAbnormal: (r: Omit<LabAbnormalEntry, "id">) => Promise<void>;
  removeLabAbnormal: (id: string) => Promise<void>;
  importSnapshot: (json: string) => Promise<boolean>;
  exportSnapshot: () => string;
  signOut: () => Promise<void>;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TrackerProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const cloud = Boolean(isSupabaseConfigured() && supabase);

  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(!cloud);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [profile, setProfileState] = useState<Profile>(defaultProfile);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [labAbnormals, setLabAbnormals] = useState<LabAbnormalEntry[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (cloud) return;
    queueMicrotask(() => {
      const snap = loadSnapshot();
      if (snap) {
        setProfileState({ ...defaultProfile, ...snap.profile });
        setMeals(snap.meals);
        setWorkouts(snap.workouts);
        setLabAbnormals(snap.labAbnormals ?? []);
      }
      setHydrated(true);
    });
  }, [cloud]);

  useEffect(() => {
    if (!cloud || !supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      setUserId(s?.user.id ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUserId(s?.user.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [cloud, supabase]);

  useEffect(() => {
    if (!cloud || !supabase || !authReady) return;
    if (!userId) {
      queueMicrotask(() => {
        setProfileState(defaultProfile);
        setMeals([]);
        setWorkouts([]);
        setLabAbnormals([]);
        setHydrated(true);
        setCloudLoading(false);
        setSyncError(null);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setCloudLoading(true);
      setHydrated(false);
    });

    (async () => {
      try {
        setSyncError(null);
        let { profile: p, meals: m, workouts: w, labAbnormals: labs } = await fetchUserTracker(supabase, userId);
        const snap = loadSnapshot();
        if (shouldMigrateLocal(snap, m.length, w.length, labs.length) && snap) {
          const merged = await migrateLocalToRemote(supabase, userId, snap);
          p = merged.profile;
          m = merged.meals;
          w = merged.workouts;
          labs = merged.labAbnormals;
        }
        if (cancelled) return;
        setProfileState(p);
        setMeals(m);
        setWorkouts(w);
        setLabAbnormals(labs);
        saveSnapshot({ profile: p, meals: m, workouts: w, labAbnormals: labs });
      } catch (e) {
        if (!cancelled) {
          setSyncError(e instanceof Error ? e.message : "Could not load your data from the cloud.");
          setProfileState(defaultProfile);
          setMeals([]);
          setWorkouts([]);
          setLabAbnormals([]);
        }
      } finally {
        if (!cancelled) {
          setCloudLoading(false);
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cloud, supabase, authReady, userId]);

  useEffect(() => {
    if (!hydrated) return;
    if (cloud && !session) return;
    saveSnapshot({ profile, meals, workouts, labAbnormals });
  }, [hydrated, cloud, session, profile, meals, workouts, labAbnormals]);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  const setProfile = useCallback(
    async (p: Profile) => {
      if (cloud && supabase && userId) {
        try {
          setSyncError(null);
          await upsertProfileRemote(supabase, userId, p);
          setProfileState(p);
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : "Could not save profile.");
        }
      } else {
        setProfileState(p);
      }
    },
    [cloud, supabase, userId],
  );

  const addMeal = useCallback(
    async (m: Omit<MealEntry, "id">) => {
      if (cloud && supabase && userId) {
        try {
          setSyncError(null);
          const inserted = await insertMealRemote(supabase, userId, m);
          setMeals((prev) => [inserted, ...prev]);
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : "Could not save meal.");
        }
      } else {
        setMeals((prev) => [{ ...m, id: newId() }, ...prev]);
      }
    },
    [cloud, supabase, userId],
  );

  const removeMeal = useCallback(
    async (id: string) => {
      if (cloud && supabase && userId) {
        try {
          setSyncError(null);
          await deleteMealRemote(supabase, userId, id);
          setMeals((prev) => prev.filter((x) => x.id !== id));
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : "Could not delete meal.");
        }
      } else {
        setMeals((prev) => prev.filter((x) => x.id !== id));
      }
    },
    [cloud, supabase, userId],
  );

  const addWorkout = useCallback(
    async (w: Omit<WorkoutEntry, "id">) => {
      if (cloud && supabase && userId) {
        try {
          setSyncError(null);
          const inserted = await insertWorkoutRemote(supabase, userId, w);
          setWorkouts((prev) => [inserted, ...prev]);
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : "Could not save workout.");
        }
      } else {
        setWorkouts((prev) => [{ ...w, id: newId() }, ...prev]);
      }
    },
    [cloud, supabase, userId],
  );

  const removeWorkout = useCallback(
    async (id: string) => {
      if (cloud && supabase && userId) {
        try {
          setSyncError(null);
          await deleteWorkoutRemote(supabase, userId, id);
          setWorkouts((prev) => prev.filter((x) => x.id !== id));
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : "Could not delete workout.");
        }
      } else {
        setWorkouts((prev) => prev.filter((x) => x.id !== id));
      }
    },
    [cloud, supabase, userId],
  );

  const exportSnapshot = useCallback(() => {
    return JSON.stringify({ profile, meals, workouts, labAbnormals }, null, 2);
  }, [profile, meals, workouts, labAbnormals]);

  const importSnapshot = useCallback(
    async (json: string) => {
      try {
        const o = JSON.parse(json) as Record<string, unknown>;
        if (!o.profile || typeof o.profile !== "object") return false;
        const snap = {
          profile: { ...defaultProfile, ...(o.profile as object) } as Profile,
          meals: Array.isArray(o.meals) ? (o.meals as MealEntry[]) : [],
          workouts: Array.isArray(o.workouts) ? (o.workouts as WorkoutEntry[]) : [],
          labAbnormals: Array.isArray(o.labAbnormals) ? (o.labAbnormals as LabAbnormalEntry[]) : [],
        };
        if (cloud && supabase && userId) {
          setSyncError(null);
          const next = await replaceRemoteWithSnapshot(supabase, userId, snap);
          setProfileState(next.profile);
          setMeals(next.meals);
          setWorkouts(next.workouts);
          setLabAbnormals(next.labAbnormals);
          saveSnapshot(next);
        } else {
          setProfileState(snap.profile);
          setMeals(snap.meals);
          setWorkouts(snap.workouts);
          setLabAbnormals(snap.labAbnormals);
        }
        return true;
      } catch {
        return false;
      }
    },
    [cloud, supabase, userId],
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setProfileState(defaultProfile);
    setMeals([]);
    setWorkouts([]);
    setLabAbnormals([]);
    setSyncError(null);
  }, [supabase]);

  const addLabAbnormal = useCallback(
    async (r: Omit<LabAbnormalEntry, "id">) => {
      if (cloud && supabase && userId) {
        try {
          setSyncError(null);
          const inserted = await insertLabAbnormalRemote(supabase, userId, r);
          setLabAbnormals((prev) => [inserted, ...prev]);
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : "Could not save lab result.");
        }
      } else {
        setLabAbnormals((prev) => [{ ...r, id: newId() }, ...prev]);
      }
    },
    [cloud, supabase, userId],
  );

  const removeLabAbnormal = useCallback(
    async (id: string) => {
      if (cloud && supabase && userId) {
        try {
          setSyncError(null);
          await deleteLabAbnormalRemote(supabase, userId, id);
          setLabAbnormals((prev) => prev.filter((x) => x.id !== id));
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : "Could not delete lab result.");
        }
      } else {
        setLabAbnormals((prev) => prev.filter((x) => x.id !== id));
      }
    },
    [cloud, supabase, userId],
  );

  const value = useMemo<TrackerContextValue>(
    () => ({
      hydrated,
      cloudSync: Boolean(cloud && session),
      userEmail: session?.user.email ?? null,
      syncError,
      clearSyncError,
      profile,
      meals,
      workouts,
      labAbnormals,
      setProfile,
      addMeal,
      removeMeal,
      addWorkout,
      removeWorkout,
      addLabAbnormal,
      removeLabAbnormal,
      importSnapshot,
      exportSnapshot,
      signOut,
    }),
    [
      hydrated,
      cloud,
      session,
      syncError,
      clearSyncError,
      profile,
      meals,
      workouts,
      labAbnormals,
      setProfile,
      addMeal,
      removeMeal,
      addWorkout,
      removeWorkout,
      addLabAbnormal,
      removeLabAbnormal,
      importSnapshot,
      exportSnapshot,
      signOut,
    ],
  );

  const showLocalSplash = !cloud && !hydrated;
  const showAuthBoot = cloud && !authReady;
  const showAuthScreen = Boolean(cloud && authReady && !session && supabase);
  const showCloudSplash = Boolean(cloud && authReady && session && (!hydrated || cloudLoading));
  const showApp =
    (cloud && authReady && session && hydrated && !cloudLoading) || (!cloud && hydrated);

  return (
    <TrackerContext.Provider value={value}>
      {showLocalSplash ? (
        <div className="flex min-h-[100dvh] flex-1 items-center justify-center px-4 text-zinc-500">
          Loading your log…
        </div>
      ) : null}
      {showAuthBoot ? (
        <div className="flex min-h-[100dvh] flex-1 items-center justify-center px-4 text-zinc-500">
          Starting…
        </div>
      ) : null}
      {showAuthScreen && supabase ? <AuthScreen supabase={supabase} /> : null}
      {showCloudSplash ? (
        <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center gap-2 px-4 text-zinc-500">
          <p>Syncing your log…</p>
        </div>
      ) : null}
      {showApp ? children : null}
    </TrackerContext.Provider>
  );
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used within TrackerProvider");
  return ctx;
}

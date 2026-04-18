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
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  deleteLabAbnormalRemote,
  deleteMealRemote,
  deleteWorkoutRemote,
  fetchUserTracker,
  insertLabAbnormalRemote,
  insertMealRemote,
  insertWorkoutRemote,
  replaceRemoteWithSnapshot,
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
  /** True when Supabase auth or the initial data load failed — blocking screen, no offline copy. */
  const [remoteDisabled, setRemoteDisabled] = useState(false);

  useEffect(() => {
    if (!cloud || !supabase) return;
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUserId(s?.user.id ?? null);
    });

    (async () => {
      const { data: got } = await supabase.auth.getSession();
      if (cancelled) return;
      const existing = got.session;
      if (existing?.user) {
        setSession(existing);
        setUserId(existing.user.id);
        setAuthReady(true);
        return;
      }
      const { data: anon, error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (error || !anon.session?.user) {
        setRemoteDisabled(true);
        queueMicrotask(() => {
          setProfileState(defaultProfile);
          setMeals([]);
          setWorkouts([]);
          setLabAbnormals([]);
          setHydrated(true);
        });
        setAuthReady(true);
        return;
      }
      setSession(anon.session);
      setUserId(anon.session.user.id);
      setAuthReady(true);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [cloud, supabase]);

  useEffect(() => {
    if (!cloud || !supabase || !authReady) return;
    if (remoteDisabled) return;
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
        const { profile: p, meals: m, workouts: w, labAbnormals: labs } = await fetchUserTracker(supabase, userId);
        if (cancelled) return;
        setRemoteDisabled(false);
        setProfileState(p);
        setMeals(m);
        setWorkouts(w);
        setLabAbnormals(labs);
      } catch {
        if (!cancelled) {
          setRemoteDisabled(true);
          queueMicrotask(() => {
            setProfileState(defaultProfile);
            setMeals([]);
            setWorkouts([]);
            setLabAbnormals([]);
          });
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
  }, [cloud, supabase, authReady, userId, remoteDisabled]);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  const setProfile = useCallback(
    async (p: Profile) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return;
      try {
        setSyncError(null);
        await upsertProfileRemote(supabase, userId, p);
        setProfileState(p);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Could not save profile.");
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const addMeal = useCallback(
    async (m: Omit<MealEntry, "id">) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return;
      try {
        setSyncError(null);
        const inserted = await insertMealRemote(supabase, userId, m);
        setMeals((prev) => [inserted, ...prev]);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Could not save meal.");
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const removeMeal = useCallback(
    async (id: string) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return;
      try {
        setSyncError(null);
        await deleteMealRemote(supabase, userId, id);
        setMeals((prev) => prev.filter((x) => x.id !== id));
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Could not delete meal.");
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const addWorkout = useCallback(
    async (w: Omit<WorkoutEntry, "id">) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return;
      try {
        setSyncError(null);
        const inserted = await insertWorkoutRemote(supabase, userId, w);
        setWorkouts((prev) => [inserted, ...prev]);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Could not save workout.");
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const removeWorkout = useCallback(
    async (id: string) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return;
      try {
        setSyncError(null);
        await deleteWorkoutRemote(supabase, userId, id);
        setWorkouts((prev) => prev.filter((x) => x.id !== id));
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Could not delete workout.");
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const exportSnapshot = useCallback(() => {
    return JSON.stringify({ profile, meals, workouts, labAbnormals }, null, 2);
  }, [profile, meals, workouts, labAbnormals]);

  const importSnapshot = useCallback(
    async (json: string) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return false;
      try {
        const o = JSON.parse(json) as Record<string, unknown>;
        if (!o.profile || typeof o.profile !== "object") return false;
        const snap = {
          profile: { ...defaultProfile, ...(o.profile as object) } as Profile,
          meals: Array.isArray(o.meals) ? (o.meals as MealEntry[]) : [],
          workouts: Array.isArray(o.workouts) ? (o.workouts as WorkoutEntry[]) : [],
          labAbnormals: Array.isArray(o.labAbnormals) ? (o.labAbnormals as LabAbnormalEntry[]) : [],
        };
        setSyncError(null);
        const next = await replaceRemoteWithSnapshot(supabase, userId, snap);
        setProfileState(next.profile);
        setMeals(next.meals);
        setWorkouts(next.workouts);
        setLabAbnormals(next.labAbnormals);
        return true;
      } catch {
        return false;
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
      if (cloud) {
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (error || !anon.session?.user) {
          setRemoteDisabled(true);
          setSession(null);
          setUserId(null);
        } else {
          setRemoteDisabled(false);
          setSyncError(null);
          setSession(anon.session);
          setUserId(anon.session.user.id);
        }
      }
    }
    setProfileState(defaultProfile);
    setMeals([]);
    setWorkouts([]);
    setLabAbnormals([]);
  }, [supabase, cloud]);

  const addLabAbnormal = useCallback(
    async (r: Omit<LabAbnormalEntry, "id">) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return;
      try {
        setSyncError(null);
        const inserted = await insertLabAbnormalRemote(supabase, userId, r);
        setLabAbnormals((prev) => [inserted, ...prev]);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Could not save lab result.");
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const removeLabAbnormal = useCallback(
    async (id: string) => {
      if (!(cloud && supabase && userId && !remoteDisabled)) return;
      try {
        setSyncError(null);
        await deleteLabAbnormalRemote(supabase, userId, id);
        setLabAbnormals((prev) => prev.filter((x) => x.id !== id));
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Could not delete lab result.");
      }
    },
    [cloud, supabase, userId, remoteDisabled],
  );

  const value = useMemo<TrackerContextValue>(
    () => ({
      hydrated,
      cloudSync: Boolean(cloud && session && userId && !remoteDisabled),
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
      userId,
      remoteDisabled,
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

  const showAuthBoot = cloud && !authReady;
  const showCloudSplash = Boolean(cloud && authReady && session && (!hydrated || cloudLoading));
  const showApp = Boolean(cloud && authReady && session && hydrated && !cloudLoading && !remoteDisabled);

  if (!cloud) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-teal-500">ATLAS</p>
        <h1 className="text-lg font-semibold text-zinc-100">Supabase is required</h1>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          Set <span className="font-mono text-zinc-300">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="font-mono text-zinc-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> in{" "}
          <span className="font-mono text-zinc-300">.env.local</span> (local) or your host environment. All tracker
          data is read and written in your Supabase project only.
        </p>
      </div>
    );
  }

  if (cloud && authReady && remoteDisabled && hydrated) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-teal-500">ATLAS</p>
        <h1 className="text-lg font-semibold text-zinc-100">Could not connect to your database</h1>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          Sign-in may be blocked (enable Anonymous under Authentication → Providers) or the first load failed (run
          SQL migrations, check RLS, and confirm this app uses the same Supabase project as your dashboard).
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <TrackerContext.Provider value={value}>
      {showAuthBoot ? (
        <div className="flex min-h-[100dvh] flex-1 items-center justify-center px-4 text-zinc-500">
          Starting…
        </div>
      ) : null}
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

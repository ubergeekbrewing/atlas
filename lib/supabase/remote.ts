import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityLevel,
  MealEntry,
  MealType,
  Profile,
  TrackerSnapshot,
  WorkoutEntry,
  WorkoutIntensity,
} from "@/lib/types";
import { defaultProfile } from "@/lib/types";

type ProfileRow = {
  id: string;
  display_name: string;
  daily_calorie_goal: number;
  protein_goal_g: number;
  carb_goal_g: number;
  fat_goal_g: number;
  weight_kg: number | null;
  height_cm: number | null;
  weekly_workout_goal: number;
  activity_level: string;
};

type MealRow = {
  id: string;
  user_id: string;
  entry_date: string;
  meal_type: string;
  name: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

type WorkoutRow = {
  id: string;
  user_id: string;
  entry_date: string;
  title: string;
  duration_min: number;
  intensity: string;
  notes: string;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    displayName: row.display_name ?? "",
    dailyCalorieGoal: row.daily_calorie_goal ?? defaultProfile.dailyCalorieGoal,
    proteinGoalG: row.protein_goal_g ?? defaultProfile.proteinGoalG,
    carbGoalG: row.carb_goal_g ?? defaultProfile.carbGoalG,
    fatGoalG: row.fat_goal_g ?? defaultProfile.fatGoalG,
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    heightCm: row.height_cm == null ? null : row.height_cm,
    weeklyWorkoutGoal: row.weekly_workout_goal ?? defaultProfile.weeklyWorkoutGoal,
    activityLevel: (row.activity_level as ActivityLevel) || defaultProfile.activityLevel,
  };
}

function profileToRow(p: Profile): Omit<ProfileRow, "id"> {
  return {
    display_name: p.displayName,
    daily_calorie_goal: p.dailyCalorieGoal,
    protein_goal_g: p.proteinGoalG,
    carb_goal_g: p.carbGoalG,
    fat_goal_g: p.fatGoalG,
    weight_kg: p.weightKg,
    height_cm: p.heightCm,
    weekly_workout_goal: p.weeklyWorkoutGoal,
    activity_level: p.activityLevel,
  };
}

export function mapMealRow(row: MealRow): MealEntry {
  return {
    id: row.id,
    date: row.entry_date.slice(0, 10),
    mealType: row.meal_type as MealType,
    name: row.name,
    calories: row.calories,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
  };
}

export function mapWorkoutRow(row: WorkoutRow): WorkoutEntry {
  return {
    id: row.id,
    date: row.entry_date.slice(0, 10),
    title: row.title,
    durationMin: row.duration_min,
    intensity: row.intensity as WorkoutIntensity,
    notes: row.notes ?? "",
  };
}

export async function fetchUserTracker(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: Profile; meals: MealEntry[]; workouts: WorkoutEntry[] }> {
  const [profileRes, mealsRes, workoutsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("meals").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
    supabase.from("workouts").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (mealsRes.error) throw mealsRes.error;
  if (workoutsRes.error) throw workoutsRes.error;

  const profile = profileRes.data
    ? mapProfileRow(profileRes.data as ProfileRow)
    : { ...defaultProfile };

  const meals = (mealsRes.data as MealRow[] | null)?.map(mapMealRow) ?? [];
  const workouts = (workoutsRes.data as WorkoutRow[] | null)?.map(mapWorkoutRow) ?? [];

  return { profile, meals, workouts };
}

export async function upsertProfileRemote(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
): Promise<void> {
  const row = { id: userId, ...profileToRow(profile), updated_at: new Date().toISOString() };
  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function insertMealRemote(
  supabase: SupabaseClient,
  userId: string,
  meal: Omit<MealEntry, "id"> & { id?: string },
): Promise<MealEntry> {
  const row: Record<string, unknown> = {
    user_id: userId,
    entry_date: meal.date,
    meal_type: meal.mealType,
    name: meal.name,
    calories: meal.calories,
    protein_g: meal.proteinG,
    carb_g: meal.carbG,
    fat_g: meal.fatG,
  };
  if (meal.id && isUuid(meal.id)) row.id = meal.id;
  const { data, error } = await supabase.from("meals").insert(row).select("*").single();
  if (error) throw error;
  return mapMealRow(data as MealRow);
}

export async function deleteMealRemote(supabase: SupabaseClient, userId: string, mealId: string): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", mealId).eq("user_id", userId);
  if (error) throw error;
}

export async function insertWorkoutRemote(
  supabase: SupabaseClient,
  userId: string,
  w: Omit<WorkoutEntry, "id"> & { id?: string },
): Promise<WorkoutEntry> {
  const row: Record<string, unknown> = {
    user_id: userId,
    entry_date: w.date,
    title: w.title,
    duration_min: w.durationMin,
    intensity: w.intensity,
    notes: w.notes ?? "",
  };
  if (w.id && isUuid(w.id)) row.id = w.id;
  const { data, error } = await supabase.from("workouts").insert(row).select("*").single();
  if (error) throw error;
  return mapWorkoutRow(data as WorkoutRow);
}

export async function deleteWorkoutRemote(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
): Promise<void> {
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId).eq("user_id", userId);
  if (error) throw error;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export async function migrateLocalToRemote(
  supabase: SupabaseClient,
  userId: string,
  snap: TrackerSnapshot,
): Promise<{ profile: Profile; meals: MealEntry[]; workouts: WorkoutEntry[] }> {
  await upsertProfileRemote(supabase, userId, snap.profile);

  if (snap.meals.length) {
    const mealRows = snap.meals.map((m) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        entry_date: m.date,
        meal_type: m.mealType,
        name: m.name,
        calories: m.calories,
        protein_g: m.proteinG,
        carb_g: m.carbG,
        fat_g: m.fatG,
      };
      if (isUuid(m.id)) row.id = m.id;
      return row;
    });
    const { error } = await supabase.from("meals").insert(mealRows);
    if (error) throw error;
  }

  if (snap.workouts.length) {
    const workoutRows = snap.workouts.map((w) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        entry_date: w.date,
        title: w.title,
        duration_min: w.durationMin,
        intensity: w.intensity,
        notes: w.notes ?? "",
      };
      if (isUuid(w.id)) row.id = w.id;
      return row;
    });
    const { error } = await supabase.from("workouts").insert(workoutRows);
    if (error) throw error;
  }

  return fetchUserTracker(supabase, userId);
}

function profileDiffersFromDefaults(p: Profile): boolean {
  return (
    Boolean(p.displayName?.trim()) ||
    p.dailyCalorieGoal !== defaultProfile.dailyCalorieGoal ||
    p.proteinGoalG !== defaultProfile.proteinGoalG ||
    p.carbGoalG !== defaultProfile.carbGoalG ||
    p.fatGoalG !== defaultProfile.fatGoalG ||
    p.weeklyWorkoutGoal !== defaultProfile.weeklyWorkoutGoal ||
    p.activityLevel !== defaultProfile.activityLevel ||
    p.weightKg != null ||
    p.heightCm != null
  );
}

export function shouldMigrateLocal(snap: TrackerSnapshot | null, remoteMeals: number, remoteWorkouts: number): boolean {
  if (!snap) return false;
  if (remoteMeals > 0 || remoteWorkouts > 0) return false;
  return snap.meals.length > 0 || snap.workouts.length > 0 || profileDiffersFromDefaults(snap.profile);
}

export async function replaceRemoteWithSnapshot(
  supabase: SupabaseClient,
  userId: string,
  snap: TrackerSnapshot,
): Promise<{ profile: Profile; meals: MealEntry[]; workouts: WorkoutEntry[] }> {
  const { error: delM } = await supabase.from("meals").delete().eq("user_id", userId);
  if (delM) throw delM;
  const { error: delW } = await supabase.from("workouts").delete().eq("user_id", userId);
  if (delW) throw delW;

  await upsertProfileRemote(supabase, userId, snap.profile);

  if (snap.meals.length) {
    const mealRows = snap.meals.map((m) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        entry_date: m.date,
        meal_type: m.mealType,
        name: m.name,
        calories: m.calories,
        protein_g: m.proteinG,
        carb_g: m.carbG,
        fat_g: m.fatG,
      };
      if (isUuid(m.id)) row.id = m.id;
      return row;
    });
    const { error } = await supabase.from("meals").insert(mealRows);
    if (error) throw error;
  }

  if (snap.workouts.length) {
    const workoutRows = snap.workouts.map((w) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        entry_date: w.date,
        title: w.title,
        duration_min: w.durationMin,
        intensity: w.intensity,
        notes: w.notes ?? "",
      };
      if (isUuid(w.id)) row.id = w.id;
      return row;
    });
    const { error } = await supabase.from("workouts").insert(workoutRows);
    if (error) throw error;
  }

  return fetchUserTracker(supabase, userId);
}

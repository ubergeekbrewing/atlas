import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityLevel,
  IngredientEntry,
  LabAbnormalEntry,
  LabResultFlag,
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

type LabAbnormalRow = {
  id: string;
  user_id: string;
  draw_date: string;
  test_name: string;
  value: string;
  flag: string;
  notes: string;
};

type IngredientRow = {
  id: string;
  user_id: string;
  name: string;
  calories: string | number;
  protein_g: string | number;
  carb_g: string | number;
  fat_g: string | number;
  serving_size: string | number | null;
  units: string;
  where_to_find: string;
  cost: string | number | null;
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

export function mapLabAbnormalRow(row: LabAbnormalRow): LabAbnormalEntry {
  const f = (row.flag ?? "") as LabResultFlag;
  return {
    id: row.id,
    drawDate: row.draw_date.slice(0, 10),
    testName: row.test_name,
    value: row.value,
    flag: f === "H" || f === "L" || f === "P" ? f : "",
    notes: row.notes ?? "",
  };
}

function numFromDb(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function optionalNumFromDb(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapIngredientRow(row: IngredientRow): IngredientEntry {
  const c = row.cost;
  let cost: number | null = null;
  if (c != null && c !== "") {
    const n = typeof c === "number" ? c : Number(c);
    cost = Number.isFinite(n) ? n : null;
  }
  return {
    id: row.id,
    name: row.name ?? "",
    calories: numFromDb(row.calories),
    proteinG: numFromDb(row.protein_g),
    carbG: numFromDb(row.carb_g),
    fatG: numFromDb(row.fat_g),
    servingSize: optionalNumFromDb(row.serving_size),
    units: row.units ?? "",
    whereToFind: row.where_to_find ?? "",
    cost,
  };
}

export async function fetchUserTracker(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  profile: Profile;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  labAbnormals: LabAbnormalEntry[];
  ingredients: IngredientEntry[];
}> {
  const [profileRes, mealsRes, workoutsRes, labsRes, ingRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("meals").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
    supabase.from("workouts").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
    supabase.from("lab_abnormals").select("*").eq("user_id", userId).order("draw_date", { ascending: false }),
    supabase.from("ingredients").select("*").eq("user_id", userId).order("name", { ascending: true }),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (mealsRes.error) throw mealsRes.error;
  if (workoutsRes.error) throw workoutsRes.error;
  if (labsRes.error) throw labsRes.error;
  if (ingRes.error) throw ingRes.error;

  const profile = profileRes.data
    ? mapProfileRow(profileRes.data as ProfileRow)
    : { ...defaultProfile };

  const meals = (mealsRes.data as MealRow[] | null)?.map(mapMealRow) ?? [];
  const workouts = (workoutsRes.data as WorkoutRow[] | null)?.map(mapWorkoutRow) ?? [];
  const labAbnormals = (labsRes.data as LabAbnormalRow[] | null)?.map(mapLabAbnormalRow) ?? [];
  const ingredients = (ingRes.data as IngredientRow[] | null)?.map(mapIngredientRow) ?? [];

  return { profile, meals, workouts, labAbnormals, ingredients };
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

export async function insertLabAbnormalRemote(
  supabase: SupabaseClient,
  userId: string,
  row: Omit<LabAbnormalEntry, "id"> & { id?: string },
): Promise<LabAbnormalEntry> {
  const insert: Record<string, unknown> = {
    user_id: userId,
    draw_date: row.drawDate,
    test_name: row.testName,
    value: row.value,
    flag: row.flag,
    notes: row.notes ?? "",
  };
  if (row.id && isUuid(row.id)) insert.id = row.id;
  const { data, error } = await supabase.from("lab_abnormals").insert(insert).select("*").single();
  if (error) throw error;
  return mapLabAbnormalRow(data as LabAbnormalRow);
}

export async function deleteLabAbnormalRemote(
  supabase: SupabaseClient,
  userId: string,
  labId: string,
): Promise<void> {
  const { error } = await supabase.from("lab_abnormals").delete().eq("id", labId).eq("user_id", userId);
  if (error) throw error;
}

export async function insertIngredientRemote(
  supabase: SupabaseClient,
  userId: string,
  row: Omit<IngredientEntry, "id"> & { id?: string },
): Promise<IngredientEntry> {
  const insert: Record<string, unknown> = {
    user_id: userId,
    name: row.name.trim(),
    calories: row.calories,
    protein_g: row.proteinG,
    carb_g: row.carbG,
    fat_g: row.fatG,
    serving_size: row.servingSize,
    units: row.units.trim(),
    where_to_find: row.whereToFind.trim(),
    cost: row.cost,
  };
  if (row.id && isUuid(row.id)) insert.id = row.id;
  const { data, error } = await supabase.from("ingredients").insert(insert).select("*").single();
  if (error) throw error;
  return mapIngredientRow(data as IngredientRow);
}

export async function deleteIngredientRemote(
  supabase: SupabaseClient,
  userId: string,
  ingredientId: string,
): Promise<void> {
  const { error } = await supabase.from("ingredients").delete().eq("id", ingredientId).eq("user_id", userId);
  if (error) throw error;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export async function replaceRemoteWithSnapshot(
  supabase: SupabaseClient,
  userId: string,
  snap: TrackerSnapshot,
): Promise<{
  profile: Profile;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  labAbnormals: LabAbnormalEntry[];
  ingredients: IngredientEntry[];
}> {
  const { error: delM } = await supabase.from("meals").delete().eq("user_id", userId);
  if (delM) throw delM;
  const { error: delW } = await supabase.from("workouts").delete().eq("user_id", userId);
  if (delW) throw delW;
  const { error: delL } = await supabase.from("lab_abnormals").delete().eq("user_id", userId);
  if (delL) throw delL;
  const { error: delI } = await supabase.from("ingredients").delete().eq("user_id", userId);
  if (delI) throw delI;

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

  const labsR = snap.labAbnormals ?? [];
  if (labsR.length) {
    const labRows = labsR.map((r) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        draw_date: r.drawDate,
        test_name: r.testName,
        value: r.value,
        flag: r.flag,
        notes: r.notes ?? "",
      };
      if (isUuid(r.id)) row.id = r.id;
      return row;
    });
    const { error } = await supabase.from("lab_abnormals").insert(labRows);
    if (error) throw error;
  }

  const ingR = snap.ingredients ?? [];
  if (ingR.length) {
    const ingRows = ingR.map((r) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        name: r.name,
        calories: r.calories,
        protein_g: r.proteinG,
        carb_g: r.carbG,
        fat_g: r.fatG,
        serving_size: r.servingSize ?? null,
        units: r.units ?? "",
        where_to_find: r.whereToFind,
        cost: r.cost,
      };
      if (isUuid(r.id)) row.id = r.id;
      return row;
    });
    const { error } = await supabase.from("ingredients").insert(ingRows);
    if (error) throw error;
  }

  return fetchUserTracker(supabase, userId);
}

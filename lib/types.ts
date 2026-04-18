export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type WorkoutIntensity = "light" | "moderate" | "hard";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";

export type Profile = {
  displayName: string;
  dailyCalorieGoal: number;
  proteinGoalG: number;
  carbGoalG: number;
  fatGoalG: number;
  weightKg: number | null;
  heightCm: number | null;
  weeklyWorkoutGoal: number;
  activityLevel: ActivityLevel;
};

export type MealEntry = {
  id: string;
  date: string;
  mealType: MealType;
  name: string;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export type WorkoutEntry = {
  id: string;
  date: string;
  title: string;
  durationMin: number;
  intensity: WorkoutIntensity;
  notes: string;
};

export type TrackerSnapshot = {
  profile: Profile;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
};

export const defaultProfile: Profile = {
  displayName: "",
  dailyCalorieGoal: 2000,
  proteinGoalG: 130,
  carbGoalG: 220,
  fatGoalG: 70,
  weightKg: null,
  heightCm: null,
  weeklyWorkoutGoal: 4,
  activityLevel: "moderate",
};

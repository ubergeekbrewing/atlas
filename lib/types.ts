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

/** Lab flag: high, low, positive (qualitative), or none */
export type LabResultFlag = "H" | "L" | "P" | "";

export type LabAbnormalEntry = {
  id: string;
  /** Blood draw / report date (YYYY-MM-DD) */
  drawDate: string;
  testName: string;
  value: string;
  flag: LabResultFlag;
  notes: string;
};

export type TrackerSnapshot = {
  profile: Profile;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  labAbnormals: LabAbnormalEntry[];
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

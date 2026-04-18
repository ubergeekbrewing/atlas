"use client";

import { useMemo, useRef, useState } from "react";
import { useTracker } from "@/context/TrackerContext";
import { todayLocal, weekdayLabel, weekRangeFromLocalDate } from "@/lib/date";
import type { ActivityLevel, MealEntry, MealType, Profile, WorkoutIntensity } from "@/lib/types";

type Tab = "dashboard" | "meals" | "workouts" | "profile";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const intensities: WorkoutIntensity[] = ["light", "moderate", "hard"];
const activityLevels: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "athlete",
];

function clampNum(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function MacroBar({
  label,
  current,
  goal,
  colorClass,
}: {
  label: string;
  current: number;
  goal: number;
  colorClass: string;
}) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="tabular-nums text-zinc-800 dark:text-zinc-200">
          {Math.round(current)} / {Math.round(goal)} g
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TrackerApp() {
  const t = useTracker();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedDate, setSelectedDate] = useState(todayLocal);
  const [profileMountKey, setProfileMountKey] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);

  const mealsToday = useMemo(
    () => t.meals.filter((m) => m.date === selectedDate),
    [t.meals, selectedDate],
  );
  const workoutsToday = useMemo(
    () => t.workouts.filter((w) => w.date === selectedDate),
    [t.workouts, selectedDate],
  );

  const totals = useMemo(() => {
    return mealsToday.reduce(
      (acc, m) => ({
        cal: acc.cal + m.calories,
        p: acc.p + m.proteinG,
        c: acc.c + m.carbG,
        f: acc.f + m.fatG,
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );
  }, [mealsToday]);

  const weekWorkouts = useMemo(() => {
    const { start, end } = weekRangeFromLocalDate(selectedDate);
    return t.workouts.filter((w) => w.date >= start && w.date <= end).length;
  }, [t.workouts, selectedDate]);

  const calPct = t.profile.dailyCalorieGoal
    ? Math.min(100, (totals.cal / t.profile.dailyCalorieGoal) * 100)
    : 0;

  if (!t.hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        Loading your log…
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200/80 bg-white/90 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-teal-600 dark:text-teal-400">
              Atlas
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Diet &amp; fitness
            </h1>
          </div>
          <nav className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {(
              [
                ["dashboard", "Today"],
                ["meals", "Meals"],
                ["workouts", "Workouts"],
                ["profile", "You"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === id
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        {tab === "dashboard" && (
          <>
            {t.profile.displayName.trim() ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{t.profile.displayName.trim()}</span>
                <span className="text-zinc-500"> — your targets below</span>
              </p>
            ) : null}

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Day
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <span className="text-sm text-zinc-500">{weekdayLabel(selectedDate)}</span>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-teal-50 to-white p-5 dark:border-zinc-800 dark:from-teal-950/40 dark:to-zinc-900/40">
                <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Calories</h2>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {Math.round(totals.cal)}
                  <span className="text-lg font-normal text-zinc-500">
                    {" "}
                    / {t.profile.dailyCalorieGoal}
                  </span>
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500 dark:bg-teal-400"
                    style={{ width: `${calPct}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
                <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Workouts this week
                </h2>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {weekWorkouts}
                  <span className="text-lg font-normal text-zinc-500">
                    {" "}
                    / {t.profile.weeklyWorkoutGoal}
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-500">Week is Monday–Sunday (local time).</p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Macros</h2>
              <div className="mt-4 space-y-4">
                <MacroBar
                  label="Protein"
                  current={totals.p}
                  goal={t.profile.proteinGoalG}
                  colorClass="bg-sky-500 dark:bg-sky-400"
                />
                <MacroBar
                  label="Carbs"
                  current={totals.c}
                  goal={t.profile.carbGoalG}
                  colorClass="bg-amber-500 dark:bg-amber-400"
                />
                <MacroBar
                  label="Fat"
                  current={totals.f}
                  goal={t.profile.fatGoalG}
                  colorClass="bg-violet-500 dark:bg-violet-400"
                />
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <DayList
                title="Meals"
                empty="No meals logged for this day."
                items={mealsToday.map((m) => ({
                  key: m.id,
                  primary: m.name,
                  secondary: `${m.mealType} · ${Math.round(m.calories)} kcal`,
                  onRemove: () => t.removeMeal(m.id),
                }))}
              />
              <DayList
                title="Workouts"
                empty="No workouts for this day."
                items={workoutsToday.map((w) => ({
                  key: w.id,
                  primary: w.title,
                  secondary: `${w.durationMin} min · ${w.intensity}`,
                  onRemove: () => t.removeWorkout(w.id),
                }))}
              />
            </section>
          </>
        )}

        {tab === "meals" && <MealsPanel defaultDate={selectedDate} />}
        {tab === "workouts" && <WorkoutsPanel defaultDate={selectedDate} />}
        {tab === "profile" && (
          <ProfilePanel
            key={profileMountKey}
            importRef={importRef}
            onImportFile={async (file) => {
              const text = await file.text();
              const ok = t.importSnapshot(text);
              if (!ok) alert("Could not read that file. Check JSON format.");
              else setProfileMountKey((k) => k + 1);
            }}
            onExport={() => {
              const blob = new Blob([t.exportSnapshot()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `atlas-backup-${todayLocal()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        )}
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        Stored on this device only. Export from You → backup before clearing browser data.
      </footer>
    </div>
  );
}

function DayList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { key: string; primary: string; secondary: string; onRemove: () => void }[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((row) => (
            <li
              key={row.key}
              className="flex items-start justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950/60"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</p>
                <p className="text-xs text-zinc-500">{row.secondary}</p>
              </div>
              <button
                type="button"
                onClick={row.onRemove}
                className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MealsPanel({ defaultDate }: { defaultDate: string }) {
  const t = useTracker();
  const [date, setDate] = useState(defaultDate);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("400");
  const [proteinG, setProteinG] = useState("30");
  const [carbG, setCarbG] = useState("40");
  const [fatG, setFatG] = useState("15");

  const recent = useMemo(
    () => [...t.meals].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 25),
    [t.meals],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const entry: Omit<MealEntry, "id"> = {
      date,
      mealType,
      name: name.trim(),
      calories: clampNum(Number(calories), 0, 20000),
      proteinG: clampNum(Number(proteinG), 0, 1000),
      carbG: clampNum(Number(carbG), 0, 2000),
      fatG: clampNum(Number(fatG), 0, 1000),
    };
    t.addMeal(entry);
    setName("");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log a meal</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Meal</span>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {mealTypes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Food</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Greek yogurt, berries, granola"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">kcal</span>
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Protein (g)</span>
            <input
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Carbs (g)</span>
            <input
              value={carbG}
              onChange={(e) => setCarbG(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Fat (g)</span>
            <input
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto sm:px-6 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Add meal
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent entries</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No meals yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950/60"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{m.name}</p>
                  <p className="text-xs text-zinc-500">
                    {m.date} · {m.mealType} · {Math.round(m.calories)} kcal · P{m.proteinG} C{m.carbG}{" "}
                    F{m.fatG}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => t.removeMeal(m.id)}
                  className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WorkoutsPanel({ defaultDate }: { defaultDate: string }) {
  const t = useTracker();
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState("30");
  const [intensity, setIntensity] = useState<WorkoutIntensity>("moderate");
  const [notes, setNotes] = useState("");

  const recent = useMemo(
    () =>
      [...t.workouts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 25),
    [t.workouts],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    t.addWorkout({
      date,
      title: title.trim(),
      durationMin: clampNum(Number(durationMin), 0, 1440),
      intensity,
      notes: notes.trim(),
    });
    setTitle("");
    setNotes("");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log a workout</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Intensity</span>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as WorkoutIntensity)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm capitalize dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {intensities.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Session</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Upper body strength, Zone 2 run"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Duration (minutes)</span>
          <input
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full max-w-xs rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto sm:px-6 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Add workout
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent sessions</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No workouts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((w) => (
              <li
                key={w.id}
                className="flex items-start justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950/60"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{w.title}</p>
                  <p className="text-xs text-zinc-500">
                    {w.date} · {w.durationMin} min · {w.intensity}
                    {w.notes ? ` · ${w.notes}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => t.removeWorkout(w.id)}
                  className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProfilePanel({
  importRef,
  onImportFile,
  onExport,
}: {
  importRef: React.RefObject<HTMLInputElement | null>;
  onImportFile: (file: File) => void;
  onExport: () => void;
}) {
  const t = useTracker();
  const [p, setP] = useState<Profile>(t.profile);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const w = p.weightKg;
    const h = p.heightCm;
    t.setProfile({
      ...p,
      dailyCalorieGoal: clampNum(p.dailyCalorieGoal, 500, 20000),
      proteinGoalG: clampNum(p.proteinGoalG, 0, 500),
      carbGoalG: clampNum(p.carbGoalG, 0, 1000),
      fatGoalG: clampNum(p.fatGoalG, 0, 500),
      weeklyWorkoutGoal: clampNum(Math.round(p.weeklyWorkoutGoal), 0, 21),
      weightKg: w == null || Number.isNaN(Number(w)) ? null : Number(w),
      heightCm: h == null || Number.isNaN(Number(h)) ? null : Number(h),
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={save}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your targets</h2>
        <p className="text-sm text-zinc-500">
          Tune these to match your plan. The dashboard compares your logged day against these numbers.
        </p>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Name (optional)</span>
          <input
            value={p.displayName}
            onChange={(e) => setP({ ...p, displayName: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Daily calories</span>
            <input
              type="number"
              value={p.dailyCalorieGoal}
              onChange={(e) => setP({ ...p, dailyCalorieGoal: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Workouts / week goal</span>
            <input
              type="number"
              value={p.weeklyWorkoutGoal}
              onChange={(e) => setP({ ...p, weeklyWorkoutGoal: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["proteinGoalG", "Protein goal (g/day)"],
              ["carbGoalG", "Carb goal (g/day)"],
              ["fatGoalG", "Fat goal (g/day)"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
              <input
                type="number"
                value={p[field]}
                onChange={(e) => setP({ ...p, [field]: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Weight (kg, optional)</span>
            <input
              type="number"
              step="0.1"
              value={p.weightKg ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  weightKg: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Height (cm, optional)</span>
            <input
              type="number"
              value={p.heightCm ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  heightCm: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Activity level</span>
            <select
              value={p.activityLevel}
              onChange={(e) => setP({ ...p, activityLevel: e.target.value as ActivityLevel })}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm capitalize dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {activityLevels.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Save profile
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Backup</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Download JSON or restore from a file. Handy when switching browsers or devices.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onExport}
            className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Export JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onImportFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Import JSON
          </button>
        </div>
      </div>
    </div>
  );
}

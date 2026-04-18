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

const TABS: { id: Tab; label: string; mobileLabel: string }[] = [
  { id: "dashboard", label: "Today", mobileLabel: "Today" },
  { id: "meals", label: "Meals", mobileLabel: "Meals" },
  { id: "workouts", label: "Workouts", mobileLabel: "Train" },
  { id: "profile", label: "You", mobileLabel: "You" },
];

/** 16px+ on controls avoids iOS zoom when focusing inputs */
const inp =
  "min-h-12 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-3 text-base text-zinc-900 [-webkit-text-size-adjust:100%] dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

const fieldLbl = "mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400";

const primaryBtn =
  "min-h-12 w-full rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white active:scale-[0.99] active:bg-teal-800 dark:bg-teal-500 dark:active:bg-teal-700 md:w-auto md:px-8";

const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-base font-medium text-zinc-800 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:active:bg-zinc-800";

function TabGlyph({ tab, active }: { tab: Tab; active: boolean }) {
  const c = active
    ? "text-teal-600 dark:text-teal-400"
    : "text-zinc-500 dark:text-zinc-400";
  const stroke = "h-6 w-6 shrink-0 stroke-current stroke-[1.65] fill-none";
  switch (tab) {
    case "dashboard":
      return (
        <svg className={`${stroke} ${c}`} viewBox="0 0 24 24" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5v3M16 3.5v3M3.5 10.5h17" strokeLinecap="round" />
        </svg>
      );
    case "meals":
      return (
        <svg className={`${stroke} ${c}`} viewBox="0 0 24 24" aria-hidden>
          <path d="M6 11h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8z" />
          <path d="M9 11V9a3 3 0 016 0v2" strokeLinecap="round" />
        </svg>
      );
    case "workouts":
      return (
        <svg className={`${stroke} ${c}`} viewBox="0 0 24 24" aria-hidden>
          <path d="M6.5 12h11M9 8.5L7 12l2 3.5M15 8.5l2 3.5-2 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "profile":
      return (
        <svg className={`${stroke} ${c}`} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="9" r="3.25" />
          <path d="M6.5 19.5c.75-3 4.25-4.25 5.5-4.25s4.75 1.25 5.5 4.25" strokeLinecap="round" />
        </svg>
      );
  }
}

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
    <div className="space-y-2">
      <div className="flex justify-between text-base sm:text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="tabular-nums text-zinc-800 dark:text-zinc-200">
          {Math.round(current)} / {Math.round(goal)} g
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 sm:h-2.5">
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
      <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 pb-8 pt-[max(2rem,env(safe-area-inset-top))] text-base text-zinc-500">
        Loading your log…
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col">
      <header className="border-b border-zinc-200/80 bg-white/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:px-4 md:py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              ATLAS
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
              Diet &amp; fitness
            </h1>
          </div>
          <nav className="hidden flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 md:flex">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-3 md:gap-6 md:px-4 md:py-8 md:pb-8">
        {tab === "dashboard" && (
          <>
            {t.profile.displayName.trim() ? (
              <p className="text-base text-zinc-600 dark:text-zinc-400 sm:text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{t.profile.displayName.trim()}</span>
                <span className="text-zinc-500"> — your targets below</span>
              </p>
            ) : null}

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
              <label className={fieldLbl}>Day</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={inp}
                />
                <span className="text-base text-zinc-500 sm:text-sm">{weekdayLabel(selectedDate)}</span>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-teal-50 to-white p-4 dark:border-zinc-800 dark:from-teal-950/40 dark:to-zinc-900/40 sm:p-5">
                <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Calories</h2>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                  {Math.round(totals.cal)}
                  <span className="text-lg font-normal text-zinc-500">
                    {" "}
                    / {t.profile.dailyCalorieGoal}
                  </span>
                </p>
                <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-white/80 dark:bg-zinc-800 sm:h-3">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500 dark:bg-teal-400"
                    style={{ width: `${calPct}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
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
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Week is Monday–Sunday (local time).
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">Macros</h2>
              <div className="mt-4 space-y-5 sm:space-y-4">
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

            <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
              a.download = `ATLAS-backup-${todayLocal()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/90 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)] md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map(({ id, mobileLabel }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors active:bg-zinc-100 dark:active:bg-zinc-900 ${
                  active ? "text-teal-700 dark:text-teal-300" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <TabGlyph tab={id} active={active} />
                <span className="max-w-[4.5rem] truncate text-[11px] font-semibold leading-tight">
                  {mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="hidden border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 md:block">
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-4">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-base text-zinc-500 sm:text-sm">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((row) => (
            <li
              key={row.key}
              className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-950/60 sm:py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-zinc-900 dark:text-zinc-100 sm:text-sm">{row.primary}</p>
                <p className="mt-0.5 text-sm text-zinc-500 sm:text-xs">{row.secondary}</p>
              </div>
              <button
                type="button"
                onClick={row.onRemove}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950/50 sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1 sm:text-xs"
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
    <div className="space-y-5 md:space-y-6">
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5"
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">Log a meal</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <label className="block">
            <span className={fieldLbl}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </label>
          <label className="block">
            <span className={fieldLbl}>Meal</span>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className={inp}
            >
              {mealTypes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={fieldLbl}>Food</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Greek yogurt, berries, granola"
            className={inp}
            autoComplete="off"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className={fieldLbl}>kcal</span>
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              inputMode="decimal"
              className={`${inp} tabular-nums`}
            />
          </label>
          <label className="block">
            <span className={fieldLbl}>Protein (g)</span>
            <input
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              inputMode="decimal"
              className={`${inp} tabular-nums`}
            />
          </label>
          <label className="block">
            <span className={fieldLbl}>Carbs (g)</span>
            <input
              value={carbG}
              onChange={(e) => setCarbG(e.target.value)}
              inputMode="decimal"
              className={`${inp} tabular-nums`}
            />
          </label>
          <label className="block">
            <span className={fieldLbl}>Fat (g)</span>
            <input
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
              inputMode="decimal"
              className={`${inp} tabular-nums`}
            />
          </label>
        </div>
        <button type="submit" className={primaryBtn}>
          Add meal
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">Recent entries</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-base text-zinc-500 sm:text-sm">No meals yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-950/60 sm:py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-100 sm:text-sm">{m.name}</p>
                  <p className="mt-0.5 text-sm text-zinc-500 sm:text-xs">
                    {m.date} · {m.mealType} · {Math.round(m.calories)} kcal · P{m.proteinG} C{m.carbG}{" "}
                    F{m.fatG}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => t.removeMeal(m.id)}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950/50 sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1 sm:text-xs"
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
    <div className="space-y-5 md:space-y-6">
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5"
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">Log a workout</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <label className="block">
            <span className={fieldLbl}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </label>
          <label className="block">
            <span className={fieldLbl}>Intensity</span>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as WorkoutIntensity)}
              className={`${inp} capitalize`}
            >
              {intensities.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={fieldLbl}>Session</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Upper body strength, Zone 2 run"
            className={inp}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className={fieldLbl}>Duration (minutes)</span>
          <input
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            inputMode="numeric"
            className={`${inp} max-w-full tabular-nums sm:max-w-xs`}
          />
        </label>
        <label className="block">
          <span className={fieldLbl}>Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inp} min-h-[6.5rem] resize-y`}
          />
        </label>
        <button type="submit" className={primaryBtn}>
          Add workout
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">Recent sessions</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-base text-zinc-500 sm:text-sm">No workouts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((w) => (
              <li
                key={w.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-950/60 sm:py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-100 sm:text-sm">{w.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-500 sm:text-xs">
                    {w.date} · {w.durationMin} min · {w.intensity}
                    {w.notes ? ` · ${w.notes}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => t.removeWorkout(w.id)}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950/50 sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1 sm:text-xs"
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
    <div className="space-y-5 md:space-y-6">
      <form
        onSubmit={save}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5"
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">Your targets</h2>
        <p className="text-base leading-relaxed text-zinc-500 sm:text-sm">
          Tune these to match your plan. The dashboard compares your logged day against these numbers.
        </p>
        <label className="block">
          <span className={fieldLbl}>Name (optional)</span>
          <input
            value={p.displayName}
            onChange={(e) => setP({ ...p, displayName: e.target.value })}
            className={inp}
            autoComplete="name"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <label className="block">
            <span className={fieldLbl}>Daily calories</span>
            <input
              type="number"
              value={p.dailyCalorieGoal}
              onChange={(e) => setP({ ...p, dailyCalorieGoal: Number(e.target.value) })}
              className={`${inp} tabular-nums`}
            />
          </label>
          <label className="block">
            <span className={fieldLbl}>Workouts / week goal</span>
            <input
              type="number"
              value={p.weeklyWorkoutGoal}
              onChange={(e) => setP({ ...p, weeklyWorkoutGoal: Number(e.target.value) })}
              className={`${inp} tabular-nums`}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-3">
          {(
            [
              ["proteinGoalG", "Protein goal (g/day)"],
              ["carbGoalG", "Carb goal (g/day)"],
              ["fatGoalG", "Fat goal (g/day)"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="block">
              <span className={fieldLbl}>{label}</span>
              <input
                type="number"
                value={p[field]}
                onChange={(e) => setP({ ...p, [field]: Number(e.target.value) })}
                className={`${inp} tabular-nums`}
              />
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-3">
          <label className="block">
            <span className={fieldLbl}>Weight (kg, optional)</span>
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
              className={`${inp} tabular-nums`}
            />
          </label>
          <label className="block">
            <span className={fieldLbl}>Height (cm, optional)</span>
            <input
              type="number"
              value={p.heightCm ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  heightCm: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={`${inp} tabular-nums`}
            />
          </label>
          <label className="block">
            <span className={fieldLbl}>Activity level</span>
            <select
              value={p.activityLevel}
              onChange={(e) => setP({ ...p, activityLevel: e.target.value as ActivityLevel })}
              className={`${inp} capitalize`}
            >
              {activityLevels.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className={`${primaryBtn} md:px-10`}>
          Save profile
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-sm">Backup</h2>
        <p className="mt-2 text-base leading-relaxed text-zinc-500 sm:text-sm">
          Download JSON or restore from a file. Handy when switching browsers or devices.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400 md:hidden">
          Data stays on this phone until you export. Back up before clearing site data or switching
          phones.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onExport} className={`${secondaryBtn} w-full sm:w-auto`}>
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
            className={`${secondaryBtn} w-full sm:w-auto`}
          >
            Import JSON
          </button>
        </div>
      </div>
    </div>
  );
}

/** Local calendar date as YYYY-MM-DD */
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekdayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function toIsoLocal(dt: Date): string {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Monday–Sunday week in local time for a given calendar day */
export function weekRangeFromLocalDate(isoDate: string): { start: string; end: string } {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return { start: isoDate, end: isoDate };
  const base = new Date(y, m - 1, d);
  const dow = base.getDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(base);
  mon.setDate(base.getDate() + toMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toIsoLocal(mon), end: toIsoLocal(sun) };
}

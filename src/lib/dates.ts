import type { ISODate } from "../db/types";

export function todayISO(): ISODate {
  const d = new Date();
  return localISO(d);
}

export function localISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: ISODate, n: number): ISODate {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localISO(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round(
    (new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000,
  );
}

/** Lundi de la semaine ISO contenant la date. */
export function weekStart(date: ISODate): ISODate {
  const d = new Date(date + "T12:00:00");
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  return localISO(d);
}

export function fmtDate(date: ISODate): string {
  return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function fmtDateShort(date: ISODate): string {
  return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

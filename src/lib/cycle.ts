import type { CycleConfig, ISODate } from "../db/types";
import { daysBetween } from "./dates";

/** Nom de la séance prévue pour une date selon le cycle. */
export function sessionForDate(cycle: CycleConfig, date: ISODate): string {
  if (!cycle.days.length) return "Repos";
  const diff = daysBetween(cycle.anchorDate, date);
  const idx = ((diff % cycle.days.length) + cycle.days.length) % cycle.days.length;
  return cycle.days[idx];
}

export function cycleDayIndex(cycle: CycleConfig, date: ISODate): number {
  const diff = daysBetween(cycle.anchorDate, date);
  return (((diff % cycle.days.length) + cycle.days.length) % cycle.days.length) + 1;
}

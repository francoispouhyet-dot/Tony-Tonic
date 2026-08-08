import type { Exercise, Workout, WorkoutSet } from "../db/types";
import { weekStart } from "./dates";

/** e1RM estimé — formule d'Epley. */
export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function setTonnage(s: WorkoutSet): number {
  return (s.weight || 0) * (s.reps || 0);
}

export function workoutTonnage(w: Workout): number {
  return (w.entries ?? []).reduce(
    (sum, e) => sum + e.sets.reduce((s2, set) => s2 + setTonnage(set), 0),
    0,
  );
}

/** Série "dure" : RIR ≤ 2, ou RIR non renseigné (on suppose un effort réel). */
export function isHardSet(s: WorkoutSet): boolean {
  return s.rir === undefined || s.rir <= 2;
}

export interface WeekAgg {
  week: string; // lundi ISO
  tonnage: number;
  hardSets: number;
  byGroup: Record<string, { tonnage: number; hardSets: number }>;
  sessions: number;
}

/** Agrégats hebdo muscu. Le tonnage d'une série est attribué en entier à
 * chaque groupe musculaire de l'exercice (convention volume par groupe). */
export function weeklyStrengthStats(
  workouts: Workout[],
  exercises: Map<number, Exercise>,
): WeekAgg[] {
  const weeks = new Map<string, WeekAgg>();
  for (const w of workouts) {
    if (w.type !== "strength") continue;
    const wk = weekStart(w.date);
    let agg = weeks.get(wk);
    if (!agg) {
      agg = { week: wk, tonnage: 0, hardSets: 0, byGroup: {}, sessions: 0 };
      weeks.set(wk, agg);
    }
    agg.sessions++;
    for (const entry of w.entries ?? []) {
      const ex = exercises.get(entry.exerciseId);
      const groups = ex?.muscleGroups?.length ? ex.muscleGroups : ["Autre"];
      for (const set of entry.sets) {
        const t = setTonnage(set);
        const hard = isHardSet(set) ? 1 : 0;
        agg.tonnage += t;
        agg.hardSets += hard;
        for (const g of groups) {
          if (!agg.byGroup[g]) agg.byGroup[g] = { tonnage: 0, hardSets: 0 };
          agg.byGroup[g].tonnage += t;
          agg.byGroup[g].hardSets += hard;
        }
      }
    }
  }
  return [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export interface ExerciseRecord {
  maxWeight: number;
  maxWeightDate: string;
  bestE1RM: number;
  bestE1RMDate: string;
}

export function exerciseHistory(workouts: Workout[], exerciseId: number) {
  const points: { date: string; topWeight: number; e1rm: number; tonnage: number }[] = [];
  for (const w of workouts) {
    if (w.type !== "strength") continue;
    const entry = (w.entries ?? []).find((e) => e.exerciseId === exerciseId);
    if (!entry || !entry.sets.length) continue;
    const topWeight = Math.max(...entry.sets.map((s) => s.weight || 0));
    const e1rm = Math.max(...entry.sets.map((s) => epley(s.weight, s.reps)));
    const tonnage = entry.sets.reduce((s2, s) => s2 + setTonnage(s), 0);
    points.push({ date: w.date, topWeight, e1rm, tonnage });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function exerciseRecords(workouts: Workout[], exerciseId: number): ExerciseRecord | null {
  const hist = exerciseHistory(workouts, exerciseId);
  if (!hist.length) return null;
  let rec: ExerciseRecord = {
    maxWeight: 0,
    maxWeightDate: "",
    bestE1RM: 0,
    bestE1RMDate: "",
  };
  for (const p of hist) {
    if (p.topWeight > rec.maxWeight) {
      rec.maxWeight = p.topWeight;
      rec.maxWeightDate = p.date;
    }
    if (p.e1rm > rec.bestE1RM) {
      rec.bestE1RM = p.e1rm;
      rec.bestE1RMDate = p.date;
    }
  }
  return rec;
}

/** Moyenne mobile sur `win` points (série {date, value} triée). */
export function movingAverage<T extends { [k: string]: any }>(
  data: T[],
  key: string,
  win: number,
): (T & { ma: number | null })[] {
  return data.map((d, i) => {
    const from = Math.max(0, i - win + 1);
    const slice = data.slice(from, i + 1);
    const ma = slice.reduce((s, x) => s + (x[key] as number), 0) / slice.length;
    return { ...d, ma: i >= Math.min(win - 1, 2) ? Math.round(ma * 100) / 100 : ma };
  });
}

/** Allure min/km formatée. */
export function paceStr(distanceKm?: number, durationMin?: number): string {
  if (!distanceKm || !durationMin || distanceKm <= 0) return "—";
  const pace = durationMin / distanceKm;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function weeklyRunning(workouts: Workout[]) {
  const weeks = new Map<string, { week: string; km: number; min: number; runs: number }>();
  for (const w of workouts) {
    if (w.type !== "running") continue;
    const wk = weekStart(w.date);
    let agg = weeks.get(wk);
    if (!agg) {
      agg = { week: wk, km: 0, min: 0, runs: 0 };
      weeks.set(wk, agg);
    }
    agg.km += w.distanceKm ?? 0;
    agg.min += w.durationMin ?? 0;
    agg.runs++;
  }
  return [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week));
}

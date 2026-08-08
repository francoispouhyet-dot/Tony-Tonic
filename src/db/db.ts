import Dexie, { type EntityTable } from "dexie";
import type {
  AppSettings,
  BodyComp,
  Exercise,
  Food,
  Meal,
  Measurement,
  PainEntry,
  Recipe,
  SleepEntry,
  StepsEntry,
  StressEntry,
  WeightEntry,
  Workout,
} from "./types";

export const db = new Dexie("tony-tonic") as Dexie & {
  settings: EntityTable<AppSettings, "id">;
  exercises: EntityTable<Exercise, "id">;
  workouts: EntityTable<Workout, "id">;
  foods: EntityTable<Food, "id">;
  recipes: EntityTable<Recipe, "id">;
  meals: EntityTable<Meal, "id">;
  weights: EntityTable<WeightEntry, "id">;
  measurements: EntityTable<Measurement, "id">;
  bodyComp: EntityTable<BodyComp, "id">;
  sleep: EntityTable<SleepEntry, "id">;
  stress: EntityTable<StressEntry, "id">;
  pains: EntityTable<PainEntry, "id">;
  steps: EntityTable<StepsEntry, "date">;
};

db.version(1).stores({
  settings: "id",
  exercises: "++id, name",
  workouts: "++id, date, type",
  foods: "++id, name, source",
  recipes: "++id, name",
  meals: "++id, date",
  weights: "++id, date",
  measurements: "++id, date",
  bodyComp: "++id, date",
  sleep: "++id, date, [date+source]",
  stress: "++id, date",
  pains: "++id, date, zone",
  steps: "date",
});

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  onboarded: false,
  goals: {
    kcal: 2800,
    proteins: 160,
    carbs: 330,
    fats: 90,
    fiber: 30,
    weightTarget: 81,
    stepsTarget: 10000,
  },
  cycle: {
    anchorDate: new Date().toISOString().slice(0, 10),
    days: ["Push", "Pull", "Legs", "Repos", "Upper", "Lower", "Wild Card", "Repos"],
  },
  ai: {
    apiKey: "",
    modelQuick: "claude-haiku-4-5",
    modelDeep: "claude-sonnet-5",
  },
};

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get("app");
  if (s) {
    // fusion défensive si de nouveaux champs apparaissent
    return {
      ...DEFAULT_SETTINGS,
      ...s,
      goals: { ...DEFAULT_SETTINGS.goals, ...s.goals },
      cycle: { ...DEFAULT_SETTINGS.cycle, ...s.cycle },
      ai: { ...DEFAULT_SETTINGS.ai, ...s.ai },
    };
  }
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<AppSettings>) {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, id: "app" });
}

// Demande la persistance du stockage (évite l'éviction IndexedDB par l'OS)
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* non bloquant */
  }
}

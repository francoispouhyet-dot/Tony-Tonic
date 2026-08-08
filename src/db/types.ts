// Modèle de données Tony Tonic — tout est stocké en local (IndexedDB via Dexie).
// Les dates "jour" sont des chaînes ISO locales "YYYY-MM-DD".

export type ISODate = string;

// ---------- Réglages ----------
export interface CycleConfig {
  anchorDate: ISODate; // date correspondant au jour 1 du cycle
  days: string[]; // ex. ["Push","Pull","Legs","Repos","Upper","Lower","Wild Card","Repos"]
}

export interface Goals {
  kcal: number;
  proteins: number; // g/j
  carbs: number; // g/j
  fats: number; // g/j
  fiber: number; // g/j
  weightTarget: number; // kg
  stepsTarget: number; // pas/j
}

export interface AISettings {
  apiKey: string; // stockée uniquement en local, jamais exportée par défaut
  modelQuick: string; // analyses courtes (fin de séance)
  modelDeep: string; // bilans hebdomadaires
}

export interface AppSettings {
  id: string; // toujours "app"
  onboarded: boolean;
  goals: Goals;
  cycle: CycleConfig;
  ai: AISettings;
  lastBackupAt?: number; // epoch ms
  demoData?: boolean; // true si les données de démo sont chargées
}

// ---------- Module 1 : Entraînement ----------
export const MUSCLE_GROUPS = [
  "Pectoraux",
  "Dos",
  "Épaules",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Ischios",
  "Fessiers",
  "Mollets",
  "Abdos",
  "Lombaires",
  "Avant-bras",
  "Trapèzes",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface Exercise {
  id?: number;
  name: string;
  muscleGroups: string[];
  photo?: Blob; // prise avec l'appareil photo ou choisie en galerie
  notes?: string;
}

export interface WorkoutSet {
  weight: number; // kg
  reps: number;
  rir?: number; // Reps In Reserve (optionnel)
  restSec?: number; // repos APRÈS cette série (optionnel, pré-rempli par le chrono)
}

export interface WorkoutEntry {
  exerciseId: number;
  sets: WorkoutSet[];
  notes?: string;
}

export type WorkoutType = "strength" | "running" | "stretching";

export interface Workout {
  id?: number;
  date: ISODate;
  type: WorkoutType;
  name: string; // ex. "Push", "Footing", "Mobilité hanches"
  startedAt?: number;
  endedAt?: number;
  entries?: WorkoutEntry[]; // musculation
  // running
  distanceKm?: number;
  durationMin?: number;
  avgHr?: number;
  // stretching
  zones?: string[];
  // commun
  feeling?: number; // 1-5
  notes?: string;
  aiAnalysis?: string; // analyse IA de fin de séance (markdown)
}

// ---------- Module 2 : Nutrition ----------
export interface Micros {
  fer?: number; // mg
  calcium?: number; // mg
  magnesium?: number; // mg
  potassium?: number; // mg
  zinc?: number; // mg
  sodium?: number; // mg
  vitC?: number; // mg
  vitD?: number; // µg
  vitB9?: number; // µg
  vitB12?: number; // µg
}

export interface Food {
  id?: number;
  name: string;
  // valeurs pour 100 g
  kcal: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number;
  micros?: Micros;
  // prix
  priceType?: "kg" | "unit"; // €/kg ou €/unité
  price?: number;
  unitGrams?: number; // poids d'une unité si priceType === "unit"
  source?: "ciqual" | "user";
}

export interface RecipeIngredient {
  foodId: number;
  grams: number;
}

export interface Recipe {
  id?: number;
  name: string;
  ingredients: RecipeIngredient[];
  portions: number; // nombre de portions produites
  notes?: string;
}

export type MealLabel = "petit-dej" | "dejeuner" | "diner" | "collation" | "autre";

export interface MealItem {
  kind: "food" | "recipe";
  refId: number;
  grams?: number; // pour un aliment
  portions?: number; // pour une recette
  label: string; // nom figé au moment de la saisie
}

export interface NutritionTotals {
  kcal: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number;
  cost: number; // €
  micros: Micros;
}

export interface Meal {
  id?: number;
  date: ISODate;
  label: MealLabel;
  items: MealItem[];
  totals: NutritionTotals; // instantané calculé à la saisie (stable si l'aliment change ensuite)
}

// ---------- Module 2 : Poids & composition ----------
export interface WeightEntry {
  id?: number;
  date: ISODate;
  kg: number;
}

export interface Measurement {
  id?: number;
  date: ISODate;
  taille?: number; // tour de taille cm
  poitrine?: number;
  brasG?: number;
  brasD?: number;
  cuisseG?: number;
  cuisseD?: number;
  molletG?: number;
  molletD?: number;
  epaules?: number;
}

export interface BodyComp {
  id?: number;
  date: ISODate;
  fatPct: number; // % masse grasse
}

// ---------- Module 3 : Santé ----------
export interface SleepEntry {
  id?: number;
  date: ISODate; // nuit attribuée au jour du réveil
  hours: number;
  quality?: number; // 1-5
  source: "manual" | "apple";
}

export interface StressEntry {
  id?: number;
  date: ISODate;
  level: number; // 1-10
  sources?: string[]; // travail, dossiers, perso, sommeil, autre
  emotions?: string[];
  note?: string;
}

export interface PainEntry {
  id?: number;
  date: ISODate;
  zone: string;
  intensity: number; // 1-10
  context?: string; // exercice associé, moment…
  exerciseId?: number;
}

export interface StepsEntry {
  date: ISODate; // clé primaire
  count: number;
  source: "manual" | "apple";
}

// Données de démonstration pour valider les écrans, et nettoyage complet.
import { db } from "./db";
import { CIQUAL_FOODS } from "../data/ciqual";
import { addDays, todayISO } from "../lib/dates";
import type { Workout } from "./types";

export async function clearAllData() {
  await db.transaction(
    "rw",
    [db.exercises, db.workouts, db.recipes, db.meals, db.weights, db.measurements, db.bodyComp, db.sleep, db.stress, db.pains, db.steps, db.foods],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.workouts.clear(),
        db.recipes.clear(),
        db.meals.clear(),
        db.weights.clear(),
        db.measurements.clear(),
        db.bodyComp.clear(),
        db.sleep.clear(),
        db.stress.clear(),
        db.pains.clear(),
        db.steps.clear(),
        // on garde la base d'aliments CIQUAL mais on retire les aliments utilisateur
        db.foods.where("source").notEqual("ciqual").delete(),
      ]);
    },
  );
}

export async function loadDemoData() {
  const today = todayISO();
  if ((await db.foods.count()) === 0) await db.foods.bulkAdd(CIQUAL_FOODS);

  // Exercices
  const exIds: Record<string, number> = {};
  for (const [name, groups] of [
    ["Développé couché", ["Pectoraux", "Triceps", "Épaules"]],
    ["Développé militaire", ["Épaules", "Triceps"]],
    ["Tractions", ["Dos", "Biceps"]],
    ["Rowing barre", ["Dos", "Biceps"]],
    ["Squat", ["Quadriceps", "Fessiers"]],
    ["Soulevé de terre roumain", ["Ischios", "Fessiers", "Lombaires"]],
    ["Curl haltères", ["Biceps"]],
    ["Extension triceps poulie", ["Triceps"]],
  ] as [string, string[]][]) {
    exIds[name] = (await db.exercises.add({ name, muscleGroups: groups })) as number;
  }

  // Séances muscu sur 3 semaines (progression légère)
  const mk = (dayOffset: number, name: string, entries: [string, [number, number, number?][]][]): Workout => ({
    date: addDays(today, dayOffset),
    type: "strength",
    name,
    entries: entries.map(([ex, sets]) => ({
      exerciseId: exIds[ex],
      sets: sets.map(([weight, reps, rir]) => ({ weight, reps, rir, restSec: 120 })),
    })),
    feeling: 4,
  });

  await db.workouts.bulkAdd([
    mk(-19, "Push", [["Développé couché", [[80, 8, 2], [80, 7, 1], [77.5, 8, 1]]], ["Développé militaire", [[47.5, 8, 2], [47.5, 7, 1]]], ["Extension triceps poulie", [[25, 12, 2], [25, 11, 1]]]]),
    mk(-17, "Pull", [["Tractions", [[0, 9, 2], [0, 8, 1]]], ["Rowing barre", [[70, 9, 2], [70, 8, 1]]], ["Curl haltères", [[14, 11, 2], [14, 10, 1]]]]),
    mk(-15, "Legs", [["Squat", [[100, 7, 2], [100, 7, 2], [95, 8, 1]]], ["Soulevé de terre roumain", [[90, 9, 2], [90, 8, 2]]]]),
    mk(-11, "Push", [["Développé couché", [[80, 9, 2], [80, 8, 1], [80, 7, 0]]], ["Développé militaire", [[50, 7, 2], [47.5, 8, 1]]], ["Extension triceps poulie", [[26.25, 12, 2], [26.25, 10, 1]]]]),
    mk(-9, "Pull", [["Tractions", [[0, 10, 2], [0, 8, 1]]], ["Rowing barre", [[72.5, 8, 2], [72.5, 8, 1]]], ["Curl haltères", [[14, 12, 2], [14, 10, 0]]]]),
    mk(-7, "Legs", [["Squat", [[102.5, 7, 2], [102.5, 6, 1], [100, 7, 1]]], ["Soulevé de terre roumain", [[92.5, 8, 2], [92.5, 8, 1]]]]),
    mk(-3, "Push", [["Développé couché", [[82.5, 8, 2], [82.5, 7, 1], [80, 8, 1]]], ["Développé militaire", [[50, 8, 2], [50, 7, 1]]], ["Extension triceps poulie", [[27.5, 11, 2], [27.5, 10, 1]]]]),
    mk(-1, "Pull", [["Tractions", [[2.5, 8, 2], [0, 10, 1]]], ["Rowing barre", [[75, 8, 2], [75, 7, 1]]], ["Curl haltères", [[16, 10, 2], [16, 8, 1]]]]),
    { date: addDays(today, -5), type: "running", name: "Footing", distanceKm: 6.2, durationMin: 34, avgHr: 152, feeling: 4 },
    { date: addDays(today, -12), type: "running", name: "Footing", distanceKm: 5.5, durationMin: 31.5, avgHr: 155, feeling: 3 },
    { date: addDays(today, -4), type: "stretching", name: "Wild Card", durationMin: 25, zones: ["Hanches", "Ischios", "Épaules"], feeling: 5 },
  ]);

  // Poids sur 3 semaines (prise de masse lente : ~78,2 → 78,9)
  for (let i = 20; i >= 0; i--) {
    const base = 78.2 + (20 - i) * 0.035;
    const noise = Math.sin(i * 2.7) * 0.25;
    await db.weights.add({ date: addDays(today, -i), kg: Math.round((base + noise) * 10) / 10 });
  }
  await db.measurements.bulkAdd([
    { date: addDays(today, -21), taille: 83, poitrine: 104, brasD: 37.5, cuisseD: 60, epaules: 121 },
    { date: addDays(today, -7), taille: 83.5, poitrine: 104.8, brasD: 37.8, cuisseD: 60.4, epaules: 121.6 },
  ]);
  await db.bodyComp.bulkAdd([
    { date: addDays(today, -21), fatPct: 15.2 },
    { date: addDays(today, -7), fatPct: 15.4 },
  ]);

  // Prix indicatifs sur les aliments de la démo (modifiables dans Aliments)
  const demoPrices: [string, number][] = [
    ["Flocons d'avoine", 2.1],
    ["Skyr", 4.5],
    ["Banane", 1.7],
    ["Blanc de poulet", 11.5],
    ["Riz blanc", 2.4],
    ["Brocoli", 3.2],
    ["Huile d'olive", 9.0],
  ];
  for (const [prefix, price] of demoPrices) {
    const f = await db.foods.where("name").startsWith(prefix).first();
    if (f) await db.foods.update(f.id!, { priceType: "kg", price } as any);
  }

  // Repas d'aujourd'hui (à partir d'aliments CIQUAL)
  const foods = await db.foods.toArray();
  const idOf = (n: string) => foods.find((f) => f.name.startsWith(n))?.id;
  const oats = idOf("Flocons"), skyr = idOf("Skyr"), banana = idOf("Banane"),
    chicken = idOf("Blanc de poulet"), rice = idOf("Riz blanc"), broc = idOf("Brocoli"),
    oil = idOf("Huile d'olive");
  const { foodTotals, addTotals, EMPTY_TOTALS } = await import("../lib/nutrition");
  const fmap = new Map(foods.map((f) => [f.id!, f]));
  const mkMeal = (label: any, parts: [number | undefined, number][]) => {
    const items = parts
      .filter(([id]) => id !== undefined)
      .map(([id, grams]) => ({ kind: "food" as const, refId: id!, grams, label: fmap.get(id!)!.name }));
    const totals = items.reduce((acc, it) => addTotals(acc, foodTotals(fmap.get(it.refId)!, it.grams!)), EMPTY_TOTALS);
    return { date: today, label, items, totals };
  };
  await db.meals.bulkAdd([
    mkMeal("petit-dej", [[oats, 90], [skyr, 200], [banana, 120]]),
    mkMeal("dejeuner", [[chicken, 180], [rice, 250], [broc, 200], [oil, 10]]),
  ]);

  // Santé : sommeil, stress, douleurs, pas
  for (let i = 14; i >= 0; i--) {
    const d = addDays(today, -i);
    await db.sleep.add({ date: d, hours: Math.round((6.6 + Math.sin(i) * 0.8) * 10) / 10, quality: 3 + (i % 3), source: "manual" });
    await db.stress.add({ date: d, level: Math.max(1, Math.min(9, Math.round(5 + Math.sin(i * 1.3) * 2.5))), sources: i % 3 === 0 ? ["travail"] : i % 3 === 1 ? ["dossiers"] : ["perso"] });
    await db.steps.put({ date: d, count: 6500 + Math.round(Math.abs(Math.sin(i * 0.9)) * 6000), source: "manual" });
  }
  await db.pains.bulkAdd([
    { date: addDays(today, -9), zone: "Épaule droite", intensity: 3, context: "Fin de séance Push, développé militaire" },
    { date: addDays(today, -2), zone: "Épaule droite", intensity: 2, context: "Le lendemain du Push" },
  ]);
}

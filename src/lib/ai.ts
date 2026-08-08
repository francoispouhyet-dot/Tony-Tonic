// Client API Anthropic — appels directs depuis le navigateur.
// On utilise fetch plutôt que le SDK : zéro dépendance, et contrôle explicite
// de l'en-tête CORS dédié `anthropic-dangerous-direct-browser-access` documenté
// sur docs.claude.com pour l'accès direct navigateur. La clé vit uniquement
// dans IndexedDB (réglages locaux) et n'est jamais incluse dans le code.
import { db, getSettings } from "../db/db";
import { mealsTotals } from "./nutrition";
import { epley, paceStr, weeklyStrengthStats, workoutTonnage } from "./stats";
import { addDays, todayISO } from "./dates";
import type { Workout } from "../db/types";

const API_URL = "https://api.anthropic.com/v1/messages";

export class AIError extends Error {}

export interface ContentBlock {
  type: "text" | "image";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
}

export async function callClaude(opts: {
  model?: "quick" | "deep";
  system?: string;
  content: string | ContentBlock[];
  maxTokens?: number;
}): Promise<string> {
  const s = await getSettings();
  if (!s.ai.apiKey) {
    throw new AIError("Aucune clé API configurée. Ajoute ta clé Anthropic dans Réglages.");
  }
  const model = opts.model === "deep" ? s.ai.modelDeep : s.ai.modelQuick;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": s.ai.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
    }),
  });
  if (!res.ok) {
    let msg = `Erreur API (${res.status})`;
    try {
      const j = await res.json();
      msg = j?.error?.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new AIError(msg);
  }
  const j = await res.json();
  const text = (j.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
  if (!text) throw new AIError("Réponse vide de l'API.");
  return text;
}

const SYSTEM_COACH = `Tu es Tony, le coach intégré d'une app de suivi fitness personnelle.
Ton utilisateur est un homme adulte en prise de masse contrôlée. Réponds en français,
de façon concise et concrète, en Markdown léger (titres ###, listes). Tu n'es pas médecin :
pour les douleurs, reste prudent, ne pose aucun diagnostic et recommande de consulter
si une douleur est aiguë, persistante ou inquiétante.`;

// ---------- Collecte de données (on n'envoie que le strict nécessaire) ----------

async function exerciseNames(): Promise<Map<number, string>> {
  const list = await db.exercises.toArray();
  return new Map(list.map((e) => [e.id!, e.name]));
}

export function workoutSummary(w: Workout, names: Map<number, string>): string {
  if (w.type === "running") {
    return `Course ${w.date} : ${w.distanceKm ?? "?"} km en ${w.durationMin ?? "?"} min (${paceStr(w.distanceKm, w.durationMin)}), FC moy ${w.avgHr ?? "—"}, ressenti ${w.feeling ?? "—"}/5`;
  }
  if (w.type === "stretching") {
    return `Stretching ${w.date} : ${w.durationMin ?? "?"} min, zones ${(w.zones ?? []).join(", ")}, ressenti ${w.feeling ?? "—"}/5`;
  }
  const lines = [(w.entries ?? [])
    .map((e) => {
      const sets = e.sets
        .map((s) => `${s.weight}kg×${s.reps}${s.rir !== undefined ? `@RIR${s.rir}` : ""}${s.restSec ? ` r${s.restSec}s` : ""}`)
        .join(", ");
      return `- ${names.get(e.exerciseId) ?? "?"} : ${sets}`;
    })
    .join("\n")];
  return `Séance ${w.name} du ${w.date} (tonnage ${Math.round(workoutTonnage(w))} kg) :\n${lines}`;
}

/** 1. Analyse de fin de séance (modèle rapide). */
export async function analyzeWorkout(workout: Workout): Promise<string> {
  const names = await exerciseNames();
  const all = await db.workouts.where("type").equals("strength").toArray();
  const previous = all
    .filter((w) => w.id !== workout.id && w.name === workout.name && w.date <= workout.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const content = `Analyse ma séance de musculation.

## Séance du jour
${workoutSummary(workout, names)}

## Dernière séance équivalente (${previous ? previous.date : "aucune"})
${previous ? workoutSummary(previous, names) : "Pas de séance comparable."}

Donne : 1) un résumé (2-3 phrases), 2) le tonnage total et la comparaison avec la
dernière séance équivalente, 3) les records battus (charge ou e1RM estimé Epley),
4) des observations sur les RIR et les temps de repos, 5) une suggestion concrète
pour la prochaine séance.`;
  return callClaude({ model: "quick", system: SYSTEM_COACH, content });
}

/** Construit un condensé des N derniers jours, toutes données croisées. */
export async function buildWeeklyDigest(days = 7): Promise<string> {
  const from = addDays(todayISO(), -days + 1);
  const names = await exerciseNames();
  const [workouts, meals, weights, sleep, stress, pains, stepsArr, settings, exercises] =
    await Promise.all([
      db.workouts.where("date").aboveOrEqual(from).toArray(),
      db.meals.where("date").aboveOrEqual(from).toArray(),
      db.weights.orderBy("date").toArray(),
      db.sleep.where("date").aboveOrEqual(from).toArray(),
      db.stress.where("date").aboveOrEqual(from).toArray(),
      db.pains.where("date").aboveOrEqual(from).toArray(),
      db.steps.where("date").aboveOrEqual(from).toArray(),
      getSettings(),
      db.exercises.toArray(),
    ]);

  const exMap = new Map(exercises.map((e) => [e.id!, e]));
  const weekly = weeklyStrengthStats(workouts, exMap);
  const byDayMeals = new Map<string, typeof meals>();
  for (const m of meals) {
    if (!byDayMeals.has(m.date)) byDayMeals.set(m.date, []);
    byDayMeals.get(m.date)!.push(m);
  }
  const nutriLines = [...byDayMeals.entries()]
    .sort()
    .map(([d, ms]) => {
      const t = mealsTotals(ms);
      return `${d}: ${Math.round(t.kcal)} kcal, P ${Math.round(t.proteins)}g, G ${Math.round(t.carbs)}g, L ${Math.round(t.fats)}g, fibres ${Math.round(t.fiber)}g, coût ${t.cost.toFixed(2)}€`;
    })
    .join("\n");

  const recentWeights = weights.slice(-14).map((w) => `${w.date}: ${w.kg}kg`).join(", ");

  return `## Objectifs
kcal ${settings.goals.kcal}, protéines ${settings.goals.proteins}g, poids cible ${settings.goals.weightTarget}kg, pas ${settings.goals.stepsTarget}

## Entraînements (${days} derniers jours)
${workouts.map((w) => workoutSummary(w, names)).join("\n") || "aucun"}
Volume hebdo par groupe : ${JSON.stringify(weekly.at(-1)?.byGroup ?? {})}

## Nutrition par jour
${nutriLines || "aucune saisie"}

## Poids (14 dernières mesures)
${recentWeights || "aucune"}

## Sommeil
${sleep.map((s) => `${s.date}: ${s.hours}h${s.quality ? ` (qualité ${s.quality}/5)` : ""}`).join(", ") || "aucun"}

## Stress
${stress.map((s) => `${s.date}: ${s.level}/10${s.sources?.length ? ` [${s.sources.join(",")}]` : ""}`).join(", ") || "aucun"}

## Douleurs
${pains.map((p) => `${p.date}: ${p.zone} ${p.intensity}/10${p.context ? ` (${p.context})` : ""}`).join(", ") || "aucune"}

## Pas
${stepsArr.map((s) => `${s.date}: ${s.count}`).join(", ") || "aucun"}`;
}

/** 3. Bilan hebdomadaire croisé (modèle approfondi). */
export async function weeklyReport(): Promise<string> {
  const digest = await buildWeeklyDigest(7);
  return callClaude({
    model: "deep",
    system: SYSTEM_COACH,
    maxTokens: 2500,
    content: `Voici mes données de la semaine. Produis un bilan hebdomadaire croisé
(entraînement × nutrition × poids × sommeil × stress × douleurs) :
1) ce qui progresse, 2) ce qui coince, 3) 2-3 actions concrètes pour la semaine
prochaine. Termine par une ligne de synthèse motivante mais factuelle.

${digest}`,
  });
}

/** 2. Analyse douleurs & stress (patterns). */
export async function painStressAnalysis(): Promise<string> {
  const digest = await buildWeeklyDigest(28);
  return callClaude({
    model: "deep",
    system: SYSTEM_COACH,
    maxTokens: 2000,
    content: `Analyse mes douleurs et mon stress sur les 4 dernières semaines.
Cherche des corrélations (douleur ↔ exercice ou volume ; stress ↔ sommeil, entraînement).
Donne des recommandations prudentes et non médicales. Rappelle de consulter si besoin.

${digest}`,
  });
}

/** 4. Détection de fatigue / suggestion de deload. */
export async function fatigueCheck(): Promise<string> {
  const digest = await buildWeeklyDigest(21);
  return callClaude({
    model: "quick",
    system: SYSTEM_COACH,
    content: `Évalue mes signaux de fatigue sur 3 semaines : RIR qui montent,
charges qui stagnent, sommeil qui raccourcit, stress qui grimpe.
Conclus clairement : deload recommandé ou non, et quels ajustements concrets.

${digest}`,
  });
}

/** 5. Ajustement des objectifs caloriques (proposition, jamais imposé). */
export async function calorieAdjustment(): Promise<string> {
  const [weights, settings] = await Promise.all([db.weights.orderBy("date").toArray(), getSettings()]);
  const digest = await buildWeeklyDigest(14);
  const weightLine = weights.slice(-30).map((w) => `${w.date}: ${w.kg}`).join(", ");
  return callClaude({
    model: "deep",
    system: SYSTEM_COACH,
    content: `Objectif : prise de masse contrôlée vers ${settings.goals.weightTarget} kg
(±0,25 à 0,5 % du poids par semaine). Objectifs actuels : ${settings.goals.kcal} kcal,
P ${settings.goals.proteins} / G ${settings.goals.carbs} / L ${settings.goals.fats}.
Courbe de poids (kg) : ${weightLine || "aucune donnée"}

En te basant sur la moyenne mobile 7 jours du poids réel vs l'objectif, PROPOSE
(sans imposer) un ajustement de calories et macros, avec le raisonnement chiffré.

${digest}`,
  });
}

/** 6. Lecture de ticket de caisse (photo → aliments + prix). */
export async function readReceipt(imageBase64: string, mediaType: string): Promise<
  { name: string; price: number; approxKg?: number }[]
> {
  const text = await callClaude({
    model: "quick",
    maxTokens: 2000,
    system:
      "Tu extrais les lignes alimentaires d'un ticket de caisse. Réponds UNIQUEMENT en JSON valide.",
    content: [
      { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
      {
        type: "text",
        text: `Extrais les aliments et leur prix de ce ticket. Réponds avec un tableau JSON :
[{"name": "nom lisible en français", "price": prix total en euros (nombre), "approxKg": poids estimé en kg si identifiable, sinon omets}]
Ignore les articles non alimentaires. Aucun texte hors du JSON.`,
      },
    ],
  });
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new AIError("Impossible de lire le ticket (réponse inattendue).");
  return JSON.parse(match[0]);
}

/** 7. Question libre « Demande à Tony ». */
export async function askTony(question: string): Promise<string> {
  const digest = await buildWeeklyDigest(28);
  return callClaude({
    model: "deep",
    system: SYSTEM_COACH,
    maxTokens: 2000,
    content: `Question de l'utilisateur : ${question}

Réponds en t'appuyant sur ses données des 4 dernières semaines ci-dessous.
Si la réponse n'est pas dans les données, dis-le simplement.

${digest}`,
  });
}

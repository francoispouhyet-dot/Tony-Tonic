import type {
  Food,
  Meal,
  MealItem,
  Micros,
  NutritionTotals,
  Recipe,
} from "../db/types";

export const EMPTY_TOTALS: NutritionTotals = {
  kcal: 0,
  proteins: 0,
  carbs: 0,
  fats: 0,
  fiber: 0,
  cost: 0,
  micros: {},
};

const MICRO_KEYS: (keyof Micros)[] = [
  "fer",
  "calcium",
  "magnesium",
  "potassium",
  "zinc",
  "sodium",
  "vitC",
  "vitD",
  "vitB9",
  "vitB12",
];

/** Apports de référence quotidiens (homme adulte, ordres de grandeur ANSES/EFSA). */
export const MICRO_REFS: { key: keyof Micros; label: string; ref: number; unit: string }[] = [
  { key: "fer", label: "Fer", ref: 11, unit: "mg" },
  { key: "calcium", label: "Calcium", ref: 950, unit: "mg" },
  { key: "magnesium", label: "Magnésium", ref: 380, unit: "mg" },
  { key: "potassium", label: "Potassium", ref: 3500, unit: "mg" },
  { key: "zinc", label: "Zinc", ref: 11, unit: "mg" },
  { key: "sodium", label: "Sodium (max)", ref: 2300, unit: "mg" },
  { key: "vitC", label: "Vitamine C", ref: 110, unit: "mg" },
  { key: "vitD", label: "Vitamine D", ref: 15, unit: "µg" },
  { key: "vitB9", label: "Folates (B9)", ref: 330, unit: "µg" },
  { key: "vitB12", label: "Vitamine B12", ref: 4, unit: "µg" },
];

export function addTotals(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  const micros: Micros = { ...a.micros };
  for (const k of MICRO_KEYS) {
    const vb = b.micros?.[k];
    if (vb !== undefined) micros[k] = (micros[k] ?? 0) + vb;
  }
  return {
    kcal: a.kcal + b.kcal,
    proteins: a.proteins + b.proteins,
    carbs: a.carbs + b.carbs,
    fats: a.fats + b.fats,
    fiber: a.fiber + b.fiber,
    cost: a.cost + b.cost,
    micros,
  };
}

export function foodCost(food: Food, grams: number): number {
  if (!food.price) return 0;
  if (food.priceType === "unit") {
    const g = food.unitGrams || 100;
    return (food.price * grams) / g;
  }
  return (food.price * grams) / 1000; // €/kg
}

export function foodTotals(food: Food, grams: number): NutritionTotals {
  const f = grams / 100;
  const micros: Micros = {};
  for (const k of MICRO_KEYS) {
    const v = food.micros?.[k];
    if (v !== undefined) micros[k] = v * f;
  }
  return {
    kcal: food.kcal * f,
    proteins: food.proteins * f,
    carbs: food.carbs * f,
    fats: food.fats * f,
    fiber: food.fiber * f,
    cost: foodCost(food, grams),
    micros,
  };
}

export function recipeTotals(recipe: Recipe, foods: Map<number, Food>): NutritionTotals {
  let tot = EMPTY_TOTALS;
  for (const ing of recipe.ingredients) {
    const f = foods.get(ing.foodId);
    if (f) tot = addTotals(tot, foodTotals(f, ing.grams));
  }
  return tot;
}

export function recipePortionTotals(recipe: Recipe, foods: Map<number, Food>): NutritionTotals {
  const tot = recipeTotals(recipe, foods);
  const p = recipe.portions || 1;
  return scaleTotals(tot, 1 / p);
}

export function scaleTotals(t: NutritionTotals, f: number): NutritionTotals {
  const micros: Micros = {};
  for (const k of MICRO_KEYS) {
    const v = t.micros?.[k];
    if (v !== undefined) micros[k] = v * f;
  }
  return {
    kcal: t.kcal * f,
    proteins: t.proteins * f,
    carbs: t.carbs * f,
    fats: t.fats * f,
    fiber: t.fiber * f,
    cost: t.cost * f,
    micros,
  };
}

export function itemTotals(
  item: MealItem,
  foods: Map<number, Food>,
  recipes: Map<number, Recipe>,
): NutritionTotals {
  if (item.kind === "food") {
    const f = foods.get(item.refId);
    return f ? foodTotals(f, item.grams ?? 0) : EMPTY_TOTALS;
  }
  const r = recipes.get(item.refId);
  if (!r) return EMPTY_TOTALS;
  return scaleTotals(recipePortionTotals(r, foods), item.portions ?? 1);
}

export function mealsTotals(meals: Meal[]): NutritionTotals {
  return meals.reduce((acc, m) => addTotals(acc, m.totals), EMPTY_TOTALS);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

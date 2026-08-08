// Journal calorique quotidien : macros + fibres, micronutriments, coût.
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { db, getSettings } from "../../db/db";
import { addDays, fmtDate, todayISO, weekStart } from "../../lib/dates";
import { MICRO_REFS, mealsTotals } from "../../lib/nutrition";
import { Btn, Card, MacroBar, SectionTitle } from "../../components/ui";
import { C1, C2, C3 } from "../../components/charts";
import type { Meal } from "../../db/types";

const LABELS: Record<string, string> = {
  "petit-dej": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
  autre: "Autre",
};

export default function Nutrition() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const settings = useLiveQuery(() => getSettings());
  const meals = useLiveQuery(() => db.meals.where("date").equals(date).toArray(), [date]);
  const weekMeals = useLiveQuery(async () => {
    const start = weekStart(date);
    return db.meals.where("date").between(start, addDays(start, 6), true, true).toArray();
  }, [date]);
  const [showMicros, setShowMicros] = useState(false);

  if (!settings) return null;
  const totals = mealsTotals(meals ?? []);
  const g = settings.goals;
  const weekTotals = mealsTotals(weekMeals ?? []);
  const weekMealCount = (weekMeals ?? []).length;

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-extrabold">Nutrition</h1>
        <div className="flex gap-1 text-sm">
          <Link to="/nutrition/foods" className="bg-stone-800 rounded-lg px-3 py-1.5">
            Aliments
          </Link>
          <Link to="/nutrition/recipes" className="bg-stone-800 rounded-lg px-3 py-1.5">
            Recettes
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <Btn small kind="ghost" onClick={() => setDate(addDays(date, -1))}>
          ‹
        </Btn>
        <button className="font-semibold capitalize" onClick={() => setDate(todayISO())}>
          {date === todayISO() ? "Aujourd'hui" : fmtDate(date)}
        </button>
        <Btn small kind="ghost" onClick={() => setDate(addDays(date, 1))}>
          ›
        </Btn>
      </div>

      <Card className="mb-3">
        <MacroBar label="Calories" value={totals.kcal} max={g.kcal} unit="kcal" color={C1} />
        <MacroBar label="Protéines" value={totals.proteins} max={g.proteins} color={C2} />
        <MacroBar label="Glucides" value={totals.carbs} max={g.carbs} color={C3} />
        <MacroBar label="Lipides" value={totals.fats} max={g.fats} color="#a16207" />
        <MacroBar label="Fibres" value={totals.fiber} max={g.fiber} color="#57534e" />
        <div className="flex justify-between text-xs text-stone-400 mt-2">
          <span>
            Coût du jour : <span className="text-stone-200 font-semibold">{totals.cost.toFixed(2)} €</span>
          </span>
          <span>
            Semaine : {weekTotals.cost.toFixed(2)} € ·{" "}
            {weekMealCount ? `${(weekTotals.cost / weekMealCount).toFixed(2)} €/repas` : "—"}
          </span>
        </div>
      </Card>

      <Btn className="w-full mb-3" onClick={() => navigate(`/nutrition/meal/${date}`)}>
        ＋ Ajouter un repas
      </Btn>

      {(meals ?? [])
        .sort((a, b) => Object.keys(LABELS).indexOf(a.label) - Object.keys(LABELS).indexOf(b.label))
        .map((m) => (
          <MealCard key={m.id} meal={m} onEdit={() => navigate(`/nutrition/meal/${date}?edit=${m.id}`)} />
        ))}

      <SectionTitle
        action={
          <button className="text-xs text-orange-400" onClick={() => setShowMicros(!showMicros)}>
            {showMicros ? "masquer" : "afficher"}
          </button>
        }
      >
        Micronutriments du jour
      </SectionTitle>
      {showMicros && (
        <Card>
          {MICRO_REFS.map(({ key, label, ref, unit }) => {
            const v = totals.micros[key] ?? 0;
            const pct = Math.round((v / ref) * 100);
            const isSodium = key === "sodium";
            const color = isSodium
              ? v > ref
                ? "#b91c1c"
                : "#57534e"
              : pct >= 80
                ? "#059669"
                : pct >= 50
                  ? "#a16207"
                  : "#b91c1c";
            return (
              <div key={key} className="flex items-center justify-between py-1 text-sm border-b border-stone-800 last:border-0">
                <span className="text-stone-300">{label}</span>
                <span className="tabular-nums">
                  {Math.round(v * 10) / 10} / {ref} {unit}{" "}
                  <span className="inline-block w-2 h-2 rounded-full ml-1" style={{ background: color }} />
                </span>
              </div>
            );
          })}
          <p className="text-[11px] text-stone-600 mt-2">
            Estimation basée sur la table CIQUAL (ANSES) pour les aliments référencés.
            Références : apports quotidiens homme adulte.
          </p>
        </Card>
      )}
    </div>
  );
}

function MealCard({ meal, onEdit }: { meal: Meal; onEdit: () => void }) {
  return (
    <Card className="mb-2" onClick={onEdit}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-semibold">{LABELS[meal.label] ?? meal.label}</span>
        <span className="text-sm text-stone-400">
          {Math.round(meal.totals.kcal)} kcal · P {Math.round(meal.totals.proteins)} g ·{" "}
          {meal.totals.cost.toFixed(2)} €
        </span>
      </div>
      <div className="text-xs text-stone-500">
        {meal.items.map((i) => `${i.label}${i.grams ? ` ${i.grams} g` : i.portions ? ` ×${i.portions}` : ""}`).join(" · ")}
      </div>
    </Card>
  );
}

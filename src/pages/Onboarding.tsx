import { useState } from "react";
import { DEFAULT_SETTINGS, db } from "../db/db";
import { CIQUAL_FOODS } from "../data/ciqual";
import { Btn, Field, NumInput, inputCls } from "../components/ui";
import { todayISO } from "../lib/dates";

export default function Onboarding() {
  const [goals, setGoals] = useState(DEFAULT_SETTINGS.goals);
  const [anchor, setAnchor] = useState(todayISO());
  const [days, setDays] = useState(DEFAULT_SETTINGS.cycle.days.join(", "));
  const [saving, setSaving] = useState(false);

  async function start() {
    setSaving(true);
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      onboarded: true,
      goals,
      cycle: {
        anchorDate: anchor,
        days: days.split(",").map((d) => d.trim()).filter(Boolean),
      },
    });
    // Pré-charge la base d'aliments CIQUAL si vide
    if ((await db.foods.count()) === 0) {
      await db.foods.bulkAdd(CIQUAL_FOODS);
    }
  }

  const g = (k: keyof typeof goals) => (v: number | undefined) =>
    setGoals({ ...goals, [k]: v ?? 0 });

  return (
    <div className="max-w-lg mx-auto min-h-screen px-4 py-8">
      <h1 className="text-3xl font-extrabold mb-1">
        Tony <span className="text-orange-500">Tonic</span>
      </h1>
      <p className="text-stone-400 mb-6 text-sm">
        Tes données restent sur cet appareil. Configure tes objectifs — tout est modifiable
        ensuite dans Réglages.
      </p>

      <h2 className="font-bold mb-2">Objectifs nutrition</h2>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="Calories (kcal/j)">
          <NumInput value={goals.kcal} onChange={g("kcal")} />
        </Field>
        <Field label="Protéines (g/j)">
          <NumInput value={goals.proteins} onChange={g("proteins")} />
        </Field>
        <Field label="Glucides (g/j)">
          <NumInput value={goals.carbs} onChange={g("carbs")} />
        </Field>
        <Field label="Lipides (g/j)">
          <NumInput value={goals.fats} onChange={g("fats")} />
        </Field>
        <Field label="Fibres (g/j)">
          <NumInput value={goals.fiber} onChange={g("fiber")} />
        </Field>
      </div>

      <h2 className="font-bold mb-2 mt-4">Poids & activité</h2>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="Objectif poids (kg)">
          <NumInput value={goals.weightTarget} onChange={g("weightTarget")} decimal step={0.5} />
        </Field>
        <Field label="Objectif pas / jour">
          <NumInput value={goals.stepsTarget} onChange={g("stepsTarget")} step={500} />
        </Field>
      </div>

      <h2 className="font-bold mb-2 mt-4">Cycle d'entraînement</h2>
      <Field
        label="Jours du cycle (séparés par des virgules)"
        hint="Par défaut : PPL + Upper/Lower sur 8 jours avec une séance Wild Card."
      >
        <textarea className={inputCls} rows={2} value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <Field label="Date du jour 1 du cycle">
        <input type="date" className={inputCls} value={anchor} onChange={(e) => setAnchor(e.target.value)} />
      </Field>

      <Btn onClick={start} disabled={saving} className="w-full mt-4">
        C'est parti 💪
      </Btn>
    </div>
  );
}

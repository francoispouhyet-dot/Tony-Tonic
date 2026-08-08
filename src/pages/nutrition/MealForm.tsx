// Saisir un repas : recettes en 1 tap + aliments pesés en grammes.
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { db } from "../../db/db";
import type { Meal, MealItem, MealLabel } from "../../db/types";
import { Btn, Card, Field, Modal, NumInput, inputCls } from "../../components/ui";
import {
  EMPTY_TOTALS,
  addTotals,
  itemTotals,
  round1,
} from "../../lib/nutrition";

const LABELS: [MealLabel, string][] = [
  ["petit-dej", "Petit-déj"],
  ["dejeuner", "Déjeuner"],
  ["diner", "Dîner"],
  ["collation", "Collation"],
  ["autre", "Autre"],
];

export default function MealForm() {
  const { date } = useParams<{ date: string }>();
  const [params] = useSearchParams();
  const editId = params.get("edit") ? Number(params.get("edit")) : null;
  const navigate = useNavigate();

  const foods = useLiveQuery(() => db.foods.toArray());
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const [label, setLabel] = useState<MealLabel>("dejeuner");
  const [items, setItems] = useState<MealItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (editId) {
      db.meals.get(editId).then((m) => {
        if (m) {
          setLabel(m.label);
          setItems(m.items);
        }
      });
    }
  }, [editId]);

  const foodsMap = useMemo(() => new Map((foods ?? []).map((f) => [f.id!, f])), [foods]);
  const recipesMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id!, r])), [recipes]);

  const totals = useMemo(
    () => items.reduce((acc, it) => addTotals(acc, itemTotals(it, foodsMap, recipesMap)), EMPTY_TOTALS),
    [items, foodsMap, recipesMap],
  );

  async function save() {
    const meal: Meal = { date: date!, label, items, totals };
    if (editId) await db.meals.update(editId, meal as any);
    else await db.meals.add(meal);
    navigate(-1);
  }

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Annuler
        </button>
        <h1 className="text-xl font-extrabold">{editId ? "Modifier le repas" : "Nouveau repas"}</h1>
        <span className="w-12 text-xs text-stone-500">{date?.slice(5)}</span>
      </div>

      <div className="flex flex-wrap mb-3">
        {LABELS.map(([val, txt]) => (
          <button
            key={val}
            onClick={() => setLabel(val)}
            className={`px-3 py-1.5 rounded-full text-sm mr-1.5 mb-1.5 ${
              label === val ? "bg-orange-600 text-white font-medium" : "bg-stone-800 text-stone-300"
            }`}
          >
            {txt}
          </button>
        ))}
      </div>

      {items.map((it, idx) => (
        <Card key={idx} className="mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="font-medium text-sm">
                {it.kind === "recipe" ? "🍲 " : ""}
                {it.label}
              </div>
              <div className="text-xs text-stone-500">
                {Math.round(itemTotals(it, foodsMap, recipesMap).kcal)} kcal ·{" "}
                {round1(itemTotals(it, foodsMap, recipesMap).proteins)} g prot
              </div>
            </div>
            {it.kind === "food" ? (
              <div className="w-24">
                <NumInput
                  value={it.grams}
                  decimal
                  onChange={(v) => {
                    const next = [...items];
                    next[idx] = { ...it, grams: v ?? 0 };
                    setItems(next);
                  }}
                  className="!py-2 text-center"
                />
                <div className="text-center text-[10px] text-stone-500">grammes</div>
              </div>
            ) : (
              <div className="w-24">
                <NumInput
                  value={it.portions}
                  decimal
                  step={0.5}
                  onChange={(v) => {
                    const next = [...items];
                    next[idx] = { ...it, portions: v ?? 0 };
                    setItems(next);
                  }}
                  className="!py-2 text-center"
                />
                <div className="text-center text-[10px] text-stone-500">portion(s)</div>
              </div>
            )}
            <button className="text-stone-600 px-1" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
              ✕
            </button>
          </div>
        </Card>
      ))}

      <Btn kind="ghost" className="w-full mb-3" onClick={() => setPickerOpen(true)}>
        ＋ Ajouter un aliment ou une recette
      </Btn>

      <Card className="mb-3 text-sm">
        <div className="flex justify-between font-semibold mb-1">
          <span>Total repas</span>
          <span>{Math.round(totals.kcal)} kcal</span>
        </div>
        <div className="flex justify-between text-stone-400 text-xs">
          <span>
            P {round1(totals.proteins)} · G {round1(totals.carbs)} · L {round1(totals.fats)} · fibres{" "}
            {round1(totals.fiber)} g
          </span>
          <span>{totals.cost.toFixed(2)} €</span>
        </div>
      </Card>

      <div className="flex gap-2">
        <Btn onClick={save} disabled={items.length === 0} className="flex-1">
          Enregistrer
        </Btn>
        {editId && (
          <Btn
            kind="danger"
            onClick={async () => {
              if (confirm("Supprimer ce repas ?")) {
                await db.meals.delete(editId);
                navigate(-1);
              }
            }}
          >
            🗑
          </Btn>
        )}
      </div>

      <ItemPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(item) => {
          setItems([...items, item]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function ItemPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (item: MealItem) => void;
}) {
  const foods = useLiveQuery(() => db.foods.toArray());
  const recipes = useLiveQuery(() => db.recipes.toArray());
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const ql = q.toLowerCase();
  const recipeHits = (recipes ?? []).filter((r) => r.name.toLowerCase().includes(ql));
  const foodHits = (foods ?? [])
    .filter((f) => f.name.toLowerCase().includes(ql))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 40);

  return (
    <Modal open={open} onClose={onClose} title="Aliment ou recette">
      <input
        className={inputCls + " mb-3"}
        placeholder="Rechercher…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="max-h-80 overflow-y-auto">
        {recipeHits.length > 0 && (
          <div className="text-xs uppercase tracking-wide text-stone-500 mb-1">Recettes</div>
        )}
        {recipeHits.map((r) => (
          <button
            key={`r${r.id}`}
            className="w-full text-left py-2 px-1 active:bg-stone-800 rounded-lg"
            onClick={() => onPick({ kind: "recipe", refId: r.id!, portions: 1, label: r.name })}
          >
            🍲 <span className="font-medium text-sm">{r.name}</span>
            <span className="text-xs text-stone-500"> — 1 portion</span>
          </button>
        ))}
        {foodHits.length > 0 && (
          <div className="text-xs uppercase tracking-wide text-stone-500 mt-2 mb-1">Aliments (100 g par défaut)</div>
        )}
        {foodHits.map((f) => (
          <button
            key={`f${f.id}`}
            className="w-full text-left py-2 px-1 active:bg-stone-800 rounded-lg"
            onClick={() => onPick({ kind: "food", refId: f.id!, grams: 100, label: f.name })}
          >
            <span className="font-medium text-sm">{f.name}</span>
            <span className="text-xs text-stone-500">
              {" "}
              — {Math.round(f.kcal)} kcal · P {f.proteins} g /100 g
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

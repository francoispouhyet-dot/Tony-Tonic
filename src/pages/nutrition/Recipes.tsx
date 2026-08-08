// Recettes : liste d'ingrédients pesés → macros, calories, micros et coût
// calculés automatiquement, au total et par portion. Saisie en 1 tap ensuite.
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db } from "../../db/db";
import type { Recipe } from "../../db/types";
import { Btn, Card, Field, Modal, NumInput, inputCls } from "../../components/ui";
import { recipeTotals, round1, scaleTotals } from "../../lib/nutrition";

export default function Recipes() {
  const navigate = useNavigate();
  const recipes = useLiveQuery(() => db.recipes.orderBy("name").toArray());
  const foods = useLiveQuery(() => db.foods.toArray());
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);

  const foodsMap = useMemo(() => new Map((foods ?? []).map((f) => [f.id!, f])), [foods]);

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Retour
        </button>
        <h1 className="text-xl font-extrabold">Recettes</h1>
        <Btn small onClick={() => setCreating(true)}>
          ＋
        </Btn>
      </div>

      <p className="text-xs text-stone-500 mb-3 px-1">
        📥 Import de tes fiches de recettes existantes : envoie-moi le format exact de tes fiches
        (voir la PR) et je code l'import par collage.
      </p>

      {(recipes ?? []).map((r) => {
        const tot = recipeTotals(r, foodsMap);
        const per = scaleTotals(tot, 1 / (r.portions || 1));
        return (
          <Card key={r.id} className="mb-2" onClick={() => setEditing(r)}>
            <div className="flex justify-between items-baseline">
              <span className="font-semibold">🍲 {r.name}</span>
              <span className="text-xs text-stone-400">{r.portions} portion(s)</span>
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              Par portion : {Math.round(per.kcal)} kcal · P {round1(per.proteins)} g ·{" "}
              {per.cost.toFixed(2)} €
            </div>
          </Card>
        );
      })}
      {(recipes ?? []).length === 0 && (
        <p className="text-sm text-stone-500 px-1">Aucune recette pour l'instant.</p>
      )}

      <RecipeEditModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        recipe={editing ?? undefined}
      />
    </div>
  );
}

function RecipeEditModal({
  open,
  onClose,
  recipe,
}: {
  open: boolean;
  onClose: () => void;
  recipe?: Recipe;
}) {
  const foods = useLiveQuery(() => db.foods.toArray());
  const [r, setR] = useState<Recipe>({ name: "", ingredients: [], portions: 2 });
  const [q, setQ] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setR(recipe ? JSON.parse(JSON.stringify(recipe)) : { name: "", ingredients: [], portions: 2 });
    setQ("");
  }
  if (!open && prevOpen) setPrevOpen(false);

  const foodsMap = useMemo(() => new Map((foods ?? []).map((f) => [f.id!, f])), [foods]);
  const tot = recipeTotals(r, foodsMap);
  const per = scaleTotals(tot, 1 / (r.portions || 1));

  const hits = q
    ? (foods ?? [])
        .filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
    : [];

  async function save() {
    if (!r.name.trim() || r.ingredients.length === 0) return;
    if (recipe?.id) await db.recipes.update(recipe.id, r as any);
    else await db.recipes.add(r);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={recipe ? "Modifier la recette" : "Nouvelle recette"}>
      <div className="grid grid-cols-[1fr_6rem] gap-x-2">
        <Field label="Nom">
          <input className={inputCls} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
        </Field>
        <Field label="Portions">
          <NumInput value={r.portions} decimal step={0.5} onChange={(v) => setR({ ...r, portions: v ?? 1 })} />
        </Field>
      </div>

      <p className="text-sm text-stone-400 mb-1">Ingrédients (pesés en g) :</p>
      {r.ingredients.map((ing, i) => {
        const f = foodsMap.get(ing.foodId);
        return (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <span className="flex-1 text-sm">{f?.name ?? "?"}</span>
            <NumInput
              value={ing.grams}
              decimal
              onChange={(v) => {
                const next = { ...r, ingredients: [...r.ingredients] };
                next.ingredients[i] = { ...ing, grams: v ?? 0 };
                setR(next);
              }}
              className="!py-1.5 !w-20 text-center"
            />
            <span className="text-xs text-stone-500">g</span>
            <button
              className="text-stone-600"
              onClick={() => setR({ ...r, ingredients: r.ingredients.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </div>
        );
      })}

      <input
        className={inputCls + " mb-1"}
        placeholder="Ajouter un ingrédient…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.map((f) => (
        <button
          key={f.id}
          className="block w-full text-left text-sm py-1.5 px-2 active:bg-stone-800 rounded-lg"
          onClick={() => {
            setR({ ...r, ingredients: [...r.ingredients, { foodId: f.id!, grams: 100 }] });
            setQ("");
          }}
        >
          {f.name} <span className="text-xs text-stone-500">({Math.round(f.kcal)} kcal/100 g)</span>
        </button>
      ))}

      <Card className="!bg-stone-800 my-3 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Total recette</span>
          <span>
            {Math.round(tot.kcal)} kcal · {tot.cost.toFixed(2)} €
          </span>
        </div>
        <div className="flex justify-between text-stone-400 text-xs mt-1">
          <span>Par portion</span>
          <span>
            {Math.round(per.kcal)} kcal · P {round1(per.proteins)} · G {round1(per.carbs)} · L{" "}
            {round1(per.fats)} · fibres {round1(per.fiber)} g · {per.cost.toFixed(2)} €
          </span>
        </div>
      </Card>

      <div className="flex gap-2">
        <Btn onClick={save} disabled={!r.name.trim() || r.ingredients.length === 0} className="flex-1">
          Enregistrer
        </Btn>
        {recipe?.id && (
          <Btn
            kind="danger"
            onClick={async () => {
              if (confirm("Supprimer cette recette ?")) {
                await db.recipes.delete(recipe.id!);
                onClose();
              }
            }}
          >
            🗑
          </Btn>
        )}
      </div>
    </Modal>
  );
}

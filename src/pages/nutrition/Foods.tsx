// Base d'aliments : macros /100 g (préremplies CIQUAL), prix au kg ou à l'unité.
// Inclut la lecture de tickets de caisse par IA pour renseigner les prix.
import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, getSettings } from "../../db/db";
import type { Food } from "../../db/types";
import { Btn, Card, Field, Modal, NumInput, Spinner, inputCls } from "../../components/ui";
import { readReceipt } from "../../lib/ai";

export default function Foods() {
  const navigate = useNavigate();
  const foods = useLiveQuery(() => db.foods.toArray());
  const settings = useLiveQuery(() => getSettings());
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Food | null>(null);
  const [creating, setCreating] = useState(false);
  const [receiptRows, setReceiptRows] = useState<{ name: string; price: number; approxKg?: number }[] | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const list = (foods ?? [])
    .filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  async function onReceiptFile(f: File) {
    setReceiptLoading(true);
    setReceiptError("");
    try {
      const buf = await f.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const b64 = btoa(binary);
      const rows = await readReceipt(b64, f.type || "image/jpeg");
      setReceiptRows(rows);
    } catch (e: any) {
      setReceiptError(e.message);
    } finally {
      setReceiptLoading(false);
    }
  }

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Retour
        </button>
        <h1 className="text-xl font-extrabold">Aliments</h1>
        <Btn small onClick={() => setCreating(true)}>
          ＋
        </Btn>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          className={inputCls}
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Btn
          kind="ghost"
          disabled={!settings?.ai.apiKey}
          onClick={() => fileRef.current?.click()}
          className="whitespace-nowrap"
        >
          🧾 Ticket
        </Btn>
      </div>
      {!settings?.ai.apiKey && (
        <p className="text-[11px] text-stone-600 mb-2 px-1">
          🧾 Lecture de ticket de caisse : nécessite une clé API (Réglages).
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onReceiptFile(f);
          e.target.value = "";
        }}
      />
      {receiptLoading && <Spinner />}
      {receiptError && <p className="text-sm text-red-400 mb-2">{receiptError}</p>}

      {list.map((f) => (
        <Card key={f.id} className="mb-1.5 !py-2.5" onClick={() => setEditing(f)}>
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-sm">{f.name}</span>
            <span className="text-xs text-stone-400 tabular-nums">
              {Math.round(f.kcal)} kcal · P {f.proteins}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-stone-500">
            <span>{f.source === "ciqual" ? "CIQUAL" : "perso"}</span>
            <span>
              {f.price
                ? f.priceType === "unit"
                  ? `${f.price.toFixed(2)} €/unité (${f.unitGrams ?? "?"} g)`
                  : `${f.price.toFixed(2)} €/kg`
                : "prix non renseigné"}
            </span>
          </div>
        </Card>
      ))}

      <FoodEditModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        food={editing ?? undefined}
      />

      <Modal open={receiptRows !== null} onClose={() => setReceiptRows(null)} title="Ticket lu 🧾">
        <p className="text-xs text-stone-400 mb-3">
          Associe chaque ligne à un aliment existant (mise à jour du prix) ou crée un nouvel
          aliment avec ce prix.
        </p>
        {(receiptRows ?? []).map((row, i) => (
          <ReceiptRow
            key={i}
            row={row}
            foods={foods ?? []}
            onDone={() => setReceiptRows((rows) => rows?.filter((_, j) => j !== i) ?? null)}
          />
        ))}
        {(receiptRows ?? []).length === 0 && (
          <p className="text-sm text-stone-500">Toutes les lignes ont été traitées ✓</p>
        )}
      </Modal>
    </div>
  );
}

function ReceiptRow({
  row,
  foods,
  onDone,
}: {
  row: { name: string; price: number; approxKg?: number };
  foods: Food[];
  onDone: () => void;
}) {
  const [target, setTarget] = useState<number | "new">("new");
  const pricePerKg = row.approxKg ? row.price / row.approxKg : undefined;
  return (
    <div className="border-b border-stone-800 py-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{row.name}</span>
        <span>
          {row.price.toFixed(2)} €{pricePerKg ? ` (${pricePerKg.toFixed(2)} €/kg)` : ""}
        </span>
      </div>
      <div className="flex gap-2">
        <select className={inputCls + " !py-1.5 text-sm"} value={target} onChange={(e) => setTarget(e.target.value === "new" ? "new" : Number(e.target.value))}>
          <option value="new">➕ Créer un aliment</option>
          {foods
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
        </select>
        <Btn
          small
          onClick={async () => {
            if (target === "new") {
              await db.foods.add({
                name: row.name,
                kcal: 0,
                proteins: 0,
                carbs: 0,
                fats: 0,
                fiber: 0,
                priceType: pricePerKg ? "kg" : "unit",
                price: pricePerKg ?? row.price,
                unitGrams: pricePerKg ? undefined : undefined,
                source: "user",
              });
            } else {
              await db.foods.update(target, {
                priceType: pricePerKg ? "kg" : "unit",
                price: pricePerKg ?? row.price,
              } as any);
            }
            onDone();
          }}
        >
          OK
        </Btn>
      </div>
    </div>
  );
}

function FoodEditModal({ open, onClose, food }: { open: boolean; onClose: () => void; food?: Food }) {
  const [f, setF] = useState<Food>({
    name: "",
    kcal: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    source: "user",
  });
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setF(
      food ?? { name: "", kcal: 0, proteins: 0, carbs: 0, fats: 0, fiber: 0, source: "user" },
    );
  }
  if (!open && prevOpen) setPrevOpen(false);

  const set = (k: keyof Food) => (v: any) => setF({ ...f, [k]: v });

  async function save() {
    if (!f.name.trim()) return;
    if (food?.id) await db.foods.update(food.id, f as any);
    else await db.foods.add({ ...f, source: "user" });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={food ? "Modifier l'aliment" : "Nouvel aliment"}>
      <Field label="Nom">
        <input className={inputCls} value={f.name} onChange={(e) => set("name")(e.target.value)} />
      </Field>
      <p className="text-xs text-stone-500 mb-2">Valeurs pour 100 g :</p>
      <div className="grid grid-cols-3 gap-x-2">
        <Field label="kcal">
          <NumInput value={f.kcal} decimal onChange={(v) => set("kcal")(v ?? 0)} />
        </Field>
        <Field label="Prot. (g)">
          <NumInput value={f.proteins} decimal onChange={(v) => set("proteins")(v ?? 0)} />
        </Field>
        <Field label="Gluc. (g)">
          <NumInput value={f.carbs} decimal onChange={(v) => set("carbs")(v ?? 0)} />
        </Field>
        <Field label="Lip. (g)">
          <NumInput value={f.fats} decimal onChange={(v) => set("fats")(v ?? 0)} />
        </Field>
        <Field label="Fibres (g)">
          <NumInput value={f.fiber} decimal onChange={(v) => set("fiber")(v ?? 0)} />
        </Field>
      </div>
      <p className="text-xs text-stone-500 mb-2">Prix :</p>
      <div className="grid grid-cols-3 gap-x-2">
        <Field label="Type">
          <select
            className={inputCls}
            value={f.priceType ?? "kg"}
            onChange={(e) => set("priceType")(e.target.value as "kg" | "unit")}
          >
            <option value="kg">€ / kg</option>
            <option value="unit">€ / unité</option>
          </select>
        </Field>
        <Field label="Prix (€)">
          <NumInput value={f.price} decimal step={0.1} onChange={(v) => set("price")(v)} />
        </Field>
        {f.priceType === "unit" && (
          <Field label="g / unité">
            <NumInput value={f.unitGrams} onChange={(v) => set("unitGrams")(v)} />
          </Field>
        )}
      </div>
      <div className="flex gap-2">
        <Btn onClick={save} disabled={!f.name.trim()} className="flex-1">
          Enregistrer
        </Btn>
        {food?.id && (
          <Btn
            kind="danger"
            onClick={async () => {
              if (confirm("Supprimer cet aliment ?")) {
                await db.foods.delete(food.id!);
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

// Saisie running / stretching (création et édition via ?edit=id).
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { db } from "../../db/db";
import type { Workout } from "../../db/types";
import { Btn, Card, Chip, Field, NumInput, inputCls } from "../../components/ui";
import { paceStr } from "../../lib/stats";
import { todayISO } from "../../lib/dates";

const ZONES = ["Hanches", "Ischios", "Quadriceps", "Mollets", "Dos", "Épaules", "Nuque", "Poignets", "Chevilles"];

export default function CardioForm() {
  const { type } = useParams<{ type: "running" | "stretching" }>();
  const [params] = useSearchParams();
  const editId = params.get("edit") ? Number(params.get("edit")) : null;
  const navigate = useNavigate();
  const running = type === "running";

  const [w, setW] = useState<Workout>({
    date: todayISO(),
    type: (type as any) ?? "running",
    name: running ? "Footing" : "Mobilité",
    zones: [],
  });

  useEffect(() => {
    if (editId) db.workouts.get(editId).then((x) => x && setW(x));
  }, [editId]);

  async function save() {
    if (editId) await db.workouts.update(editId, w as any);
    else await db.workouts.add(w);
    navigate("/training");
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Retour
        </button>
        <h1 className="text-xl font-extrabold">{running ? "🏃 Running" : "🧘 Stretching / mobilité"}</h1>
        <span className="w-12" />
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-x-3">
          <Field label="Date">
            <input type="date" className={inputCls} value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} />
          </Field>
          <Field label="Nom">
            <input className={inputCls} value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} />
          </Field>
        </div>

        {running ? (
          <>
            <div className="grid grid-cols-2 gap-x-3">
              <Field label="Distance (km)">
                <NumInput value={w.distanceKm} decimal step={0.1} onChange={(v) => setW({ ...w, distanceKm: v })} />
              </Field>
              <Field label="Durée (min)">
                <NumInput value={w.durationMin} decimal step={0.5} onChange={(v) => setW({ ...w, durationMin: v })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <Field label="FC moyenne (opt.)">
                <NumInput value={w.avgHr} onChange={(v) => setW({ ...w, avgHr: v })} />
              </Field>
              <Field label="Allure">
                <div className={inputCls + " text-stone-400"}>{paceStr(w.distanceKm, w.durationMin)}</div>
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Durée (min)">
              <NumInput value={w.durationMin} onChange={(v) => setW({ ...w, durationMin: v })} />
            </Field>
            <Field label="Zones travaillées">
              <div>
                {ZONES.map((z) => (
                  <Chip
                    key={z}
                    active={(w.zones ?? []).includes(z)}
                    onClick={() =>
                      setW({
                        ...w,
                        zones: (w.zones ?? []).includes(z)
                          ? (w.zones ?? []).filter((x) => x !== z)
                          : [...(w.zones ?? []), z],
                      })
                    }
                  >
                    {z}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}

        <Field label={`Ressenti : ${w.feeling ?? "—"}/5`}>
          <input
            type="range"
            min={1}
            max={5}
            value={w.feeling ?? 3}
            onChange={(e) => setW({ ...w, feeling: Number(e.target.value) })}
            className="w-full accent-orange-600"
          />
        </Field>
        <Field label="Notes (opt.)">
          <input className={inputCls} value={w.notes ?? ""} onChange={(e) => setW({ ...w, notes: e.target.value })} />
        </Field>

        <div className="flex gap-2">
          <Btn onClick={save} className="flex-1">
            Enregistrer
          </Btn>
          {editId && (
            <Btn
              kind="danger"
              onClick={async () => {
                if (confirm("Supprimer cette séance ?")) {
                  await db.workouts.delete(editId);
                  navigate("/training");
                }
              }}
            >
              🗑
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}

// Poids (courbe + moyenne mobile 7 j — la seule qui compte), mensurations,
// composition corporelle (% masse grasse, masse maigre estimée).
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, getSettings } from "../../db/db";
import { fmtDateShort, todayISO } from "../../lib/dates";
import { movingAverage } from "../../lib/stats";
import { Btn, Card, Field, Modal, NumInput, SectionTitle, inputCls } from "../../components/ui";
import { C2, INK_MUTED, TrendLine } from "../../components/charts";
import type { Measurement } from "../../db/types";

const MEASURE_FIELDS: [keyof Measurement, string][] = [
  ["taille", "Tour de taille"],
  ["poitrine", "Poitrine"],
  ["epaules", "Épaules"],
  ["brasG", "Bras G"],
  ["brasD", "Bras D"],
  ["cuisseG", "Cuisse G"],
  ["cuisseD", "Cuisse D"],
  ["molletG", "Mollet G"],
  ["molletD", "Mollet D"],
];

export default function Body() {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => getSettings());
  const weights = useLiveQuery(() => db.weights.orderBy("date").toArray());
  const measurements = useLiveQuery(() => db.measurements.orderBy("date").toArray());
  const comps = useLiveQuery(() => db.bodyComp.orderBy("date").toArray());
  const [kg, setKg] = useState<number | undefined>();
  const [measureOpen, setMeasureOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);

  if (!settings) return null;

  const wData = movingAverage(
    (weights ?? []).map((w) => ({ x: fmtDateShort(w.date), kg: w.kg })),
    "kg",
    7,
  ).map((d) => ({ ...d, mm7: d.ma }));

  const lastW = (weights ?? []).at(-1);
  const lastComp = (comps ?? []).at(-1);
  const leanMass =
    lastW && lastComp ? Math.round(lastW.kg * (1 - lastComp.fatPct / 100) * 10) / 10 : null;

  async function addWeight() {
    if (!kg) return;
    const today = todayISO();
    const existing = (weights ?? []).find((w) => w.date === today);
    if (existing) await db.weights.update(existing.id!, { kg });
    else await db.weights.add({ date: today, kg });
    setKg(undefined);
  }

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Retour
        </button>
        <h1 className="text-xl font-extrabold">Poids & corps</h1>
        <span className="w-12" />
      </div>

      <Card className="mb-3">
        <div className="flex gap-2 items-end mb-3">
          <div className="flex-1">
            <Field label={`Poids du jour (dernier : ${lastW ? `${lastW.kg} kg` : "—"})`}>
              <NumInput value={kg} decimal step={0.1} placeholder="78,4" onChange={setKg} />
            </Field>
          </div>
          <Btn onClick={addWeight} disabled={!kg} className="mb-3">
            OK
          </Btn>
        </div>
        {wData.length > 1 ? (
          <>
            <TrendLine
              data={wData}
              xKey="x"
              series={[
                { key: "kg", name: "Poids (kg)", color: INK_MUTED, dots: true },
                { key: "mm7", name: "Moyenne 7 j (kg)" },
              ]}
              refY={settings.goals.weightTarget}
              refLabel={`objectif ${settings.goals.weightTarget} kg`}
              yDomain={["dataMin", "auto"]}
            />
            <div className="flex gap-4 justify-center mt-1 text-[11px] text-stone-400">
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: INK_MUTED }} />
                Poids brut
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: "#ea580c" }} />
                Moyenne mobile 7 j
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-500 text-center py-3">
            Saisis ton poids régulièrement pour voir la courbe et la moyenne mobile 7 jours.
          </p>
        )}
      </Card>

      <SectionTitle
        action={
          <Btn small kind="ghost" onClick={() => setMeasureOpen(true)}>
            ＋ Mesure
          </Btn>
        }
      >
        Mensurations (cm)
      </SectionTitle>
      <Card className="mb-3 overflow-x-auto">
        {(measurements ?? []).length ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 text-left">
                <th className="font-normal pb-1 pr-2">Date</th>
                {MEASURE_FIELDS.map(([k, l]) => (
                  <th key={k} className="font-normal pb-1 pr-2 whitespace-nowrap">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(measurements ?? [])
                .slice()
                .reverse()
                .map((m) => (
                  <tr key={m.id} className="border-t border-stone-800">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDateShort(m.date)}</td>
                    {MEASURE_FIELDS.map(([k]) => (
                      <td key={k} className="py-1.5 pr-2 tabular-nums">
                        {(m[k] as number | undefined) ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-stone-500 text-center py-2">Aucune mesure.</p>
        )}
      </Card>

      <SectionTitle
        action={
          <Btn small kind="ghost" onClick={() => setCompOpen(true)}>
            ＋ Compo
          </Btn>
        }
      >
        Composition corporelle
      </SectionTitle>
      <Card className="mb-6">
        {lastComp && (
          <p className="text-sm mb-2">
            Dernière estimation : <b>{lastComp.fatPct} %</b> de masse grasse
            {leanMass && (
              <>
                {" "}
                → masse maigre ≈ <b>{leanMass} kg</b>
              </>
            )}
          </p>
        )}
        {(comps ?? []).length > 1 ? (
          <TrendLine
            data={(comps ?? []).map((c) => ({ x: fmtDateShort(c.date), pct: c.fatPct }))}
            xKey="x"
            series={[{ key: "pct", name: "Masse grasse (%)", color: C2, dots: true }]}
            height={160}
          />
        ) : (
          <p className="text-sm text-stone-500 text-center py-2">
            Saisis tes estimations (balance impédancemètre, pince…) pour suivre l'évolution.
          </p>
        )}
      </Card>

      <MeasureModal open={measureOpen} onClose={() => setMeasureOpen(false)} />
      <CompModal open={compOpen} onClose={() => setCompOpen(false)} />
    </div>
  );
}

function MeasureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [m, setM] = useState<Measurement>({ date: todayISO() });
  return (
    <Modal open={open} onClose={onClose} title="Nouvelles mensurations (cm)">
      <Field label="Date">
        <input type="date" className={inputCls} value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-x-3">
        {MEASURE_FIELDS.map(([k, l]) => (
          <Field key={k} label={l}>
            <NumInput
              value={m[k] as number | undefined}
              decimal
              step={0.5}
              onChange={(v) => setM({ ...m, [k]: v })}
            />
          </Field>
        ))}
      </div>
      <Btn
        className="w-full"
        onClick={async () => {
          await db.measurements.add(m);
          setM({ date: todayISO() });
          onClose();
        }}
      >
        Enregistrer
      </Btn>
    </Modal>
  );
}

function CompModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [pct, setPct] = useState<number | undefined>();
  return (
    <Modal open={open} onClose={onClose} title="Composition corporelle">
      <Field label="Date">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Masse grasse (%)" hint="Saisie manuelle : balance impédancemètre, pince, DEXA…">
        <NumInput value={pct} decimal step={0.1} onChange={setPct} />
      </Field>
      <Btn
        className="w-full"
        disabled={!pct}
        onClick={async () => {
          await db.bodyComp.add({ date, fatPct: pct! });
          setPct(undefined);
          onClose();
        }}
      >
        Enregistrer
      </Btn>
    </Modal>
  );
}

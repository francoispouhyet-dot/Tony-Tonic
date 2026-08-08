// Statistiques d'évolution : tonnage hebdo, volume par groupe, séries dures,
// progression par exercice (charge, e1RM Epley, records), running.
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db } from "../../db/db";
import {
  exerciseHistory,
  exerciseRecords,
  weeklyRunning,
  weeklyStrengthStats,
} from "../../lib/stats";
import { fmtDateShort } from "../../lib/dates";
import { Card, SectionTitle, inputCls } from "../../components/ui";
import { TrendLine, WeekBars, C2, C3 } from "../../components/charts";

export default function TrainingStats() {
  const navigate = useNavigate();
  const workouts = useLiveQuery(() => db.workouts.toArray());
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [exId, setExId] = useState<number | null>(null);

  const exMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id!, e])), [exercises]);
  const weekly = useMemo(
    () => weeklyStrengthStats(workouts ?? [], exMap),
    [workouts, exMap],
  );
  const runs = useMemo(() => weeklyRunning(workouts ?? []), [workouts]);

  const selectedId = exId ?? exercises?.[0]?.id ?? null;
  const hist = useMemo(
    () => (selectedId ? exerciseHistory(workouts ?? [], selectedId) : []),
    [workouts, selectedId],
  );
  const rec = selectedId ? exerciseRecords(workouts ?? [], selectedId) : null;

  const lastWeek = weekly.at(-1);
  const prevWeek = weekly.at(-2);
  const delta =
    lastWeek && prevWeek && prevWeek.tonnage > 0
      ? Math.round(((lastWeek.tonnage - prevWeek.tonnage) / prevWeek.tonnage) * 100)
      : null;

  const tonnageData = weekly.map((wk) => ({ x: fmtDateShort(wk.week), tonnage: Math.round(wk.tonnage) }));
  const histData = hist.map((h) => ({
    x: fmtDateShort(h.date),
    e1rm: Math.round(h.e1rm * 10) / 10,
    charge: h.topWeight,
  }));
  const runData = runs.map((r) => ({ x: fmtDateShort(r.week), km: Math.round(r.km * 10) / 10 }));

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Retour
        </button>
        <h1 className="text-xl font-extrabold">Statistiques</h1>
        <span className="w-12" />
      </div>

      <SectionTitle>Tonnage hebdomadaire (kg)</SectionTitle>
      <Card>
        {delta !== null && (
          <p className="text-xs text-stone-400 mb-1">
            Semaine en cours vs précédente :{" "}
            <span className={delta >= 0 ? "text-green-400" : "text-red-400"}>
              {delta >= 0 ? "+" : ""}
              {delta} %
            </span>
          </p>
        )}
        {tonnageData.length ? (
          <WeekBars data={tonnageData} xKey="x" yKey="tonnage" name="Tonnage (kg)" />
        ) : (
          <Empty />
        )}
      </Card>

      <SectionTitle>Volume par groupe musculaire (semaine en cours)</SectionTitle>
      <Card>
        {lastWeek ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-stone-500 text-xs text-left">
                <th className="pb-1 font-normal">Groupe</th>
                <th className="pb-1 font-normal text-right">Tonnage</th>
                <th className="pb-1 font-normal text-right">Séries dures</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(lastWeek.byGroup)
                .sort((a, b) => b[1].tonnage - a[1].tonnage)
                .map(([g, v]) => (
                  <tr key={g} className="border-t border-stone-800">
                    <td className="py-1.5">{g}</td>
                    <td className="py-1.5 text-right tabular-nums">{Math.round(v.tonnage)} kg</td>
                    <td className="py-1.5 text-right tabular-nums">{v.hardSets}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <Empty />
        )}
        <p className="text-[11px] text-stone-600 mt-2">
          Série dure = RIR ≤ 2 (ou non renseigné). Le tonnage d'une série compte pour chaque
          groupe travaillé par l'exercice.
        </p>
      </Card>

      <SectionTitle>Par exercice</SectionTitle>
      <Card>
        <select
          className={inputCls + " mb-3"}
          value={selectedId ?? ""}
          onChange={(e) => setExId(Number(e.target.value))}
        >
          {(exercises ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {rec && (
          <div className="flex gap-4 text-sm mb-2">
            <div>
              <span className="text-stone-500">Record charge : </span>
              <span className="font-bold">{rec.maxWeight} kg</span>
              <span className="text-stone-600 text-xs"> ({fmtDateShort(rec.maxWeightDate)})</span>
            </div>
            <div>
              <span className="text-stone-500">Meilleur e1RM : </span>
              <span className="font-bold">{Math.round(rec.bestE1RM)} kg</span>
              <span className="text-stone-600 text-xs"> ({fmtDateShort(rec.bestE1RMDate)})</span>
            </div>
          </div>
        )}
        {histData.length ? (
          <>
            <TrendLine
              data={histData}
              xKey="x"
              series={[
                { key: "e1rm", name: "e1RM estimé (kg)", dots: true },
                { key: "charge", name: "Charge max (kg)", color: C2, dots: true },
              ]}
            />
            <div className="flex gap-4 justify-center mt-1 text-[11px] text-stone-400">
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: "#ea580c" }} />
                e1RM estimé
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: C2 }} />
                Charge max
              </span>
            </div>
          </>
        ) : (
          <Empty />
        )}
      </Card>

      <SectionTitle>Running — volume hebdo (km)</SectionTitle>
      <Card className="mb-6">
        {runData.length ? <WeekBars data={runData} xKey="x" yKey="km" name="Distance (km)" color={C3} /> : <Empty />}
      </Card>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-stone-500 py-4 text-center">Pas encore de données.</p>;
}

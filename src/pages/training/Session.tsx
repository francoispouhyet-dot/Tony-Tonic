// Saisie en séance de musculation — le cœur de l'app.
// Objectif : logger une série en 3 taps max. « + Série » ajoute une série
// pré-remplie avec la précédente (ou la dernière séance similaire) et lance
// le chrono de repos, qui pré-remplit le temps de repos à l'arrêt.
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { db, getSettings } from "../../db/db";
import type { Exercise, Workout, WorkoutEntry, WorkoutSet } from "../../db/types";
import { Btn, Card, Modal, NumInput, Spinner, MiniMarkdown, inputCls, Field } from "../../components/ui";
import ExerciseEditModal, { PhotoThumb } from "../../components/ExerciseEdit";
import RestTimer from "../../components/RestTimer";
import { epley, workoutTonnage } from "../../lib/stats";
import { analyzeWorkout } from "../../lib/ai";

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const wid = Number(id);
  const workout = useLiveQuery(() => db.workouts.get(wid), [wid]);
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const settings = useLiveQuery(() => getSettings());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [timerFor, setTimerFor] = useState<{ entryIdx: number; setIdx: number } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const exMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id!, e])), [exercises]);

  if (!workout || !exercises || !settings) return <Spinner />;
  const w = workout;

  async function patch(p: Partial<Workout>) {
    await db.workouts.update(wid, p as any);
  }

  async function updateEntries(fn: (entries: WorkoutEntry[]) => WorkoutEntry[]) {
    const entries = fn(JSON.parse(JSON.stringify(w.entries ?? [])));
    await patch({ entries });
  }

  /** Dernière série connue pour un exercice (séance en cours, sinon historique). */
  async function prefillFor(exerciseId: number, entry?: WorkoutEntry): Promise<WorkoutSet> {
    if (entry && entry.sets.length) return { ...entry.sets[entry.sets.length - 1] };
    const all = await db.workouts.where("type").equals("strength").toArray();
    const prev = all
      .filter((x) => x.id !== wid)
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((x) => x.entries ?? [])
      .find((e) => e.exerciseId === exerciseId);
    if (prev?.sets.length) {
      const s = prev.sets[0];
      return { weight: s.weight, reps: s.reps, rir: s.rir };
    }
    return { weight: 20, reps: 10 };
  }

  async function addSet(entryIdx: number) {
    const entry = (w.entries ?? [])[entryIdx];
    const prefill = await prefillFor(entry.exerciseId, entry);
    await updateEntries((es) => {
      es[entryIdx].sets.push(prefill);
      return es;
    });
    // fin de série → on lance le chrono de repos pour CETTE série
    setTimerFor({ entryIdx, setIdx: entry.sets.length });
  }

  async function addExercise(exId: number) {
    if ((w.entries ?? []).some((e) => e.exerciseId === exId)) return setPickerOpen(false);
    await updateEntries((es) => [...es, { exerciseId: exId, sets: [] }]);
    setPickerOpen(false);
  }

  async function runAnalysis() {
    setAiLoading(true);
    setAiError("");
    try {
      const analysis = await analyzeWorkout(w);
      await patch({ aiAnalysis: analysis });
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const tonnage = Math.round(workoutTonnage(w));
  const hasKey = !!settings.ai.apiKey;

  return (
    <div className="pt-4 pb-32">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Retour
        </button>
        <input
          className="bg-transparent text-xl font-extrabold text-center outline-none w-40"
          value={w.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <input
          type="date"
          className="bg-transparent text-xs text-stone-400 outline-none w-[7.2rem]"
          value={w.date}
          onChange={(e) => patch({ date: e.target.value })}
        />
      </div>
      <div className="text-center text-xs text-stone-400 mb-3">
        Tonnage : <span className="text-stone-200 font-semibold">{tonnage} kg</span>
        {w.endedAt && <span className="text-green-400 ml-2">séance terminée ✓</span>}
      </div>

      {(w.entries ?? []).map((entry, ei) => {
        const ex = exMap.get(entry.exerciseId);
        return (
          <Card key={ei} className="mb-3">
            <div className="flex items-center gap-3 mb-2">
              <PhotoThumb blob={ex?.photo} />
              <div className="flex-1">
                <div className="font-bold">{ex?.name ?? "Exercice supprimé"}</div>
                <div className="text-[11px] text-stone-500">{(ex?.muscleGroups ?? []).join(" · ")}</div>
              </div>
              <button
                className="text-stone-600 px-2"
                onClick={() => {
                  if (confirm("Retirer cet exercice de la séance ?"))
                    updateEntries((es) => es.filter((_, i) => i !== ei));
                }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-[1.6rem_1fr_1fr_4.4rem_3.4rem_1.4rem] gap-1.5 items-center text-[11px] text-stone-500 px-0.5 mb-1">
              <span>#</span>
              <span>kg</span>
              <span>reps</span>
              <span>RIR</span>
              <span>repos</span>
              <span />
            </div>
            {entry.sets.map((s, si) => (
              <div key={si} className="grid grid-cols-[1.6rem_1fr_1fr_4.4rem_3.4rem_1.4rem] gap-1.5 items-center mb-1.5">
                <span className="text-stone-500 text-sm">{si + 1}</span>
                <NumInput
                  value={s.weight}
                  decimal
                  step={0.5}
                  onChange={(v) =>
                    updateEntries((es) => {
                      es[ei].sets[si].weight = v ?? 0;
                      return es;
                    })
                  }
                  className="!py-2 text-center font-semibold"
                />
                <NumInput
                  value={s.reps}
                  onChange={(v) =>
                    updateEntries((es) => {
                      es[ei].sets[si].reps = v ?? 0;
                      return es;
                    })
                  }
                  className="!py-2 text-center font-semibold"
                />
                <select
                  className="bg-stone-800 rounded-lg px-1 py-2 text-sm text-center"
                  value={s.rir ?? ""}
                  onChange={(e) =>
                    updateEntries((es) => {
                      es[ei].sets[si].rir = e.target.value === "" ? undefined : Number(e.target.value);
                      return es;
                    })
                  }
                >
                  <option value="">—</option>
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  className="text-xs text-stone-400 bg-stone-800 rounded-lg py-2"
                  onClick={() => setTimerFor({ entryIdx: ei, setIdx: si })}
                  title="Lancer le chrono de repos"
                >
                  {s.restSec ? `${s.restSec}s` : "⏱"}
                </button>
                <button
                  className="text-stone-600"
                  onClick={() =>
                    updateEntries((es) => {
                      es[ei].sets.splice(si, 1);
                      return es;
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between mt-2">
              <Btn small kind="ghost" onClick={() => addSet(ei)}>
                ＋ Série
              </Btn>
              {entry.sets.length > 0 && (
                <span className="text-[11px] text-stone-500">
                  e1RM max :{" "}
                  {Math.round(Math.max(...entry.sets.map((s) => epley(s.weight, s.reps))))} kg
                </span>
              )}
            </div>
          </Card>
        );
      })}

      <Btn kind="ghost" className="w-full mb-2" onClick={() => setPickerOpen(true)}>
        ＋ Ajouter un exercice
      </Btn>
      <Btn className="w-full" onClick={() => setFinishOpen(true)}>
        Terminer la séance
      </Btn>

      {w.aiAnalysis && (
        <Card className="mt-3">
          <div className="font-bold mb-1">🤖 Analyse de Tony</div>
          <MiniMarkdown text={w.aiAnalysis} />
        </Card>
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exercises}
        onPick={addExercise}
        onCreate={() => {
          setPickerOpen(false);
          setCreateOpen(true);
        }}
      />
      <ExerciseEditModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={addExercise} />

      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Fin de séance">
        <Field label={`Ressenti : ${w.feeling ?? "—"}/5`}>
          <input
            type="range"
            min={1}
            max={5}
            value={w.feeling ?? 3}
            onChange={(e) => patch({ feeling: Number(e.target.value) })}
            className="w-full accent-orange-600"
          />
        </Field>
        <Field label="Notes (optionnel)">
          <textarea
            className={inputCls}
            rows={2}
            value={w.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>
        <Btn
          className="w-full mb-2"
          onClick={async () => {
            await patch({ endedAt: w.endedAt ?? Date.now() });
            setFinishOpen(false);
            if (hasKey && !w.aiAnalysis) runAnalysis();
          }}
        >
          Valider la séance
        </Btn>
        <Btn
          kind="ghost"
          className="w-full"
          disabled={!hasKey || aiLoading}
          onClick={() => {
            setFinishOpen(false);
            runAnalysis();
          }}
        >
          {hasKey ? "Analyse IA de la séance" : "Analyse IA (clé API requise — voir Réglages)"}
        </Btn>
      </Modal>

      {aiLoading && (
        <Card className="mt-3">
          <div className="text-sm text-stone-400">Tony analyse ta séance…</div>
          <Spinner />
        </Card>
      )}
      {aiError && <p className="text-sm text-red-400 mt-2">{aiError}</p>}

      <RestTimer
        running={timerFor !== null}
        onStop={(sec) => {
          if (timerFor) {
            const { entryIdx, setIdx } = timerFor;
            updateEntries((es) => {
              if (es[entryIdx]?.sets[setIdx]) es[entryIdx].sets[setIdx].restSec = sec;
              return es;
            });
          }
          setTimerFor(null);
        }}
      />
    </div>
  );
}

function ExercisePicker({
  open,
  onClose,
  exercises,
  onPick,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onPick: (id: number) => void;
  onCreate: () => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);
  const list = exercises
    .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Modal open={open} onClose={onClose} title="Choisir un exercice">
      <input
        className={inputCls + " mb-3"}
        placeholder="Rechercher…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-72 overflow-y-auto">
        {list.map((e) => (
          <button
            key={e.id}
            className="w-full flex items-center gap-3 py-2 px-1 active:bg-stone-800 rounded-xl text-left"
            onClick={() => onPick(e.id!)}
          >
            <PhotoThumb blob={e.photo} size={36} />
            <div>
              <div className="font-medium text-sm">{e.name}</div>
              <div className="text-[11px] text-stone-500">{e.muscleGroups.join(" · ")}</div>
            </div>
          </button>
        ))}
        {list.length === 0 && <p className="text-sm text-stone-500 py-2">Aucun résultat.</p>}
      </div>
      <Btn kind="ghost" className="w-full mt-2" onClick={onCreate}>
        ＋ Créer « {q || "nouvel exercice"} »
      </Btn>
    </Modal>
  );
}

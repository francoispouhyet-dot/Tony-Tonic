import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { db, getSettings } from "../../db/db";
import { fmtDate, todayISO } from "../../lib/dates";
import { sessionForDate } from "../../lib/cycle";
import { paceStr, workoutTonnage } from "../../lib/stats";
import { Btn, Card, SectionTitle } from "../../components/ui";
import type { Workout } from "../../db/types";

/** Crée une séance muscu vide et renvoie son id. */
export async function startStrengthSession(name: string): Promise<number> {
  const id = await db.workouts.add({
    date: todayISO(),
    type: "strength",
    name,
    startedAt: Date.now(),
    entries: [],
  });
  return id as number;
}

/** Duplique la dernière séance du même nom comme modèle (mêmes exos et séries). */
export async function duplicateLastSession(name: string): Promise<number | null> {
  const all = await db.workouts.where("type").equals("strength").toArray();
  const last = all
    .filter((w) => w.name === name && (w.entries?.length ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return null;
  const id = await db.workouts.add({
    date: todayISO(),
    type: "strength",
    name,
    startedAt: Date.now(),
    entries: (last.entries ?? []).map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets.map((s) => ({ ...s })),
    })),
  });
  return id as number;
}

function WorkoutRow({ w, exNames }: { w: Workout; exNames: Map<number, string> }) {
  const navigate = useNavigate();
  const desc =
    w.type === "strength"
      ? `${(w.entries ?? []).length} exos · ${Math.round(workoutTonnage(w))} kg`
      : w.type === "running"
        ? `${w.distanceKm ?? "?"} km · ${paceStr(w.distanceKm, w.durationMin)}`
        : `${w.durationMin ?? "?"} min · ${(w.zones ?? []).join(", ")}`;
  const icon = w.type === "strength" ? "🏋️" : w.type === "running" ? "🏃" : "🧘";
  return (
    <Card
      className="mb-2 flex items-center justify-between"
      onClick={() => {
        if (w.type === "strength") navigate(`/session/${w.id}`);
        else navigate(`/cardio/${w.type}?edit=${w.id}`);
      }}
    >
      <div>
        <div className="font-semibold">
          {icon} {w.name}
        </div>
        <div className="text-xs text-stone-400">
          {fmtDate(w.date)} · {desc}
        </div>
      </div>
      <span className="text-stone-500">›</span>
    </Card>
  );
}

export default function Training() {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => getSettings());
  const workouts = useLiveQuery(async () =>
    (await db.workouts.orderBy("date").reverse().limit(30).toArray()).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  );
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const exNames = new Map((exercises ?? []).map((e) => [e.id!, e.name]));

  if (!settings) return null;
  const planned = sessionForDate(settings.cycle, todayISO());

  async function start(dupe: boolean) {
    let id: number | null = null;
    if (dupe) id = await duplicateLastSession(planned);
    if (id === null) id = await startStrengthSession(planned);
    navigate(`/session/${id}`);
  }

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-extrabold">Entraînement</h1>

      <Card className="mt-3">
        <div className="text-xs text-stone-400 mb-1">Aujourd'hui selon ton cycle</div>
        <div className="text-xl font-bold mb-3">{planned}</div>
        <div className="flex gap-2">
          <Btn onClick={() => start(true)} className="flex-1">
            Dupliquer la dernière {planned !== "Repos" ? planned : "séance"}
          </Btn>
          <Btn kind="ghost" onClick={() => start(false)} className="flex-1">
            Séance vide
          </Btn>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Btn kind="ghost" onClick={() => navigate("/cardio/running")}>
          🏃 Running
        </Btn>
        <Btn kind="ghost" onClick={() => navigate("/cardio/stretching")}>
          🧘 Stretching
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <Link to="/training/stats" className="block">
          <Btn kind="ghost" className="w-full">
            📈 Statistiques
          </Btn>
        </Link>
        <Link to="/training/exercises" className="block">
          <Btn kind="ghost" className="w-full">
            📚 Exercices
          </Btn>
        </Link>
      </div>

      <SectionTitle>Historique</SectionTitle>
      {(workouts ?? []).map((w) => (
        <WorkoutRow key={w.id} w={w} exNames={exNames} />
      ))}
      {(workouts ?? []).length === 0 && (
        <p className="text-sm text-stone-500 px-1">Aucune séance pour l'instant.</p>
      )}
    </div>
  );
}

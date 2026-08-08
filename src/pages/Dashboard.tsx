import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { db, getSettings } from "../db/db";
import { todayISO, fmtDate } from "../lib/dates";
import { sessionForDate, cycleDayIndex } from "../lib/cycle";
import { mealsTotals } from "../lib/nutrition";
import { Card, Ring, Btn } from "../components/ui";
import { C1, C2, C3 } from "../components/charts";
import { startStrengthSession } from "./training/Training";

export default function Dashboard() {
  const navigate = useNavigate();
  const today = todayISO();
  const settings = useLiveQuery(() => getSettings());
  const meals = useLiveQuery(() => db.meals.where("date").equals(today).toArray(), [today]);
  const steps = useLiveQuery(() => db.steps.get(today), [today]);
  const lastWeight = useLiveQuery(async () => {
    const all = await db.weights.orderBy("date").toArray();
    return all.at(-1);
  });
  const todayWorkouts = useLiveQuery(() => db.workouts.where("date").equals(today).toArray(), [today]);

  if (!settings) return null;
  const totals = mealsTotals(meals ?? []);
  const kcalLeft = Math.round(settings.goals.kcal - totals.kcal);
  const planned = sessionForDate(settings.cycle, today);
  const dayIdx = cycleDayIndex(settings.cycle, today);
  const doneToday = (todayWorkouts ?? []).length > 0;

  async function quickStart() {
    const id = await startStrengthSession(planned);
    navigate(`/session/${id}`);
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            Tony <span className="text-orange-500">Tonic</span>
          </h1>
          <p className="text-xs text-stone-400 capitalize">{fmtDate(today)}</p>
        </div>
        <Link to="/settings" className="text-2xl p-2" aria-label="Réglages">
          ⚙️
        </Link>
      </div>

      <Card className="mb-3">
        <div className="flex justify-around">
          <Ring
            value={totals.kcal}
            max={settings.goals.kcal}
            color={C1}
            label={`${kcalLeft >= 0 ? kcalLeft : 0}`}
            sub={kcalLeft >= 0 ? "kcal restantes" : `+${-kcalLeft} kcal`}
          />
          <Ring
            value={totals.proteins}
            max={settings.goals.proteins}
            color={C2}
            label={`${Math.round(totals.proteins)} g`}
            sub={`prot. / ${settings.goals.proteins}`}
          />
          <Ring
            value={steps?.count ?? 0}
            max={settings.goals.stepsTarget}
            color={C3}
            label={`${((steps?.count ?? 0) / 1000).toFixed(1)}k`}
            sub={`pas / ${settings.goals.stepsTarget / 1000}k`}
          />
        </div>
      </Card>

      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">
              Séance prévue — jour {dayIdx}/{settings.cycle.days.length} du cycle
            </div>
            <div className="text-xl font-bold">
              {planned}
              {doneToday && <span className="text-green-400 text-sm ml-2">✓ séance faite</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-400">Dernier poids</div>
            <div className="text-xl font-bold">
              {lastWeight ? `${lastWeight.kg} kg` : "—"}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Btn onClick={quickStart} className="text-center">
          ▶ Démarrer une séance
        </Btn>
        <Btn kind="ghost" onClick={() => navigate(`/nutrition/meal/${today}`)} className="text-center">
          ＋ Ajouter un repas
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Card onClick={() => navigate("/body")}>
          <div className="text-xs text-stone-400 mb-1">Poids & mensurations</div>
          <div className="font-semibold text-sm">
            Objectif {settings.goals.weightTarget} kg →
          </div>
        </Card>
        <Card onClick={() => navigate("/training/stats")}>
          <div className="text-xs text-stone-400 mb-1">Statistiques</div>
          <div className="font-semibold text-sm">Tonnage, e1RM, records →</div>
        </Card>
      </div>
    </div>
  );
}

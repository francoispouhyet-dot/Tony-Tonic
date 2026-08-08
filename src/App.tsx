import { useLiveQuery } from "dexie-react-hooks";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { db } from "./db/db";
import { daysSinceBackup } from "./db/backup";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Training from "./pages/training/Training";
import Session from "./pages/training/Session";
import CardioForm from "./pages/training/CardioForm";
import TrainingStats from "./pages/training/TrainingStats";
import Exercises from "./pages/training/Exercises";
import Nutrition from "./pages/nutrition/Nutrition";
import MealForm from "./pages/nutrition/MealForm";
import Foods from "./pages/nutrition/Foods";
import Recipes from "./pages/nutrition/Recipes";
import Body from "./pages/body/Body";
import Health from "./pages/health/Health";
import Tony from "./pages/ai/Tony";

const tabs = [
  { to: "/", label: "Accueil", icon: "🏠" },
  { to: "/training", label: "Entraîn.", icon: "🏋️" },
  { to: "/nutrition", label: "Nutrition", icon: "🍽️" },
  { to: "/health", label: "Santé", icon: "❤️" },
  { to: "/tony", label: "Tony", icon: "🤖" },
];

export default function App() {
  // undefined = requête en cours ; null = aucun réglage (premier lancement)
  const settings = useLiveQuery(async () => (await db.settings.get("app")) ?? null);
  const location = useLocation();
  const inSession = location.pathname.startsWith("/session/");

  if (settings === undefined) return null; // chargement Dexie
  if (!settings || !settings.onboarded) return <Onboarding />;

  const staleDays = daysSinceBackup(settings.lastBackupAt);
  const showBackupNag = staleDays === null || staleDays >= 7;

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-24">
      {showBackupNag && !inSession && (
        <NavLink
          to="/settings"
          className="block bg-amber-900/40 text-amber-200 text-xs px-4 py-2 text-center"
        >
          {staleDays === null
            ? "Aucune sauvegarde effectuée — pense à exporter tes données (Réglages)."
            : `Dernière sauvegarde il y a ${staleDays} j — pense à exporter tes données.`}
        </NavLink>
      )}
      <div className="px-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/training" element={<Training />} />
          <Route path="/session/:id" element={<Session />} />
          <Route path="/cardio/:type" element={<CardioForm />} />
          <Route path="/training/stats" element={<TrainingStats />} />
          <Route path="/training/exercises" element={<Exercises />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/nutrition/meal/:date" element={<MealForm />} />
          <Route path="/nutrition/foods" element={<Foods />} />
          <Route path="/nutrition/recipes" element={<Recipes />} />
          <Route path="/body" element={<Body />} />
          <Route path="/health" element={<Health />} />
          <Route path="/tony" element={<Tony />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {!inSession && (
        <nav className="fixed bottom-0 inset-x-0 bg-stone-900/95 backdrop-blur border-t border-stone-800 pb-[env(safe-area-inset-bottom)] z-40">
          <div className="max-w-lg mx-auto flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center py-2 text-[11px] ${
                    isActive ? "text-orange-400 font-semibold" : "text-stone-400"
                  }`
                }
              >
                <span className="text-xl leading-none mb-0.5">{t.icon}</span>
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

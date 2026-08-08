// « Demande à Tony » — fonctions IA. Toutes grisées avec explication si la clé
// API est absente ; l'app reste 100 % fonctionnelle sans.
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { getSettings } from "../../db/db";
import {
  askTony,
  calorieAdjustment,
  fatigueCheck,
  painStressAnalysis,
  weeklyReport,
} from "../../lib/ai";
import { Btn, Card, MiniMarkdown, Spinner, inputCls } from "../../components/ui";

const ACTIONS: { key: string; icon: string; title: string; desc: string; run: () => Promise<string> }[] = [
  {
    key: "weekly",
    icon: "📋",
    title: "Bilan hebdomadaire",
    desc: "Croise entraînement × nutrition × poids × sommeil × stress × douleurs.",
    run: weeklyReport,
  },
  {
    key: "fatigue",
    icon: "🔋",
    title: "Détection de fatigue",
    desc: "RIR, charges, sommeil, stress : faut-il un deload ?",
    run: fatigueCheck,
  },
  {
    key: "pain",
    icon: "🩹",
    title: "Douleurs & stress",
    desc: "Patterns et corrélations sur 4 semaines. Non médical.",
    run: painStressAnalysis,
  },
  {
    key: "calories",
    icon: "🍚",
    title: "Ajuster mes calories",
    desc: "Proposition basée sur la courbe de poids réelle vs objectif.",
    run: calorieAdjustment,
  },
];

export default function Tony() {
  const settings = useLiveQuery(() => getSettings());
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<{ title: string; text: string }[]>([]);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");

  if (!settings) return null;
  const hasKey = !!settings.ai.apiKey;

  async function run(key: string, title: string, fn: () => Promise<string>) {
    setBusy(key);
    setError("");
    try {
      const text = await fn();
      setResults((r) => [{ title, text }, ...r]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pt-4 pb-8">
      <h1 className="text-2xl font-extrabold mb-1">🤖 Tony</h1>
      <p className="text-xs text-stone-400 mb-3">
        Analyses IA via l'API Anthropic. Seules les données strictement nécessaires à chaque
        analyse sont envoyées. Modèles : {settings.ai.modelQuick} / {settings.ai.modelDeep}.
      </p>

      {!hasKey && (
        <Card className="mb-3 border border-amber-800/50">
          <p className="text-sm text-amber-200">
            Les fonctions IA sont désactivées : aucune clé API Anthropic configurée.
            <Link to="/settings" className="underline ml-1">
              Ajouter ma clé dans Réglages
            </Link>
            . L'app fonctionne intégralement sans — l'IA est un enrichissement, jamais un
            prérequis.
          </p>
        </Card>
      )}

      <div className="flex gap-2 mb-3">
        <input
          className={inputCls}
          placeholder="Demande à Tony… (ex. « mon squat progresse-t-il ? »)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!hasKey}
        />
        <Btn
          disabled={!hasKey || !question.trim() || busy !== null}
          onClick={() => {
            const q = question.trim();
            setQuestion("");
            run("ask", `« ${q} »`, () => askTony(q));
          }}
        >
          →
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            disabled={!hasKey || busy !== null}
            onClick={() => run(a.key, a.title, a.run)}
            className={`text-left bg-stone-900 rounded-2xl p-3 ${
              !hasKey || busy !== null ? "opacity-40" : "active:bg-stone-800"
            }`}
          >
            <div className="text-xl mb-1">{a.icon}</div>
            <div className="font-semibold text-sm">{a.title}</div>
            <div className="text-[11px] text-stone-500 leading-tight mt-0.5">{a.desc}</div>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-stone-600 mb-3">
        💡 L'analyse de fin de séance se lance depuis l'écran de séance ; la lecture de tickets
        de caisse depuis Nutrition → Aliments.
      </p>

      {busy && (
        <Card className="mb-3">
          <div className="text-sm text-stone-400">Tony réfléchit…</div>
          <Spinner />
        </Card>
      )}
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {results.map((r, i) => (
        <Card key={i} className="mb-3">
          <div className="font-bold mb-1">{r.title}</div>
          <MiniMarkdown text={r.text} />
        </Card>
      ))}
    </div>
  );
}

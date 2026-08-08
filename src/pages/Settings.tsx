import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, saveSettings } from "../db/db";
import { downloadBackup, importAll } from "../db/backup";
import { loadDemoData, clearAllData } from "../db/seed";
import { Btn, Card, Field, NumInput, SectionTitle, inputCls } from "../components/ui";
import type { AppSettings } from "../db/types";

export default function Settings() {
  const live = useLiveQuery(() => getSettings());
  const [s, setS] = useState<AppSettings | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (live && !s) setS(live);
  }, [live]); // eslint-disable-line

  if (!s) return null;

  async function persist(patch: Partial<AppSettings>) {
    const next = { ...s!, ...patch };
    setS(next);
    await saveSettings(patch);
  }

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-extrabold mb-1">Réglages</h1>

      <SectionTitle>Objectifs</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-x-3">
          {(
            [
              ["kcal", "Calories (kcal/j)", 50],
              ["proteins", "Protéines (g/j)", 5],
              ["carbs", "Glucides (g/j)", 5],
              ["fats", "Lipides (g/j)", 5],
              ["fiber", "Fibres (g/j)", 1],
              ["weightTarget", "Objectif poids (kg)", 0.5],
              ["stepsTarget", "Pas / jour", 500],
            ] as const
          ).map(([key, label, step]) => (
            <Field key={key} label={label}>
              <NumInput
                value={s.goals[key]}
                step={step}
                decimal={step < 1}
                onChange={(v) => persist({ goals: { ...s.goals, [key]: v ?? 0 } })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <SectionTitle>Cycle d'entraînement</SectionTitle>
      <Card>
        <Field label="Jours du cycle (séparés par des virgules)">
          <textarea
            className={inputCls}
            rows={2}
            defaultValue={s.cycle.days.join(", ")}
            onBlur={(e) =>
              persist({
                cycle: {
                  ...s.cycle,
                  days: e.target.value.split(",").map((d) => d.trim()).filter(Boolean),
                },
              })
            }
          />
        </Field>
        <Field label="Date du jour 1 du cycle">
          <input
            type="date"
            className={inputCls}
            value={s.cycle.anchorDate}
            onChange={(e) => persist({ cycle: { ...s.cycle, anchorDate: e.target.value } })}
          />
        </Field>
      </Card>

      <SectionTitle>Fonctions IA (Anthropic)</SectionTitle>
      <Card>
        <Field
          label="Clé API Anthropic"
          hint="Stockée uniquement sur cet appareil. Jamais incluse dans les exports. Sans clé, les fonctions IA sont désactivées — le reste de l'app fonctionne normalement."
        >
          <input
            type="password"
            className={inputCls}
            placeholder="sk-ant-…"
            value={s.ai.apiKey}
            onChange={(e) => persist({ ai: { ...s.ai, apiKey: e.target.value.trim() } })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-x-3">
          <Field label="Modèle rapide (séances)">
            <select
              className={inputCls}
              value={s.ai.modelQuick}
              onChange={(e) => persist({ ai: { ...s.ai, modelQuick: e.target.value } })}
            >
              <option value="claude-haiku-4-5">Haiku 4.5 (éco)</option>
              <option value="claude-sonnet-5">Sonnet 5</option>
            </select>
          </Field>
          <Field label="Modèle bilans (hebdo)">
            <select
              className={inputCls}
              value={s.ai.modelDeep}
              onChange={(e) => persist({ ai: { ...s.ai, modelDeep: e.target.value } })}
            >
              <option value="claude-sonnet-5">Sonnet 5 (recommandé)</option>
              <option value="claude-haiku-4-5">Haiku 4.5 (éco)</option>
            </select>
          </Field>
        </div>
      </Card>

      <SectionTitle>Sauvegarde</SectionTitle>
      <Card>
        <p className="text-xs text-stone-400 mb-3">
          Export complet en JSON (photos incluses). Garde ce fichier en lieu sûr : c'est ta seule
          sauvegarde, les données ne quittent jamais l'appareil.
        </p>
        <div className="flex gap-2">
          <Btn onClick={() => downloadBackup().then(() => setMsg("Sauvegarde téléchargée ✓"))} className="flex-1">
            Exporter
          </Btn>
          <Btn kind="ghost" onClick={() => fileRef.current?.click()} className="flex-1">
            Importer
          </Btn>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!confirm("L'import remplace TOUTES les données actuelles. Continuer ?")) return;
            try {
              setMsg(await importAll(f));
            } catch (err: any) {
              setMsg(`Erreur : ${err.message}`);
            }
            e.target.value = "";
          }}
        />
        {msg && <p className="text-sm text-orange-300 mt-2">{msg}</p>}
      </Card>

      <SectionTitle>Données</SectionTitle>
      <Card>
        <div className="flex gap-2">
          <Btn
            kind="ghost"
            className="flex-1"
            onClick={async () => {
              await loadDemoData();
              setMsg("Données de démo chargées ✓");
            }}
          >
            Charger la démo
          </Btn>
          <Btn
            kind="danger"
            className="flex-1"
            onClick={async () => {
              if (!confirm("Effacer TOUTES les données (sauf réglages) ? Action irréversible.")) return;
              await clearAllData();
              setMsg("Données effacées.");
            }}
          >
            Tout effacer
          </Btn>
        </div>
        <p className="text-xs text-stone-500 mt-2">
          « Charger la démo » remplit l'app de données d'exemple pour valider les écrans.
          « Tout effacer » nettoie tout avant de saisir tes vraies données (les aliments CIQUAL
          et tes réglages sont conservés).
        </p>
      </Card>

      <p className="text-center text-xs text-stone-600 my-6">
        Tony Tonic — 100 % local, aucune donnée envoyée sauf appels IA explicites.
      </p>
    </div>
  );
}

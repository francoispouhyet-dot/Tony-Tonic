// Santé générale : sommeil, stress, douleurs, pas + import Apple Santé.
import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "../../db/db";
import { addDays, fmtDateShort, todayISO } from "../../lib/dates";
import { parseAppleHealthExport, saveAppleImport } from "../../lib/appleHealth";
import { Btn, Card, Chip, Field, Modal, NumInput, Ring, SectionTitle, inputCls } from "../../components/ui";
import { C2, C3, TrendLine, WeekBars } from "../../components/charts";

const STRESS_SOURCES = ["travail", "dossiers", "perso", "sommeil", "autre"];
const EMOTIONS = ["tension", "fatigue", "irritabilité", "inquiétude", "surcharge", "sérénité", "motivation"];
const PAIN_ZONES = [
  "Épaule gauche", "Épaule droite", "Coude", "Poignet", "Nuque", "Haut du dos",
  "Lombaires", "Hanche", "Genou gauche", "Genou droit", "Cheville", "Autre",
];

export default function Health() {
  const today = todayISO();
  const settings = useLiveQuery(() => getSettings());
  const sleep = useLiveQuery(() => db.sleep.orderBy("date").toArray());
  const stress = useLiveQuery(() => db.stress.orderBy("date").toArray());
  const pains = useLiveQuery(() => db.pains.orderBy("date").reverse().toArray());
  const steps = useLiveQuery(() => db.steps.orderBy("date").toArray());
  const todaySteps = (steps ?? []).find((s) => s.date === today);

  const [sleepOpen, setSleepOpen] = useState(false);
  const [stressOpen, setStressOpen] = useState(false);
  const [painOpen, setPainOpen] = useState(false);
  const [stepsVal, setStepsVal] = useState<number | undefined>();
  const [importPct, setImportPct] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!settings) return null;

  const last14sleep = (sleep ?? []).slice(-14).map((s) => ({ x: fmtDateShort(s.date), h: s.hours }));
  const last14stress = (stress ?? []).slice(-14).map((s) => ({ x: fmtDateShort(s.date), n: s.level }));
  const last14steps = (steps ?? []).slice(-14).map((s) => ({ x: fmtDateShort(s.date), pas: s.count }));
  const weekAvgSteps = (() => {
    const from = addDays(today, -6);
    const wk = (steps ?? []).filter((s) => s.date >= from);
    return wk.length ? Math.round(wk.reduce((a, s) => a + s.count, 0) / wk.length) : 0;
  })();

  async function importApple(f: File) {
    setImportPct(0);
    setImportMsg("");
    try {
      const { steps: st, sleep: sl } = await parseAppleHealthExport(f, setImportPct);
      const res = await saveAppleImport(st, sl);
      setImportMsg(
        `Import terminé : ${res.stepsDays} jours de pas, ${res.sleepNights} nuits de sommeil.` +
          (res.skippedManual ? ` ${res.skippedManual} saisies manuelles conservées.` : ""),
      );
    } catch (e: any) {
      setImportMsg(`Erreur d'import : ${e.message}`);
    } finally {
      setImportPct(null);
    }
  }

  return (
    <div className="pt-4 pb-8">
      <h1 className="text-2xl font-extrabold mb-3">Santé</h1>

      {/* -------- Pas -------- */}
      <Card className="mb-3">
        <div className="flex items-center gap-4">
          <Ring
            value={todaySteps?.count ?? 0}
            max={settings.goals.stepsTarget}
            color={C3}
            label={`${todaySteps?.count ?? 0}`}
            sub={`/ ${settings.goals.stepsTarget} pas`}
          />
          <div className="flex-1">
            <div className="text-sm text-stone-400 mb-1">Moyenne 7 j : {weekAvgSteps} pas</div>
            <div className="flex gap-2">
              <NumInput value={stepsVal} placeholder="Pas du jour" onChange={setStepsVal} className="!py-2" />
              <Btn
                small
                disabled={!stepsVal}
                onClick={async () => {
                  await db.steps.put({ date: today, count: stepsVal!, source: "manual" });
                  setStepsVal(undefined);
                }}
              >
                OK
              </Btn>
            </div>
          </div>
        </div>
        {last14steps.length > 1 && (
          <div className="mt-2">
            <WeekBars data={last14steps} xKey="x" yKey="pas" name="Pas" height={120} color={C3} />
          </div>
        )}
      </Card>

      {/* -------- Sommeil -------- */}
      <SectionTitle
        action={
          <Btn small kind="ghost" onClick={() => setSleepOpen(true)}>
            ＋ Nuit
          </Btn>
        }
      >
        Sommeil
      </SectionTitle>
      <Card className="mb-3">
        {last14sleep.length > 1 ? (
          <TrendLine data={last14sleep} xKey="x" series={[{ key: "h", name: "Heures", color: C2, dots: true }]} height={140} refY={8} refLabel="8 h" />
        ) : (
          <p className="text-sm text-stone-500 text-center py-2">Saisis tes nuits ou importe Apple Santé.</p>
        )}
      </Card>

      {/* -------- Stress -------- */}
      <SectionTitle
        action={
          <Btn small kind="ghost" onClick={() => setStressOpen(true)}>
            ＋ Aujourd'hui
          </Btn>
        }
      >
        Stress
      </SectionTitle>
      <Card className="mb-3">
        {last14stress.length > 1 ? (
          <TrendLine data={last14stress} xKey="x" series={[{ key: "n", name: "Stress (1-10)" }]} height={140} yDomain={[0, 10]} />
        ) : (
          <p className="text-sm text-stone-500 text-center py-2">Déclare ton niveau de stress quotidien (1-10).</p>
        )}
        {(stress ?? []).length > 0 && <StressRecap stress={stress!} />}
      </Card>

      {/* -------- Douleurs -------- */}
      <SectionTitle
        action={
          <Btn small kind="ghost" onClick={() => setPainOpen(true)}>
            ＋ Douleur
          </Btn>
        }
      >
        Douleurs
      </SectionTitle>
      <Card className="mb-3">
        {(pains ?? []).slice(0, 8).map((p) => (
          <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-stone-800 last:border-0 text-sm">
            <div>
              <span className="font-medium">{p.zone}</span>
              <span className="text-stone-500 text-xs"> · {fmtDateShort(p.date)}</span>
              {p.context && <div className="text-xs text-stone-500">{p.context}</div>}
            </div>
            <span
              className={`font-bold tabular-nums ${p.intensity >= 7 ? "text-red-400" : p.intensity >= 4 ? "text-amber-400" : "text-stone-300"}`}
            >
              {p.intensity}/10
            </span>
          </div>
        ))}
        {(pains ?? []).length === 0 && (
          <p className="text-sm text-stone-500 text-center py-2">Aucune douleur signalée 👍</p>
        )}
        <p className="text-[11px] text-stone-600 mt-2">
          ⚕️ Tony Tonic ne fournit pas d'avis médical. Si une douleur est aiguë, persistante ou
          inquiétante, consulte un professionnel de santé.
        </p>
      </Card>

      {/* -------- Import Apple Santé -------- */}
      <SectionTitle>Import Apple Santé</SectionTitle>
      <Card className="mb-6">
        <p className="text-xs text-stone-400 mb-2">
          Depuis l'app Santé sur iPhone : photo de profil → « Exporter toutes les données » →
          dézippe et sélectionne <b>export.xml</b> ici (ou le .zip non dézippé n'est pas accepté).
          Récupère pas + sommeil en masse, avec déduplication (la meilleure source par jour ;
          tes saisies manuelles sont conservées).
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xml,text/xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importApple(f);
            e.target.value = "";
          }}
        />
        <Btn kind="ghost" className="w-full" onClick={() => fileRef.current?.click()} disabled={importPct !== null}>
          {importPct !== null ? `Analyse… ${importPct} %` : "Choisir export.xml"}
        </Btn>
        {importMsg && <p className="text-sm text-orange-300 mt-2">{importMsg}</p>}
      </Card>

      <SleepModal open={sleepOpen} onClose={() => setSleepOpen(false)} />
      <StressModal open={stressOpen} onClose={() => setStressOpen(false)} />
      <PainModal open={painOpen} onClose={() => setPainOpen(false)} />
    </div>
  );
}

function StressRecap({ stress }: { stress: { sources?: string[] }[] }) {
  const counts = new Map<string, number>();
  for (const s of stress) for (const src of s.sources ?? []) counts.set(src, (counts.get(src) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!top.length) return null;
  return (
    <p className="text-xs text-stone-500 mt-1">
      Sources récurrentes : {top.map(([s, n]) => `${s} (${n}×)`).join(" · ")}
    </p>
  );
}

function SleepModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState<number | undefined>();
  const [quality, setQuality] = useState<number | undefined>();
  return (
    <Modal open={open} onClose={onClose} title="Nuit de sommeil">
      <Field label="Date (jour du réveil)">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Heures de sommeil">
        <NumInput value={hours} decimal step={0.25} placeholder="7,5" onChange={setHours} />
      </Field>
      <Field label={`Qualité (optionnel) : ${quality ?? "—"}/5`}>
        <input
          type="range"
          min={1}
          max={5}
          value={quality ?? 3}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full accent-orange-600"
        />
      </Field>
      <Btn
        className="w-full"
        disabled={!hours}
        onClick={async () => {
          const existing = await db.sleep.where("date").equals(date).and((s) => s.source === "manual").first();
          if (existing) await db.sleep.update(existing.id!, { hours: hours!, quality });
          else await db.sleep.add({ date, hours: hours!, quality, source: "manual" });
          setHours(undefined);
          onClose();
        }}
      >
        Enregistrer
      </Btn>
    </Modal>
  );
}

function StressModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [level, setLevel] = useState(5);
  const [sources, setSources] = useState<string[]>([]);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <Modal open={open} onClose={onClose} title="Stress du jour">
      <Field label={`Niveau : ${level}/10`}>
        <input
          type="range"
          min={1}
          max={10}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="w-full accent-orange-600"
        />
      </Field>
      <Field label="Sources principales (optionnel)">
        <div>
          {STRESS_SOURCES.map((s) => (
            <Chip key={s} active={sources.includes(s)} onClick={() => toggle(sources, setSources, s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Émotions prédominantes (optionnel)">
        <div>
          {EMOTIONS.map((e) => (
            <Chip key={e} active={emotions.includes(e)} onClick={() => toggle(emotions, setEmotions, e)}>
              {e}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Champ libre (optionnel)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Btn
        className="w-full"
        onClick={async () => {
          const today = todayISO();
          const existing = await db.stress.where("date").equals(today).first();
          const data = { date: today, level, sources, emotions, note };
          if (existing) await db.stress.update(existing.id!, data);
          else await db.stress.add(data);
          onClose();
        }}
      >
        Enregistrer
      </Btn>
    </Modal>
  );
}

function PainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [zone, setZone] = useState(PAIN_ZONES[0]);
  const [intensity, setIntensity] = useState(3);
  const [context, setContext] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Signaler une douleur">
      <Field label="Zone">
        <select className={inputCls} value={zone} onChange={(e) => setZone(e.target.value)}>
          {PAIN_ZONES.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
      </Field>
      <Field label={`Intensité : ${intensity}/10`}>
        <input
          type="range"
          min={1}
          max={10}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="w-full accent-orange-600"
        />
      </Field>
      <Field label="Contexte (exercice associé, moment…)">
        <input
          className={inputCls}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="ex. fin de Push, développé militaire"
        />
      </Field>
      <p className="text-[11px] text-stone-600 mb-3">
        ⚕️ Rappel : pas d'avis médical ici. Douleur aiguë, persistante ou inquiétante → consulte.
      </p>
      <Btn
        className="w-full"
        onClick={async () => {
          await db.pains.add({ date: todayISO(), zone, intensity, context });
          setContext("");
          onClose();
        }}
      >
        Enregistrer
      </Btn>
    </Modal>
  );
}

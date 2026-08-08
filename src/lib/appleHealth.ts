// Import de l'export Apple Santé (fichier export.xml, éventuellement très gros).
// Lecture en flux par morceaux + regex, pour ne jamais charger tout le fichier
// en mémoire. On extrait les pas et le sommeil, avec déduplication :
//  - Pas : somme par (jour, source), puis on garde la source la plus complète
//    par jour (évite le double comptage iPhone + Apple Watch).
//  - Sommeil : somme des phases "Asleep*" par nuit (attribuée à la date de fin),
//    même règle de meilleure source.
// À l'enregistrement : les entrées "apple" existantes sont remplacées ; une
// saisie manuelle existante pour la même date est conservée (le manuel gagne).
import { db } from "../db/db";
import type { ISODate } from "../db/types";
import { localISO } from "./dates";

export interface AppleImportResult {
  stepsDays: number;
  sleepNights: number;
  skippedManual: number;
}

const RECORD_RE =
  /<Record[^>]*type="(HKQuantityTypeIdentifierStepCount|HKCategoryTypeIdentifierSleepAnalysis)"[^>]*\/>/g;

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1];
}

function parseAppleDate(s: string): Date {
  // format: 2024-05-01 07:31:12 +0200
  return new Date(s.replace(" ", "T").replace(" ", ""));
}

export async function parseAppleHealthExport(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ steps: Map<ISODate, number>; sleep: Map<ISODate, number> }> {
  const stepsBySource = new Map<string, Map<ISODate, number>>();
  const sleepBySource = new Map<string, Map<ISODate, number>>();

  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let read = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.byteLength;
    buffer += decoder.decode(value, { stream: true });

    let match: RegExpExecArray | null;
    let lastIndex = 0;
    RECORD_RE.lastIndex = 0;
    while ((match = RECORD_RE.exec(buffer))) {
      lastIndex = RECORD_RE.lastIndex;
      const tag = match[0];
      const type = match[1];
      const source = attr(tag, "sourceName") ?? "?";
      if (type === "HKQuantityTypeIdentifierStepCount") {
        const value = parseFloat(attr(tag, "value") ?? "0");
        const start = attr(tag, "startDate");
        if (!start || !value) continue;
        const day = localISO(parseAppleDate(start));
        let m = stepsBySource.get(source);
        if (!m) stepsBySource.set(source, (m = new Map()));
        m.set(day, (m.get(day) ?? 0) + value);
      } else {
        const v = attr(tag, "value") ?? "";
        // On ne compte que les phases de sommeil réel
        if (!/Asleep/.test(v)) continue;
        const start = attr(tag, "startDate");
        const end = attr(tag, "endDate");
        if (!start || !end) continue;
        const s = parseAppleDate(start);
        const e = parseAppleDate(end);
        const hours = (e.getTime() - s.getTime()) / 3600000;
        if (hours <= 0 || hours > 24) continue;
        const night = localISO(e); // nuit attribuée au jour du réveil
        let m = sleepBySource.get(source);
        if (!m) sleepBySource.set(source, (m = new Map()));
        m.set(night, (m.get(night) ?? 0) + hours);
      }
    }
    // garde la fin du buffer (balise potentiellement coupée)
    buffer = buffer.slice(Math.max(lastIndex, buffer.length - 4096));
    onProgress?.(Math.min(99, Math.round((read / file.size) * 100)));
  }

  // Meilleure source par jour : celle qui totalise le plus sur l'ensemble
  const steps = bestSourcePerDay(stepsBySource);
  const sleep = bestSourcePerDay(sleepBySource);
  onProgress?.(100);
  return { steps, sleep };
}

function bestSourcePerDay(bySource: Map<string, Map<ISODate, number>>): Map<ISODate, number> {
  const out = new Map<ISODate, { value: number; sourceTotal: number }>();
  for (const [, days] of bySource) {
    let total = 0;
    for (const v of days.values()) total += v;
    for (const [day, value] of days) {
      const cur = out.get(day);
      // à jour égal, on garde la valeur de la source globalement la plus riche
      if (!cur || total > cur.sourceTotal) out.set(day, { value, sourceTotal: total });
    }
  }
  return new Map([...out.entries()].map(([d, v]) => [d, v.value]));
}

export async function saveAppleImport(
  steps: Map<ISODate, number>,
  sleep: Map<ISODate, number>,
): Promise<AppleImportResult> {
  let skippedManual = 0;

  await db.transaction("rw", db.steps, db.sleep, async () => {
    for (const [date, count] of steps) {
      const existing = await db.steps.get(date);
      if (existing?.source === "manual") {
        skippedManual++;
        continue;
      }
      await db.steps.put({ date, count: Math.round(count), source: "apple" });
    }
    for (const [date, hours] of sleep) {
      const manual = await db.sleep.where("date").equals(date).and((s) => s.source === "manual").first();
      if (manual) {
        skippedManual++;
        continue;
      }
      const existing = await db.sleep.where("[date+source]").equals([date, "apple"]).first();
      if (existing) await db.sleep.update(existing.id!, { hours: Math.round(hours * 10) / 10 });
      else
        await db.sleep.add({
          date,
          hours: Math.round(hours * 10) / 10,
          source: "apple",
        });
    }
  });

  return { stepsDays: steps.size, sleepNights: sleep.size, skippedManual };
}

// Export / import complet en JSON, photos incluses (blobs → base64).
import { db, getSettings, saveSettings } from "./db";

const TABLES = [
  "settings",
  "exercises",
  "workouts",
  "foods",
  "recipes",
  "meals",
  "weights",
  "measurements",
  "bodyComp",
  "sleep",
  "stress",
  "pains",
  "steps",
] as const;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string); // data URL
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function exportAll(includeApiKey = false): Promise<Blob> {
  const dump: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const rows = await (db as any)[t].toArray();
    dump[t] = await Promise.all(
      rows.map(async (row: any) => {
        const copy = { ...row };
        if (copy.photo instanceof Blob) {
          copy.photo = { __blob: await blobToBase64(copy.photo) };
        }
        if (t === "settings" && !includeApiKey && copy.ai) {
          copy.ai = { ...copy.ai, apiKey: "" };
        }
        return copy;
      }),
    );
  }
  const payload = {
    app: "tony-tonic",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: dump,
  };
  await saveSettings({ lastBackupAt: Date.now() });
  return new Blob([JSON.stringify(payload)], { type: "application/json" });
}

export async function downloadBackup() {
  const blob = await exportAll();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tony-tonic-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importAll(file: File): Promise<string> {
  const text = await file.text();
  const payload = JSON.parse(text);
  if (payload.app !== "tony-tonic" || !payload.data) {
    throw new Error("Fichier non reconnu : ce n'est pas une sauvegarde Tony Tonic.");
  }
  const currentKey = (await getSettings()).ai.apiKey;
  await db.transaction("rw", TABLES.map((t) => (db as any)[t]), async () => {
    for (const t of TABLES) {
      const rows = payload.data[t] ?? [];
      await (db as any)[t].clear();
      for (const row of rows) {
        const copy = { ...row };
        if (copy.photo?.__blob) copy.photo = await dataUrlToBlob(copy.photo.__blob);
        await (db as any)[t].put(copy);
      }
    }
  });
  // on ne perd pas la clé API locale si la sauvegarde n'en contient pas
  const s = await getSettings();
  if (!s.ai.apiKey && currentKey) await saveSettings({ ai: { ...s.ai, apiKey: currentKey } });
  return `Import réussi (${payload.exportedAt ?? "date inconnue"}).`;
}

export function daysSinceBackup(lastBackupAt?: number): number | null {
  if (!lastBackupAt) return null;
  return Math.floor((Date.now() - lastBackupAt) / 86400000);
}

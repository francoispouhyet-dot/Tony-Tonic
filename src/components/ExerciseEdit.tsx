import { useEffect, useState } from "react";
import { db } from "../db/db";
import { MUSCLE_GROUPS, type Exercise } from "../db/types";
import { Btn, Chip, Field, Modal, inputCls } from "./ui";

export function usePhotoUrl(blob?: Blob) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function PhotoThumb({ blob, size = 44 }: { blob?: Blob; size?: number }) {
  const url = usePhotoUrl(blob);
  if (!url)
    return (
      <div
        className="bg-stone-800 rounded-lg flex items-center justify-center text-stone-600"
        style={{ width: size, height: size }}
      >
        🏋️
      </div>
    );
  return <img src={url} className="rounded-lg object-cover" style={{ width: size, height: size }} />;
}

/** Réduit la photo (max 800 px) pour limiter la taille en base. */
async function shrinkImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const max = 800;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82),
  );
}

export default function ExerciseEditModal({
  open,
  onClose,
  exercise,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise; // undefined = création
  onSaved?: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [photo, setPhoto] = useState<Blob | undefined>();
  const [notes, setNotes] = useState("");
  const photoUrl = usePhotoUrl(photo);

  useEffect(() => {
    if (open) {
      setName(exercise?.name ?? "");
      setGroups(exercise?.muscleGroups ?? []);
      setPhoto(exercise?.photo);
      setNotes(exercise?.notes ?? "");
    }
  }, [open, exercise]);

  async function save() {
    if (!name.trim()) return;
    const data: Exercise = { name: name.trim(), muscleGroups: groups, photo, notes };
    let id: number;
    if (exercise?.id) {
      await db.exercises.update(exercise.id, data as any);
      id = exercise.id;
    } else {
      id = (await db.exercises.add(data)) as number;
    }
    onSaved?.(id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={exercise ? "Modifier l'exercice" : "Nouvel exercice"}>
      <Field label="Nom">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Développé couché" />
      </Field>
      <Field label="Groupes musculaires (pour les stats)">
        <div>
          {MUSCLE_GROUPS.map((g) => (
            <Chip
              key={g}
              active={groups.includes(g)}
              onClick={() =>
                setGroups(groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g])
              }
            >
              {g}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Photo (appareil photo ou galerie)" hint="Réutilisée automatiquement à chaque séance.">
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <img src={photoUrl} className="w-20 h-20 rounded-xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-stone-800 flex items-center justify-center text-3xl">📷</div>
          )}
          <label className="flex-1">
            <span className="block text-center bg-stone-800 rounded-xl py-3 text-sm active:bg-stone-700">
              Choisir / prendre une photo
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(await shrinkImage(f));
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </Field>
      <Field label="Notes (optionnel)">
        <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Réglages banc, prise…" />
      </Field>
      <Btn onClick={save} disabled={!name.trim()} className="w-full">
        Enregistrer
      </Btn>
    </Modal>
  );
}

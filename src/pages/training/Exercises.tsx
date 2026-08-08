import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db } from "../../db/db";
import type { Exercise } from "../../db/types";
import { Btn, Card, inputCls } from "../../components/ui";
import ExerciseEditModal, { PhotoThumb } from "../../components/ExerciseEdit";

export default function Exercises() {
  const navigate = useNavigate();
  const exercises = useLiveQuery(() => db.exercises.orderBy("name").toArray());
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Exercise | undefined>();
  const [open, setOpen] = useState(false);

  const list = (exercises ?? []).filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="text-stone-400 text-sm py-2 pr-3">
          ‹ Retour
        </button>
        <h1 className="text-xl font-extrabold">Exercices</h1>
        <Btn
          small
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          ＋
        </Btn>
      </div>
      <input className={inputCls + " mb-3"} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((e) => (
        <Card
          key={e.id}
          className="mb-2 flex items-center gap-3"
          onClick={() => {
            setEditing(e);
            setOpen(true);
          }}
        >
          <PhotoThumb blob={e.photo} />
          <div className="flex-1">
            <div className="font-semibold">{e.name}</div>
            <div className="text-xs text-stone-500">{e.muscleGroups.join(" · ")}</div>
          </div>
          <button
            className="text-stone-600 px-2"
            onClick={(ev) => {
              ev.stopPropagation();
              if (confirm(`Supprimer « ${e.name} » ? (l'historique des séances le référence encore)`))
                db.exercises.delete(e.id!);
            }}
          >
            🗑
          </button>
        </Card>
      ))}
      {list.length === 0 && <p className="text-sm text-stone-500 px-1">Aucun exercice. Crée ton premier !</p>}
      <ExerciseEditModal open={open} onClose={() => setOpen(false)} exercise={editing} />
    </div>
  );
}

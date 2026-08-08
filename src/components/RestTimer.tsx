import { useEffect, useRef, useState } from "react";
import { Btn } from "./ui";

/** Chronomètre de repos : lancé en fin de série, il pré-remplit le temps de
 * repos de la série au moment de l'arrêt (ou quand la série suivante démarre). */
export default function RestTimer({
  running,
  onStop,
}: {
  running: boolean;
  onStop: (elapsedSec: number) => void;
}) {
  const [sec, setSec] = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    setSec(0);
    const it = setInterval(() => {
      setSec(Math.round((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(it);
  }, [running]);

  if (!running) return null;
  const mm = Math.floor(sec / 60);
  const ss = String(sec % 60).padStart(2, "0");

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-stone-900 border-t border-stone-700 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-stone-400">Repos</div>
          <div className="text-3xl font-bold tabular-nums">
            {mm}:{ss}
          </div>
        </div>
        <Btn onClick={() => onStop(sec)}>Fin du repos ✓</Btn>
      </div>
    </div>
  );
}

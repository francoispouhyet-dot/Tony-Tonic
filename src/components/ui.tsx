import React, { useEffect, useRef } from "react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-stone-900 rounded-2xl p-4 ${onClick ? "active:bg-stone-800 cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-5 mb-2 px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">{children}</h2>
      {action}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  kind = "primary",
  className = "",
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  kind?: "primary" | "ghost" | "danger" | "subtle";
  className?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  const base = small ? "px-3 py-1.5 rounded-lg text-sm" : "px-4 py-3 rounded-xl text-base";
  const kinds = {
    primary: "bg-orange-600 text-white font-semibold active:bg-orange-700 disabled:opacity-40",
    ghost: "bg-stone-800 text-stone-100 active:bg-stone-700 disabled:opacity-40",
    subtle: "bg-transparent text-orange-400 active:text-orange-300 disabled:opacity-40",
    danger: "bg-red-900/60 text-red-200 active:bg-red-900 disabled:opacity-40",
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${kinds[kind]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-sm text-stone-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-500 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full bg-stone-800 rounded-xl px-3 py-2.5 text-stone-100 outline-none focus:ring-2 focus:ring-orange-600";

export function NumInput({
  value,
  onChange,
  step = 1,
  placeholder,
  className = "",
  decimal = false,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  placeholder?: string;
  className?: string;
  decimal?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode={decimal ? "decimal" : "numeric"}
      step={step}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? undefined : Number(v));
      }}
      className={`${inputCls} ${className}`}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollTo(0, 0);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900 w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none px-2" aria-label="Fermer">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Anneau de progression SVG. */
export function Ring({
  value,
  max,
  size = 90,
  stroke = 9,
  color = "#ea580c",
  label,
  sub,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#292524" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="-mt-[62px] mb-[26px] text-center rotate-0">
        <div className="text-sm font-bold leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-stone-400 leading-tight">{sub}</div>}
      </div>
    </div>
  );
}

/** Barre de progression avec libellé (macros, fibres…). */
export function MacroBar({
  label,
  value,
  max,
  unit = "g",
  color = "#ea580c",
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = value > max * 1.05;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-0.5">
        <span className="text-stone-300">{label}</span>
        <span className={over ? "text-red-400" : "text-stone-400"}>
          {Math.round(value)} / {max} {unit}
        </span>
      </div>
      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm mr-1.5 mb-1.5 ${
        active ? "bg-orange-600 text-white font-medium" : "bg-stone-800 text-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

/** Rendu markdown minimal (###, listes, gras) pour les réponses IA. */
export function MiniMarkdown({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h3>$1</h3>")
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>");
  return <div className="markdown text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-4">
      <div className="w-6 h-6 border-2 border-stone-600 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}

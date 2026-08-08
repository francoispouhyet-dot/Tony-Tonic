// Graphiques Recharts — palette validée pour surface sombre #0c0a09
// (bande de luminance, séparation CVD et contraste vérifiés par script).
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const C1 = "#ea580c"; // orange — série principale
export const C2 = "#0284c7"; // bleu — série secondaire
export const C3 = "#059669"; // vert — série tertiaire
export const INK_MUTED = "#78716c";
export const GRID = "#292524";

const tooltipStyle = {
  backgroundColor: "#1c1917",
  border: "1px solid #44403c",
  borderRadius: 8,
  fontSize: 12,
};

export function TrendLine({
  data,
  xKey,
  series,
  height = 200,
  refY,
  refLabel,
  yDomain,
}: {
  data: any[];
  xKey: string;
  series: { key: string; name: string; color?: string; dashed?: boolean; dots?: boolean }[];
  height?: number;
  refY?: number;
  refLabel?: string;
  yDomain?: [number | "auto" | "dataMin", number | "auto" | "dataMax"];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: INK_MUTED, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={{ fill: INK_MUTED, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={yDomain ?? ["auto", "auto"]}
        />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#d6d3d1" }} />
        {refY !== undefined && (
          <ReferenceLine
            y={refY}
            stroke={INK_MUTED}
            strokeDasharray="4 4"
            label={{ value: refLabel, fill: INK_MUTED, fontSize: 10, position: "insideTopRight" }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? C1}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "4 3" : undefined}
            dot={s.dots ? { r: 2.5, fill: s.color ?? C1, strokeWidth: 0 } : false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WeekBars({
  data,
  xKey,
  yKey,
  name,
  height = 180,
  color = C1,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap="25%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: INK_MUTED, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={{ fill: INK_MUTED, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#d6d3d1" }} cursor={{ fill: "#292524" }} />
        <Bar dataKey={yKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

'use client';
import {
  ComposedChart, Bar, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type Row = { progress_date: string; count: number };

function genRange(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  while (d <= e) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function ProgressChart({
  rows, target, unit, deadline,
}: {
  rows: Row[];
  target: number;
  unit: string;
  deadline?: string;
}) {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const sorted = [...rows].sort((a, b) => a.progress_date.localeCompare(b.progress_date));
  const startDate = sorted.length > 0 ? sorted[0].progress_date : todayStr;
  const endDate = deadline && deadline >= startDate ? deadline : todayStr;

  const rowMap = Object.fromEntries(sorted.map((r) => [r.progress_date, Number(r.count)]));
  const dates = genRange(startDate, endDate);

  let cumulative = 0;
  const data = dates.map((date) => {
    const isPast = date <= todayStr;
    const count = isPast ? (rowMap[date] ?? 0) : undefined;
    if (isPast) cumulative += count as number;
    return {
      date: date.slice(5),
      日次実績: isPast && (count as number) > 0 ? count : undefined,
      累計: isPast ? cumulative : undefined,
    };
  });

  const yMax = Math.ceil(Math.max(cumulative, target) * 1.1);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} unit={unit} domain={[0, yMax]} />
        <Tooltip formatter={(v, name) => v != null ? [`${v} ${unit}`, String(name)] : ['-', String(name)]} />
        <Legend />
        <Bar dataKey="日次実績" fill="#667eea" opacity={0.75} />
        <Line dataKey="累計" stroke="#f5576c" strokeWidth={2} dot={false} connectNulls={false} />
        <ReferenceLine y={target} stroke="#22c55e" strokeDasharray="4 2"
          label={{ value: `目標: ${target}${unit}`, position: 'insideBottomRight', fontSize: 11, fill: '#16a34a' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

'use client';
import {
  ComposedChart, Bar, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type Row = { progress_date: string; count: number };

export default function ProgressChart({
  rows, target, unit,
}: {
  rows: Row[];
  target: number;
  unit: string;
}) {
  let cumulative = 0;
  const data = rows.map((r) => {
    cumulative += Number(r.count);
    return {
      date: r.progress_date.slice(5),
      日次実績: Number(r.count),
      累計: cumulative,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit={unit} />
        <Tooltip formatter={(v) => [`${v} ${unit}`]} />
        <Legend />
        <Bar dataKey="日次実績" fill="#667eea" opacity={0.75} />
        <Line dataKey="累計" stroke="#f5576c" strokeWidth={2} dot={false} />
        <ReferenceLine y={target} stroke="#22c55e" strokeDasharray="4 2"
          label={{ value: `目標: ${target}${unit}`, position: 'insideBottomRight', fontSize: 11, fill: '#16a34a' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

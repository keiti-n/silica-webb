import React from "react";

type Point = { t: number; value: number };
export function LineChart({ data, height = 80 }: { data: Point[]; height?: number }) {
  if (!data.length) return <svg height={height}></svg>;
  const w = 300;
  const padding = 8;
  const minV = Math.min(...data.map(d => d.value));
  const maxV = Math.max(...data.map(d => d.value));
  const range = maxV - minV || 1;
  const step = (w - padding * 2) / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = padding + i * step;
    const y = padding + (height - padding * 2) * (1 - (d.value - minV) / range);
    return `${x},${y}`;
  });

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{display:'block'}}>
      <polyline
        fill="none"
        stroke="#0C7A6B"
        strokeWidth={2}
        points={points.join(" ")}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoistureTimeline({ data, height = 40 }: { data: { t: number; state: string }[]; height?: number }) {
  if (!data.length) return <svg height={height}></svg>;
  const w = 300;
  const padding = 2;
  const step = (w - padding * 2) / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{display:'block'}}>
      {data.map((d, i) => {
        const x = padding + i * step;
        const color = d.state.toLowerCase() === "dry" ? "#FF8A3D" : d.state.toLowerCase() === "mixed" ? "#C6F16B" : "#37D6B8";
        return <rect key={i} x={x} y={0} width={Math.max(1, step-1)} height={height} fill={color} />;
      })}
    </svg>
  );
}

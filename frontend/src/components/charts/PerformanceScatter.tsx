import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from "recharts";

interface ScatterDataPoint {
  name: string;
  quality: number;
  speed: number;
  size: number;
}

interface PerformanceScatterProps {
  data: ScatterDataPoint[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterDataPoint }> }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{d.name}</p>
        <p className="text-xs text-zinc-400">
          Quality: <span className="text-zinc-200">{d.quality.toFixed(1)}</span>
        </p>
        <p className="text-xs text-zinc-400">
          Speed: <span className="text-zinc-200">{d.speed.toFixed(1)} tok/s</span>
        </p>
        <p className="text-xs text-zinc-400">
          Size: <span className="text-zinc-200">{(d.size / 1e9).toFixed(1)}B params</span>
        </p>
      </div>
    );
  }
  return null;
}

export function PerformanceScatter({ data }: PerformanceScatterProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="quality"
          name="Quality"
          tick={{ fill: "#71717a", fontSize: 11 }}
          label={{
            value: "Quality Score",
            position: "bottom",
            fill: "#71717a",
            fontSize: 12,
          }}
          domain={[0, 10]}
        />
        <YAxis
          type="number"
          dataKey="speed"
          name="Speed"
          tick={{ fill: "#71717a", fontSize: 11 }}
          label={{
            value: "Tokens/sec",
            angle: -90,
            position: "insideLeft",
            fill: "#71717a",
            fontSize: 12,
          }}
        />
        <ZAxis
          type="number"
          dataKey="size"
          range={[60, 400]}
          name="Size"
        />
        <Tooltip content={<CustomTooltip />} />
        <Scatter name="Models" data={data}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

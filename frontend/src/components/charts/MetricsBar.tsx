import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricsBarProps {
  data: Record<string, string | number>[];
  metrics: string[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function MetricsBar({ data, metrics }: MetricsBarProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={{ stroke: "#3f3f46" }}
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#3f3f46" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#e4e4e7",
          }}
        />
        <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
        {metrics.map((metric, i) => (
          <Bar
            key={metric}
            dataKey={metric}
            fill={COLORS[i % COLORS.length]}
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

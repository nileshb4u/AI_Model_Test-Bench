import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface RadarDataPoint {
  category: string;
  [modelName: string]: string | number;
}

interface ScoreRadarProps {
  data: RadarDataPoint[];
  modelNames: string[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function ScoreRadar({ data, modelNames }: ScoreRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#3f3f46" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false}
        />
        {modelNames.map((name, i) => (
          <Radar
            key={name}
            name={name}
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend
          wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#e4e4e7",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

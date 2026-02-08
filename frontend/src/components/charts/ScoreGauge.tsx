interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: number;
}

function getGaugeColor(score: number): string {
  if (score < 4) return "#ef4444";
  if (score < 7) return "#f59e0b";
  return "#10b981";
}

export function ScoreGauge({ score, label, size = 120 }: ScoreGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(10, score));
  const progress = (normalizedScore / 10) * circumference;
  const color = getGaugeColor(normalizedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold font-mono"
            style={{ color, fontSize: size * 0.25 }}
          >
            {normalizedScore.toFixed(1)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-zinc-400">{label}</span>
    </div>
  );
}

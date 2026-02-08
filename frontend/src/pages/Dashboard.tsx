import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  CheckCircle,
  Trophy,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreRadar } from "@/components/charts/ScoreRadar";
import { PerformanceScatter } from "@/components/charts/PerformanceScatter";
import { statsApi, rankingsApi, runsApi } from "@/api";
import type { AppStats, RankingEntry, TestRun } from "@/types";
import {
  formatDate,
  formatNumber,
  getScoreColor,
  getStatusBadgeVariant,
} from "@/utils/format";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}

function StatCard({ icon, label, value, subValue, color }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-zinc-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        {subValue && (
          <p className="text-xs text-zinc-500 mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AppStats | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("composite_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, rankingsData, runsData] = await Promise.all([
          statsApi.get().catch(() => ({ models: 0, configs: 0, suites: 0, runs: 0, results: 0 })),
          rankingsApi.get().catch(() => []),
          runsApi.list().catch(() => []),
        ]);
        setStats(statsData);
        setRankings(rankingsData);
        setRuns(runsData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const sortedRankings = [...rankings].sort((a, b) => {
    const aVal = a[sortBy as keyof RankingEntry];
    const bVal = b[sortBy as keyof RankingEntry];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const topModel = rankings.length > 0
    ? rankings.reduce((best, curr) =>
        curr.composite_score > best.composite_score ? curr : best
      )
    : null;

  const avgSpeed = rankings.length > 0
    ? rankings.reduce((sum, r) => sum + r.avg_tokens_per_sec, 0) / rankings.length
    : 0;

  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const recentRuns = [...runs]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 10);

  // Build radar chart data from top 3 models
  const top3 = sortedRankings.slice(0, 3);
  const radarCategories = new Set<string>();
  top3.forEach((m) => {
    Object.keys(m.categories || {}).forEach((c) => radarCategories.add(c));
  });
  const radarData = Array.from(radarCategories).map((cat) => {
    const point: Record<string, string | number> = { category: cat };
    top3.forEach((m) => {
      point[m.model_name] = m.categories?.[cat] ?? 0;
    });
    return point;
  });
  // Add overall scores if no categories
  if (radarData.length === 0 && top3.length > 0) {
    const defaultCats = ["Quality", "Speed", "Efficiency"];
    defaultCats.forEach((cat) => {
      const point: Record<string, string | number> = { category: cat };
      top3.forEach((m) => {
        if (cat === "Quality") point[m.model_name] = m.quality_score;
        else if (cat === "Speed") point[m.model_name] = m.speed_score;
        else point[m.model_name] = m.efficiency_score;
      });
      radarData.push(point);
    });
  }

  // Build scatter data
  const scatterData = rankings.map((r) => ({
    name: r.model_name,
    quality: r.quality_score,
    speed: r.avg_tokens_per_sec,
    size: r.total_runs * 1e9,
  }));

  const rankingColumns: Column<Record<string, unknown>>[] = [
    {
      key: "rank",
      label: "#",
      render: (_, ) => {
        return null;
      },
    },
    {
      key: "model_name",
      label: "Model",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-zinc-100">
          {item.model_name as string}
        </span>
      ),
    },
    {
      key: "composite_score",
      label: "Score",
      sortable: true,
      render: (item) => {
        const score = item.composite_score as number;
        return (
          <span className={`font-bold font-mono ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </span>
        );
      },
    },
    {
      key: "quality_score",
      label: "Quality",
      sortable: true,
      render: (item) => (
        <span className="text-zinc-300 font-mono">
          {(item.quality_score as number).toFixed(1)}
        </span>
      ),
    },
    {
      key: "speed_score",
      label: "Speed",
      sortable: true,
      render: (item) => (
        <span className="text-zinc-300 font-mono">
          {(item.speed_score as number).toFixed(1)}
        </span>
      ),
    },
    {
      key: "efficiency_score",
      label: "Efficiency",
      sortable: true,
      render: (item) => (
        <span className="text-zinc-300 font-mono">
          {(item.efficiency_score as number).toFixed(1)}
        </span>
      ),
    },
    {
      key: "total_runs",
      label: "Runs",
      sortable: true,
      render: (item) => (
        <span className="text-zinc-400">{item.total_runs as number}</span>
      ),
    },
    {
      key: "avg_tokens_per_sec",
      label: "Avg tok/s",
      sortable: true,
      render: (item) => (
        <span className="text-zinc-300 font-mono">
          {(item.avg_tokens_per_sec as number).toFixed(1)}
        </span>
      ),
    },
  ];

  // Fix the rank column
  rankingColumns[0].render = (item) => {
    const idx = sortedRankings.findIndex(
      (r) => r.model_id === (item.model_id as string)
    );
    const rank = idx + 1;
    return (
      <span
        className={`font-bold ${
          rank === 1
            ? "text-yellow-400"
            : rank === 2
            ? "text-zinc-300"
            : rank === 3
            ? "text-amber-600"
            : "text-zinc-500"
        }`}
      >
        {rank}
      </span>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Box className="w-6 h-6 text-blue-400" />}
          label="Total Models"
          value={String(stats?.models ?? 0)}
          color="bg-blue-500/15"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-green-400" />}
          label="Tests Completed"
          value={String(completedRuns)}
          subValue={`${stats?.runs ?? 0} total runs`}
          color="bg-green-500/15"
        />
        <StatCard
          icon={<Trophy className="w-6 h-6 text-yellow-400" />}
          label="Top Model"
          value={topModel?.model_name ?? "N/A"}
          subValue={
            topModel
              ? `Score: ${topModel.composite_score.toFixed(1)}`
              : "Run tests to see rankings"
          }
          color="bg-yellow-500/15"
        />
        <StatCard
          icon={<Zap className="w-6 h-6 text-purple-400" />}
          label="Average Speed"
          value={avgSpeed > 0 ? `${avgSpeed.toFixed(1)}` : "N/A"}
          subValue={avgSpeed > 0 ? "tokens per second" : "No data yet"}
          color="bg-purple-500/15"
        />
      </div>

      {/* Leaderboard */}
      <Card
        title="Model Leaderboard"
        action={
          rankings.length > 0 ? (
            <button
              onClick={() => navigate("/compare")}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              Compare <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
      >
        {rankings.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No rankings yet"
            description="Run tests on your models to see them ranked here."
            action={{ label: "Run a Test", onClick: () => navigate("/run") }}
          />
        ) : (
          <Table
            columns={rankingColumns}
            data={sortedRankings as unknown as Record<string, unknown>[]}
            onSort={handleSort}
            sortBy={sortBy}
            sortDir={sortDir}
            onRowClick={(item) =>
              navigate(`/models/${item.model_id as string}`)
            }
          />
        )}
      </Card>

      {/* Charts row */}
      {rankings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Score Breakdown (Top 3)">
            {radarData.length > 0 ? (
              <ScoreRadar
                data={radarData}
                modelNames={top3.map((m) => m.model_name)}
              />
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">
                Not enough category data for radar chart
              </p>
            )}
          </Card>
          <Card title="Quality vs Speed">
            {scatterData.length > 0 ? (
              <PerformanceScatter data={scatterData} />
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">
                Not enough data for scatter plot
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Recent runs */}
      <Card
        title="Recent Runs"
        action={
          runs.length > 0 ? (
            <button
              onClick={() => navigate("/results")}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
      >
        {recentRuns.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No runs yet"
            description="Start your first test to see results here."
            action={{ label: "Run a Test", onClick: () => navigate("/run") }}
          />
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                onClick={() => navigate(`/run/${run.id}`)}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Badge
                    text={run.status}
                    variant={getStatusBadgeVariant(run.status)}
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {run.model_name}
                    </p>
                    <p className="text-xs text-zinc-500">{run.suite_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {run.composite_score !== null && (
                    <span
                      className={`font-bold font-mono text-sm ${getScoreColor(
                        run.composite_score
                      )}`}
                    >
                      {run.composite_score.toFixed(1)}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    {formatDate(run.started_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

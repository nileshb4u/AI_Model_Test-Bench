import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  Hash,
  Layers,
  Box,
  Trash2,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricsBar } from "@/components/charts/MetricsBar";
import { ScoreGauge } from "@/components/charts/ScoreGauge";
import { modelsApi, runsApi, resultsApi } from "@/api";
import type { Model, TestRun, TestResult } from "@/types";
import {
  formatBytes,
  formatNumber,
  formatDate,
  formatDuration,
  getScoreColor,
  getStatusBadgeVariant,
} from "@/utils/format";

export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<Model | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      try {
        const [modelData, runsData] = await Promise.all([
          modelsApi.get(id!),
          runsApi.list(),
        ]);
        setModel(modelData);
        const modelRuns = runsData.filter((r) => r.model_id === id);
        setRuns(modelRuns);

        // Fetch results for completed runs
        const allResults: TestResult[] = [];
        for (const run of modelRuns.filter((r) => r.status === "completed").slice(0, 10)) {
          try {
            const runResults = await resultsApi.list(run.id);
            allResults.push(...runResults);
          } catch {
            // skip failed result fetches
          }
        }
        setResults(allResults);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm("Are you sure you want to remove this model?")) {
      try {
        await modelsApi.remove(id);
        navigate("/models");
      } catch {
        // handle error
      }
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading model details..." />;
  }

  if (!model) {
    return (
      <Card>
        <EmptyState
          icon={Box}
          title="Model not found"
          description="The requested model could not be found."
          action={{ label: "Back to Models", onClick: () => navigate("/models") }}
        />
      </Card>
    );
  }

  const completedRuns = runs.filter((r) => r.status === "completed");
  const avgScore = completedRuns.length > 0
    ? completedRuns.reduce((sum, r) => sum + (r.composite_score ?? 0), 0) / completedRuns.length
    : 0;
  const avgTokPerSec = results.length > 0
    ? results.reduce((sum, r) => sum + r.tokens_per_sec, 0) / results.length
    : 0;
  const avgTtft = results.length > 0
    ? results.reduce((sum, r) => sum + r.time_to_first_token_ms, 0) / results.length
    : 0;

  // Build metrics chart data from runs
  const metricsData = completedRuns.slice(0, 10).map((run) => ({
    name: run.suite_name?.slice(0, 15) || run.id.slice(0, 8),
    Score: run.composite_score ?? 0,
  }));

  const runColumns: Column<Record<string, unknown>>[] = [
    {
      key: "suite_name",
      label: "Test Suite",
      render: (item) => (
        <span className="font-medium text-zinc-200">
          {item.suite_name as string}
        </span>
      ),
    },
    {
      key: "config_name",
      label: "Config",
      render: (item) => (
        <span className="text-zinc-400">{item.config_name as string}</span>
      ),
    },
    {
      key: "composite_score",
      label: "Score",
      sortable: true,
      render: (item) => {
        const score = item.composite_score as number | null;
        return score !== null ? (
          <span className={`font-bold font-mono ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </span>
        ) : (
          <span className="text-zinc-600">-</span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <Badge
          text={item.status as string}
          variant={getStatusBadgeVariant(item.status as string)}
        />
      ),
    },
    {
      key: "started_at",
      label: "Date",
      render: (item) => (
        <span className="text-zinc-500 text-xs">
          {formatDate(item.started_at as string)}
        </span>
      ),
    },
  ];

  const metadataItems = [
    { icon: Layers, label: "Architecture", value: model.architecture || "Unknown" },
    { icon: Hash, label: "Parameters", value: model.parameter_count > 0 ? formatNumber(model.parameter_count) : "Unknown" },
    { icon: Box, label: "Quantization", value: model.quantization || "Unknown" },
    { icon: HardDrive, label: "File Size", value: formatBytes(model.file_size_bytes) },
    { icon: Box, label: "Context Length", value: model.context_length > 0 ? formatNumber(model.context_length, 0) : "Unknown" },
    { icon: Clock, label: "Added", value: formatDate(model.added_at) },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button
        variant="ghost"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate("/models")}
      >
        Back to Models
      </Button>

      {/* Model header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-600/15 flex items-center justify-center">
            <Cpu className="w-7 h-7 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{model.name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5 font-mono truncate max-w-lg">
              {model.file_path}
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={handleDelete}
        >
          Remove
        </Button>
      </div>

      {/* Metadata + Score gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metadataItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                <p className="text-sm font-medium text-zinc-200">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-around py-2">
            <ScoreGauge score={avgScore} label="Avg Score" size={100} />
            <div className="space-y-3 text-center">
              <div>
                <p className="text-xl font-bold font-mono text-zinc-100">
                  {avgTokPerSec > 0 ? avgTokPerSec.toFixed(1) : "N/A"}
                </p>
                <p className="text-xs text-zinc-500">Avg tok/s</p>
              </div>
              <div>
                <p className="text-xl font-bold font-mono text-zinc-100">
                  {avgTtft > 0 ? `${avgTtft.toFixed(0)}ms` : "N/A"}
                </p>
                <p className="text-xs text-zinc-500">Avg TTFT</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Score chart */}
      {metricsData.length > 0 && (
        <Card title="Scores Across Test Runs">
          <MetricsBar data={metricsData} metrics={["Score"]} />
        </Card>
      )}

      {/* Test history */}
      <Card title="Test History">
        {runs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No test runs"
            description="This model hasn't been tested yet."
            action={{ label: "Run a Test", onClick: () => navigate("/run") }}
          />
        ) : (
          <Table
            columns={runColumns}
            data={runs as unknown as Record<string, unknown>[]}
            onRowClick={(item) => navigate(`/run/${item.id as string}`)}
          />
        )}
      </Card>
    </div>
  );
}

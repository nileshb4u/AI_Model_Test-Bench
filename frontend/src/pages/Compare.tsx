import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { MetricsBar } from '../components/charts/MetricsBar';
import { ScoreRadar } from '../components/charts/ScoreRadar';
import { modelsApi, rankingsApi } from '../api';
import { Model, RankingEntry } from '../types';
import { GitCompare } from 'lucide-react';

export default function Compare() {
  const [models, setModels] = useState<Model[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState<RankingEntry[]>([]);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const [modelsData, rankingsData] = await Promise.all([
        modelsApi.list(),
        rankingsApi.get(),
      ]);
      setModels(Array.isArray(modelsData) ? modelsData : modelsData.items || []);
      const rankingsList = Array.isArray(rankingsData) ? rankingsData : rankingsData.rankings || [];
      setRankings(rankingsList);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectModel(index: number, modelId: string) {
    const newIds = [...selectedIds];
    newIds[index] = modelId;
    setSelectedIds(newIds);
  }

  function addSlot() {
    if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, '']);
    }
  }

  function removeSlot(index: number) {
    if (selectedIds.length > 2) {
      setSelectedIds(selectedIds.filter((_, i) => i !== index));
    }
  }

  async function handleCompare() {
    const validIds = selectedIds.filter(id => id !== '');
    if (validIds.length < 2) return;

    setComparing(true);
    try {
      const data = await rankingsApi.compare(validIds);
      const compList = Array.isArray(data) ? data : data.rankings || [];
      setComparisonData(compList);
    } catch (err) {
      console.error('Comparison failed:', err);
      // Fallback: filter from existing rankings
      setComparisonData(rankings.filter(r => validIds.includes(r.model_id)));
    } finally {
      setComparing(false);
    }
  }

  const modelOptions = [
    { value: '', label: 'Select a model...' },
    ...models.map(m => ({ value: m.id, label: m.name })),
  ];

  // Prepare chart data
  const metricsBarData = comparisonData.map(r => ({
    name: r.model_name,
    'Quality': r.quality_score,
    'Speed': r.speed_score,
    'Efficiency': r.efficiency_score,
    'Composite': r.composite_score,
  }));

  const allCategories = Array.from(
    new Set(comparisonData.flatMap(r => Object.keys(r.categories || {})))
  );

  const radarDataSets = comparisonData.map(r => ({
    data: allCategories.map(cat => ({
      category: cat,
      score: (r.categories || {})[cat] || 0,
    })),
    modelName: r.model_name,
  }));

  // Win/Loss/Tie matrix
  function computeWinMatrix() {
    if (comparisonData.length < 2) return null;
    const matrix: Record<string, Record<string, { wins: number; losses: number; ties: number }>> = {};
    const metrics = ['quality_score', 'speed_score', 'efficiency_score'] as const;

    for (const a of comparisonData) {
      matrix[a.model_name] = {};
      for (const b of comparisonData) {
        if (a.model_id === b.model_id) continue;
        let wins = 0, losses = 0, ties = 0;
        for (const metric of metrics) {
          const va = a[metric] || 0;
          const vb = b[metric] || 0;
          if (va > vb) wins++;
          else if (va < vb) losses++;
          else ties++;
        }
        matrix[a.model_name][b.model_name] = { wins, losses, ties };
      }
    }
    return matrix;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner text="Loading models..." />
      </div>
    );
  }

  if (models.length < 2) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Need at least 2 models"
        description="Import more models to use the comparison feature."
      />
    );
  }

  const winMatrix = computeWinMatrix();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Compare Models</h1>

      {/* Model Selection */}
      <Card title="Select Models to Compare">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedIds.map((id, index) => (
              <div key={index} className="relative">
                <Select
                  label={`Model ${index + 1}`}
                  value={id}
                  onChange={(v) => handleSelectModel(index, v)}
                  options={modelOptions}
                />
                {selectedIds.length > 2 && (
                  <button
                    onClick={() => removeSlot(index)}
                    className="absolute top-0 right-0 text-zinc-500 hover:text-red-400 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length < 4 && (
              <Button variant="secondary" size="sm" onClick={addSlot}>
                + Add Model
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleCompare}
              disabled={selectedIds.filter(id => id !== '').length < 2}
              loading={comparing}
              icon={<GitCompare className="w-4 h-4" />}
            >
              Compare
            </Button>
          </div>
        </div>
      </Card>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <>
          {/* Score Overview */}
          <Card title="Score Overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {comparisonData.map((entry) => (
                <div key={entry.model_id} className="text-center p-4 bg-zinc-800 rounded-lg">
                  <div className="text-sm text-zinc-400 mb-2 truncate">{entry.model_name}</div>
                  <div className="text-3xl font-bold text-blue-400">{(entry.composite_score || 0).toFixed(1)}</div>
                  <div className="text-xs text-zinc-500 mt-1">Composite Score</div>
                  <div className="grid grid-cols-3 gap-1 mt-3 text-xs">
                    <div>
                      <div className="text-green-400">{(entry.quality_score || 0).toFixed(1)}</div>
                      <div className="text-zinc-600">Quality</div>
                    </div>
                    <div>
                      <div className="text-yellow-400">{(entry.speed_score || 0).toFixed(1)}</div>
                      <div className="text-zinc-600">Speed</div>
                    </div>
                    <div>
                      <div className="text-purple-400">{(entry.efficiency_score || 0).toFixed(1)}</div>
                      <div className="text-zinc-600">Efficiency</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bar Chart Comparison */}
          <Card title="Metrics Comparison">
            <MetricsBar data={metricsBarData} metrics={['Quality', 'Speed', 'Efficiency', 'Composite']} />
          </Card>

          {/* Radar Charts */}
          {allCategories.length > 0 && (
            <Card title="Category Breakdown">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {radarDataSets.map(({ data, modelName }) => (
                  <div key={modelName}>
                    <h3 className="text-sm font-medium text-zinc-400 mb-2 text-center">{modelName}</h3>
                    <ScoreRadar data={data} modelName={modelName} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Win/Loss/Tie Matrix */}
          {winMatrix && (
            <Card title="Win / Loss / Tie Matrix">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-3 text-zinc-400 font-medium">Model</th>
                      {comparisonData.map(m => (
                        <th key={m.model_id} className="p-3 text-zinc-400 font-medium text-center">{m.model_name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map(a => (
                      <tr key={a.model_id} className="border-t border-zinc-800">
                        <td className="p-3 text-zinc-300 font-medium">{a.model_name}</td>
                        {comparisonData.map(b => {
                          if (a.model_id === b.model_id) {
                            return <td key={b.model_id} className="p-3 text-center text-zinc-700">—</td>;
                          }
                          const record = winMatrix[a.model_name]?.[b.model_name];
                          if (!record) return <td key={b.model_id} className="p-3 text-center">—</td>;
                          return (
                            <td key={b.model_id} className="p-3 text-center">
                              <span className="text-green-400">{record.wins}W</span>
                              {' / '}
                              <span className="text-red-400">{record.losses}L</span>
                              {' / '}
                              <span className="text-zinc-400">{record.ties}T</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

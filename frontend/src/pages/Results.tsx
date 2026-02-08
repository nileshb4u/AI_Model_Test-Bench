import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { resultsApi, modelsApi, suitesApi } from '../api';
import { TestResult, Model, TestSuite } from '../types';
import { BarChart3, Download, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber, formatDate, getScoreColor } from '../utils/format';

export default function Results() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState('');
  const [filterSuite, setFilterSuite] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<{ id: string; current: number | null } | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);

  useEffect(() => {
    loadData();
  }, [filterModel, filterSuite]);

  async function loadData() {
    setLoading(true);
    try {
      const [resultsData, modelsData, suitesData] = await Promise.all([
        resultsApi.list({ model_id: filterModel || undefined, suite_id: filterSuite || undefined }),
        modelsApi.list(),
        suitesApi.list(),
      ]);
      setResults(Array.isArray(resultsData) ? resultsData : resultsData.items || []);
      setModels(Array.isArray(modelsData) ? modelsData : modelsData.items || []);
      setSuites(Array.isArray(suitesData) ? suitesData : suitesData.items || []);
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    try {
      const data = await resultsApi.exportData(format, {
        model_id: filterModel || undefined,
        suite_id: filterSuite || undefined,
      });
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-results.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }

  async function handleRate() {
    if (!ratingModal || selectedRating === 0) return;
    try {
      await resultsApi.rate(ratingModal.id, selectedRating);
      setRatingModal(null);
      setSelectedRating(0);
      loadData();
    } catch (err) {
      console.error('Rating failed:', err);
    }
  }

  const columns = [
    {
      key: 'quality_score',
      label: 'Score',
      sortable: true,
      render: (row: TestResult) => (
        <span className={`font-bold ${getScoreColor(row.quality_score || 0)}`}>
          {row.quality_score !== null ? formatNumber(row.quality_score, 1) : '—'}
        </span>
      ),
    },
    {
      key: 'tokens_per_sec',
      label: 'Tok/s',
      sortable: true,
      render: (row: TestResult) => (
        <span className="text-zinc-300">{row.tokens_per_sec ? formatNumber(row.tokens_per_sec, 1) : '—'}</span>
      ),
    },
    {
      key: 'time_to_first_token_ms',
      label: 'TTFT',
      sortable: true,
      render: (row: TestResult) => (
        <span className="text-zinc-300">{row.time_to_first_token_ms ? `${formatNumber(row.time_to_first_token_ms, 0)}ms` : '—'}</span>
      ),
    },
    {
      key: 'peak_ram_mb',
      label: 'RAM',
      sortable: true,
      render: (row: TestResult) => (
        <span className="text-zinc-300">{row.peak_ram_mb ? `${formatNumber(row.peak_ram_mb, 0)} MB` : '—'}</span>
      ),
    },
    {
      key: 'scoring_method',
      label: 'Method',
      render: (row: TestResult) => (
        <Badge text={row.scoring_method || 'none'} variant="default" />
      ),
    },
    {
      key: 'human_rating',
      label: 'Rating',
      render: (row: TestResult) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRatingModal({ id: row.id, current: row.human_rating });
            setSelectedRating(row.human_rating || 0);
          }}
          className="flex items-center gap-1 text-zinc-400 hover:text-yellow-400 transition-colors"
        >
          {row.human_rating ? (
            <>
              {Array.from({ length: row.human_rating }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </>
          ) : (
            <span className="text-xs">Rate</span>
          )}
        </button>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (row: TestResult) => (
        <span className="text-zinc-500 text-sm">{row.created_at ? formatDate(row.created_at) : '—'}</span>
      ),
    },
    {
      key: 'expand',
      label: '',
      render: (row: TestResult) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId(expandedId === row.id ? null : row.id);
          }}
          className="text-zinc-500 hover:text-zinc-300"
        >
          {expandedId === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner text="Loading results..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Test Results</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} icon={<Download className="w-4 h-4" />}>
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('json')} icon={<Download className="w-4 h-4" />}>
            JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select
              label="Filter by Model"
              value={filterModel}
              onChange={(v) => setFilterModel(v)}
              options={[{ value: '', label: 'All Models' }, ...models.map(m => ({ value: m.id, label: m.name }))]}
            />
          </div>
          <div className="w-64">
            <Select
              label="Filter by Suite"
              value={filterSuite}
              onChange={(v) => setFilterSuite(v)}
              options={[{ value: '', label: 'All Suites' }, ...suites.map(s => ({ value: s.id, label: s.name }))]}
            />
          </div>
          <div className="flex-1" />
          <div className="text-sm text-zinc-500">{results.length} results</div>
        </div>
      </Card>

      {/* Results Table */}
      {results.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No results yet"
          description="Run some tests to see results here."
          action={{ label: 'Run a Test', onClick: () => window.location.href = '/run' }}
        />
      ) : (
        <Card>
          <div className="space-y-0">
            <Table columns={columns} data={results} />
            {/* Expanded output view */}
            {expandedId && (
              <div className="border-t border-zinc-800 p-4">
                {(() => {
                  const result = results.find(r => r.id === expandedId);
                  if (!result) return null;
                  return (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-zinc-300">Model Output</h4>
                      <div className="bg-zinc-950 rounded-lg p-4 font-mono text-sm text-zinc-300 max-h-64 overflow-y-auto border border-zinc-800 whitespace-pre-wrap">
                        {result.output_text || 'No output captured.'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Rating Modal */}
      <Modal
        isOpen={ratingModal !== null}
        onClose={() => { setRatingModal(null); setSelectedRating(0); }}
        title="Rate this Output"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">How would you rate the quality of this model output?</p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating)}
                className="p-2 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    rating <= selectedRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-zinc-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setRatingModal(null); setSelectedRating(0); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRate} disabled={selectedRating === 0}>
              Submit Rating
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

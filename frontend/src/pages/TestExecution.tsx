import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useWebSocket } from '../hooks/useWebSocket';
import { runsApi } from '../api';
import { TestRun } from '../types';
import { XCircle, CheckCircle, Clock, Zap, MemoryStick } from 'lucide-react';

export default function TestExecution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [outputTokens, setOutputTokens] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [liveMetrics, setLiveMetrics] = useState({ tokensPerSec: 0, ttft: 0, ram: 0 });
  const outputRef = useRef<HTMLDivElement>(null);
  const { messages, isConnected } = useWebSocket(id || null);

  useEffect(() => {
    if (!id) return;
    loadRun();
  }, [id]);

  useEffect(() => {
    if (messages.length === 0) return;
    const msg = messages[messages.length - 1];
    if (!msg) return;

    try {
      const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
      switch (data.type) {
        case 'token':
          setOutputTokens(prev => [...prev, data.data.token]);
          break;
        case 'progress':
          setProgress({ current: data.data.current, total: data.data.total });
          setCurrentPrompt(data.data.prompt || '');
          setOutputTokens([]);
          break;
        case 'metrics':
          setLiveMetrics({
            tokensPerSec: data.data.tokens_per_sec || 0,
            ttft: data.data.time_to_first_token_ms || 0,
            ram: data.data.peak_ram_mb || 0,
          });
          break;
        case 'complete':
          loadRun();
          break;
        case 'error':
          loadRun();
          break;
      }
    } catch {
      // not JSON, treat as raw token
      setOutputTokens(prev => [...prev, String(msg)]);
    }
  }, [messages]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputTokens]);

  async function loadRun() {
    if (!id) return;
    try {
      const data = await runsApi.get(id);
      setRun(data);
    } catch (err) {
      console.error('Failed to load run:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    try {
      await runsApi.cancel(id);
      loadRun();
    } catch (err) {
      console.error('Failed to cancel run:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner text="Loading test run..." />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-20 text-zinc-400">
        Test run not found.
      </div>
    );
  }

  const isRunning = run.status === 'running' || run.status === 'queued';
  const isComplete = run.status === 'completed';
  const isFailed = run.status === 'failed' || run.status === 'cancelled';
  const progressPct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Test Execution</h1>
          <p className="text-zinc-400 mt-1">
            {run.model_name} — {run.suite_name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            text={run.status}
            variant={
              isComplete ? 'success' : isRunning ? 'warning' : isFailed ? 'error' : 'default'
            }
          />
          {isRunning && (
            <Button variant="danger" size="sm" onClick={handleCancel} icon={<XCircle className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
          {isComplete && (
            <Button variant="primary" size="sm" onClick={() => navigate(`/results`)}>
              View Results
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Progress</span>
              <span className="text-zinc-300">
                {progress.current} / {progress.total} prompts
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {currentPrompt && (
              <div className="text-sm text-zinc-500">
                <span className="text-zinc-400">Current: </span>
                {currentPrompt.length > 100 ? currentPrompt.slice(0, 100) + '...' : currentPrompt}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Tokens/sec</p>
              <p className="text-xl font-bold text-zinc-100">{liveMetrics.tokensPerSec.toFixed(1)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">TTFT</p>
              <p className="text-xl font-bold text-zinc-100">{liveMetrics.ttft.toFixed(0)}ms</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <MemoryStick className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">RAM Usage</p>
              <p className="text-xl font-bold text-zinc-100">{liveMetrics.ram.toFixed(0)} MB</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Connection</p>
              <p className="text-sm font-medium text-zinc-100">{isConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Terminal Output */}
      <Card title="Model Output">
        <div
          ref={outputRef}
          className="bg-zinc-950 rounded-lg p-4 font-mono text-sm text-green-400 h-96 overflow-y-auto border border-zinc-800"
        >
          {outputTokens.length === 0 && isRunning && (
            <span className="text-zinc-600 animate-pulse">Waiting for output...</span>
          )}
          {outputTokens.length === 0 && !isRunning && (
            <span className="text-zinc-600">No output captured.</span>
          )}
          {outputTokens.map((token, i) => (
            <span key={i}>{token}</span>
          ))}
          {isRunning && <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5" />}
        </div>
      </Card>

      {/* Completion Summary */}
      {isComplete && run.composite_score !== null && (
        <Card title="Results Summary">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400">{run.composite_score?.toFixed(1)}</div>
              <div className="text-sm text-zinc-500 mt-1">Composite Score</div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <div className="text-sm text-zinc-300">Completed</div>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <div className="text-lg font-semibold text-zinc-200">{progress.total}</div>
                <div className="text-sm text-zinc-400">Prompts Tested</div>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <div className="text-lg font-semibold text-zinc-200">{liveMetrics.tokensPerSec.toFixed(1)}</div>
                <div className="text-sm text-zinc-400">Avg tok/s</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

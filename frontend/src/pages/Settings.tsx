import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Slider } from '../components/ui/Slider';
import { Settings as SettingsIcon, Save, FolderOpen, Info } from 'lucide-react';

interface AppSettings {
  models_directory: string;
  default_n_threads: number;
  default_n_gpu_layers: number;
  scoring_weight_quality: number;
  scoring_weight_speed: number;
  scoring_weight_efficiency: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    models_directory: './models',
    default_n_threads: 4,
    default_n_gpu_layers: 0,
    scoring_weight_quality: 0.5,
    scoring_weight_speed: 0.3,
    scoring_weight_efficiency: 0.2,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('atb_settings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        // use defaults
      }
    }
  }, []);

  function handleSave() {
    // Normalize weights to sum to 1
    const total = settings.scoring_weight_quality + settings.scoring_weight_speed + settings.scoring_weight_efficiency;
    const normalized = {
      ...settings,
      scoring_weight_quality: total > 0 ? settings.scoring_weight_quality / total : 0.5,
      scoring_weight_speed: total > 0 ? settings.scoring_weight_speed / total : 0.3,
      scoring_weight_efficiency: total > 0 ? settings.scoring_weight_efficiency / total : 0.2,
    };
    setSettings(normalized);
    localStorage.setItem('atb_settings', JSON.stringify(normalized));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateWeight(key: 'scoring_weight_quality' | 'scoring_weight_speed' | 'scoring_weight_efficiency', value: number) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  const weightTotal = settings.scoring_weight_quality + settings.scoring_weight_speed + settings.scoring_weight_efficiency;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <Button variant="primary" onClick={handleSave} icon={<Save className="w-4 h-4" />}>
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>

      {/* Model Directory */}
      <Card title="Model Directory">
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Path to the directory containing your .gguf model files. The app will scan this directory when importing models.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={settings.models_directory}
                onChange={(e) => setSettings({ ...settings, models_directory: e.target.value })}
                placeholder="/path/to/models"
              />
            </div>
            <Button variant="secondary" icon={<FolderOpen className="w-4 h-4" />}>
              Browse
            </Button>
          </div>
        </div>
      </Card>

      {/* Default Inference */}
      <Card title="Default Inference Settings">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Default values used when creating new test configurations.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="CPU Threads"
                type="number"
                value={String(settings.default_n_threads)}
                onChange={(e) => setSettings({ ...settings, default_n_threads: parseInt(e.target.value) || 1 })}
                placeholder="4"
              />
              <p className="text-xs text-zinc-600 mt-1">Number of CPU threads for inference</p>
            </div>
            <div>
              <Input
                label="GPU Layers"
                type="number"
                value={String(settings.default_n_gpu_layers)}
                onChange={(e) => setSettings({ ...settings, default_n_gpu_layers: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-zinc-600 mt-1">Layers to offload to GPU (0 = CPU only)</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Scoring Weights */}
      <Card title="Scoring Weights">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Adjust the weights used to compute the composite ranking score. Weights are automatically normalized to sum to 1.0.
          </p>

          <Slider
            label="Quality Weight"
            value={settings.scoring_weight_quality}
            onChange={(v) => updateWeight('scoring_weight_quality', v)}
            min={0}
            max={1}
            step={0.05}
            displayValue={settings.scoring_weight_quality.toFixed(2)}
          />

          <Slider
            label="Speed Weight"
            value={settings.scoring_weight_speed}
            onChange={(v) => updateWeight('scoring_weight_speed', v)}
            min={0}
            max={1}
            step={0.05}
            displayValue={settings.scoring_weight_speed.toFixed(2)}
          />

          <Slider
            label="Efficiency Weight"
            value={settings.scoring_weight_efficiency}
            onChange={(v) => updateWeight('scoring_weight_efficiency', v)}
            min={0}
            max={1}
            step={0.05}
            displayValue={settings.scoring_weight_efficiency.toFixed(2)}
          />

          <div className={`text-sm ${Math.abs(weightTotal - 1) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
            Total: {weightTotal.toFixed(2)}
            {Math.abs(weightTotal - 1) >= 0.01 && ' (will be normalized to 1.0 on save)'}
          </div>

          <div className="bg-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
            <div className="font-medium text-zinc-300 mb-2">Formula:</div>
            <code className="text-blue-400">
              Composite = ({settings.scoring_weight_quality.toFixed(2)} × Quality) + ({settings.scoring_weight_speed.toFixed(2)} × Speed) + ({settings.scoring_weight_efficiency.toFixed(2)} × Efficiency)
            </code>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card title="About">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-200">AI Model Test Bench</h3>
              <p className="text-sm text-zinc-500">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400">
            A self-hosted platform for systematically testing, benchmarking, and ranking local AI models.
            Built with FastAPI, React, and llama-cpp-python.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500">Backend</div>
              <div className="text-zinc-300">FastAPI + SQLite</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500">Frontend</div>
              <div className="text-zinc-300">React + TypeScript</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500">Inference</div>
              <div className="text-zinc-300">llama-cpp-python</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500">License</div>
              <div className="text-zinc-300">MIT</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

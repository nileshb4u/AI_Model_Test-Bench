import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  ChevronDown,
  ChevronUp,
  Save,
  Box,
  Settings,
  MessageSquare,
  FlaskConical,
  CheckCircle,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { modelsApi, configsApi, promptsApi, suitesApi, runsApi } from "@/api";
import type { Model, TestConfig, SystemPrompt, TestSuite } from "@/types";
import { formatBytes, formatNumber } from "@/utils/format";

interface ConfigState {
  temperature: number;
  top_p: number;
  top_k: number;
  min_p: number;
  repeat_penalty: number;
  frequency_penalty: number;
  presence_penalty: number;
  mirostat_mode: number;
  mirostat_tau: number;
  mirostat_eta: number;
  n_ctx: number;
  max_tokens: number;
  n_batch: number;
  n_threads: number;
  n_gpu_layers: number;
  npu_enabled: boolean;
  npu_device: string;
  seed: number;
}

const defaultConfig: ConfigState = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  min_p: 0.05,
  repeat_penalty: 1.1,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  mirostat_mode: 0,
  mirostat_tau: 5.0,
  mirostat_eta: 0.1,
  n_ctx: 4096,
  max_tokens: 2048,
  n_batch: 512,
  n_threads: 4,
  n_gpu_layers: 0,
  npu_enabled: false,
  npu_device: "",
  seed: -1,
};

const contextSizes = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

export default function RunTest() {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [configs, setConfigs] = useState<TestConfig[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Selections
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [selectedSuiteId, setSelectedSuiteId] = useState("");
  const [batchMode, setBatchMode] = useState(false);

  // Custom config
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [config, setConfig] = useState<ConfigState>(defaultConfig);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);

  // System prompt creation
  const [newPromptOpen, setNewPromptOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptCategory, setNewPromptCategory] = useState("");
  const [creatingPrompt, setCreatingPrompt] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [modelsData, configsData, promptsData, suitesData] =
          await Promise.all([
            modelsApi.list().catch(() => []),
            configsApi.list().catch(() => []),
            promptsApi.list().catch(() => []),
            suitesApi.list().catch(() => []),
          ]);
        setModels(modelsData);
        setConfigs(configsData);
        setSystemPrompts(promptsData);
        setSuites(suitesData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleConfigPresetChange = (configId: string) => {
    setSelectedConfigId(configId);
    if (configId) {
      const preset = configs.find((c) => c.id === configId);
      if (preset) {
        setConfig({
          temperature: preset.temperature,
          top_p: preset.top_p,
          top_k: preset.top_k,
          min_p: preset.min_p,
          repeat_penalty: preset.repeat_penalty,
          frequency_penalty: preset.frequency_penalty,
          presence_penalty: preset.presence_penalty,
          mirostat_mode: preset.mirostat_mode,
          mirostat_tau: preset.mirostat_tau,
          mirostat_eta: preset.mirostat_eta,
          n_ctx: preset.n_ctx,
          max_tokens: preset.max_tokens,
          n_batch: preset.n_batch,
          n_threads: preset.n_threads,
          n_gpu_layers: preset.n_gpu_layers,
          npu_enabled: preset.npu_enabled ?? false,
          npu_device: preset.npu_device ?? "",
          seed: preset.seed,
        });
      }
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    setSavingPreset(true);
    try {
      const newConfig = await configsApi.create({
        name: presetName.trim(),
        ...config,
      });
      setConfigs((prev) => [...prev, newConfig]);
      setSelectedConfigId(newConfig.id);
      setSavePresetOpen(false);
      setPresetName("");
    } catch {
      // handle error
    } finally {
      setSavingPreset(false);
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return;
    setCreatingPrompt(true);
    try {
      const prompt = await promptsApi.create({
        name: newPromptName.trim(),
        content: newPromptContent.trim(),
        category: newPromptCategory.trim() || "general",
      });
      setSystemPrompts((prev) => [...prev, prompt]);
      setSelectedPromptId(prompt.id);
      setNewPromptOpen(false);
      setNewPromptName("");
      setNewPromptContent("");
      setNewPromptCategory("");
    } catch {
      // handle error
    } finally {
      setCreatingPrompt(false);
    }
  };

  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleRun = async () => {
    if (selectedModelIds.length === 0 || !selectedSuiteId) return;

    setRunning(true);
    try {
      let configId = selectedConfigId;

      // If no preset selected, create a temporary config
      if (!configId) {
        const newConfig = await configsApi.create({
          name: `Custom ${new Date().toISOString().slice(0, 19)}`,
          ...config,
        });
        configId = newConfig.id;
      }

      if (batchMode && selectedModelIds.length > 1) {
        const runs = await runsApi.createBatch({
          model_ids: selectedModelIds,
          config_id: configId,
          suite_id: selectedSuiteId,
          system_prompt_id: selectedPromptId || undefined,
        });
        if (runs.length > 0) {
          navigate(`/run/${runs[0].id}`);
        }
      } else {
        const run = await runsApi.create({
          model_id: selectedModelIds[0],
          config_id: configId,
          suite_id: selectedSuiteId,
          system_prompt_id: selectedPromptId || undefined,
        });
        navigate(`/run/${run.id}`);
      }
    } catch {
      // handle error
    } finally {
      setRunning(false);
    }
  };

  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));
  const selectedSuite = suites.find((s) => s.id === selectedSuiteId);
  const selectedSystemPrompt = systemPrompts.find(
    (p) => p.id === selectedPromptId
  );
  const selectedConfig = configs.find((c) => c.id === selectedConfigId);
  const canRun = selectedModelIds.length > 0 && selectedSuiteId;

  if (loading) {
    return <LoadingSpinner text="Loading configuration..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Batch mode toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={batchMode}
            onChange={(e) => {
              setBatchMode(e.target.checked);
              if (!e.target.checked && selectedModelIds.length > 1) {
                setSelectedModelIds([selectedModelIds[0]]);
              }
            }}
            className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm text-zinc-300 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Batch Mode (test multiple models)
          </span>
        </label>
      </div>

      {/* STEP 1: Select Model */}
      <Card
        title="Step 1: Select Model"
        action={
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Box className="w-3.5 h-3.5" />
            {selectedModelIds.length} selected
          </div>
        }
      >
        {models.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No models available.{" "}
            <button
              className="text-primary-400 hover:underline"
              onClick={() => navigate("/models")}
            >
              Import models first
            </button>
          </p>
        ) : batchMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {models.map((model) => (
              <label
                key={model.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedModelIds.includes(model.id)
                    ? "border-primary-500/50 bg-primary-500/10"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModelIds.includes(model.id)}
                  onChange={() => handleToggleModel(model.id)}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-primary-500 focus:ring-primary-500"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {model.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {model.quantization && `${model.quantization} - `}
                    {formatBytes(model.file_size_bytes)}
                    {model.parameter_count > 0 && ` - ${formatNumber(model.parameter_count)} params`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <Select
            value={selectedModelIds[0] || ""}
            onChange={(v) => setSelectedModelIds(v ? [v] : [])}
            options={models.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.quantization || "unknown"} - ${formatBytes(m.file_size_bytes)})`,
            }))}
            placeholder="Select a model..."
          />
        )}
      </Card>

      {/* STEP 2: Test Configuration */}
      <Card
        title="Step 2: Test Configuration"
        action={
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Settings className="w-3.5 h-3.5" />
            {selectedConfig ? selectedConfig.name : "Custom"}
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Configuration Preset"
            value={selectedConfigId}
            onChange={handleConfigPresetChange}
            options={[
              { value: "", label: "Custom Configuration" },
              ...configs.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <button
            onClick={() => setShowCustomConfig(!showCustomConfig)}
            className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            {showCustomConfig ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {showCustomConfig ? "Hide" : "Show"} Custom Configuration
          </button>

          {showCustomConfig && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sampling Parameters */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-zinc-300">
                    Sampling Parameters
                  </h4>
                  <Slider
                    label="Temperature"
                    value={config.temperature}
                    onChange={(v) =>
                      setConfig((prev) => ({ ...prev, temperature: v }))
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    displayValue={config.temperature.toFixed(1)}
                  />
                  <Slider
                    label="Top P"
                    value={config.top_p}
                    onChange={(v) =>
                      setConfig((prev) => ({ ...prev, top_p: v }))
                    }
                    min={0}
                    max={1}
                    step={0.05}
                    displayValue={config.top_p.toFixed(2)}
                  />
                  <Slider
                    label="Top K"
                    value={config.top_k}
                    onChange={(v) =>
                      setConfig((prev) => ({ ...prev, top_k: v }))
                    }
                    min={0}
                    max={200}
                    step={1}
                    displayValue={String(config.top_k)}
                  />
                  <Slider
                    label="Min P"
                    value={config.min_p}
                    onChange={(v) =>
                      setConfig((prev) => ({ ...prev, min_p: v }))
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    displayValue={config.min_p.toFixed(2)}
                  />
                </div>

                {/* Penalty Parameters */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-zinc-300">
                    Penalty Parameters
                  </h4>
                  <Slider
                    label="Repeat Penalty"
                    value={config.repeat_penalty}
                    onChange={(v) =>
                      setConfig((prev) => ({ ...prev, repeat_penalty: v }))
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    displayValue={config.repeat_penalty.toFixed(1)}
                  />
                  <Slider
                    label="Frequency Penalty"
                    value={config.frequency_penalty}
                    onChange={(v) =>
                      setConfig((prev) => ({ ...prev, frequency_penalty: v }))
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    displayValue={config.frequency_penalty.toFixed(1)}
                  />
                  <Slider
                    label="Presence Penalty"
                    value={config.presence_penalty}
                    onChange={(v) =>
                      setConfig((prev) => ({ ...prev, presence_penalty: v }))
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    displayValue={config.presence_penalty.toFixed(1)}
                  />
                </div>
              </div>

              {/* Mirostat */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-zinc-300">
                  Mirostat
                </h4>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">Mode:</span>
                  {[0, 1, 2].map((mode) => (
                    <label
                      key={mode}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="mirostat_mode"
                        checked={config.mirostat_mode === mode}
                        onChange={() =>
                          setConfig((prev) => ({
                            ...prev,
                            mirostat_mode: mode,
                          }))
                        }
                        className="w-4 h-4 bg-zinc-800 border-zinc-700 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-zinc-300">
                        {mode === 0 ? "Off" : `Mirostat ${mode}`}
                      </span>
                    </label>
                  ))}
                </div>
                {config.mirostat_mode > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Slider
                      label="Mirostat Tau"
                      value={config.mirostat_tau}
                      onChange={(v) =>
                        setConfig((prev) => ({ ...prev, mirostat_tau: v }))
                      }
                      min={0}
                      max={10}
                      step={0.1}
                      displayValue={config.mirostat_tau.toFixed(1)}
                    />
                    <Slider
                      label="Mirostat Eta"
                      value={config.mirostat_eta}
                      onChange={(v) =>
                        setConfig((prev) => ({ ...prev, mirostat_eta: v }))
                      }
                      min={0}
                      max={1}
                      step={0.01}
                      displayValue={config.mirostat_eta.toFixed(2)}
                    />
                  </div>
                )}
              </div>

              {/* Runtime Parameters */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-zinc-300">
                  Runtime Parameters
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-400">
                      Context Size
                    </label>
                    <select
                      value={config.n_ctx}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          n_ctx: parseInt(e.target.value),
                        }))
                      }
                      className="input-base w-full"
                    >
                      {contextSizes.map((size) => (
                        <option key={size} value={size}>
                          {formatNumber(size, 0)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Slider
                    label="Max Tokens"
                    value={config.max_tokens}
                    onChange={(v) =>
                      setConfig((prev) => ({
                        ...prev,
                        max_tokens: Math.round(v),
                      }))
                    }
                    min={1}
                    max={32768}
                    step={256}
                    displayValue={formatNumber(config.max_tokens, 0)}
                  />
                  <Slider
                    label="Batch Size"
                    value={config.n_batch}
                    onChange={(v) =>
                      setConfig((prev) => ({
                        ...prev,
                        n_batch: Math.round(v),
                      }))
                    }
                    min={1}
                    max={4096}
                    step={64}
                    displayValue={String(config.n_batch)}
                  />
                  <Slider
                    label="Threads"
                    value={config.n_threads}
                    onChange={(v) =>
                      setConfig((prev) => ({
                        ...prev,
                        n_threads: Math.round(v),
                      }))
                    }
                    min={1}
                    max={32}
                    step={1}
                    displayValue={String(config.n_threads)}
                  />
                  <Slider
                    label="GPU Layers"
                    value={config.n_gpu_layers}
                    onChange={(v) =>
                      setConfig((prev) => ({
                        ...prev,
                        n_gpu_layers: Math.round(v),
                      }))
                    }
                    min={0}
                    max={999}
                    step={1}
                    displayValue={String(config.n_gpu_layers)}
                  />
                  <Input
                    label="Seed (-1 = random)"
                    type="number"
                    value={String(config.seed)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        seed: parseInt(e.target.value) || -1,
                      }))
                    }
                  />
                </div>
              </div>

              {/* NPU / Snapdragon */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  NPU Acceleration
                  <span className="text-xs font-normal text-zinc-500">(Snapdragon / Qualcomm QNN)</span>
                </h4>
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.npu_enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          npu_enabled: e.target.checked,
                          npu_device: e.target.checked ? "qnn" : "",
                        }))
                      }
                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-primary-500 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-sm text-zinc-200">Enable NPU Offloading</span>
                      <p className="text-xs text-zinc-500">
                        Route inference through the Hexagon Tensor Processor (HTP) on Snapdragon devices
                      </p>
                    </div>
                  </label>
                  {config.npu_enabled && (
                    <div className="space-y-3 ml-7">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                          NPU Backend
                        </label>
                        <select
                          value={config.npu_device}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              npu_device: e.target.value,
                            }))
                          }
                          className="input-base w-full"
                        >
                          <option value="qnn">Qualcomm QNN (Snapdragon HTP)</option>
                        </select>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <span className="text-amber-400 text-sm">!</span>
                        <p className="text-xs text-amber-300">
                          Requires llama-cpp-python compiled with <code className="bg-zinc-800 px-1 rounded">GGML_QNN=on</code> and
                          the Qualcomm QNN SDK installed. See README for setup instructions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save preset */}
              <Button
                variant="secondary"
                size="sm"
                icon={<Save className="w-4 h-4" />}
                onClick={() => setSavePresetOpen(true)}
              >
                Save as Preset
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* STEP 3: System Prompt */}
      <Card
        title="Step 3: System Prompt (Optional)"
        action={
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MessageSquare className="w-3.5 h-3.5" />
            {selectedSystemPrompt ? selectedSystemPrompt.name : "None"}
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            value={selectedPromptId}
            onChange={(v) => setSelectedPromptId(v)}
            options={[
              { value: "", label: "No system prompt" },
              ...systemPrompts.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.category})`,
              })),
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<MessageSquare className="w-4 h-4" />}
            onClick={() => setNewPromptOpen(true)}
          >
            Create New Prompt
          </Button>
          {selectedSystemPrompt && (
            <div className="p-3 bg-zinc-800 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Preview:</p>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-4">
                {selectedSystemPrompt.content}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* STEP 4: Test Suite */}
      <Card
        title="Step 4: Select Test Suite"
        action={
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <FlaskConical className="w-3.5 h-3.5" />
            {selectedSuite
              ? `${selectedSuite.prompts?.length ?? 0} prompts`
              : "None selected"}
          </div>
        }
      >
        {suites.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No test suites available.{" "}
            <button
              className="text-primary-400 hover:underline"
              onClick={() => navigate("/tests")}
            >
              Create one first
            </button>
          </p>
        ) : (
          <Select
            value={selectedSuiteId}
            onChange={(v) => setSelectedSuiteId(v)}
            options={suites.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.prompts?.length ?? 0} prompts) - ${s.category}`,
            }))}
            placeholder="Select a test suite..."
          />
        )}
      </Card>

      {/* STEP 5: Review */}
      <Card title="Step 5: Review & Run">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              <Box className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Model(s)</p>
                <p className="text-sm text-zinc-200">
                  {selectedModels.length > 0
                    ? selectedModels.map((m) => m.name).join(", ")
                    : "Not selected"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              <Settings className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Configuration</p>
                <p className="text-sm text-zinc-200">
                  {selectedConfig?.name || "Custom"} (temp={config.temperature})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">System Prompt</p>
                <p className="text-sm text-zinc-200">
                  {selectedSystemPrompt?.name || "None"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              <FlaskConical className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Test Suite</p>
                <p className="text-sm text-zinc-200">
                  {selectedSuite?.name || "Not selected"}
                </p>
              </div>
            </div>
          </div>

          {batchMode && selectedModelIds.length > 1 && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-sm text-blue-300">
                Batch mode: Will run {selectedModelIds.length} tests sequentially
              </p>
            </div>
          )}

          <div className="pt-3">
            <Button
              variant="primary"
              size="lg"
              icon={<Play className="w-5 h-5" />}
              onClick={handleRun}
              loading={running}
              disabled={!canRun}
              className="w-full"
            >
              {batchMode && selectedModelIds.length > 1
                ? `Run ${selectedModelIds.length} Tests`
                : "Run Test"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Save Preset Modal */}
      <Modal
        isOpen={savePresetOpen}
        onClose={() => setSavePresetOpen(false)}
        title="Save Configuration Preset"
      >
        <div className="space-y-4">
          <Input
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="e.g., Creative Writing Config"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setSavePresetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePreset}
              loading={savingPreset}
              disabled={!presetName.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create System Prompt Modal */}
      <Modal
        isOpen={newPromptOpen}
        onClose={() => setNewPromptOpen(false)}
        title="Create System Prompt"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            placeholder="e.g., Helpful Assistant"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              Content
            </label>
            <textarea
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              placeholder="You are a helpful assistant..."
              className="input-base w-full h-32 resize-none"
            />
          </div>
          <Input
            label="Category"
            value={newPromptCategory}
            onChange={(e) => setNewPromptCategory(e.target.value)}
            placeholder="e.g., general, coding, creative"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setNewPromptOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreatePrompt}
              loading={creatingPrompt}
              disabled={!newPromptName.trim() || !newPromptContent.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

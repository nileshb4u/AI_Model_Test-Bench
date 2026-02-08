export interface Model {
  id: string;
  name: string;
  file_path: string;
  file_size_bytes: number;
  architecture: string;
  parameter_count: number;
  quantization: string;
  context_length: number;
  added_at: string;
}

export interface TestConfig {
  id: string;
  name: string;
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
  created_at: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  category: string;
  created_at: string;
}

export interface TestPrompt {
  id: string;
  suite_id: string;
  prompt_text: string;
  expected_output: string;
  grading_rubric: string;
  order_index: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  prompts: TestPrompt[];
}

export interface TestRun {
  id: string;
  model_id: string;
  config_id: string;
  suite_id: string;
  system_prompt_id: string | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  composite_score: number | null;
  model_name: string;
  config_name: string;
  suite_name: string;
}

export interface TestResult {
  id: string;
  run_id: string;
  prompt_id: string;
  output_text: string;
  tokens_per_sec: number;
  time_to_first_token_ms: number;
  prompt_eval_speed: number;
  total_time_sec: number;
  output_token_count: number;
  peak_ram_mb: number;
  peak_vram_mb: number;
  peak_npu_mb: number | null;
  accelerator_used: string | null;
  quality_score: number | null;
  scoring_method: string;
  human_rating: number | null;
  created_at: string;
}

export interface RankingEntry {
  model_id: string;
  model_name: string;
  composite_score: number;
  quality_score: number;
  speed_score: number;
  efficiency_score: number;
  total_runs: number;
  avg_tokens_per_sec: number;
  avg_ram_mb: number;
  categories: Record<string, number>;
}

export interface AppStats {
  models: number;
  configs: number;
  suites: number;
  runs: number;
  results: number;
}

export interface NpuInfo {
  available: boolean;
  device: string;
  name: string;
  soc: string;
  htp_available: boolean;
}

export interface AcceleratorInfo {
  gpu: { available: boolean; type: string | null };
  npu: NpuInfo;
}

export interface WSMessage {
  type: string;
  run_id?: string;
  prompt_index?: number;
  total_prompts?: number;
  token?: string;
  tokens_per_sec?: number;
  time_to_first_token_ms?: number;
  output_text?: string;
  status?: string;
  composite_score?: number;
  error?: string;
  [key: string]: unknown;
}

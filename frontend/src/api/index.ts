import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  Model,
  TestConfig,
  SystemPrompt,
  TestSuite,
  TestPrompt,
  TestRun,
  TestResult,
  RankingEntry,
  AppStats,
} from "@/types";

export const modelsApi = {
  list: () => apiGet<Model[]>("/models"),
  create: (data: { file_path: string }) => apiPost<Model>("/models", data),
  get: (id: string) => apiGet<Model>(`/models/${id}`),
  remove: (id: string) => apiDelete(`/models/${id}`),
  scan: (directory: string) => apiPost<Model[]>("/models/scan", { directory }),
};

export const configsApi = {
  list: () => apiGet<TestConfig[]>("/configs"),
  create: (data: Partial<TestConfig>) => apiPost<TestConfig>("/configs", data),
  get: (id: string) => apiGet<TestConfig>(`/configs/${id}`),
  update: (id: string, data: Partial<TestConfig>) =>
    apiPut<TestConfig>(`/configs/${id}`, data),
  remove: (id: string) => apiDelete(`/configs/${id}`),
};

export const promptsApi = {
  list: (category?: string) =>
    apiGet<SystemPrompt[]>(category ? `/prompts?category=${category}` : "/prompts"),
  create: (data: Partial<SystemPrompt>) =>
    apiPost<SystemPrompt>("/prompts", data),
  get: (id: string) => apiGet<SystemPrompt>(`/prompts/${id}`),
  update: (id: string, data: Partial<SystemPrompt>) =>
    apiPut<SystemPrompt>(`/prompts/${id}`, data),
  remove: (id: string) => apiDelete(`/prompts/${id}`),
};

export const suitesApi = {
  list: () => apiGet<TestSuite[]>("/suites"),
  create: (data: Partial<TestSuite>) => apiPost<TestSuite>("/suites", data),
  get: (id: string) => apiGet<TestSuite>(`/suites/${id}`),
  remove: (id: string) => apiDelete(`/suites/${id}`),
  addPrompts: (id: string, prompts: Partial<TestPrompt>[]) =>
    apiPost<TestPrompt[]>(`/suites/${id}/prompts`, prompts),
  importPrompts: (id: string, data: { prompts: Partial<TestPrompt>[] }) =>
    apiPost<TestPrompt[]>(`/suites/${id}/import`, data),
};

export const runsApi = {
  create: (data: {
    model_id: string;
    config_id: string;
    suite_id: string;
    system_prompt_id?: string;
  }) => apiPost<TestRun>("/runs", data),
  createBatch: (data: {
    model_ids: string[];
    config_id: string;
    suite_id: string;
    system_prompt_id?: string;
  }) => apiPost<TestRun[]>("/runs/batch", data),
  list: () => apiGet<TestRun[]>("/runs"),
  get: (id: string) => apiGet<TestRun>(`/runs/${id}`),
  cancel: (id: string) => apiPost<TestRun>(`/runs/${id}/cancel`),
};

export const resultsApi = {
  list: (filters?: { run_id?: string; model_id?: string; suite_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.run_id) params.set("run_id", filters.run_id);
    if (filters?.model_id) params.set("model_id", filters.model_id);
    if (filters?.suite_id) params.set("suite_id", filters.suite_id);
    const qs = params.toString();
    return apiGet<TestResult[]>(qs ? `/results?${qs}` : "/results");
  },
  get: (id: string) => apiGet<TestResult>(`/results/${id}`),
  rate: (id: string, rating: number) =>
    apiPost<TestResult>(`/results/${id}/rate`, { human_rating: rating }),
  exportData: (format: "csv" | "json", filters?: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    }
    return apiGet<string>(`/export/${format}?${params.toString()}`);
  },
};

export const rankingsApi = {
  get: () =>
    apiGet<{ rankings: RankingEntry[]; weights: Record<string, number> }>("/rankings"),
  compare: (modelIds: string[]) =>
    apiGet<{ rankings: RankingEntry[]; weights: Record<string, number> }>(
      `/rankings/compare?model_ids=${modelIds.join(",")}`
    ),
};

export const statsApi = {
  get: () => apiGet<AppStats>("/stats"),
};

export const healthApi = {
  check: () => apiGet<{ status: string }>("/health"),
};

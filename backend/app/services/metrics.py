import subprocess
import time
from typing import Optional

import psutil


def get_ram_usage_mb() -> float:
    process = psutil.Process()
    return process.memory_info().rss / (1024 * 1024)


def get_gpu_memory_mb() -> Optional[float]:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.used",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            lines = result.stdout.strip().split("\n")
            total_vram = sum(float(line.strip()) for line in lines if line.strip())
            return total_vram
    except (FileNotFoundError, subprocess.TimeoutExpired, ValueError, OSError):
        pass
    return None


class MetricsCollector:
    def __init__(self) -> None:
        self._start_time: float = 0.0
        self._first_token_time: Optional[float] = None
        self._end_time: float = 0.0
        self._initial_ram_mb: float = 0.0
        self._peak_ram_mb: float = 0.0
        self._initial_vram_mb: Optional[float] = None
        self._peak_vram_mb: Optional[float] = None
        self._token_count: int = 0
        self._prompt_eval_time: Optional[float] = None

    def start(self) -> None:
        self._start_time = time.perf_counter()
        self._initial_ram_mb = get_ram_usage_mb()
        self._peak_ram_mb = self._initial_ram_mb
        self._initial_vram_mb = get_gpu_memory_mb()
        self._peak_vram_mb = self._initial_vram_mb

    def record_first_token(self) -> None:
        if self._first_token_time is None:
            self._first_token_time = time.perf_counter()

    def update_peak_memory(self) -> None:
        current_ram = get_ram_usage_mb()
        if current_ram > self._peak_ram_mb:
            self._peak_ram_mb = current_ram
        current_vram = get_gpu_memory_mb()
        if current_vram is not None:
            if self._peak_vram_mb is None or current_vram > self._peak_vram_mb:
                self._peak_vram_mb = current_vram

    def set_prompt_eval_time(self, eval_time: float) -> None:
        self._prompt_eval_time = eval_time

    def finish(self, token_count: int) -> None:
        self._end_time = time.perf_counter()
        self._token_count = token_count
        self.update_peak_memory()

    def get_metrics(self) -> dict:
        total_time = self._end_time - self._start_time if self._end_time > 0 else 0.0

        ttft_ms: Optional[float] = None
        if self._first_token_time is not None:
            ttft_ms = (self._first_token_time - self._start_time) * 1000.0

        tokens_per_sec: Optional[float] = None
        if total_time > 0 and self._token_count > 0:
            generation_start = self._first_token_time if self._first_token_time else self._start_time
            generation_time = self._end_time - generation_start
            if generation_time > 0:
                tokens_per_sec = self._token_count / generation_time

        prompt_eval_speed: Optional[float] = None
        if self._prompt_eval_time is not None and self._prompt_eval_time > 0:
            prompt_eval_speed = 1.0 / self._prompt_eval_time

        peak_ram = self._peak_ram_mb - self._initial_ram_mb
        if peak_ram < 0:
            peak_ram = 0.0

        peak_vram: Optional[float] = None
        if self._peak_vram_mb is not None and self._initial_vram_mb is not None:
            peak_vram = self._peak_vram_mb - self._initial_vram_mb
            if peak_vram < 0:
                peak_vram = 0.0

        return {
            "tokens_per_sec": round(tokens_per_sec, 2) if tokens_per_sec else None,
            "time_to_first_token_ms": round(ttft_ms, 2) if ttft_ms else None,
            "total_time_sec": round(total_time, 3) if total_time > 0 else None,
            "output_token_count": self._token_count,
            "prompt_eval_speed": round(prompt_eval_speed, 2) if prompt_eval_speed else None,
            "peak_ram_mb": round(peak_ram, 2),
            "peak_vram_mb": round(peak_vram, 2) if peak_vram is not None else None,
        }

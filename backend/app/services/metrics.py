import os
import platform
import re
import subprocess
import time
from pathlib import Path
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


def detect_npu_device() -> dict:
    """Detect available NPU hardware on the system.

    Supports Qualcomm Snapdragon platforms with Hexagon NPU/HTP.

    Returns a dict with:
        available: bool - whether any NPU was detected
        device: str - device identifier ("qnn" for Qualcomm, "" for none)
        name: str - human-readable name
        soc: str - SoC name if detectable (e.g., "Snapdragon X Elite")
        htp_available: bool - whether Hexagon Tensor Processor is available
    """
    info: dict = {
        "available": False,
        "device": "",
        "name": "",
        "soc": "",
        "htp_available": False,
    }

    # Method 1: Check for Qualcomm QNN SDK
    qnn_sdk = os.environ.get("QNN_SDK_ROOT", "")
    if qnn_sdk and Path(qnn_sdk).exists():
        info["available"] = True
        info["device"] = "qnn"
        info["name"] = "Qualcomm QNN"

    # Method 2: Linux sysfs for Qualcomm NPU / Hexagon DSP
    if platform.system() == "Linux":
        npu_paths = [
            "/sys/class/misc/adsprpc-smd",
            "/sys/class/misc/adsprpc-smd-secure",
            "/sys/devices/platform/soc/soc:qcom,npu",
            "/sys/class/npu",
        ]
        for path in npu_paths:
            if Path(path).exists():
                info["available"] = True
                info["device"] = "qnn"
                info["htp_available"] = True
                info["name"] = "Qualcomm Hexagon NPU"
                break

        # Read SoC info if available
        try:
            soc_path = Path("/sys/devices/soc0/soc_id")
            if soc_path.exists():
                info["soc"] = f"Qualcomm SoC ID {soc_path.read_text().strip()}"
        except OSError:
            pass

        # Check lscpu for Snapdragon on ARM Linux / WoA
        try:
            result = subprocess.run(
                ["lscpu"], capture_output=True, text=True, timeout=5,
            )
            if result.returncode == 0:
                output_lower = result.stdout.lower()
                if "qualcomm" in output_lower or "snapdragon" in output_lower:
                    info["available"] = True
                    info["device"] = "qnn"
                    info["name"] = "Snapdragon NPU"
                    for line in result.stdout.split("\n"):
                        if "model name" in line.lower():
                            model = line.split(":")[-1].strip()
                            if model:
                                info["soc"] = model
                            break
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            pass

    # Method 3: Windows - WMI + QNN driver DLLs
    if platform.system() == "Windows":
        try:
            result = subprocess.run(
                ["wmic", "cpu", "get", "name"],
                capture_output=True, text=True, timeout=5,
            )
            if result.returncode == 0:
                output_lower = result.stdout.lower()
                if "qualcomm" in output_lower or "snapdragon" in output_lower:
                    info["available"] = True
                    info["device"] = "qnn"
                    info["name"] = "Snapdragon NPU"
                    for line in result.stdout.strip().split("\n"):
                        line = line.strip()
                        if line and line.lower() != "name":
                            info["soc"] = line
                            break
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            pass

        # Check for QNN runtime DLLs
        system32 = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32"
        qnn_dlls = ["QnnHtp.dll", "QnnCpu.dll", "QnnGpu.dll", "QnnSystem.dll"]
        for dll in qnn_dlls:
            if (system32 / dll).exists():
                info["available"] = True
                info["device"] = "qnn"
                if dll == "QnnHtp.dll":
                    info["htp_available"] = True
                if not info["name"]:
                    info["name"] = "Qualcomm QNN"
                break

    return info


def get_npu_memory_mb() -> Optional[float]:
    """Read NPU memory usage where possible.

    Snapdragon NPUs use unified system memory, so dedicated NPU memory
    stats are only available through Qualcomm's fastrpc debug interface.
    Falls back to None if not available.
    """
    if platform.system() == "Linux":
        try:
            fastrpc_path = Path("/sys/kernel/debug/fastrpc/global")
            if fastrpc_path.exists():
                content = fastrpc_path.read_text()
                match = re.search(r"total_mapped\s*:\s*(\d+)", content)
                if match:
                    return int(match.group(1)) / (1024 * 1024)
        except (OSError, PermissionError):
            pass
    return None


class MetricsCollector:
    def __init__(self, track_npu: bool = False) -> None:
        self._start_time: float = 0.0
        self._first_token_time: Optional[float] = None
        self._end_time: float = 0.0
        self._initial_ram_mb: float = 0.0
        self._peak_ram_mb: float = 0.0
        self._initial_vram_mb: Optional[float] = None
        self._peak_vram_mb: Optional[float] = None
        self._initial_npu_mb: Optional[float] = None
        self._peak_npu_mb: Optional[float] = None
        self._track_npu: bool = track_npu
        self._token_count: int = 0
        self._prompt_eval_time: Optional[float] = None

    def start(self) -> None:
        self._start_time = time.perf_counter()
        self._initial_ram_mb = get_ram_usage_mb()
        self._peak_ram_mb = self._initial_ram_mb
        self._initial_vram_mb = get_gpu_memory_mb()
        self._peak_vram_mb = self._initial_vram_mb
        if self._track_npu:
            self._initial_npu_mb = get_npu_memory_mb()
            self._peak_npu_mb = self._initial_npu_mb

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
        if self._track_npu:
            current_npu = get_npu_memory_mb()
            if current_npu is not None:
                if self._peak_npu_mb is None or current_npu > self._peak_npu_mb:
                    self._peak_npu_mb = current_npu

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

        peak_npu: Optional[float] = None
        if self._peak_npu_mb is not None and self._initial_npu_mb is not None:
            peak_npu = self._peak_npu_mb - self._initial_npu_mb
            if peak_npu < 0:
                peak_npu = 0.0

        return {
            "tokens_per_sec": round(tokens_per_sec, 2) if tokens_per_sec else None,
            "time_to_first_token_ms": round(ttft_ms, 2) if ttft_ms else None,
            "total_time_sec": round(total_time, 3) if total_time > 0 else None,
            "output_token_count": self._token_count,
            "prompt_eval_speed": round(prompt_eval_speed, 2) if prompt_eval_speed else None,
            "peak_ram_mb": round(peak_ram, 2),
            "peak_vram_mb": round(peak_vram, 2) if peak_vram is not None else None,
            "peak_npu_mb": round(peak_npu, 2) if peak_npu is not None else None,
        }

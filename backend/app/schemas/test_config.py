from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TestConfigCreate(BaseModel):
    name: str
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    min_p: float = 0.05
    repeat_penalty: float = 1.1
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    mirostat_mode: int = 0
    mirostat_tau: float = 5.0
    mirostat_eta: float = 0.1
    n_ctx: int = 2048
    max_tokens: int = 512
    n_batch: int = 512
    n_threads: int = 4
    n_gpu_layers: int = 0
    npu_enabled: bool = False
    npu_device: str = ""  # "qnn" for Snapdragon QNN, "" for none
    seed: int = -1


class TestConfigUpdate(BaseModel):
    name: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    min_p: Optional[float] = None
    repeat_penalty: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    mirostat_mode: Optional[int] = None
    mirostat_tau: Optional[float] = None
    mirostat_eta: Optional[float] = None
    n_ctx: Optional[int] = None
    max_tokens: Optional[int] = None
    n_batch: Optional[int] = None
    n_threads: Optional[int] = None
    n_gpu_layers: Optional[int] = None
    npu_enabled: Optional[bool] = None
    npu_device: Optional[str] = None
    seed: Optional[int] = None


class TestConfigResponse(BaseModel):
    id: str
    name: str
    temperature: float
    top_p: float
    top_k: int
    min_p: float
    repeat_penalty: float
    frequency_penalty: float
    presence_penalty: float
    mirostat_mode: int
    mirostat_tau: float
    mirostat_eta: float
    n_ctx: int
    max_tokens: int
    n_batch: int
    n_threads: int
    n_gpu_layers: int
    npu_enabled: bool
    npu_device: str
    seed: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

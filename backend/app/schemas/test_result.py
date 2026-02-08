from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TestResultResponse(BaseModel):
    id: str
    run_id: str
    prompt_id: str
    output_text: Optional[str] = None
    tokens_per_sec: Optional[float] = None
    time_to_first_token_ms: Optional[float] = None
    prompt_eval_speed: Optional[float] = None
    total_time_sec: Optional[float] = None
    output_token_count: Optional[int] = None
    peak_ram_mb: Optional[float] = None
    peak_vram_mb: Optional[float] = None
    peak_npu_mb: Optional[float] = None
    accelerator_used: Optional[str] = None
    quality_score: Optional[float] = None
    scoring_method: Optional[str] = None
    human_rating: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class HumanRatingUpdate(BaseModel):
    human_rating: int = Field(..., ge=1, le=5)


class TestResultDetail(BaseModel):
    id: str
    run_id: str
    prompt_id: str
    output_text: Optional[str] = None
    tokens_per_sec: Optional[float] = None
    time_to_first_token_ms: Optional[float] = None
    prompt_eval_speed: Optional[float] = None
    total_time_sec: Optional[float] = None
    output_token_count: Optional[int] = None
    peak_ram_mb: Optional[float] = None
    peak_vram_mb: Optional[float] = None
    peak_npu_mb: Optional[float] = None
    accelerator_used: Optional[str] = None
    quality_score: Optional[float] = None
    scoring_method: Optional[str] = None
    human_rating: Optional[int] = None
    created_at: Optional[datetime] = None
    prompt_text: Optional[str] = None
    model_name: Optional[str] = None

    model_config = {"from_attributes": True}

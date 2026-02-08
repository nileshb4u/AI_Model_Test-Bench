from typing import Optional

from pydantic import BaseModel


class RankingEntry(BaseModel):
    model_id: str
    model_name: str
    composite_score: float
    quality_score: float
    speed_score: float
    efficiency_score: float
    total_runs: int
    avg_tokens_per_sec: Optional[float] = None
    avg_ram_mb: Optional[float] = None
    categories: dict[str, float] = {}


class RankingsResponse(BaseModel):
    rankings: list[RankingEntry]
    weights: dict[str, float]

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TestRunCreate(BaseModel):
    model_id: str
    config_id: str
    suite_id: str
    system_prompt_id: Optional[str] = None


class TestRunResponse(BaseModel):
    id: str
    model_id: str
    config_id: str
    suite_id: str
    system_prompt_id: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    composite_score: Optional[float] = None
    model_name: Optional[str] = None
    config_name: Optional[str] = None
    suite_name: Optional[str] = None

    model_config = {"from_attributes": True}


class BatchRunCreate(BaseModel):
    model_ids: list[str]
    config_id: str
    suite_id: str
    system_prompt_id: Optional[str] = None

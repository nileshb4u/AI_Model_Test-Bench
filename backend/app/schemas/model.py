from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ModelCreate(BaseModel):
    name: str
    file_path: str


class ModelResponse(BaseModel):
    id: str
    name: str
    file_path: str
    file_size_bytes: Optional[int] = None
    architecture: Optional[str] = None
    parameter_count: Optional[str] = None
    quantization: Optional[str] = None
    context_length: Optional[int] = None
    added_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ModelListResponse(BaseModel):
    models: list[ModelResponse]
    count: int

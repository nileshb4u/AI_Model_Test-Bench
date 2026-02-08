from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SystemPromptCreate(BaseModel):
    name: str
    content: str
    category: Optional[str] = None


class SystemPromptUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class SystemPromptResponse(BaseModel):
    id: str
    name: str
    content: str
    category: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

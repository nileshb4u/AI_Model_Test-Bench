from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TestPromptCreate(BaseModel):
    prompt_text: str
    expected_output: Optional[str] = None
    grading_rubric: Optional[str] = None
    order_index: int = 0


class TestPromptResponse(BaseModel):
    id: str
    suite_id: str
    prompt_text: str
    expected_output: Optional[str] = None
    grading_rubric: Optional[str] = None
    order_index: int

    model_config = {"from_attributes": True}


class TestSuiteCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    prompts: Optional[list[TestPromptCreate]] = None


class TestSuiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class TestSuiteResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    prompts: list[TestPromptResponse] = []

    model_config = {"from_attributes": True}

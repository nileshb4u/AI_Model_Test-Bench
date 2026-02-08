import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.system_prompt import SystemPrompt
from app.schemas.system_prompt import SystemPromptCreate, SystemPromptResponse, SystemPromptUpdate

router = APIRouter(prefix="/api/prompts", tags=["system-prompts"])


@router.get("", response_model=list[SystemPromptResponse])
async def list_system_prompts(
    category: str = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
) -> list[SystemPromptResponse]:
    query = select(SystemPrompt).order_by(SystemPrompt.created_at.desc())
    if category:
        query = query.where(SystemPrompt.category == category)
    result = await db.execute(query)
    prompts = result.scalars().all()
    return [SystemPromptResponse.model_validate(p) for p in prompts]


@router.post("", response_model=SystemPromptResponse, status_code=201)
async def create_system_prompt(
    data: SystemPromptCreate,
    db: AsyncSession = Depends(get_db),
) -> SystemPromptResponse:
    prompt = SystemPrompt(
        id=str(uuid.uuid4()),
        name=data.name,
        content=data.content,
        category=data.category,
        created_at=datetime.utcnow(),
    )
    db.add(prompt)
    await db.flush()
    return SystemPromptResponse.model_validate(prompt)


@router.get("/{prompt_id}", response_model=SystemPromptResponse)
async def get_system_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
) -> SystemPromptResponse:
    result = await db.execute(select(SystemPrompt).where(SystemPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="System prompt not found")
    return SystemPromptResponse.model_validate(prompt)


@router.put("/{prompt_id}", response_model=SystemPromptResponse)
async def update_system_prompt(
    prompt_id: str,
    data: SystemPromptUpdate,
    db: AsyncSession = Depends(get_db),
) -> SystemPromptResponse:
    result = await db.execute(select(SystemPrompt).where(SystemPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="System prompt not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prompt, key, value)

    await db.flush()
    return SystemPromptResponse.model_validate(prompt)


@router.delete("/{prompt_id}", status_code=204)
async def delete_system_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(SystemPrompt).where(SystemPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="System prompt not found")

    await db.delete(prompt)
    await db.flush()

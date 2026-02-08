import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_config import TestConfig
from app.schemas.test_config import TestConfigCreate, TestConfigResponse, TestConfigUpdate

router = APIRouter(prefix="/api/configs", tags=["configs"])


@router.get("", response_model=list[TestConfigResponse])
async def list_configs(
    db: AsyncSession = Depends(get_db),
) -> list[TestConfigResponse]:
    result = await db.execute(select(TestConfig).order_by(TestConfig.created_at.desc()))
    configs = result.scalars().all()
    return [TestConfigResponse.model_validate(c) for c in configs]


@router.post("", response_model=TestConfigResponse, status_code=201)
async def create_config(
    data: TestConfigCreate,
    db: AsyncSession = Depends(get_db),
) -> TestConfigResponse:
    config = TestConfig(
        id=str(uuid.uuid4()),
        name=data.name,
        temperature=data.temperature,
        top_p=data.top_p,
        top_k=data.top_k,
        min_p=data.min_p,
        repeat_penalty=data.repeat_penalty,
        frequency_penalty=data.frequency_penalty,
        presence_penalty=data.presence_penalty,
        mirostat_mode=data.mirostat_mode,
        mirostat_tau=data.mirostat_tau,
        mirostat_eta=data.mirostat_eta,
        n_ctx=data.n_ctx,
        max_tokens=data.max_tokens,
        n_batch=data.n_batch,
        n_threads=data.n_threads,
        n_gpu_layers=data.n_gpu_layers,
        seed=data.seed,
        created_at=datetime.utcnow(),
    )
    db.add(config)
    await db.flush()
    return TestConfigResponse.model_validate(config)


@router.get("/{config_id}", response_model=TestConfigResponse)
async def get_config(
    config_id: str,
    db: AsyncSession = Depends(get_db),
) -> TestConfigResponse:
    result = await db.execute(select(TestConfig).where(TestConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return TestConfigResponse.model_validate(config)


@router.put("/{config_id}", response_model=TestConfigResponse)
async def update_config(
    config_id: str,
    data: TestConfigUpdate,
    db: AsyncSession = Depends(get_db),
) -> TestConfigResponse:
    result = await db.execute(select(TestConfig).where(TestConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)

    await db.flush()
    return TestConfigResponse.model_validate(config)


@router.delete("/{config_id}", status_code=204)
async def delete_config(
    config_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(TestConfig).where(TestConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    await db.delete(config)
    await db.flush()

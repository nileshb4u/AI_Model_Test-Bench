import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.model import Model
from app.models.test_run import TestRun
from app.schemas.model import ModelCreate, ModelListResponse, ModelResponse
from app.services.gguf_parser import parse_gguf_metadata

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("", response_model=ModelListResponse)
async def list_models(
    sort_by: str = Query("added_at", description="Sort by field: name, added_at, file_size_bytes"),
    db: AsyncSession = Depends(get_db),
) -> ModelListResponse:
    allowed_sorts = {
        "name": Model.name,
        "added_at": Model.added_at,
        "file_size_bytes": Model.file_size_bytes,
    }
    sort_column = allowed_sorts.get(sort_by, Model.added_at)
    result = await db.execute(select(Model).order_by(sort_column.desc()))
    models = result.scalars().all()
    return ModelListResponse(
        models=[ModelResponse.model_validate(m) for m in models],
        count=len(models),
    )


@router.post("", response_model=ModelResponse, status_code=201)
async def register_model(
    data: ModelCreate,
    db: AsyncSession = Depends(get_db),
) -> ModelResponse:
    if not os.path.exists(data.file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {data.file_path}")

    if not data.file_path.lower().endswith(".gguf"):
        raise HTTPException(status_code=400, detail="File must be a .gguf file")

    existing = await db.execute(select(Model).where(Model.file_path == data.file_path))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Model with this file path already registered")

    metadata = parse_gguf_metadata(data.file_path)

    model = Model(
        id=str(uuid.uuid4()),
        name=data.name,
        file_path=data.file_path,
        file_size_bytes=metadata.get("file_size_bytes"),
        architecture=metadata.get("architecture"),
        parameter_count=metadata.get("parameter_count"),
        quantization=metadata.get("quantization"),
        context_length=metadata.get("context_length"),
        added_at=datetime.utcnow(),
    )
    db.add(model)
    await db.flush()
    return ModelResponse.model_validate(model)


@router.get("/{model_id}", response_model=dict)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    count_result = await db.execute(
        select(func.count(TestRun.id)).where(TestRun.model_id == model_id)
    )
    run_count = count_result.scalar() or 0

    model_data = ModelResponse.model_validate(model).model_dump()
    model_data["test_run_count"] = run_count
    return model_data


@router.delete("/{model_id}", status_code=204)
async def delete_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    await db.delete(model)
    await db.flush()


@router.post("/scan", response_model=list[dict])
async def scan_directory(
    body: dict,
) -> list[dict]:
    directory = body.get("directory", "")
    if not directory:
        raise HTTPException(status_code=400, detail="Directory path is required")

    if not os.path.isdir(directory):
        raise HTTPException(status_code=400, detail=f"Directory not found: {directory}")

    found_files = []
    for root, _dirs, files in os.walk(directory):
        for filename in files:
            if filename.lower().endswith(".gguf"):
                full_path = os.path.join(root, filename)
                metadata = parse_gguf_metadata(full_path)
                found_files.append(
                    {
                        "file_path": full_path,
                        "file_name": filename,
                        "file_size_bytes": metadata.get("file_size_bytes"),
                        "architecture": metadata.get("architecture"),
                        "parameter_count": metadata.get("parameter_count"),
                        "quantization": metadata.get("quantization"),
                        "context_length": metadata.get("context_length"),
                    }
                )

    return found_files

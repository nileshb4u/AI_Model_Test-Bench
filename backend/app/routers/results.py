import csv
import io
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.model import Model
from app.models.test_prompt import TestPrompt
from app.models.test_result import TestResult
from app.models.test_run import TestRun
from app.schemas.test_result import HumanRatingUpdate, TestResultDetail, TestResultResponse

router = APIRouter(prefix="/api/results", tags=["results"])


@router.get("", response_model=dict)
async def list_results(
    run_id: Optional[str] = Query(None),
    model_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    query = select(TestResult).options(
        selectinload(TestResult.prompt),
        selectinload(TestResult.run).selectinload(TestRun.model),
    )

    count_query = select(func.count(TestResult.id))

    if run_id:
        query = query.where(TestResult.run_id == run_id)
        count_query = count_query.where(TestResult.run_id == run_id)

    if model_id:
        query = query.join(TestRun, TestResult.run_id == TestRun.id).where(TestRun.model_id == model_id)
        count_query = count_query.join(TestRun, TestResult.run_id == TestRun.id).where(
            TestRun.model_id == model_id
        )

    total_count = await db.execute(count_query)
    total = total_count.scalar() or 0

    query = query.order_by(TestResult.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    results = result.scalars().all()

    items = []
    for r in results:
        items.append(TestResultResponse(
            id=r.id,
            run_id=r.run_id,
            prompt_id=r.prompt_id,
            output_text=r.output_text,
            tokens_per_sec=r.tokens_per_sec,
            time_to_first_token_ms=r.time_to_first_token_ms,
            prompt_eval_speed=r.prompt_eval_speed,
            total_time_sec=r.total_time_sec,
            output_token_count=r.output_token_count,
            peak_ram_mb=r.peak_ram_mb,
            peak_vram_mb=r.peak_vram_mb,
            quality_score=r.quality_score,
            scoring_method=r.scoring_method,
            human_rating=r.human_rating,
            created_at=r.created_at,
        ).model_dump())

    return {
        "results": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{result_id}", response_model=TestResultDetail)
async def get_result(
    result_id: str,
    db: AsyncSession = Depends(get_db),
) -> TestResultDetail:
    result = await db.execute(
        select(TestResult)
        .options(
            selectinload(TestResult.prompt),
            selectinload(TestResult.run).selectinload(TestRun.model),
        )
        .where(TestResult.id == result_id)
    )
    test_result = result.scalar_one_or_none()
    if not test_result:
        raise HTTPException(status_code=404, detail="Test result not found")

    return TestResultDetail(
        id=test_result.id,
        run_id=test_result.run_id,
        prompt_id=test_result.prompt_id,
        output_text=test_result.output_text,
        tokens_per_sec=test_result.tokens_per_sec,
        time_to_first_token_ms=test_result.time_to_first_token_ms,
        prompt_eval_speed=test_result.prompt_eval_speed,
        total_time_sec=test_result.total_time_sec,
        output_token_count=test_result.output_token_count,
        peak_ram_mb=test_result.peak_ram_mb,
        peak_vram_mb=test_result.peak_vram_mb,
        quality_score=test_result.quality_score,
        scoring_method=test_result.scoring_method,
        human_rating=test_result.human_rating,
        created_at=test_result.created_at,
        prompt_text=test_result.prompt.prompt_text if test_result.prompt else None,
        model_name=test_result.run.model.name if test_result.run and test_result.run.model else None,
    )


@router.post("/{result_id}/rate", response_model=TestResultResponse)
async def rate_result(
    result_id: str,
    data: HumanRatingUpdate,
    db: AsyncSession = Depends(get_db),
) -> TestResultResponse:
    result = await db.execute(select(TestResult).where(TestResult.id == result_id))
    test_result = result.scalar_one_or_none()
    if not test_result:
        raise HTTPException(status_code=404, detail="Test result not found")

    test_result.human_rating = data.human_rating
    await db.flush()
    return TestResultResponse.model_validate(test_result)


export_router = APIRouter(prefix="/api/export", tags=["export"])


@export_router.get("/{format}")
async def export_results(
    format: str,
    model_id: Optional[str] = Query(None),
    suite_id: Optional[str] = Query(None),
    run_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    if format not in ("csv", "json"):
        raise HTTPException(status_code=400, detail="Format must be 'csv' or 'json'")

    query = (
        select(TestResult, TestPrompt.prompt_text, Model.name.label("model_name"))
        .join(TestPrompt, TestResult.prompt_id == TestPrompt.id)
        .join(TestRun, TestResult.run_id == TestRun.id)
        .join(Model, TestRun.model_id == Model.id)
    )

    if run_id:
        query = query.where(TestResult.run_id == run_id)
    if model_id:
        query = query.where(TestRun.model_id == model_id)
    if suite_id:
        query = query.where(TestRun.suite_id == suite_id)

    query = query.order_by(TestResult.created_at)

    result = await db.execute(query)
    rows = result.all()

    export_data = []
    for row in rows:
        test_result = row[0]
        prompt_text = row[1]
        model_name = row[2]
        export_data.append({
            "id": test_result.id,
            "run_id": test_result.run_id,
            "model_name": model_name,
            "prompt_text": prompt_text,
            "output_text": test_result.output_text,
            "tokens_per_sec": test_result.tokens_per_sec,
            "time_to_first_token_ms": test_result.time_to_first_token_ms,
            "prompt_eval_speed": test_result.prompt_eval_speed,
            "total_time_sec": test_result.total_time_sec,
            "output_token_count": test_result.output_token_count,
            "peak_ram_mb": test_result.peak_ram_mb,
            "peak_vram_mb": test_result.peak_vram_mb,
            "quality_score": test_result.quality_score,
            "scoring_method": test_result.scoring_method,
            "human_rating": test_result.human_rating,
            "created_at": test_result.created_at.isoformat() if test_result.created_at else None,
        })

    if format == "json":
        content = json.dumps(export_data, indent=2, default=str)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=results.json"},
        )
    else:
        output = io.StringIO()
        if export_data:
            writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
            writer.writeheader()
            writer.writerows(export_data)
        csv_content = output.getvalue()
        return StreamingResponse(
            io.BytesIO(csv_content.encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=results.csv"},
        )

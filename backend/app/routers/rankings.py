from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.model import Model
from app.models.test_result import TestResult
from app.models.test_run import TestRun
from app.models.test_suite import TestSuite
from app.schemas.rankings import RankingEntry, RankingsResponse
from app.services.scoring import normalize_scores

router = APIRouter(prefix="/api/rankings", tags=["rankings"])


async def _compute_rankings(
    db: AsyncSession,
    model_ids: Optional[list[str]] = None,
) -> list[RankingEntry]:
    query = (
        select(
            Model.id,
            Model.name,
            func.count(TestRun.id).label("total_runs"),
            func.avg(TestResult.quality_score).label("avg_quality"),
            func.avg(TestResult.tokens_per_sec).label("avg_speed"),
            func.avg(TestResult.peak_ram_mb).label("avg_ram"),
        )
        .join(TestRun, TestRun.model_id == Model.id)
        .join(TestResult, TestResult.run_id == TestRun.id)
        .where(TestRun.status == "completed")
        .group_by(Model.id, Model.name)
    )

    if model_ids:
        query = query.where(Model.id.in_(model_ids))

    result = await db.execute(query)
    rows = result.all()

    if not rows:
        return []

    quality_values = [float(r.avg_quality) if r.avg_quality is not None else 0.0 for r in rows]
    speed_values = [float(r.avg_speed) if r.avg_speed is not None else 0.0 for r in rows]
    ram_values = [float(r.avg_ram) if r.avg_ram is not None else 0.0 for r in rows]

    norm_quality = normalize_scores(quality_values, higher_is_better=True)
    norm_speed = normalize_scores(speed_values, higher_is_better=True)
    norm_efficiency = normalize_scores(ram_values, higher_is_better=False)

    w_quality = settings.scoring_weight_quality
    w_speed = settings.scoring_weight_speed
    w_efficiency = settings.scoring_weight_efficiency

    category_query = (
        select(
            TestRun.model_id,
            TestSuite.category,
            func.avg(TestResult.quality_score).label("cat_avg"),
        )
        .join(TestResult, TestResult.run_id == TestRun.id)
        .join(TestSuite, TestRun.suite_id == TestSuite.id)
        .where(TestRun.status == "completed")
        .where(TestSuite.category.isnot(None))
        .group_by(TestRun.model_id, TestSuite.category)
    )

    if model_ids:
        category_query = category_query.where(TestRun.model_id.in_(model_ids))

    cat_result = await db.execute(category_query)
    cat_rows = cat_result.all()

    categories_map: dict[str, dict[str, float]] = {}
    for cr in cat_rows:
        mid = cr.model_id
        cat = cr.category
        avg = float(cr.cat_avg) if cr.cat_avg is not None else 0.0
        if mid not in categories_map:
            categories_map[mid] = {}
        categories_map[mid][cat] = round(avg, 2)

    rankings: list[RankingEntry] = []
    for idx, row in enumerate(rows):
        composite = (
            w_quality * norm_quality[idx]
            + w_speed * norm_speed[idx]
            + w_efficiency * norm_efficiency[idx]
        )
        rankings.append(
            RankingEntry(
                model_id=row.id,
                model_name=row.name,
                composite_score=round(composite, 2),
                quality_score=round(norm_quality[idx], 2),
                speed_score=round(norm_speed[idx], 2),
                efficiency_score=round(norm_efficiency[idx], 2),
                total_runs=row.total_runs,
                avg_tokens_per_sec=round(float(row.avg_speed), 2) if row.avg_speed else None,
                avg_ram_mb=round(float(row.avg_ram), 2) if row.avg_ram else None,
                categories=categories_map.get(row.id, {}),
            )
        )

    rankings.sort(key=lambda r: r.composite_score, reverse=True)
    return rankings


@router.get("", response_model=RankingsResponse)
async def get_rankings(
    db: AsyncSession = Depends(get_db),
) -> RankingsResponse:
    rankings = await _compute_rankings(db)
    return RankingsResponse(
        rankings=rankings,
        weights={
            "quality": settings.scoring_weight_quality,
            "speed": settings.scoring_weight_speed,
            "efficiency": settings.scoring_weight_efficiency,
        },
    )


@router.get("/compare", response_model=RankingsResponse)
async def compare_models(
    model_ids: str = Query(..., description="Comma-separated model IDs"),
    db: AsyncSession = Depends(get_db),
) -> RankingsResponse:
    ids = [mid.strip() for mid in model_ids.split(",") if mid.strip()]
    if not ids:
        return RankingsResponse(
            rankings=[],
            weights={
                "quality": settings.scoring_weight_quality,
                "speed": settings.scoring_weight_speed,
                "efficiency": settings.scoring_weight_efficiency,
            },
        )

    rankings = await _compute_rankings(db, model_ids=ids)
    return RankingsResponse(
        rankings=rankings,
        weights={
            "quality": settings.scoring_weight_quality,
            "speed": settings.scoring_weight_speed,
            "efficiency": settings.scoring_weight_efficiency,
        },
    )

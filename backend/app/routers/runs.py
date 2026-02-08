import asyncio
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session, get_db
from app.models.model import Model
from app.models.system_prompt import SystemPrompt
from app.models.test_config import TestConfig
from app.models.test_prompt import TestPrompt
from app.models.test_result import TestResult
from app.models.test_run import TestRun
from app.models.test_suite import TestSuite
from app.schemas.test_run import BatchRunCreate, TestRunCreate, TestRunResponse
from app.services.inference import engine
from app.services.scoring import compute_composite_score, compute_quality_score
from app.config import settings
from app.websocket.stream import broadcast_to_run

router = APIRouter(prefix="/api/runs", tags=["test-runs"])

_active_tasks: dict[str, asyncio.Task] = {}


async def _execute_test_run(run_id: str) -> None:
    async with async_session() as db:
        try:
            result = await db.execute(
                select(TestRun)
                .options(
                    selectinload(TestRun.model),
                    selectinload(TestRun.config),
                    selectinload(TestRun.suite).selectinload(TestSuite.prompts),
                    selectinload(TestRun.system_prompt),
                )
                .where(TestRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if not run:
                return

            run.status = "running"
            run.started_at = datetime.utcnow()
            await db.commit()

            await broadcast_to_run(run_id, {
                "type": "progress",
                "data": {"status": "running", "message": "Loading model..."},
            })

            model_obj = run.model
            config_obj = run.config

            await engine.load_model(
                file_path=model_obj.file_path,
                n_ctx=config_obj.n_ctx,
                n_threads=config_obj.n_threads,
                n_gpu_layers=config_obj.n_gpu_layers,
                n_batch=config_obj.n_batch,
            )

            system_prompt_text: Optional[str] = None
            if run.system_prompt:
                system_prompt_text = run.system_prompt.content

            prompts = sorted(run.suite.prompts, key=lambda p: p.order_index)
            total_prompts = len(prompts)

            config_dict = {
                "temperature": config_obj.temperature,
                "top_p": config_obj.top_p,
                "top_k": config_obj.top_k,
                "min_p": config_obj.min_p,
                "repeat_penalty": config_obj.repeat_penalty,
                "frequency_penalty": config_obj.frequency_penalty,
                "presence_penalty": config_obj.presence_penalty,
                "mirostat_mode": config_obj.mirostat_mode,
                "mirostat_tau": config_obj.mirostat_tau,
                "mirostat_eta": config_obj.mirostat_eta,
                "max_tokens": config_obj.max_tokens,
                "seed": config_obj.seed,
            }

            quality_scores: list[float] = []
            speed_values: list[float] = []
            ram_values: list[float] = []

            for prompt_idx, prompt in enumerate(prompts):
                if run_id in _active_tasks and _active_tasks[run_id].cancelled():
                    run.status = "cancelled"
                    run.completed_at = datetime.utcnow()
                    await db.commit()
                    await broadcast_to_run(run_id, {
                        "type": "complete",
                        "data": {"status": "cancelled"},
                    })
                    return

                await broadcast_to_run(run_id, {
                    "type": "progress",
                    "data": {
                        "status": "running",
                        "current_prompt": prompt_idx + 1,
                        "total_prompts": total_prompts,
                        "prompt_text": prompt.prompt_text[:100],
                    },
                })

                full_output = ""
                final_metrics: Optional[dict] = None
                error_msg: Optional[str] = None

                try:
                    async for chunk in engine.generate(
                        prompt=prompt.prompt_text,
                        system_prompt=system_prompt_text,
                        config=config_dict,
                    ):
                        token = chunk.get("token", "")
                        done = chunk.get("done", False)

                        if token:
                            await broadcast_to_run(run_id, {
                                "type": "token",
                                "data": {
                                    "token": token,
                                    "prompt_index": prompt_idx,
                                },
                            })

                        if done:
                            full_output = chunk.get("full_output", full_output)
                            final_metrics = chunk.get("metrics")
                            error_msg = chunk.get("error")
                        else:
                            full_output += token

                except Exception as e:
                    error_msg = str(e)
                    await broadcast_to_run(run_id, {
                        "type": "error",
                        "data": {"message": str(e), "prompt_index": prompt_idx},
                    })

                quality_score_val, scoring_method = compute_quality_score(
                    output=full_output,
                    expected=prompt.expected_output,
                    rubric=prompt.grading_rubric,
                )

                tokens_per_sec = final_metrics.get("tokens_per_sec") if final_metrics else None
                ttft_ms = final_metrics.get("time_to_first_token_ms") if final_metrics else None
                total_time = final_metrics.get("total_time_sec") if final_metrics else None
                output_tokens = final_metrics.get("output_token_count") if final_metrics else None
                peak_ram = final_metrics.get("peak_ram_mb") if final_metrics else None
                peak_vram = final_metrics.get("peak_vram_mb") if final_metrics else None
                prompt_eval_speed = final_metrics.get("prompt_eval_speed") if final_metrics else None

                test_result = TestResult(
                    id=str(uuid.uuid4()),
                    run_id=run_id,
                    prompt_id=prompt.id,
                    output_text=full_output if not error_msg else f"[ERROR] {error_msg}",
                    tokens_per_sec=tokens_per_sec,
                    time_to_first_token_ms=ttft_ms,
                    prompt_eval_speed=prompt_eval_speed,
                    total_time_sec=total_time,
                    output_token_count=output_tokens,
                    peak_ram_mb=peak_ram,
                    peak_vram_mb=peak_vram,
                    quality_score=quality_score_val,
                    scoring_method=scoring_method,
                    created_at=datetime.utcnow(),
                )
                db.add(test_result)
                await db.flush()

                quality_scores.append(quality_score_val)
                if tokens_per_sec is not None:
                    speed_values.append(tokens_per_sec)
                if peak_ram is not None:
                    ram_values.append(peak_ram)

                await broadcast_to_run(run_id, {
                    "type": "metrics",
                    "data": {
                        "prompt_index": prompt_idx,
                        "quality_score": quality_score_val,
                        "tokens_per_sec": tokens_per_sec,
                        "total_time_sec": total_time,
                        "peak_ram_mb": peak_ram,
                    },
                })

            weights = {
                "quality": settings.scoring_weight_quality,
                "speed": settings.scoring_weight_speed,
                "efficiency": settings.scoring_weight_efficiency,
            }
            composite = compute_composite_score(quality_scores, speed_values, ram_values, weights)

            run.composite_score = composite
            run.status = "completed"
            run.completed_at = datetime.utcnow()
            await db.commit()

            await broadcast_to_run(run_id, {
                "type": "complete",
                "data": {
                    "status": "completed",
                    "composite_score": composite,
                },
            })

        except asyncio.CancelledError:
            async with async_session() as cancel_db:
                cancel_result = await cancel_db.execute(
                    select(TestRun).where(TestRun.id == run_id)
                )
                cancel_run = cancel_result.scalar_one_or_none()
                if cancel_run:
                    cancel_run.status = "cancelled"
                    cancel_run.completed_at = datetime.utcnow()
                    await cancel_db.commit()
            await broadcast_to_run(run_id, {
                "type": "complete",
                "data": {"status": "cancelled"},
            })

        except Exception as e:
            try:
                async with async_session() as err_db:
                    err_result = await err_db.execute(
                        select(TestRun).where(TestRun.id == run_id)
                    )
                    err_run = err_result.scalar_one_or_none()
                    if err_run:
                        err_run.status = "failed"
                        err_run.completed_at = datetime.utcnow()
                        await err_db.commit()
            except Exception:
                pass

            await broadcast_to_run(run_id, {
                "type": "error",
                "data": {"message": str(e), "status": "failed"},
            })

        finally:
            _active_tasks.pop(run_id, None)


@router.post("", response_model=TestRunResponse, status_code=201)
async def start_run(
    data: TestRunCreate,
    db: AsyncSession = Depends(get_db),
) -> TestRunResponse:
    model_result = await db.execute(select(Model).where(Model.id == data.model_id))
    if not model_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Model not found")

    config_result = await db.execute(select(TestConfig).where(TestConfig.id == data.config_id))
    if not config_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Config not found")

    suite_result = await db.execute(
        select(TestSuite).options(selectinload(TestSuite.prompts)).where(TestSuite.id == data.suite_id)
    )
    suite = suite_result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    if not suite.prompts:
        raise HTTPException(status_code=400, detail="Test suite has no prompts")

    if data.system_prompt_id:
        sp_result = await db.execute(
            select(SystemPrompt).where(SystemPrompt.id == data.system_prompt_id)
        )
        if not sp_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="System prompt not found")

    run = TestRun(
        id=str(uuid.uuid4()),
        model_id=data.model_id,
        config_id=data.config_id,
        suite_id=data.suite_id,
        system_prompt_id=data.system_prompt_id,
        status="queued",
    )
    db.add(run)
    await db.flush()

    result = await db.execute(
        select(TestRun)
        .options(
            selectinload(TestRun.model),
            selectinload(TestRun.config),
            selectinload(TestRun.suite),
        )
        .where(TestRun.id == run.id)
    )
    run = result.scalar_one()

    response = TestRunResponse(
        id=run.id,
        model_id=run.model_id,
        config_id=run.config_id,
        suite_id=run.suite_id,
        system_prompt_id=run.system_prompt_id,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        composite_score=run.composite_score,
        model_name=run.model.name if run.model else None,
        config_name=run.config.name if run.config else None,
        suite_name=run.suite.name if run.suite else None,
    )

    task = asyncio.create_task(_execute_test_run(run.id))
    _active_tasks[run.id] = task

    return response


@router.post("/batch", response_model=list[TestRunResponse], status_code=201)
async def start_batch_run(
    data: BatchRunCreate,
    db: AsyncSession = Depends(get_db),
) -> list[TestRunResponse]:
    config_result = await db.execute(select(TestConfig).where(TestConfig.id == data.config_id))
    if not config_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Config not found")

    suite_result = await db.execute(
        select(TestSuite).options(selectinload(TestSuite.prompts)).where(TestSuite.id == data.suite_id)
    )
    suite = suite_result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    if not suite.prompts:
        raise HTTPException(status_code=400, detail="Test suite has no prompts")

    if data.system_prompt_id:
        sp_result = await db.execute(
            select(SystemPrompt).where(SystemPrompt.id == data.system_prompt_id)
        )
        if not sp_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="System prompt not found")

    responses = []
    for model_id in data.model_ids:
        model_result = await db.execute(select(Model).where(Model.id == model_id))
        model_obj = model_result.scalar_one_or_none()
        if not model_obj:
            raise HTTPException(status_code=404, detail=f"Model not found: {model_id}")

        run = TestRun(
            id=str(uuid.uuid4()),
            model_id=model_id,
            config_id=data.config_id,
            suite_id=data.suite_id,
            system_prompt_id=data.system_prompt_id,
            status="queued",
        )
        db.add(run)
        await db.flush()

        result = await db.execute(
            select(TestRun)
            .options(
                selectinload(TestRun.model),
                selectinload(TestRun.config),
                selectinload(TestRun.suite),
            )
            .where(TestRun.id == run.id)
        )
        run = result.scalar_one()

        responses.append(TestRunResponse(
            id=run.id,
            model_id=run.model_id,
            config_id=run.config_id,
            suite_id=run.suite_id,
            system_prompt_id=run.system_prompt_id,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
            composite_score=run.composite_score,
            model_name=run.model.name if run.model else None,
            config_name=run.config.name if run.config else None,
            suite_name=run.suite.name if run.suite else None,
        ))

    await db.commit()

    async def _run_batch_sequentially(run_ids: list[str]) -> None:
        for rid in run_ids:
            await _execute_test_run(rid)

    run_ids = [r.id for r in responses]
    task = asyncio.create_task(_run_batch_sequentially(run_ids))
    for rid in run_ids:
        _active_tasks[rid] = task

    return responses


@router.get("", response_model=dict)
async def list_runs(
    model_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    query = select(TestRun).options(
        selectinload(TestRun.model),
        selectinload(TestRun.config),
        selectinload(TestRun.suite),
    )

    if model_id:
        query = query.where(TestRun.model_id == model_id)
    if status:
        query = query.where(TestRun.status == status)

    count_query = select(func.count(TestRun.id))
    if model_id:
        count_query = count_query.where(TestRun.model_id == model_id)
    if status:
        count_query = count_query.where(TestRun.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(TestRun.started_at.desc().nullslast())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    runs = result.scalars().all()

    run_responses = []
    for r in runs:
        run_responses.append(TestRunResponse(
            id=r.id,
            model_id=r.model_id,
            config_id=r.config_id,
            suite_id=r.suite_id,
            system_prompt_id=r.system_prompt_id,
            status=r.status,
            started_at=r.started_at,
            completed_at=r.completed_at,
            composite_score=r.composite_score,
            model_name=r.model.name if r.model else None,
            config_name=r.config.name if r.config else None,
            suite_name=r.suite.name if r.suite else None,
        ).model_dump())

    return {
        "runs": run_responses,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{run_id}", response_model=dict)
async def get_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(TestRun)
        .options(
            selectinload(TestRun.model),
            selectinload(TestRun.config),
            selectinload(TestRun.suite),
            selectinload(TestRun.results).selectinload(TestResult.prompt),
        )
        .where(TestRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")

    run_data = TestRunResponse(
        id=run.id,
        model_id=run.model_id,
        config_id=run.config_id,
        suite_id=run.suite_id,
        system_prompt_id=run.system_prompt_id,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        composite_score=run.composite_score,
        model_name=run.model.name if run.model else None,
        config_name=run.config.name if run.config else None,
        suite_name=run.suite.name if run.suite else None,
    ).model_dump()

    results_data = []
    for res in run.results:
        results_data.append({
            "id": res.id,
            "run_id": res.run_id,
            "prompt_id": res.prompt_id,
            "output_text": res.output_text,
            "tokens_per_sec": res.tokens_per_sec,
            "time_to_first_token_ms": res.time_to_first_token_ms,
            "prompt_eval_speed": res.prompt_eval_speed,
            "total_time_sec": res.total_time_sec,
            "output_token_count": res.output_token_count,
            "peak_ram_mb": res.peak_ram_mb,
            "peak_vram_mb": res.peak_vram_mb,
            "quality_score": res.quality_score,
            "scoring_method": res.scoring_method,
            "human_rating": res.human_rating,
            "created_at": res.created_at.isoformat() if res.created_at else None,
            "prompt_text": res.prompt.prompt_text if res.prompt else None,
        })

    run_data["results"] = results_data
    return run_data


@router.post("/{run_id}/cancel", response_model=dict)
async def cancel_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(TestRun).where(TestRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")

    if run.status not in ("queued", "running"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel run with status: {run.status}")

    task = _active_tasks.get(run_id)
    if task and not task.done():
        task.cancel()

    run.status = "cancelled"
    run.completed_at = datetime.utcnow()
    await db.flush()

    return {"id": run_id, "status": "cancelled"}

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.test_prompt import TestPrompt
from app.models.test_suite import TestSuite
from app.schemas.test_suite import (
    TestPromptCreate,
    TestPromptResponse,
    TestSuiteCreate,
    TestSuiteResponse,
    TestSuiteUpdate,
)

router = APIRouter(prefix="/api/suites", tags=["test-suites"])


@router.get("", response_model=list[TestSuiteResponse])
async def list_suites(
    db: AsyncSession = Depends(get_db),
) -> list[TestSuiteResponse]:
    result = await db.execute(
        select(TestSuite)
        .options(selectinload(TestSuite.prompts))
        .order_by(TestSuite.created_at.desc())
    )
    suites = result.scalars().all()
    return [TestSuiteResponse.model_validate(s) for s in suites]


@router.post("", response_model=TestSuiteResponse, status_code=201)
async def create_suite(
    data: TestSuiteCreate,
    db: AsyncSession = Depends(get_db),
) -> TestSuiteResponse:
    suite = TestSuite(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        category=data.category,
        created_at=datetime.utcnow(),
    )
    db.add(suite)
    await db.flush()

    if data.prompts:
        for idx, p in enumerate(data.prompts):
            prompt = TestPrompt(
                id=str(uuid.uuid4()),
                suite_id=suite.id,
                prompt_text=p.prompt_text,
                expected_output=p.expected_output,
                grading_rubric=p.grading_rubric,
                order_index=p.order_index if p.order_index != 0 else idx,
            )
            db.add(prompt)
        await db.flush()

    result = await db.execute(
        select(TestSuite)
        .options(selectinload(TestSuite.prompts))
        .where(TestSuite.id == suite.id)
    )
    suite = result.scalar_one()
    return TestSuiteResponse.model_validate(suite)


@router.get("/{suite_id}", response_model=TestSuiteResponse)
async def get_suite(
    suite_id: str,
    db: AsyncSession = Depends(get_db),
) -> TestSuiteResponse:
    result = await db.execute(
        select(TestSuite)
        .options(selectinload(TestSuite.prompts))
        .where(TestSuite.id == suite_id)
    )
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    return TestSuiteResponse.model_validate(suite)


@router.put("/{suite_id}", response_model=TestSuiteResponse)
async def update_suite(
    suite_id: str,
    data: TestSuiteUpdate,
    db: AsyncSession = Depends(get_db),
) -> TestSuiteResponse:
    result = await db.execute(
        select(TestSuite)
        .options(selectinload(TestSuite.prompts))
        .where(TestSuite.id == suite_id)
    )
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(suite, key, value)

    await db.flush()
    return TestSuiteResponse.model_validate(suite)


@router.post("/{suite_id}/prompts", response_model=list[TestPromptResponse], status_code=201)
async def add_prompts_to_suite(
    suite_id: str,
    prompts: list[TestPromptCreate],
    db: AsyncSession = Depends(get_db),
) -> list[TestPromptResponse]:
    result = await db.execute(select(TestSuite).where(TestSuite.id == suite_id))
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")

    existing_count_result = await db.execute(
        select(TestPrompt).where(TestPrompt.suite_id == suite_id)
    )
    existing_prompts = existing_count_result.scalars().all()
    start_index = len(existing_prompts)

    created = []
    for idx, p in enumerate(prompts):
        prompt = TestPrompt(
            id=str(uuid.uuid4()),
            suite_id=suite_id,
            prompt_text=p.prompt_text,
            expected_output=p.expected_output,
            grading_rubric=p.grading_rubric,
            order_index=p.order_index if p.order_index != 0 else start_index + idx,
        )
        db.add(prompt)
        created.append(prompt)

    await db.flush()
    return [TestPromptResponse.model_validate(p) for p in created]


@router.delete("/{suite_id}", status_code=204)
async def delete_suite(
    suite_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(TestSuite).where(TestSuite.id == suite_id))
    suite = result.scalar_one_or_none()
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")

    await db.delete(suite)
    await db.flush()


@router.post("/import", response_model=TestSuiteResponse, status_code=201)
async def import_prompts(
    body: dict,
    db: AsyncSession = Depends(get_db),
) -> TestSuiteResponse:
    suite_name = body.get("name", "Imported Suite")
    suite_description = body.get("description")
    suite_category = body.get("category")
    prompts_data = body.get("prompts", [])

    if not prompts_data:
        raise HTTPException(status_code=400, detail="No prompts provided in the import data")

    suite = TestSuite(
        id=str(uuid.uuid4()),
        name=suite_name,
        description=suite_description,
        category=suite_category,
        created_at=datetime.utcnow(),
    )
    db.add(suite)
    await db.flush()

    for idx, p_data in enumerate(prompts_data):
        if not isinstance(p_data, dict):
            continue
        prompt_text = p_data.get("prompt_text", "")
        if not prompt_text:
            continue
        prompt = TestPrompt(
            id=str(uuid.uuid4()),
            suite_id=suite.id,
            prompt_text=prompt_text,
            expected_output=p_data.get("expected_output"),
            grading_rubric=p_data.get("grading_rubric"),
            order_index=idx,
        )
        db.add(prompt)

    await db.flush()

    result = await db.execute(
        select(TestSuite)
        .options(selectinload(TestSuite.prompts))
        .where(TestSuite.id == suite.id)
    )
    suite = result.scalar_one()
    return TestSuiteResponse.model_validate(suite)

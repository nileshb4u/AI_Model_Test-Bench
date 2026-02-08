import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base


class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey("models.id"), nullable=False)
    config_id = Column(String(36), ForeignKey("test_configs.id"), nullable=False)
    suite_id = Column(String(36), ForeignKey("test_suites.id"), nullable=False)
    system_prompt_id = Column(String(36), ForeignKey("system_prompts.id"), nullable=True)
    status = Column(String(20), default="queued")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    composite_score = Column(Float, nullable=True)

    model = relationship("Model", back_populates="test_runs")
    config = relationship("TestConfig", back_populates="test_runs")
    suite = relationship("TestSuite", back_populates="test_runs")
    system_prompt = relationship("SystemPrompt", back_populates="test_runs")
    results = relationship("TestResult", back_populates="run", cascade="all, delete-orphan")

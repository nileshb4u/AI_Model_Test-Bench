import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    prompt_id = Column(String(36), ForeignKey("test_prompts.id"), nullable=False)
    output_text = Column(Text, nullable=True)
    tokens_per_sec = Column(Float, nullable=True)
    time_to_first_token_ms = Column(Float, nullable=True)
    prompt_eval_speed = Column(Float, nullable=True)
    total_time_sec = Column(Float, nullable=True)
    output_token_count = Column(Integer, nullable=True)
    peak_ram_mb = Column(Float, nullable=True)
    peak_vram_mb = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)
    scoring_method = Column(String(50), nullable=True)
    human_rating = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("TestRun", back_populates="results")
    prompt = relationship("TestPrompt")

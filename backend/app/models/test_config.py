import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class TestConfig(Base):
    __tablename__ = "test_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    temperature = Column(Float, default=0.7)
    top_p = Column(Float, default=0.9)
    top_k = Column(Integer, default=40)
    min_p = Column(Float, default=0.05)
    repeat_penalty = Column(Float, default=1.1)
    frequency_penalty = Column(Float, default=0.0)
    presence_penalty = Column(Float, default=0.0)
    mirostat_mode = Column(Integer, default=0)
    mirostat_tau = Column(Float, default=5.0)
    mirostat_eta = Column(Float, default=0.1)
    n_ctx = Column(Integer, default=2048)
    max_tokens = Column(Integer, default=512)
    n_batch = Column(Integer, default=512)
    n_threads = Column(Integer, default=4)
    n_gpu_layers = Column(Integer, default=0)
    seed = Column(Integer, default=-1)
    created_at = Column(DateTime, default=datetime.utcnow)

    test_runs = relationship("TestRun", back_populates="config")

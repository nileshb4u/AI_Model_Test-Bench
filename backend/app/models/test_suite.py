import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class TestSuite(Base):
    __tablename__ = "test_suites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    prompts = relationship("TestPrompt", back_populates="suite", cascade="all, delete-orphan")
    test_runs = relationship("TestRun", back_populates="suite")

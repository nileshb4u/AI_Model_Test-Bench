import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Model(Base):
    __tablename__ = "models"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False, unique=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    architecture = Column(String(255), nullable=True)
    parameter_count = Column(String(50), nullable=True)
    quantization = Column(String(50), nullable=True)
    context_length = Column(Integer, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    test_runs = relationship("TestRun", back_populates="model")

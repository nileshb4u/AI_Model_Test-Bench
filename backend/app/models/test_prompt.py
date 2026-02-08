import uuid

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class TestPrompt(Base):
    __tablename__ = "test_prompts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    suite_id = Column(String(36), ForeignKey("test_suites.id", ondelete="CASCADE"), nullable=False)
    prompt_text = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=True)
    grading_rubric = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)

    suite = relationship("TestSuite", back_populates="prompts")

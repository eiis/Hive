"""数据库模型"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class DBGroup(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    messages = relationship("DBMessage", back_populates="group")


class DBMessage(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    sender = Column(String, nullable=False)
    target = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    group = relationship("DBGroup", back_populates="messages")


class DBTask(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    status = Column(String, default="pending")
    assigned_to = Column(String, nullable=True)
    progress = Column(Float, default=0.0)
    group_id = Column(String, nullable=True)
    parent_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DBUser(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)


class DBAgent(Base):
    __tablename__ = "agents"

    name = Column(String, primary_key=True)
    model_name = Column(String, nullable=False)
    system_prompt = Column(Text, default="")
    group_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

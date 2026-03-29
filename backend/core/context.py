"""共享上下文 — Agent 间共享的数据结构"""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from .task import TaskTree


class MemoryItem(BaseModel):
    content: str
    author: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Artifact(BaseModel):
    name: str
    type: str  # "file", "code", "text"
    content: str
    author: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SharedContext:
    """Agent 间共享的上下文"""

    def __init__(self) -> None:
        self.objective: str = ""
        self.task_tree: TaskTree = TaskTree()
        self.memory: list[MemoryItem] = []
        self.artifacts: list[Artifact] = []

    def set_objective(self, objective: str) -> None:
        self.objective = objective

    def add_memory(self, content: str, author: str) -> MemoryItem:
        item = MemoryItem(content=content, author=author)
        self.memory.append(item)
        return item

    def add_artifact(self, name: str, type: str, content: str, author: str) -> Artifact:
        artifact = Artifact(name=name, type=type, content=content, author=author)
        self.artifacts.append(artifact)
        return artifact

    def to_dict(self) -> dict:
        return {
            "objective": self.objective,
            "tasks": [t.model_dump(mode="json") for t in self.task_tree.to_list()],
            "memory": [m.model_dump(mode="json") for m in self.memory],
            "artifacts": [a.model_dump(mode="json") for a in self.artifacts],
        }

"""任务树管理"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, Field


class TaskStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class Task(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    assigned_to: str | None = None
    depends_on: list[str] = Field(default_factory=list)
    children: list[Task] = Field(default_factory=list)
    progress: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    result: str | None = None


class TaskTree:
    """任务树管理器，支持拓扑排序调度"""

    def __init__(self) -> None:
        self.tasks: dict[str, Task] = {}

    def add_task(self, task: Task) -> Task:
        self.tasks[task.id] = task
        self.refresh_blocked_states()
        return task

    def clear(self) -> None:
        self.tasks.clear()

    def get_task(self, task_id: str) -> Task | None:
        return self.tasks.get(task_id)

    def update_task(self, task_id: str, **kwargs) -> Task | None:
        task = self.tasks.get(task_id)
        if not task:
            return None
        for key, value in kwargs.items():
            if hasattr(task, key):
                setattr(task, key, value)
        task.updated_at = datetime.now(timezone.utc)
        self.refresh_blocked_states()
        return task

    def get_ready_tasks(self) -> list[Task]:
        """获取所有依赖已完成、可以开始执行的任务"""
        ready = []
        for task in self.tasks.values():
            if task.status not in (TaskStatus.PENDING, TaskStatus.BLOCKED):
                continue
            deps_met = all(
                self.tasks.get(dep_id) and self.tasks[dep_id].status == TaskStatus.COMPLETED
                for dep_id in task.depends_on
            )
            if deps_met:
                ready.append(task)
        return ready

    def all_completed(self) -> bool:
        return all(
            t.status in (TaskStatus.COMPLETED, TaskStatus.FAILED) for t in self.tasks.values()
        )

    def to_list(self) -> list[Task]:
        return sorted(self.tasks.values(), key=lambda task: task.created_at)

    def refresh_blocked_states(self) -> None:
        for task in self.tasks.values():
            if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.IN_PROGRESS):
                continue
            if not task.depends_on:
                task.status = TaskStatus.PENDING
                continue

            deps = [self.tasks.get(dep_id) for dep_id in task.depends_on]
            if any(dep and dep.status == TaskStatus.FAILED for dep in deps):
                task.status = TaskStatus.FAILED
            elif deps and all(dep and dep.status == TaskStatus.COMPLETED for dep in deps):
                task.status = TaskStatus.PENDING
            else:
                task.status = TaskStatus.BLOCKED

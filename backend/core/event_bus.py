"""Event Bus — 所有状态变化和消息通过统一事件总线流转"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from enum import StrEnum
from typing import Any, Callable, Coroutine

from pydantic import BaseModel


class EventType(StrEnum):
    AGENT_STATUS_CHANGED = "agent.status.changed"
    AGENT_PROGRESS = "agent.progress"
    MESSAGE_SENT = "message.sent"
    TASK_CREATED = "task.created"
    TASK_UPDATED = "task.updated"
    TASK_COMPLETED = "task.completed"
    GROUP_UPDATED = "group.updated"


class Event(BaseModel):
    type: EventType
    data: dict[str, Any]


Listener = Callable[[Event], Coroutine[Any, Any, None]]


class EventBus:
    """进程内异步事件总线，支持发布/订阅"""

    def __init__(self) -> None:
        self._listeners: dict[EventType, list[Listener]] = defaultdict(list)
        self._global_listeners: list[Listener] = []

    def on(self, event_type: EventType, listener: Listener) -> None:
        self._listeners[event_type].append(listener)

    def on_all(self, listener: Listener) -> None:
        """订阅所有事件（WebSocket Handler 使用）"""
        self._global_listeners.append(listener)

    def off(self, event_type: EventType, listener: Listener) -> None:
        self._listeners[event_type] = [
            fn for fn in self._listeners[event_type] if fn is not listener
        ]

    def off_all(self, listener: Listener) -> None:
        self._global_listeners = [fn for fn in self._global_listeners if fn is not listener]

    async def emit(self, event_type: EventType, data: dict[str, Any]) -> None:
        event = Event(type=event_type, data=data)
        tasks: list[Coroutine[Any, Any, None]] = []

        for listener in self._listeners[event_type]:
            tasks.append(listener(event))
        for listener in self._global_listeners:
            tasks.append(listener(event))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


# 全局单例
event_bus = EventBus()

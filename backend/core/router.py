"""消息路由 — 支持 @all @foreman @peers @user @{name} 等寻址"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from .event_bus import EventType, event_bus

if TYPE_CHECKING:
    from .agent import Agent


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    sender: str
    target: str  # "@all", "@foreman", "@peers", "@user", "@{name}"
    content: str
    group_id: str = "default"
    task_id: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MessageRouter:
    """消息路由器"""

    def __init__(self) -> None:
        self._agents: dict[str, Agent] = {}
        self.message_history: list[ChatMessage] = []

    def register_agent(self, agent: Agent) -> None:
        self._agents[agent.name] = agent

    def unregister_agent(self, name: str) -> None:
        self._agents.pop(name, None)

    def get_agent(self, name: str) -> Agent | None:
        return self._agents.get(name)

    def list_agents(self) -> list[Agent]:
        return list(self._agents.values())

    async def route(self, message: ChatMessage) -> None:
        """路由消息到目标 Agent"""
        self.message_history.append(message)

        # 通过事件总线广播（前端接收）
        await event_bus.emit(
            EventType.MESSAGE_SENT,
            message.model_dump(mode="json"),
        )

        # 解析目标并投递
        targets = self._resolve_targets(message)
        for agent in targets:
            await agent.receive_message(message)

    def _resolve_targets(self, message: ChatMessage) -> list[Agent]:
        target = message.target
        sender = message.sender

        if target == "@all":
            return [a for a in self._agents.values() if a.name != sender]
        elif target == "@foreman":
            foreman = next(
                (agent for agent in self._agents.values() if agent.role == "foreman"),
                None,
            )
            return [foreman] if foreman else []
        elif target == "@peers":
            return [
                a for a in self._agents.values()
                if a.name != sender and a.name != "user"
            ]
        elif target == "@user":
            # 用户消息不投递给 Agent，通过 WebSocket 推送
            return []
        elif target.startswith("@"):
            name = target[1:]
            agent = self._agents.get(name)
            return [agent] if agent else []
        return []

    def get_history(self, limit: int = 50) -> list[ChatMessage]:
        return self.message_history[-limit:]

"""Group — Agent 的协作空间"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from .agent import Agent
from .context import SharedContext
from .foreman import Foreman
from .router import MessageRouter


class Group:
    """Agent 协作空间，管理一组 Agent 的生命周期"""

    def __init__(
        self,
        group_id: str = "default",
        name: str = "Default Group",
        workspace: str = "",
    ) -> None:
        self.id = group_id
        self.name = name
        self.workspace = workspace  # 用户指定的工作目录
        self.router = MessageRouter()
        self.context = SharedContext()
        self._agent_tasks: dict[str, asyncio.Task[None]] = {}

    def add_agent(self, agent: Agent) -> None:
        agent.router = self.router
        agent.context = self.context
        agent.group_id = self.id

        # 如果 Group 有工作目录，覆盖 CLI 适配器的工作目录
        ws = self.workspace_dir
        if ws and hasattr(agent.model, "working_dir"):
            agent.model.working_dir = ws

        self.router.register_agent(agent)

    def remove_agent(self, name: str) -> None:
        task = self._agent_tasks.pop(name, None)
        if task:
            task.cancel()
        self.router.unregister_agent(name)

    def get_agent(self, name: str) -> Agent | None:
        return self.router.get_agent(name)

    def list_agents(self) -> list[Agent]:
        return self.router.list_agents()

    def get_foreman(self) -> Foreman | None:
        agent = next((agent for agent in self.list_agents() if agent.role == "foreman"), None)
        return agent if isinstance(agent, Foreman) else None

    async def start(self) -> None:
        """启动所有 Agent 的消息处理循环"""
        for agent in self.router.list_agents():
            if agent.name not in self._agent_tasks:
                self._agent_tasks[agent.name] = asyncio.create_task(
                    agent.run(), name=f"agent-{agent.name}"
                )

    async def stop(self) -> None:
        for task in self._agent_tasks.values():
            task.cancel()
        self._agent_tasks.clear()

    @property
    def workspace_dir(self) -> Path | None:
        if self.workspace:
            p = Path(self.workspace).resolve()
            if p.is_dir():
                return p
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "workspace": self.workspace,
            "agents": [a.get_status().model_dump(mode="json") for a in self.list_agents()],
            "context": self.context.to_dict(),
        }

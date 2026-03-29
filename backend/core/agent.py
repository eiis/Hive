"""Agent 基类 + 状态机"""

from __future__ import annotations

import asyncio
import logging
from enum import StrEnum
from typing import TYPE_CHECKING

from pydantic import BaseModel

from ..models.base import BaseModelAdapter, Message
from .event_bus import EventType, event_bus
from .router import ChatMessage
from .task import TaskStatus

if TYPE_CHECKING:
    from .context import SharedContext
    from .router import MessageRouter

logger = logging.getLogger(__name__)


class AgentState(StrEnum):
    IDLE = "idle"
    THINKING = "thinking"
    WORKING = "working"
    WAITING = "waiting"
    DONE = "done"
    FAILED = "failed"


class AgentStatus(BaseModel):
    name: str
    role: str = "developer"
    state: AgentState
    model_name: str
    current_task: str | None = None
    detail: str | None = None
    progress: float = 0.0


class Agent:
    """AI Agent 基类，由模型驱动的工作单元"""

    def __init__(
        self,
        name: str,
        model: BaseModelAdapter,
        system_prompt: str = "",
        role: str = "developer",
        router: MessageRouter | None = None,
        context: SharedContext | None = None,
    ) -> None:
        self.name = name
        self.model = model
        self.system_prompt = system_prompt
        self.role = role
        self.router = router
        self.context = context
        self.group_id = "default"

        self._state = AgentState.IDLE
        self._current_task: str | None = None
        self._detail: str | None = None
        self._progress: float = 0.0
        self._message_queue: asyncio.Queue[ChatMessage] = asyncio.Queue()
        self._conversation: list[Message] = []

    @property
    def state(self) -> AgentState:
        return self._state

    def get_status(self) -> AgentStatus:
        return AgentStatus(
            name=self.name,
            role=self.role,
            state=self._state,
            model_name=self.model.name,
            current_task=self._current_task,
            detail=self._detail,
            progress=self._progress,
        )

    async def set_state(
        self,
        state: AgentState,
        detail: str | None = None,
        progress: float | None = None,
    ) -> None:
        self._state = state
        if detail is not None:
            self._detail = detail
        if progress is not None:
            self._progress = progress
        await event_bus.emit(
            EventType.AGENT_STATUS_CHANGED,
            self.get_status().model_dump(mode="json"),
        )

    async def receive_message(self, message: ChatMessage) -> None:
        """接收消息放入队列"""
        await self._message_queue.put(message)

    async def process_message(self, message: ChatMessage) -> str:
        """处理单条消息，调用模型生成回复"""
        task = self._resolve_task(message)
        if task:
            self._current_task = task.title

        await self.set_state(
            AgentState.THINKING,
            detail=f"正在理解消息: {message.content[:30]}...",
            progress=0.15 if task else 0.0,
        )

        # 构建对话上下文
        self._conversation.append(
            Message(role="user", content=f"[{message.sender}]: {message.content}")
        )

        messages = []
        if self.system_prompt:
            messages.append(Message(role="system", content=self._build_system_prompt()))
        messages.extend(self._conversation)

        await self.set_state(
            AgentState.WORKING,
            detail="正在生成回复...",
            progress=0.65 if task else 0.25,
        )

        try:
            # 使用流式输出
            stream_id = f"{self.name}-{id(message)}"
            full_response = ""
            async for chunk in self.model.chat(messages):
                full_response += chunk
                await event_bus.emit(
                    EventType.MESSAGE_STREAM,
                    {
                        "stream_id": stream_id,
                        "sender": self.name,
                        "chunk": chunk,
                        "accumulated": full_response,
                        "group_id": self.group_id,
                    },
                )
            await event_bus.emit(
                EventType.MESSAGE_STREAM_END,
                {"stream_id": stream_id, "sender": self.name, "group_id": self.group_id},
            )
            self._conversation.append(Message(role="assistant", content=full_response))
            await self.set_state(AgentState.DONE, detail="完成", progress=1.0)
            return full_response
        except Exception as e:
            logger.error(f"Agent {self.name} error: {e}")
            await self.set_state(AgentState.FAILED, detail=str(e))
            raise

    async def send_message(
        self,
        content: str,
        target: str = "@user",
        *,
        task_id: str | None = None,
    ) -> None:
        """发送消息"""
        if self.router:
            msg = ChatMessage(
                sender=self.name,
                target=target,
                content=content,
                group_id=self.group_id,
                task_id=task_id,
            )
            await self.router.route(msg)

    async def run(self) -> None:
        """主循环：持续处理消息队列"""
        while True:
            message = await self._message_queue.get()
            task = self._resolve_task(message)
            try:
                response = await self.process_message(message)
                if task and self.context:
                    completed_task = self.context.task_tree.update_task(
                        task.id,
                        status=TaskStatus.COMPLETED,
                        progress=1.0,
                        result=response,
                    )
                    if completed_task:
                        await event_bus.emit(
                            EventType.TASK_COMPLETED,
                            completed_task.model_dump(mode="json"),
                        )
                if response.strip():
                    await self.send_message(
                        response,
                        target=self._determine_reply_target(message),
                        task_id=message.task_id,
                    )
            except Exception as e:
                logger.error(f"Agent {self.name} run error: {e}")
                if task and self.context:
                    failed_task = self.context.task_tree.update_task(
                        task.id,
                        status=TaskStatus.FAILED,
                        result=str(e),
                    )
                    if failed_task:
                        await event_bus.emit(
                            EventType.TASK_UPDATED,
                            failed_task.model_dump(mode="json"),
                        )
                await self.set_state(AgentState.FAILED, detail=str(e))
                await self.send_message(
                    f"任务执行失败: {e}",
                    target=self._determine_reply_target(message),
                    task_id=message.task_id,
                )
            finally:
                self._current_task = None
                await self.set_state(AgentState.IDLE, detail=None, progress=0.0)

    def _build_system_prompt(self) -> str:
        parts = [self.system_prompt]
        if self.context:
            ctx = self.context.to_dict()
            if ctx["objective"]:
                parts.append(f"\n当前目标: {ctx['objective']}")
            if ctx["tasks"]:
                task_info = "\n".join(
                    f"- [{t['status']}] {t['title']} (assigned: {t.get('assigned_to', 'unassigned')})"
                    for t in ctx["tasks"]
                )
                parts.append(f"\n当前任务:\n{task_info}")
        return "\n".join(parts)

    def _determine_reply_target(self, message: ChatMessage) -> str:
        if message.sender == "user":
            return "@user"
        return f"@{message.sender}"

    def _resolve_task(self, message: ChatMessage):
        if not self.context or not message.task_id:
            return None
        return self.context.task_tree.get_task(message.task_id)

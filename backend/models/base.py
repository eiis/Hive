"""模型适配层 — 所有模型实现统一接口"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator

from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str


class ToolParam(BaseModel):
    name: str
    description: str
    input_schema: dict


class BaseModelAdapter(ABC):
    """模型适配器抽象基类"""

    name: str

    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
        stream: bool = True,
    ) -> AsyncIterator[str]:
        """统一聊天接口，返回流式文本"""
        ...

    @abstractmethod
    async def chat_complete(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
    ) -> str:
        """非流式聊天，返回完整回复"""
        ...

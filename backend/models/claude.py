"""Claude 模型适配器"""

from __future__ import annotations

from typing import AsyncIterator

import anthropic

from ..config import settings
from .base import BaseModelAdapter, Message, ToolParam


class ClaudeAdapter(BaseModelAdapter):
    name = "claude"

    def __init__(self, model: str = "claude-sonnet-4-20250514") -> None:
        self.model = model
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    def _convert_messages(self, messages: list[Message]) -> tuple[str, list[dict]]:
        system = ""
        msgs = []
        for m in messages:
            if m.role == "system":
                system = m.content
            else:
                msgs.append({"role": m.role, "content": m.content})
        return system, msgs

    def _convert_tools(self, tools: list[ToolParam] | None) -> list[dict] | None:
        if not tools:
            return None
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema,
            }
            for t in tools
        ]

    async def chat(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
        stream: bool = True,
    ) -> AsyncIterator[str]:
        system, msgs = self._convert_messages(messages)
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": msgs,
        }
        if system:
            kwargs["system"] = system
        converted_tools = self._convert_tools(tools)
        if converted_tools:
            kwargs["tools"] = converted_tools

        async with self.client.messages.stream(**kwargs) as stream_resp:
            async for text in stream_resp.text_stream:
                yield text

    async def chat_complete(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
    ) -> str:
        system, msgs = self._convert_messages(messages)
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": msgs,
        }
        if system:
            kwargs["system"] = system
        converted_tools = self._convert_tools(tools)
        if converted_tools:
            kwargs["tools"] = converted_tools

        response = await self.client.messages.create(**kwargs)
        return response.content[0].text

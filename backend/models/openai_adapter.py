"""OpenAI / 兼容接口适配器"""

from __future__ import annotations

from typing import AsyncIterator

import openai

from ..config import settings
from .base import BaseModelAdapter, Message, ToolParam


class OpenAIAdapter(BaseModelAdapter):
    """支持 OpenAI API 及所有兼容接口（Ollama、DeepSeek、Qwen 等）"""

    name = "openai"

    def __init__(
        self,
        model: str = "gpt-4o",
        base_url: str | None = None,
        api_key: str | None = None,
    ) -> None:
        self.model = model
        self.client = openai.AsyncOpenAI(
            api_key=api_key or settings.openai_api_key,
            base_url=base_url,
        )

    def _convert_messages(self, messages: list[Message]) -> list[dict]:
        return [{"role": m.role, "content": m.content} for m in messages]

    def _convert_tools(self, tools: list[ToolParam] | None) -> list[dict] | None:
        if not tools:
            return None
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                },
            }
            for t in tools
        ]

    async def chat(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
        stream: bool = True,
    ) -> AsyncIterator[str]:
        kwargs: dict = {
            "model": self.model,
            "messages": self._convert_messages(messages),
            "stream": True,
        }
        converted_tools = self._convert_tools(tools)
        if converted_tools:
            kwargs["tools"] = converted_tools

        stream_resp = await self.client.chat.completions.create(**kwargs)
        async for chunk in stream_resp:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def chat_complete(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
    ) -> str:
        kwargs: dict = {
            "model": self.model,
            "messages": self._convert_messages(messages),
        }
        converted_tools = self._convert_tools(tools)
        if converted_tools:
            kwargs["tools"] = converted_tools

        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""


def create_compatible_adapter(
    base_url: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> OpenAIAdapter:
    """创建兼容接口适配器（Ollama、DeepSeek 等）"""
    return OpenAIAdapter(
        model=model or settings.openai_compatible_model or "default",
        base_url=base_url or settings.openai_compatible_base_url,
        api_key=api_key or settings.openai_compatible_api_key or "none",
    )

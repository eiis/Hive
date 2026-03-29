"""模型注册表 — 管理所有已注册的模型适配器"""

from __future__ import annotations

from typing import Callable

from .base import BaseModelAdapter
from .claude import ClaudeAdapter
from .cli import ClaudeCLIAdapter, CodexCLIAdapter
from .openai_adapter import OpenAIAdapter, create_compatible_adapter


class ModelRegistry:
    def __init__(self) -> None:
        self._factories: dict[str, Callable[[], BaseModelAdapter]] = {}

    def register(self, name: str, factory: Callable[[], BaseModelAdapter]) -> None:
        self._factories[name] = factory

    def get(self, name: str) -> BaseModelAdapter:
        """每次调用返回新实例，避免跨 Group 共享状态"""
        if name not in self._factories:
            raise KeyError(f"Model adapter '{name}' not registered")
        return self._factories[name]()

    def list_models(self) -> list[str]:
        return list(self._factories.keys())


def create_default_registry() -> ModelRegistry:
    """创建默认模型注册表，注册所有可用模型"""
    registry = ModelRegistry()
    registry.register("claude", lambda: ClaudeAdapter())
    registry.register("claude-api", lambda: ClaudeAdapter())
    registry.register("claude-cli", lambda: ClaudeCLIAdapter())
    registry.register("codex-cli", lambda: CodexCLIAdapter())
    registry.register("gpt-4o", lambda: OpenAIAdapter(model="gpt-4o"))
    registry.register("gpt-4o-mini", lambda: OpenAIAdapter(model="gpt-4o-mini"))
    registry.register("compatible", create_compatible_adapter)
    return registry


model_registry = create_default_registry()

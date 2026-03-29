"""CLI-backed model adapters for Codex and Claude Code."""

from __future__ import annotations

import asyncio
import os
import shlex
import shutil
import tempfile
from pathlib import Path
from typing import AsyncIterator

from ..config import settings
from .base import BaseModelAdapter, Message, ToolParam


def _split_system_and_conversation(messages: list[Message]) -> tuple[str, list[Message]]:
    system_parts = [message.content.strip() for message in messages if message.role == "system"]
    conversation = [message for message in messages if message.role != "system"]
    return "\n\n".join(part for part in system_parts if part), conversation


def _render_prompt(messages: list[Message], *, inline_system: bool) -> tuple[str, str]:
    system_prompt, conversation = _split_system_and_conversation(messages)

    parts: list[str] = []
    if inline_system and system_prompt:
        parts.append(f"System instructions:\n{system_prompt}")

    if conversation:
        rendered_messages = []
        for message in conversation:
            role = {
                "user": "User",
                "assistant": "Assistant",
            }.get(message.role, message.role.title())
            rendered_messages.append(f"{role}:\n{message.content.strip()}")
        parts.append("Conversation:\n" + "\n\n".join(rendered_messages))

    parts.append(
        "Reply as the assistant to the latest user or coordinator message. "
        "If the latest message is a task assignment, execute it in the current workspace and report the result clearly."
    )
    return system_prompt, "\n\n".join(parts)


class CLIAdapter(BaseModelAdapter):
    """Shared subprocess wrapper for local CLI agents."""

    name = "cli"

    def __init__(
        self,
        *,
        name: str,
        command: str,
        working_dir: Path | None = None,
        timeout_seconds: int | None = None,
    ) -> None:
        self.name = name
        self.command = command
        self.working_dir = working_dir or settings.workspace_dir
        self.timeout_seconds = timeout_seconds or settings.cli_timeout_seconds

    async def chat(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
        stream: bool = True,
    ) -> AsyncIterator[str]:
        yield await self.chat_complete(messages, tools=tools)

    async def _run_command(
        self,
        args: list[str],
        *,
        output_file: Path | None = None,
    ) -> str:
        resolved_command = shutil.which(args[0]) or args[0]
        process = await asyncio.create_subprocess_exec(
            resolved_command,
            *args[1:],
            cwd=str(self.working_dir),
            env=os.environ.copy(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            process.kill()
            await process.communicate()
            raise RuntimeError(
                f"{self.name} timed out after {self.timeout_seconds} seconds"
            ) from exc

        stdout_text = stdout.decode("utf-8", errors="replace").strip()
        stderr_text = stderr.decode("utf-8", errors="replace").strip()

        if process.returncode != 0:
            detail = stderr_text or stdout_text or f"exit code {process.returncode}"
            raise RuntimeError(f"{self.name} failed: {detail}")

        if output_file and output_file.exists():
            result = output_file.read_text(encoding="utf-8").strip()
            if result:
                return result

        return stdout_text


class CodexCLIAdapter(CLIAdapter):
    """Runs tasks through the local Codex CLI."""

    def __init__(self) -> None:
        super().__init__(
            name="codex-cli",
            command=settings.codex_command,
        )
        self.model = settings.codex_model
        self.sandbox = settings.codex_sandbox
        self.full_auto = settings.codex_full_auto
        self.extra_args = shlex.split(settings.codex_extra_args)

    async def chat_complete(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
    ) -> str:
        del tools
        _, prompt = _render_prompt(messages, inline_system=True)

        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as handle:
            output_path = Path(handle.name)

        args = [
            self.command,
            "exec",
            "--skip-git-repo-check",
            "--ephemeral",
            "--cd",
            str(self.working_dir),
            "--sandbox",
            self.sandbox,
            "--output-last-message",
            str(output_path),
        ]
        if self.full_auto:
            args.append("--full-auto")
        if self.model:
            args.extend(["--model", self.model])
        args.extend(self.extra_args)
        args.append(prompt)

        try:
            return await self._run_command(args, output_file=output_path)
        finally:
            output_path.unlink(missing_ok=True)


class ClaudeCLIAdapter(CLIAdapter):
    """Runs tasks through the local Claude Code CLI."""

    def __init__(self) -> None:
        super().__init__(
            name="claude-cli",
            command=settings.claude_command,
        )
        self.model = settings.claude_model
        self.permission_mode = settings.claude_permission_mode
        self.extra_args = shlex.split(settings.claude_extra_args)

    async def chat_complete(
        self,
        messages: list[Message],
        tools: list[ToolParam] | None = None,
    ) -> str:
        del tools
        system_prompt, prompt = _render_prompt(messages, inline_system=False)

        args = [
            self.command,
            "--print",
            "--output-format",
            "text",
            "--permission-mode",
            self.permission_mode,
            "--add-dir",
            str(self.working_dir),
        ]
        if self.model:
            args.extend(["--model", self.model])
        if system_prompt:
            args.extend(["--system-prompt", system_prompt])
        args.extend(self.extra_args)
        args.append(prompt)

        return await self._run_command(args)

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    openai_compatible_base_url: str = ""
    openai_compatible_api_key: str = ""
    openai_compatible_model: str = ""
    gemini_api_key: str = ""

    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite+aiosqlite:///./hive.db"
    workspace_root: str = "."
    cli_timeout_seconds: int = 900

    foreman_model: str = "claude-cli"
    default_worker_agents: str = ""

    codex_command: str = "codex"
    codex_model: str = ""
    codex_sandbox: str = "workspace-write"
    codex_full_auto: bool = True
    codex_extra_args: str = ""

    claude_command: str = "claude"
    claude_model: str = ""
    claude_permission_mode: str = "bypassPermissions"
    claude_extra_args: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def workspace_dir(self) -> Path:
        return Path(self.workspace_root).resolve()

    @property
    def parsed_default_worker_agents(self) -> list[tuple[str, str]]:
        workers: list[tuple[str, str]] = []
        for item in self.default_worker_agents.split(","):
            entry = item.strip()
            if not entry:
                continue
            if "=" in entry:
                name, model = entry.split("=", 1)
            else:
                name, model = entry, entry
            workers.append((name.strip(), model.strip()))
        return workers


settings = Settings()

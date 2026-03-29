"""FastAPI 入口"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import routes, ws
from .config import settings
from .core.agent import Agent
from .core.foreman import Foreman
from .core.group import Group
from .db.database import init_db
from .models.registry import model_registry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AppState:
    """应用全局状态"""

    def __init__(self) -> None:
        self.groups: dict[str, Group] = {}


app_state = AppState()


async def setup_default_group() -> None:
    """创建默认 Group 并注册 Foreman"""
    group = Group(group_id="default", name="Default Group")

    # 创建 Foreman
    foreman_model = model_registry.get(settings.foreman_model)
    foreman = Foreman(model=foreman_model)
    group.add_agent(foreman)

    # 创建默认工作 Agent
    for agent_name, model_name in settings.parsed_default_worker_agents:
        try:
            worker_model = model_registry.get(model_name)
        except KeyError:
            logger.warning("Model %s not available, skipping default agent %s", model_name, agent_name)
            continue

        agent = Agent(
            name=agent_name,
            model=worker_model,
            system_prompt=(
                f"你是 {agent_name}，一个多 Agent 协作中的执行者。"
                "请根据 Foreman 分配给你的任务直接动手完成，并用简洁结果回报。"
            ),
        )
        group.add_agent(agent)

    app_state.groups["default"] = group
    await group.start()
    logger.info("Default group created with Foreman and %d worker agents", len(group.list_agents()) - 1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await setup_default_group()
    logger.info(f"Hive server started on {settings.host}:{settings.port}")
    yield
    # Shutdown
    for group in app_state.groups.values():
        await group.stop()
    logger.info("Hive server stopped")


app = FastAPI(
    title="Hive",
    description="Multi-Agent collaboration framework",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)
app.include_router(ws.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)

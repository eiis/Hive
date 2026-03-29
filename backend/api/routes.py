"""REST API 接口"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..core.event_bus import EventType, event_bus
from ..core.router import ChatMessage

router = APIRouter(prefix="/api")


# ── Request Models ──


class AgentConfig(BaseModel):
    name: str
    role: str = "developer"  # "foreman" | "developer"
    model: str | None = None
    system_prompt: str = ""


class CreateGroupRequest(BaseModel):
    name: str
    workspace: str = ""
    agents: list[AgentConfig] = Field(min_length=1)


class SendMessageRequest(BaseModel):
    content: str
    target: str = "@foreman"
    sender: str = "user"


class AddAgentRequest(BaseModel):
    name: str
    model: str | None = None
    role: str = "developer"
    system_prompt: str = ""


def _default_model_for_role(role: str) -> str:
    return "claude-cli" if role == "foreman" else "codex-cli"


def _resolve_model_name(role: str, requested: str | None) -> str:
    return requested or _default_model_for_role(role)


# ── Group CRUD ──


@router.post("/groups")
async def create_group(req: CreateGroupRequest):
    """创建工作组，指定 Foreman 和开发 Agent"""
    from ..core.agent import Agent
    from ..core.foreman import Foreman
    from ..core.group import Group
    from ..main import app_state
    from ..models.registry import model_registry

    group_id = uuid.uuid4().hex[:8]
    group = Group(group_id=group_id, name=req.name, workspace=req.workspace)

    has_foreman = False
    for agent_cfg in req.agents:
        try:
            model = model_registry.get(_resolve_model_name(agent_cfg.role, agent_cfg.model))
        except KeyError:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown model: {_resolve_model_name(agent_cfg.role, agent_cfg.model)}",
            )

        if agent_cfg.role == "foreman":
            if has_foreman:
                raise HTTPException(status_code=400, detail="Only one foreman allowed per group")
            agent = Foreman(model=model, name_override=agent_cfg.name)
            has_foreman = True
        else:
            prompt = agent_cfg.system_prompt or (
                f"你是 {agent_cfg.name}，一个 AI 开发者。"
                f"请根据 Foreman 分配给你的任务认真完成工作，完成后汇报结果。"
            )
            agent = Agent(name=agent_cfg.name, model=model, system_prompt=prompt)

        group.add_agent(agent)

    if not has_foreman:
        raise HTTPException(status_code=400, detail="Must have exactly one foreman")

    app_state.groups[group_id] = group
    await group.start()
    await event_bus.emit(EventType.GROUP_UPDATED, group.to_dict())

    return group.to_dict()


@router.get("/groups")
async def list_groups():
    from ..main import app_state
    return [g.to_dict() for g in app_state.groups.values()]


@router.get("/groups/{group_id}")
async def get_group(group_id: str):
    from ..main import app_state
    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group.to_dict()


@router.delete("/groups/{group_id}")
async def delete_group(group_id: str):
    from ..main import app_state
    group = app_state.groups.pop(group_id, None)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    await group.stop()
    return {"status": "deleted", "group_id": group_id}


# ── Agent ──


@router.get("/groups/{group_id}/agents")
async def list_agents(group_id: str):
    from ..main import app_state
    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return [a.get_status().model_dump(mode="json") for a in group.list_agents()]


@router.post("/groups/{group_id}/agents")
async def add_agent(group_id: str, req: AddAgentRequest):
    from ..core.agent import Agent
    from ..core.foreman import Foreman
    from ..main import app_state
    from ..models.registry import model_registry

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.get_agent(req.name):
        raise HTTPException(status_code=400, detail=f"Agent '{req.name}' already exists")

    try:
        model_name = _resolve_model_name(req.role, req.model)
        model = model_registry.get(model_name)
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

    if req.role == "foreman":
        agent = Foreman(model=model, name_override=req.name)
    else:
        prompt = req.system_prompt or f"你是 {req.name}，一个 AI 开发者。请根据分配的任务认真完成工作。"
        agent = Agent(name=req.name, model=model, system_prompt=prompt)

    group.add_agent(agent)
    await group.start()  # 启动新 Agent 的消息循环
    await event_bus.emit(EventType.GROUP_UPDATED, group.to_dict())
    return agent.get_status().model_dump(mode="json")


class UpdateAgentRequest(BaseModel):
    name: str | None = None
    model: str | None = None
    system_prompt: str | None = None


@router.put("/groups/{group_id}/agents/{agent_name}")
async def update_agent(group_id: str, agent_name: str, req: UpdateAgentRequest):
    from ..main import app_state
    from ..models.registry import model_registry

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    agent = group.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")

    if req.system_prompt is not None:
        agent.system_prompt = req.system_prompt
    if req.model is not None:
        try:
            agent.model = model_registry.get(req.model)
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Unknown model: {req.model}")
    if req.name is not None and req.name != agent_name:
        if group.get_agent(req.name):
            raise HTTPException(status_code=400, detail=f"Agent '{req.name}' already exists")
        group.remove_agent(agent_name)
        agent.name = req.name
        group.add_agent(agent)
        await group.start()

    await event_bus.emit(EventType.GROUP_UPDATED, group.to_dict())
    return agent.get_status().model_dump(mode="json")


@router.delete("/groups/{group_id}/agents/{agent_name}")
async def delete_agent(group_id: str, agent_name: str):
    from ..main import app_state

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    agent = group.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")

    group.remove_agent(agent_name)
    await event_bus.emit(EventType.GROUP_UPDATED, group.to_dict())
    return {"status": "deleted", "agent_name": agent_name}


# ── Messages ──


@router.post("/groups/{group_id}/messages")
async def send_message(group_id: str, req: SendMessageRequest):
    from ..main import app_state

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    message = ChatMessage(
        sender=req.sender,
        target=req.target,
        content=req.content,
        group_id=group_id,
    )
    await group.router.route(message)
    return {"status": "sent", "message_id": message.id}


@router.get("/groups/{group_id}/messages")
async def get_messages(group_id: str, limit: int = 50):
    from ..main import app_state

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return [m.model_dump(mode="json") for m in group.router.get_history(limit)]


# ── Tasks & Context ──


@router.get("/groups/{group_id}/tasks")
async def get_tasks(group_id: str):
    from ..main import app_state

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return [t.model_dump(mode="json") for t in group.context.task_tree.to_list()]


@router.get("/groups/{group_id}/context")
async def get_context(group_id: str):
    from ..main import app_state

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group.context.to_dict()


# ── Task Assignment ──


class AssignTaskRequest(BaseModel):
    agent_name: str
    task_title: str
    task_description: str = ""


@router.post("/groups/{group_id}/tasks")
async def assign_task(group_id: str, req: AssignTaskRequest):
    from ..core.task import Task
    from ..main import app_state

    group = app_state.groups.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    agent = group.get_agent(req.agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{req.agent_name}' not found")

    task = Task(
        title=req.task_title,
        description=req.task_description,
        assigned_to=req.agent_name,
    )
    group.context.task_tree.add_task(task)

    await group.router.route(
        ChatMessage(
            sender="foreman",
            target=f"@{req.agent_name}",
            content=f"请执行任务: {task.title}\n\n{task.description}",
            group_id=group_id,
        )
    )

    await event_bus.emit(EventType.TASK_CREATED, task.model_dump(mode="json"))
    return {"status": "assigned", "task_id": task.id}


# ── Models ──


@router.get("/models")
async def list_models():
    from ..models.registry import model_registry
    return {"models": model_registry.list_models()}

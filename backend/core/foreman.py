"""Foreman — 特殊 Agent，负责理解用户意图、分解任务、分配给其他 Agent"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

from ..models.base import Message
from .agent import Agent, AgentState
from .event_bus import EventType, event_bus
from .router import ChatMessage
from .task import Task, TaskStatus

if TYPE_CHECKING:
    from ..models.base import BaseModelAdapter
    from .context import SharedContext
    from .router import MessageRouter

logger = logging.getLogger(__name__)

FOREMAN_SYSTEM_PROMPT = """你是 Hive 协作系统的协调者。你的职责：

1. **理解用户意图**：分析用户的需求，理解他们想要完成什么
2. **分解任务**：将需求拆分成可执行的子任务，明确依赖关系
3. **分配任务**：根据可用 Agent 的能力和状态，合理分配任务
4. **审查结果**：评估每个 Agent 的交付质量，决定是否通过
5. **汇总进度**：收集各 Agent 的结果，整合后回复用户

当用户提出需求时，你必须返回一个 JSON 格式的任务分解：

```json
{
    "objective": "总目标描述",
    "tasks": [
        {
            "title": "任务标题",
            "description": "详细描述",
            "assigned_to": "agent名称",
            "depends_on": ["依赖的任务标题"]
        }
    ],
    "response": "给用户的回复消息"
}
```

可用的 Agent 列表会在每次消息中提供给你。

**重要**：你是协调者，你自己不执行任何开发工作。只要用户的需求涉及编写代码、创建文件、修改文件、调试等开发任务，你**必须**生成 JSON 任务分解并分配给可用的开发者 Agent 执行。即使任务看起来很简单（比如写一个简单页面），也必须分配给开发者，而不是自己完成。

只有当用户的消息是纯粹的闲聊对话（如打招呼、问你是谁、问项目状态等不需要任何代码或文件操作的问题）时，才直接回复，不需要 JSON 格式。"""

REVIEW_PROMPT = """你是协调者，现在需要审查一个开发者提交的任务结果。

任务信息：
- 标题：{task_title}
- 描述：{task_description}
- 执行者：{agent_name}

整体目标：{objective}

执行者的回报：
{result}

请审查这个结果，返回 JSON 格式：

```json
{{
    "verdict": "accept 或 reject",
    "reason": "审查意见",
    "feedback": "如果 reject，给执行者的修改指导（accept 时留空）"
}}
```

判断标准：
- 结果是否完成了任务描述中的要求
- 质量是否达标
- 如果明显有问题或未完成，reject 并给出具体修改指导
- 如果基本完成了要求，accept"""


class Foreman(Agent):
    """协调者 Agent"""

    MAX_RETRIES = 2  # 每个任务最多打回重做次数

    def __init__(
        self,
        model: BaseModelAdapter,
        name_override: str | None = None,
        router: MessageRouter | None = None,
        context: SharedContext | None = None,
    ) -> None:
        super().__init__(
            name=name_override or "协调者",
            model=model,
            system_prompt=FOREMAN_SYSTEM_PROMPT,
            role="foreman",
            router=router,
            context=context,
        )
        self._task_retries: dict[str, int] = {}  # task_id -> retry count

    async def process_message(self, message: ChatMessage) -> str:
        if message.sender != "user":
            return await self._handle_worker_update(message)

        await self.set_state(AgentState.THINKING, detail="正在分析用户需求...")

        # 构建上下文
        available_agents = []
        if self.router:
            for agent in self.router.list_agents():
                if agent.role == "foreman":
                    continue
                status = agent.get_status()
                available_agents.append(
                    f"- {status.name} (model: {status.model_name}, state: {status.state})"
                )

        agent_info = "\n".join(available_agents) if available_agents else "无可用 Agent"

        self._conversation.append(
            Message(
                role="user",
                content=f"[{message.sender}]: {message.content}\n\n可用 Agent:\n{agent_info}",
            )
        )

        messages = [Message(role="system", content=self._build_system_prompt())]
        messages.extend(self._conversation)

        await self.set_state(AgentState.WORKING, detail="正在制定计划...")

        try:
            response = await self.model.chat_complete(messages)
            self._conversation.append(Message(role="assistant", content=response))

            # 尝试解析任务分解
            await self._try_parse_tasks(response)

            await self.set_state(AgentState.DONE, detail="计划已制定", progress=1.0)
            return self._extract_user_response(response)
        except Exception as e:
            logger.error(f"Foreman error: {e}")
            await self.set_state(AgentState.FAILED, detail=str(e))
            return f"抱歉，处理出错了: {e}"

    async def _handle_worker_update(self, message: ChatMessage) -> str:
        task = None
        if self.context and message.task_id:
            task = self.context.task_tree.get_task(message.task_id)

        if not task:
            # 非任务消息，记录即可
            await self.set_state(AgentState.DONE, detail="已收到进度回报", progress=1.0)
            return f"收到 {message.sender} 的回报。"

        await self.set_state(
            AgentState.THINKING,
            detail=f"正在审查 {message.sender} 的任务结果...",
            progress=0.3,
        )

        # 调 LLM 审查结果
        review = await self._review_result(task, message)

        if review["verdict"] == "accept":
            # 通过：标记完成，调度下一批
            task.status = TaskStatus.COMPLETED
            task.progress = 1.0
            task.result = message.content
            await event_bus.emit(EventType.TASK_COMPLETED, task.model_dump(mode="json"))

            self.context.add_memory(
                content=f"{message.sender} 完成了任务《{task.title}》— {review['reason']}",
                author=self.name,
            )

            await self.set_state(AgentState.WORKING, detail="调度后续任务...", progress=0.7)
            await self._emit_group_update()
            await self._dispatch_ready_tasks()

            # 检查是否全部完成
            if self.context.task_tree.all_completed():
                await self.set_state(AgentState.DONE, detail="所有任务已完成", progress=1.0)
                return self._build_completion_summary()

            await self.set_state(AgentState.DONE, detail="审查通过", progress=1.0)
            return f"任务《{task.title}》审查通过：{review['reason']}。已调度后续任务。"

        else:
            # 打回：检查重试次数
            retries = self._task_retries.get(task.id, 0)
            if retries >= self.MAX_RETRIES:
                # 超过重试上限，强制标记失败
                task.status = TaskStatus.FAILED
                task.result = f"多次重试未通过审查：{review['reason']}"
                await event_bus.emit(EventType.TASK_UPDATED, task.model_dump(mode="json"))

                self.context.add_memory(
                    content=f"任务《{task.title}》多次重试后仍未通过，已标记失败",
                    author=self.name,
                )
                await self._emit_group_update()
                await self._dispatch_ready_tasks()

                await self.set_state(AgentState.DONE, detail="任务已标记失败", progress=1.0)
                return f"任务《{task.title}》经过 {retries + 1} 次尝试仍未通过，已跳过。原因：{review['reason']}"

            # 打回重做
            self._task_retries[task.id] = retries + 1
            task.status = TaskStatus.IN_PROGRESS
            task.progress = 0.05
            await event_bus.emit(EventType.TASK_UPDATED, task.model_dump(mode="json"))

            feedback = review.get("feedback", review["reason"])
            await self.router.route(
                ChatMessage(
                    sender=self.name,
                    target=f"@{message.sender}",
                    content=f"任务《{task.title}》需要修改（第 {retries + 1} 次）：\n\n{feedback}\n\n请根据以上意见重新完成任务。",
                    group_id=self.group_id,
                    task_id=task.id,
                )
            )

            await self.set_state(AgentState.DONE, detail="已打回修改", progress=1.0)
            return f"任务《{task.title}》审查未通过，已打回 {message.sender} 修改。原因：{review['reason']}"

    async def _review_result(self, task: Task, message: ChatMessage) -> dict:
        """调用 LLM 审查开发者提交的结果"""
        objective = self.context.objective if self.context else ""
        review_prompt = REVIEW_PROMPT.format(
            task_title=task.title,
            task_description=task.description,
            agent_name=message.sender,
            objective=objective,
            result=message.content,
        )

        messages = [
            Message(role="system", content="你是一个严格但公正的任务审查者。"),
            Message(role="user", content=review_prompt),
        ]

        try:
            response = await self.model.chat_complete(messages)
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                data = json.loads(response[json_start:json_end])
                return {
                    "verdict": data.get("verdict", "accept"),
                    "reason": data.get("reason", ""),
                    "feedback": data.get("feedback", ""),
                }
        except Exception as e:
            logger.warning(f"Review parsing failed, auto-accepting: {e}")

        # 解析失败默认通过
        return {"verdict": "accept", "reason": "自动通过（审查解析失败）", "feedback": ""}

    async def _try_parse_tasks(self, response: str) -> None:
        """尝试从回复中解析任务 JSON"""
        try:
            # 查找 JSON 块
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start == -1 or json_end <= json_start:
                return

            data = json.loads(response[json_start:json_end])
            if "tasks" not in data:
                return

            if self.context:
                self.context.task_tree.clear()
                self._task_retries.clear()

            # 设置目标
            if self.context and "objective" in data:
                self.context.set_objective(data["objective"])
                await self._emit_group_update()

            # 创建任务
            task_id_map: dict[str, str] = {}
            for task_data in data["tasks"]:
                task = Task(
                    title=task_data["title"],
                    description=task_data.get("description", ""),
                    assigned_to=task_data.get("assigned_to"),
                )
                task_id_map[task.title] = task.id

                if self.context:
                    self.context.task_tree.add_task(task)

                await event_bus.emit(
                    EventType.TASK_CREATED,
                    task.model_dump(mode="json"),
                )

            # 处理依赖关系
            for task_data in data["tasks"]:
                task_id = task_id_map.get(task_data["title"])
                if not task_id or not self.context:
                    continue
                task = self.context.task_tree.get_task(task_id)
                if not task:
                    continue
                for dep_title in task_data.get("depends_on", []):
                    dep_id = task_id_map.get(dep_title)
                    if dep_id:
                        task.depends_on.append(dep_id)
                self.context.task_tree.refresh_blocked_states()
                task.updated_at = task.created_at
                await event_bus.emit(EventType.TASK_UPDATED, task.model_dump(mode="json"))

            # 分配并启动就绪任务
            await self._emit_group_update()
            await self._dispatch_ready_tasks()

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.debug(f"No task JSON in response: {e}")

    async def _dispatch_ready_tasks(self) -> None:
        """分配就绪的任务给对应 Agent"""
        if not self.context or not self.router:
            return

        ready_tasks = self.context.task_tree.get_ready_tasks()
        for task in ready_tasks:
            if not task.assigned_to:
                continue
            agent = self.router.get_agent(task.assigned_to)
            if not agent:
                continue

            task.status = TaskStatus.IN_PROGRESS
            task.progress = 0.05
            await event_bus.emit(EventType.TASK_UPDATED, task.model_dump(mode="json"))

            # 发送任务给 Agent
            await self.router.route(
                ChatMessage(
                    sender=self.name,
                    target=f"@{task.assigned_to}",
                    content=f"请执行任务: {task.title}\n\n{task.description}",
                    group_id=self.group_id,
                    task_id=task.id,
                )
            )
        await self._emit_group_update()

    def _extract_user_response(self, response: str) -> str:
        """提取给用户的回复"""
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                data = json.loads(response[json_start:json_end])
                if "response" in data:
                    return data["response"]
        except (json.JSONDecodeError, KeyError):
            pass
        return response

    def _determine_reply_target(self, message: ChatMessage) -> str:
        return "@user"

    async def _emit_group_update(self) -> None:
        if not self.router or not self.context:
            return
        await event_bus.emit(
            EventType.GROUP_UPDATED,
            {
                "objective": self.context.objective,
                "tasks": [task.model_dump(mode="json") for task in self.context.task_tree.to_list()],
                "memory": [item.model_dump(mode="json") for item in self.context.memory],
            },
        )

    def _build_completion_summary(self) -> str:
        if not self.context:
            return "所有任务已完成。"

        lines = ["所有任务已完成："]
        for task in self.context.task_tree.to_list():
            status = "失败" if task.status == TaskStatus.FAILED else "完成"
            summary = (task.result or "").strip()
            if len(summary) > 120:
                summary = summary[:117] + "..."
            if summary:
                lines.append(f"- {task.title}（{status}）：{summary}")
            else:
                lines.append(f"- {task.title}（{status}）")
        return "\n".join(lines)

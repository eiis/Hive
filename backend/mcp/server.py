"""MCP Server — 通过 HTTP 调用 Hive 后端，供 Claude Code 使用"""

from __future__ import annotations

import os
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

HIVE_BASE_URL = os.environ.get("HIVE_BASE_URL", "http://localhost:8000")


def _api(path: str) -> str:
    return f"{HIVE_BASE_URL}{path}"


def create_mcp_server() -> Server:
    server = Server("hive")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return [
            Tool(
                name="hive_send_message",
                description="Send a message to Hive Group (multi-agent workspace)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "Message content"},
                        "target": {
                            "type": "string",
                            "description": "Target: @all, @foreman, @peers, @user, @{agent_name}",
                            "default": "@foreman",
                        },
                        "sender": {
                            "type": "string",
                            "description": "Sender identity",
                            "default": "claude-code",
                        },
                        "group_id": {
                            "type": "string",
                            "description": "Group ID",
                            "default": "default",
                        },
                    },
                    "required": ["content"],
                },
            ),
            Tool(
                name="hive_get_task_status",
                description="Query current task status and tree from Hive",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "group_id": {"type": "string", "default": "default"},
                    },
                },
            ),
            Tool(
                name="hive_get_context",
                description="Read Hive shared context (objective, tasks, memory, artifacts)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "group_id": {"type": "string", "default": "default"},
                    },
                },
            ),
            Tool(
                name="hive_list_agents",
                description="List all agents and their current status in Hive",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "group_id": {"type": "string", "default": "default"},
                    },
                },
            ),
            Tool(
                name="hive_assign_task",
                description="Assign a task to a specific agent in Hive",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "agent_name": {"type": "string", "description": "Target agent name"},
                        "task_title": {"type": "string", "description": "Task title"},
                        "task_description": {"type": "string", "description": "Task description"},
                        "group_id": {"type": "string", "default": "default"},
                    },
                    "required": ["agent_name", "task_title"],
                },
            ),
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        group_id = arguments.get("group_id", "default")

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                if name == "hive_send_message":
                    resp = await client.post(
                        _api(f"/api/groups/{group_id}/messages"),
                        json={
                            "content": arguments["content"],
                            "target": arguments.get("target", "@foreman"),
                            "sender": arguments.get("sender", "claude-code"),
                        },
                    )
                    resp.raise_for_status()
                    return [TextContent(type="text", text=f"Message sent: {resp.json()}")]

                elif name == "hive_get_task_status":
                    resp = await client.get(_api(f"/api/groups/{group_id}/tasks"))
                    resp.raise_for_status()
                    return [TextContent(type="text", text=resp.text)]

                elif name == "hive_get_context":
                    resp = await client.get(_api(f"/api/groups/{group_id}/context"))
                    resp.raise_for_status()
                    return [TextContent(type="text", text=resp.text)]

                elif name == "hive_list_agents":
                    resp = await client.get(_api(f"/api/groups/{group_id}/agents"))
                    resp.raise_for_status()
                    return [TextContent(type="text", text=resp.text)]

                elif name == "hive_assign_task":
                    resp = await client.post(
                        _api(f"/api/groups/{group_id}/tasks"),
                        json={
                            "agent_name": arguments["agent_name"],
                            "task_title": arguments["task_title"],
                            "task_description": arguments.get("task_description", ""),
                        },
                    )
                    resp.raise_for_status()
                    return [TextContent(type="text", text=f"Task assigned: {resp.json()}")]

                else:
                    return [TextContent(type="text", text=f"Unknown tool: {name}")]

            except httpx.HTTPStatusError as e:
                return [TextContent(type="text", text=f"HTTP error {e.response.status_code}: {e.response.text}")]
            except httpx.ConnectError:
                return [TextContent(type="text", text=f"Cannot connect to Hive backend at {HIVE_BASE_URL}. Is the server running?")]

    return server


async def run_mcp_server() -> None:
    server = create_mcp_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)


def main() -> None:
    """Console script entry point."""
    import asyncio

    asyncio.run(run_mcp_server())

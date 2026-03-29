"""WebSocket Handler — 实时推送事件到前端"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..core.event_bus import Event, event_bus

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """管理 WebSocket 连接"""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected, total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected, total: {len(self.active_connections)}")

    async def broadcast(self, data: dict) -> None:
        disconnected = []
        for conn in self.active_connections:
            try:
                await conn.send_json(data)
            except Exception:
                disconnected.append(conn)
        for conn in disconnected:
            self.active_connections.remove(conn)


manager = ConnectionManager()


async def _forward_event(event: Event) -> None:
    """将事件总线的事件转发到所有 WebSocket 客户端"""
    await manager.broadcast({
        "type": event.type,
        "data": event.data,
    })


# 订阅所有事件
event_bus.on_all(_forward_event)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # 客户端可以通过 WebSocket 发送消息
                if msg.get("type") == "send_message":
                    from ..core.router import ChatMessage
                    from ..main import app_state

                    group_id = msg.get("group_id", "default")
                    group = app_state.groups.get(group_id)
                    if group:
                        chat_msg = ChatMessage(
                            sender=msg.get("sender", "user"),
                            target=msg.get("target", "@foreman"),
                            content=msg["content"],
                            group_id=group_id,
                        )
                        await group.router.route(chat_msg)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Invalid WebSocket message: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

import { useEffect, useRef, useCallback } from "react";
import { useAgentStore } from "../store/agentStore";
import { useMessageStore } from "../store/messageStore";
import type { AgentStatus, ChatMessage, Task, WSEvent } from "../types";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const closedOnPurpose = useRef(false);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const updateTask = useAgentStore((s) => s.updateTask);
  const addMessage = useMessageStore((s) => s.addMessage);

  const connect = useCallback(() => {
    // 防止重复连接
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        switch (wsEvent.type) {
          case "agent.status.changed":
            updateAgent(wsEvent.data as unknown as AgentStatus);
            break;
          case "message.sent":
            addMessage(wsEvent.data as unknown as ChatMessage);
            break;
          case "task.created":
          case "task.updated":
          case "task.completed":
            updateTask(wsEvent.data as unknown as Task);
            break;
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      if (!closedOnPurpose.current) {
        console.log("WebSocket disconnected, reconnecting...");
        reconnectTimer.current = setTimeout(connect, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [updateAgent, addMessage, updateTask]);

  const sendMessage = useCallback(
    (content: string, target: string = "@foreman", groupId: string = "default") => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "send_message",
            content,
            target,
            sender: "user",
            group_id: groupId,
          })
        );
      }
    },
    []
  );

  useEffect(() => {
    closedOnPurpose.current = false;
    connect();
    return () => {
      closedOnPurpose.current = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { sendMessage };
}

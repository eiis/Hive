import { useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { useMessageStore } from "../../store/messageStore";
import { useAgentStore } from "../../store/agentStore";
import { InputBar } from "./InputBar";
import { MessageBubble } from "./MessageBubble";

const stateLabels: Record<string, string> = {
  idle: "空闲",
  thinking: "思考中",
  working: "工作中",
  waiting: "等待中",
  done: "已完成",
  failed: "失败",
};

const stateColors: Record<string, string> = {
  idle: "bg-gray-500",
  thinking: "bg-blue-400 animate-pulse",
  working: "bg-yellow-400 animate-pulse",
  waiting: "bg-purple-400",
  done: "bg-green-500",
  failed: "bg-red-500",
};

interface ChatWindowProps {
  onSend: (content: string, target: string) => void;
}

export function ChatWindow({ onSend }: ChatWindowProps) {
  const messages = useMessageStore((s) => s.messages);
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const agents = useAgentStore((s) => s.agents);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const tasks = useAgentStore((s) => s.tasks);
  const bottomRef = useRef<HTMLDivElement>(null);

  const agent = selectedAgent ? agents[selectedAgent] : null;

  const filteredMessages = useMemo(() => {
    if (!selectedAgent) return messages;
    return messages.filter(
      (m) =>
        m.sender === selectedAgent ||
        m.target === `@${selectedAgent}`,
    );
  }, [messages, selectedAgent]);

  // 选中角色的任务
  const agentTasks = useMemo(() => {
    if (!selectedAgent) return [];
    return tasks.filter((t) => t.assigned_to === selectedAgent);
  }, [tasks, selectedAgent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Agent detail header */}
      {agent && (
        <div className="border-b border-gray-800 bg-gray-900/60 px-4 py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${stateColors[agent.state] || "bg-gray-500"}`} />
              <span className="font-medium text-sm text-gray-200">{agent.name}</span>
              <span className="text-xs text-gray-500">{agent.model_name}</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-400">{stateLabels[agent.state] || agent.state}</span>
            </div>
            <button
              onClick={() => selectAgent(null)}
              className="text-gray-600 hover:text-gray-300 transition-colors p-0.5"
              title="返回全部对话"
            >
              <X size={14} />
            </button>
          </div>

          {agent.detail && (
            <div className="text-xs text-gray-400 mb-2">{agent.detail}</div>
          )}

          {(agent.state === "working" || agent.state === "thinking") && (
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
              <div
                className="bg-hive-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(agent.progress * 100)}%` }}
              />
            </div>
          )}

          {/* Agent's tasks */}
          {agentTasks.length > 0 && (
            <div className="space-y-1.5">
              {agentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2">
                  <span className={`text-xs ${
                    task.status === "completed" ? "text-green-400" :
                    task.status === "failed" ? "text-red-400" :
                    task.status === "in_progress" ? "text-yellow-400" :
                    "text-gray-500"
                  }`}>
                    {task.status === "completed" ? "✓" :
                     task.status === "failed" ? "✗" :
                     task.status === "in_progress" ? "●" : "○"}
                  </span>
                  <span className="text-xs text-gray-400 flex-1 truncate">{task.title}</span>
                  {task.status === "in_progress" && (
                    <div className="w-16 bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-hive-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(task.progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      {selectedAgent && (
        <div className="flex border-b border-gray-800 bg-gray-900/40 px-4 shrink-0">
          <button
            onClick={() => selectAgent(null)}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            全部对话
          </button>
          <button
            className="px-3 py-2 text-xs text-hive-400 border-b-2 border-hive-500"
          >
            {selectedAgent} 的对话
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {selectedAgent ? `${selectedAgent} 暂无对话记录` : "发送消息开始协作"}
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <InputBar onSend={onSend} />
    </div>
  );
}

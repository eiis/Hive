import type { ChatMessage } from "../../types";

const senderColors: Record<string, string> = {
  user: "text-blue-400",
  foreman: "text-hive-400",
};

const stateIcons: Record<string, string> = {
  thinking: "💭",
  working: "⚙️",
  waiting: "⏳",
  done: "✅",
  failed: "❌",
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isAction = message.type === "agent_action";
  const isUser = message.sender === "user";
  const senderColor = senderColors[message.sender] || "text-green-400";
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Agent 动作：紧凑的系统消息样式
  if (isAction) {
    return (
      <div className="flex justify-center mb-1.5">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800/40 border border-gray-800/60 max-w-[85%]">
          <span className={`text-[11px] font-medium ${senderColor}`}>
            {message.sender}
          </span>
          <span className="text-[11px] text-gray-400">
            {message.content}
          </span>
          <span className="text-[10px] text-gray-600">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] rounded-lg px-3.5 py-2.5 ${
          isUser
            ? "bg-blue-600/20 border border-blue-500/30"
            : "bg-gray-800/60 border border-gray-700/50"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${senderColor}`}>
            {message.sender}
          </span>
          <span className="text-[10px] text-gray-500">{time}</span>
          {message.target && (
            <span className="text-[10px] text-gray-600">→ {message.target}</span>
          )}
        </div>
        <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
}

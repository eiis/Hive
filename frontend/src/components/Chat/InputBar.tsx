import { useState } from "react";
import { Send } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";

interface InputBarProps {
  onSend: (content: string, target: string) => void;
}

export function InputBar({ onSend }: InputBarProps) {
  const agents = useAgentStore((s) => Object.values(s.agents));
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("@all");

  const foreman = agents.find((a) => a.role === "foreman");
  const targets = [
    { value: "@all", label: "@全体" },
    ...(foreman ? [{ value: `@${foreman.name}`, label: `@${foreman.name} (协调者)` }] : []),
    { value: "@peers", label: "@所有成员" },
    ...agents
      .filter((a) => a.role !== "foreman")
      .map((a) => ({ value: `@${a.name}`, label: `@${a.name}` })),
  ];

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed, target);
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-800 p-3 flex items-center gap-2">
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-hive-500"
      >
        {targets.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-hive-500"
      />

      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="bg-hive-600 hover:bg-hive-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md px-3 py-1.5 transition-colors"
      >
        <Send size={16} />
      </button>
    </div>
  );
}

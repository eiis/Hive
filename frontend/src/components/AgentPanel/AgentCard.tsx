import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { AgentStatus } from "../../types";

const stateColors: Record<string, string> = {
  idle: "bg-gray-500",
  thinking: "bg-blue-400 animate-pulse",
  working: "bg-yellow-400 animate-pulse",
  waiting: "bg-purple-400",
  done: "bg-green-500",
  failed: "bg-red-500",
};

const stateLabels: Record<string, string> = {
  idle: "空闲",
  thinking: "思考中",
  working: "工作中",
  waiting: "等待中",
  done: "已完成",
  failed: "失败",
};

const roleLabels: Record<string, string> = {
  foreman: "协调者",
  developer: "开发者",
};

interface AgentCardProps {
  agent: AgentStatus;
  selected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AgentCard({ agent, selected, onClick, onEdit, onDelete }: AgentCardProps) {
  const [hovered, setHovered] = useState(false);
  const color = stateColors[agent.state] || "bg-gray-500";
  const label = stateLabels[agent.state] || agent.state;
  const roleLabel = roleLabels[agent.role || "developer"] || agent.role;

  return (
    <div
      className={`rounded-lg p-3 border transition-colors relative cursor-pointer ${
        selected
          ? "bg-hive-600/10 border-hive-500/40"
          : "bg-gray-800/60 border-gray-700/50 hover:border-gray-600"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="font-medium text-sm">{agent.name}</span>
        <span className="text-[10px] text-gray-500 ml-auto">
          {roleLabel}
        </span>
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-[10px] text-gray-600">{agent.model_name}</span>
      </div>

      {agent.detail && (
        <div className="text-xs text-gray-300 truncate mb-2">{agent.detail}</div>
      )}

      {(agent.state === "working" || agent.state === "thinking") && (
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-hive-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.round(agent.progress * 100)}%` }}
          />
        </div>
      )}

      {agent.current_task && (
        <div className="text-[10px] text-gray-500 mt-1.5 truncate">
          任务: {agent.current_task}
        </div>
      )}

      {/* Hover actions */}
      {hovered && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 rounded bg-gray-700/80 text-gray-400 hover:text-hive-400 transition-colors"
              title="编辑"
            >
              <Pencil size={11} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded bg-gray-700/80 text-gray-400 hover:text-red-400 transition-colors"
              title="删除"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

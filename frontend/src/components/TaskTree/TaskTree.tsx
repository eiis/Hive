import { useState } from "react";
import { useAgentStore } from "../../store/agentStore";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Task } from "../../types";

const statusIcons: Record<string, string> = {
  pending: "○",
  in_progress: "●",
  completed: "✓",
  failed: "✗",
  blocked: "◌",
};

const statusColors: Record<string, string> = {
  pending: "text-gray-500",
  in_progress: "text-yellow-400",
  completed: "text-green-400",
  failed: "text-red-400",
  blocked: "text-purple-400",
};

function TaskItem({ task }: { task: Task }) {
  const color = statusColors[task.status] || "text-gray-500";
  const icon = statusIcons[task.status] || "○";

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 text-xs hover:bg-gray-800/40 rounded">
      <span className={`${color} font-mono`}>{icon}</span>
      <span className="text-gray-300 flex-1 truncate">{task.title}</span>
      {task.assigned_to && (
        <span className="text-gray-600 text-[10px]">{task.assigned_to}</span>
      )}
      {task.status === "in_progress" && (
        <div className="w-16 bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-hive-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, Math.round(task.progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function TaskTree() {
  const [expanded, setExpanded] = useState(true);
  const tasks = useAgentStore((s) => s.tasks);
  const objective = useAgentStore((s) => s.objective);

  if (tasks.length === 0) return null;

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const overallProgress = total > 0 ? completed / total : 0;

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        任务树
        <span className="text-gray-600 ml-1">
          {completed}/{total}
        </span>
        {/* Overall progress bar */}
        <div className="flex-1 max-w-32 bg-gray-700 rounded-full h-1.5 ml-2">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              overallProgress === 1 ? "bg-green-500" : "bg-hive-500"
            }`}
            style={{ width: `${Math.round(overallProgress * 100)}%` }}
          />
        </div>
      </button>

      {expanded && (
        <div className="pb-2 px-1">
          {objective && (
            <div className="text-[10px] text-hive-500/70 px-2 mb-1">
              目标: {objective}
            </div>
          )}
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

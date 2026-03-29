import { useEffect, useState } from "react";
import { Plus, Trash2, Users, MessageSquare } from "lucide-react";
import { useGroupStore } from "../store/groupStore";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Group } from "../types";

const stateColors: Record<string, string> = {
  idle: "bg-gray-500",
  thinking: "bg-blue-400",
  working: "bg-yellow-400",
  done: "bg-green-500",
  failed: "bg-red-500",
};

export function HomePage() {
  const groups = useGroupStore((s) => s.groups);
  const setGroups = useGroupStore((s) => s.setGroups);
  const removeGroup = useGroupStore((s) => s.removeGroup);
  const navigate = useGroupStore((s) => s.navigate);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: Group[]) => setGroups(data))
      .catch(console.error);
  }, [setGroups]);

  const handleDeleteClick = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    setDeleteTarget({ id: group.id, name: group.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const resp = await fetch(`/api/groups/${deleteTarget.id}`, { method: "DELETE" });
    if (resp.ok) removeGroup(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/90">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-hive-500">Hive</h1>
            <p className="text-xs text-gray-500 mt-0.5">Multi-Agent Collaboration</p>
          </div>
          <button
            onClick={() => navigate({ name: "create" })}
            className="flex items-center gap-2 bg-hive-600 hover:bg-hive-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus size={16} />
            创建空间
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {groups.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-gray-600" />
            </div>
            <h2 className="text-lg text-gray-400 mb-2">还没有空间</h2>
            <p className="text-sm text-gray-600 mb-6">创建一个空间，定义你的 Agent 团队</p>
            <button
              onClick={() => navigate({ name: "create" })}
              className="bg-hive-600 hover:bg-hive-500 text-white text-sm rounded-lg px-5 py-2.5 transition-colors"
            >
              创建第一个空间
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate({ name: "workspace", groupId: group.id })}
                className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-hive-500/40 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-200 group-hover:text-hive-400 transition-colors">
                      {group.name}
                    </h3>
                    <span className="text-[10px] text-gray-600 font-mono">{group.id}</span>
                    {group.workspace && (
                      <div className="text-[10px] text-gray-600 font-mono truncate max-w-48 mt-0.5">{group.workspace}</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, group)}
                    className="text-gray-700 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Agents */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {group.agents.map((agent) => (
                    <div
                      key={agent.name}
                      className="flex items-center gap-1.5 bg-gray-800/60 rounded-md px-2 py-1"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${stateColors[agent.state] || "bg-gray-500"}`}
                      />
                      <span className="text-xs text-gray-400">{agent.name}</span>
                      <span className="text-[10px] text-gray-600">{agent.role || agent.model_name}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users size={10} />
                    {group.agents.length} agents
                  </span>
                  {group.context?.tasks?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare size={10} />
                      {group.context.tasks.filter((t) => t.status === "completed").length}/
                      {group.context.tasks.length} tasks
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="删除空间"
          message={`确定要删除「${deleteTarget.name}」吗？删除后无法恢复。`}
          confirmText="删除"
          cancelText="取消"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

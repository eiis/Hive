import { useState } from "react";
import { Plus } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { AgentCard } from "./AgentCard";
import { AddAgentDialog } from "./AddAgentDialog";
import { EditAgentDialog } from "./EditAgentDialog";
import { ConfirmDialog } from "../ConfirmDialog";
import type { AgentStatus } from "../../types";

interface AgentPanelProps {
  groupId?: string;
}

export function AgentPanel({ groupId = "default" }: AgentPanelProps) {
  const agents = useAgentStore((s) => Object.values(s.agents));
  const setAgents = useAgentStore((s) => s.setAgents);
  const selectedAgent = useAgentStore((s) => s.selectedAgent);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const [showAdd, setShowAdd] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentStatus | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<AgentStatus | null>(null);

  const refreshAgents = async () => {
    try {
      const resp = await fetch(`/api/groups/${groupId}/agents`);
      if (resp.ok) setAgents(await resp.json());
    } catch (e) {
      console.error("Failed to refresh agents:", e);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;
    try {
      const resp = await fetch(`/api/groups/${groupId}/agents/${deleteAgent.name}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        if (selectedAgent === deleteAgent.name) selectAgent(null);
        await refreshAgents();
      }
    } catch (e) {
      console.error("Failed to delete agent:", e);
    }
    setDeleteAgent(null);
  };

  const handleClick = (name: string) => {
    selectAgent(selectedAgent === name ? null : name);
  };

  return (
    <>
      <div className="w-56 bg-gray-900/80 border-r border-gray-800 flex flex-col h-full">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-300">角色</h2>
            <span className="text-[10px] text-gray-500">
              {agents.length} 个在线
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-gray-600 hover:text-hive-400 transition-colors p-1"
            title="添加角色"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {agents.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              等待连接...
            </div>
          ) : (
            agents.map((agent) => (
              <AgentCard
                key={agent.name}
                agent={agent}
                selected={selectedAgent === agent.name}
                onClick={() => handleClick(agent.name)}
                onEdit={() => setEditAgent(agent)}
                onDelete={() => setDeleteAgent(agent)}
              />
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <AddAgentDialog
          groupId={groupId}
          onClose={() => setShowAdd(false)}
          onAdded={refreshAgents}
        />
      )}

      {editAgent && (
        <EditAgentDialog
          groupId={groupId}
          agent={editAgent}
          onClose={() => setEditAgent(null)}
          onUpdated={refreshAgents}
        />
      )}

      {deleteAgent && (
        <ConfirmDialog
          title="删除角色"
          message={`确定要删除「${deleteAgent.name}」吗？`}
          confirmText="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteAgent(null)}
        />
      )}
    </>
  );
}

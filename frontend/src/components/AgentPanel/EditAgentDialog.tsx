import { useState } from "react";
import { X } from "lucide-react";
import type { AgentStatus } from "../../types";

const MODEL_OPTIONS = [
  { value: "", label: "默认模型" },
  { value: "claude-cli", label: "Claude CLI" },
  { value: "codex-cli", label: "Codex CLI" },
  { value: "claude", label: "Claude API" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "compatible", label: "兼容接口" },
];

interface EditAgentDialogProps {
  groupId: string;
  agent: AgentStatus;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditAgentDialog({ groupId, agent, onClose, onUpdated }: EditAgentDialogProps) {
  const [name, setName] = useState(agent.name);
  const [model, setModel] = useState(agent.model_name);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("名称不能为空");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const body: Record<string, string> = {};
      if (name.trim() !== agent.name) body.name = name.trim();
      if (model !== agent.model_name) body.model = model;
      if (systemPrompt.trim()) body.system_prompt = systemPrompt.trim();

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const resp = await fetch(`/api/groups/${groupId}/agents/${agent.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const data = await resp.json();
        const detail = typeof data.detail === "string" ? data.detail : "更新失败";
        throw new Error(detail);
      }

      onUpdated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">编辑角色</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-hive-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">模型</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-hive-500"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">角色定位</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="留空保持当前设定不变"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-hive-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-hive-600 hover:bg-hive-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

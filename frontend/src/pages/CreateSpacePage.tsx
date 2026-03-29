import { useState } from "react";
import { ArrowLeft, Plus, Trash2, FolderOpen } from "lucide-react";
import { useGroupStore } from "../store/groupStore";
import { FolderPicker } from "../components/FolderPicker";

interface AgentConfig {
  key: string;
  name: string;
  role: "foreman" | "developer";
  model: string;
  system_prompt: string;
}

const MODEL_OPTIONS = [
  { value: "", label: "默认模型" },
  { value: "claude-cli", label: "Claude CLI" },
  { value: "codex-cli", label: "Codex CLI" },
  { value: "claude", label: "Claude API" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "compatible", label: "兼容接口" },
];

const ROLE_OPTIONS = [
  { value: "foreman", label: "协调者" },
  { value: "developer", label: "开发者" },
];

let keyCounter = 0;
function makeKey() {
  return `agent-${++keyCounter}`;
}

export function CreateSpacePage() {
  const navigate = useGroupStore((s) => s.navigate);
  const addGroup = useGroupStore((s) => s.addGroup);

  const [spaceName, setSpaceName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [agents, setAgents] = useState<AgentConfig[]>([
    { key: makeKey(), name: "", role: "foreman", model: "", system_prompt: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  const addAgent = () => {
    setAgents([...agents, { key: makeKey(), name: "", role: "developer", model: "", system_prompt: "" }]);
  };

  const removeAgent = (key: string) => {
    if (agents.length <= 1) return;
    setAgents(agents.filter((a) => a.key !== key));
  };

  const updateAgent = (key: string, field: keyof AgentConfig, value: string) => {
    setAgents(agents.map((a) => (a.key === key ? { ...a, [field]: value } : a)));
  };

  const handleSubmit = async () => {
    setError("");

    if (!spaceName.trim()) {
      setError("请输入空间名称");
      return;
    }
    if (agents.some((a) => !a.name.trim())) {
      setError("所有角色都需要填写名称");
      return;
    }
    if (!agents.some((a) => a.role === "foreman")) {
      setError("需要至少一个协调者角色");
      return;
    }

    const names = agents.map((a) => a.name.trim());
    if (new Set(names).size !== names.length) {
      setError("角色名称不能重复");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spaceName.trim(),
          workspace: workspace.trim(),
          agents: agents.map((a) => ({
            name: a.name.trim(),
            role: a.role,
            model: a.model || null,
            system_prompt: a.system_prompt,
          })),
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || "创建失败");
      }

      const group = await resp.json();
      addGroup(group);
      navigate({ name: "workspace", groupId: group.id });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/90">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate({ name: "home" })}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold text-gray-200">创建空间</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Space Name */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">空间名称</label>
          <input
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="给你的空间起个名字"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-hive-500 transition-colors"
          />
        </div>

        {/* Workspace */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            工作目录
            <span className="text-gray-600 font-normal ml-2">Agent 在此目录下读写文件和执行命令</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="/path/to/your/project（留空使用默认目录）"
              className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-hive-500 transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setFolderPickerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 border border-gray-700 hover:border-hive-500 text-gray-300 hover:text-hive-400 rounded-lg text-sm transition-colors shrink-0"
            >
              <FolderOpen size={15} />
              浏览
            </button>
          </div>
        </div>

        <FolderPicker
          open={folderPickerOpen}
          initial={workspace}
          onSelect={(path) => setWorkspace(path)}
          onClose={() => setFolderPickerOpen(false)}
        />

        {/* Agents */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-400">
              角色配置
              <span className="text-gray-600 ml-2 font-normal">({agents.length} 个)</span>
            </label>
            <button
              onClick={addAgent}
              className="flex items-center gap-1 text-xs text-hive-500 hover:text-hive-400 transition-colors"
            >
              <Plus size={14} />
              添加角色
            </button>
          </div>

          <p className="text-xs text-gray-600 mb-4">至少需要一个协调者角色来分解和分配任务，其他角色由你自由定义。</p>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.key}
                className="bg-gray-900/80 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    value={agent.name}
                    onChange={(e) => updateAgent(agent.key, "name", e.target.value)}
                    placeholder="角色名称"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-hive-500"
                  />
                  <select
                    value={agent.role}
                    onChange={(e) => updateAgent(agent.key, "role", e.target.value as AgentConfig["role"])}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-hive-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <select
                    value={agent.model}
                    onChange={(e) => updateAgent(agent.key, "model", e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-hive-500"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  {agents.length > 1 && (
                    <button
                      onClick={() => removeAgent(agent.key)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={agent.system_prompt}
                  onChange={(e) => updateAgent(agent.key, "system_prompt", e.target.value)}
                  placeholder="角色定位（可选）— 描述这个角色的职责和擅长领域"
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-hive-500 resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-hive-600 hover:bg-hive-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg py-3 transition-colors"
        >
          {submitting ? "创建中..." : "创建空间"}
        </button>
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X } from "lucide-react";

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
  { value: "developer", label: "开发者" },
  { value: "foreman", label: "协调者" },
];

const DEFAULT_PROMPTS: Record<string, string> = {
  "前端开发": "你是前端开发工程师，擅长 React、Vue、TypeScript、CSS，负责页面开发和交互实现。",
  "后端开发": "你是后端开发工程师，擅长 API 设计、数据库、服务端逻辑，负责接口开发和系统架构。",
  "全栈开发": "你是全栈开发工程师，前后端均可胜任，负责完整功能的实现。",
  "测试工程师": "你是测试工程师，擅长编写单元测试、集成测试，负责发现和验证 Bug。",
  "架构师": "你是软件架构师，擅长系统设计、技术选型和性能优化，负责整体技术方案。",
  "代码审查": "你是代码审查专家，负责 Review 代码质量、发现潜在问题和改进点。",
  "产品经理": "你是产品经理，擅长需求分析、产品设计和用户体验，负责需求文档和验收标准。",
  "文档撰写": "你是技术文档工程师，擅长编写 README、API 文档和使用指南。",
  "DevOps": "你是 DevOps 工程师，擅长 CI/CD、Docker、部署和运维自动化。",
  "数据分析": "你是数据分析师，擅长数据处理、可视化和洞察提取。",
};

function getDefaultPrompt(name: string): string {
  return DEFAULT_PROMPTS[name] || "";
}

interface AddAgentDialogProps {
  groupId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddAgentDialog({ groupId, onClose, onAdded }: AddAgentDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("developer");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptManuallyEdited, setPromptManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 根据名称自动填充角色定位
  useEffect(() => {
    if (!promptManuallyEdited) {
      setSystemPrompt(getDefaultPrompt(name.trim()));
    }
  }, [name, promptManuallyEdited]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入角色名称");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const resp = await fetch(`/api/groups/${groupId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          model: model || undefined,
          system_prompt: systemPrompt || "",
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        const detail = typeof data.detail === "string" ? data.detail : "添加失败";
        throw new Error(detail);
      }

      onAdded();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const presetNames = Object.keys(DEFAULT_PROMPTS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">添加角色</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick preset chips */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">快速选择</label>
            <div className="flex flex-wrap gap-1.5">
              {presetNames.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setName(preset);
                    setPromptManuallyEdited(false);
                  }}
                  className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                    name === preset
                      ? "bg-hive-600/20 border-hive-500/40 text-hive-400"
                      : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setPromptManuallyEdited(false); }}
              placeholder="角色名称"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-hive-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-hive-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-hive-500"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <textarea
            value={systemPrompt}
            onChange={(e) => { setSystemPrompt(e.target.value); setPromptManuallyEdited(true); }}
            placeholder="角色定位 — 描述职责和擅长领域"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-hive-500 resize-none"
          />

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
            {submitting ? "添加中..." : "添加"}
          </button>
        </div>
      </div>
    </div>
  );
}

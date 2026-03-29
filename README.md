# Hive

<p align="center">
  <a href="https://github.com/eiis/Hive/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://www.python.org"><img src="https://img.shields.io/badge/Python-3.11+-blue.svg" alt="Python 3.11+"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18+-61dafb.svg" alt="React 18+"></a>
  <a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/FastAPI-0.115+-009688.svg" alt="FastAPI"></a>
</p>

<p align="center">🐝 多 Agent 协作框架，支持任务自动分解、实时状态可视化、MCP 集成</p>

<p align="center">
  <a href="https://github.com/eiis/Hive/issues">反馈</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-技术文档">技术文档</a>
</p>

---

## ✨ 特性

- **多模型混合** — 支持 Claude、GPT-4、Gemini 等模型混合协作，统一适配器接口
- **实时可视化** — Agent 状态、进度、当前任务在 Web UI 实时更新
- **智能任务分解** — Foreman 自动理解用户意图，分解任务树并分配给最合适的 Agent
- **MCP 集成** — 可作为 MCP Server 嵌入 Claude Code 工作流
- **消息路由** — 支持 `@all` `@foreman` `@peers` `@user` `@{name}` 多种寻址方式
- **Docker 一键部署** — 开箱即用，无需复杂配置

---

## 📦 快速开始

### Docker 部署（推荐）

```bash
git clone https://github.com/eiis/Hive.git
cd Hive
cp .env.example .env  # 编辑 .env 填入 API Key
docker compose up -d
```

浏览器访问 `http://localhost:3000`。

### 本地开发

**后端：**

```bash
# 需要 Python 3.11+，推荐使用 uv
uv sync
uv run python -m backend.main
```

**前端：**

```bash
cd frontend
pnpm install
pnpm dev
```

---

## 🖥 界面预览

```
┌──────────────────────────────────────────────────────┐
│  🐝 Hive   [Group: Desktop ▼]              [设置]    │
├────────────────┬─────────────────────────────────────┤
│  Agent 面板    │  消息区                              │
│                │                                     │
│ ● foreman      │  user  → @foreman                   │
│   思考中...    │  "帮我写一个 Todo 应用"              │
│   ██░░░ 40%    │                                     │
│                │  foreman  → @all                     │
│ ● claude       │  "任务已分解，分配给 claude..."      │
│   写 TodoList  │                                     │
│   ████░ 75%    │                                     │
│                │                                     │
│ ○ codex        │                                     │
│   等待中       │                                     │
├────────────────┼─────────────────────────────────────┤
│                │  [@all ▼]  [输入消息...]   [发送]   │
└────────────────┴─────────────────────────────────────┘
```

---

## ⚙️ 核心架构

```
Web UI (React + TypeScript)
        │ WebSocket / REST
FastAPI Backend
        │
   ┌────┼────────────┐
   │    │             │
Event Bus    MCP Server    Model Adapters
   │                       (Claude / GPT / Gemini)
   ├── Foreman (任务分解 + 分配)
   ├── Agent A (执行任务)
   ├── Agent B (执行任务)
   └── Shared Context DB
```

**核心概念：**

| 概念 | 说明 |
|------|------|
| **Agent** | AI 模型驱动的工作单元，有独立状态机和任务队列 |
| **Foreman** | 协调者 Agent，负责理解意图、分解任务、分配执行 |
| **Group** | Agent 协作空间，共享上下文和消息 |
| **Event Bus** | 所有状态变化和消息通过统一事件总线流转 |

---

## 📁 项目结构

```
Hive/
├── backend/
│   ├── core/              # 核心逻辑
│   │   ├── agent.py       # Agent 基类 + 状态机
│   │   ├── foreman.py     # Foreman 协调逻辑
│   │   ├── router.py      # 消息路由
│   │   ├── event_bus.py   # 事件总线
│   │   ├── context.py     # 共享上下文
│   │   └── task.py        # 任务树管理
│   ├── models/            # 模型适配器
│   │   ├── base.py        # 统一抽象接口
│   │   ├── claude.py      # Claude 适配器
│   │   └── openai_adapter.py  # OpenAI 兼容接口适配器
│   ├── mcp/               # MCP Server
│   ├── api/               # REST + WebSocket
│   ├── db/                # 数据库模型
│   ├── config.py          # 配置管理
│   └── main.py            # FastAPI 入口
├── frontend/
│   └── src/
│       ├── components/    # AgentPanel / Chat / TaskTree
│       ├── pages/         # HomePage / WorkspacePage
│       ├── store/         # Zustand 状态管理
│       └── hooks/         # WebSocket / Agent 状态 hooks
├── docker/                # Docker 部署配置
├── pyproject.toml
└── README.md
```

---

## 🗺 路线图

- [x] 核心骨架（Agent 状态机、Event Bus、消息路由）
- [x] Foreman 协调（任务分解、依赖管理、进度上报）
- [x] Web UI（Agent 面板、聊天区、任务树可视化）
- [x] MCP Server 集成
- [x] Docker 一键部署
- [ ] 更多模型适配（Gemini、Ollama 本地模型）
- [ ] GitHub Actions CI/CD
- [ ] 插件系统

---

## 🔧 MCP 集成

Hive 可作为 MCP Server 嵌入 Claude Code 工作流，暴露以下工具：

| 工具 | 功能 |
|------|------|
| `hive_send_message` | 向 Group 发消息 |
| `hive_get_task_status` | 查询任务状态 |
| `hive_get_context` | 读取共享上下文 |
| `hive_list_agents` | 列出所有 Agent 及状态 |
| `hive_assign_task` | 给指定 Agent 分配任务 |

```json
{
  "mcpServers": {
    "hive": {
      "command": "uv",
      "args": ["run", "hive-mcp"]
    }
  }
}
```

---

## 📄 License

[MIT](./LICENSE)

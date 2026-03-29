# Hive — 开发进度跟踪

## Phase 1 — 核心骨架

- [x] 项目初始化（uv + pnpm + FastAPI + React）
- [x] 模型适配器（Claude + OpenAI 兼容接口）
- [x] Agent 基类 + 状态机
- [x] Event Bus 实现
- [x] 消息路由系统
- [x] SQLite 数据库 + 基础模型
- [x] WebSocket 基础连接

## Phase 2 — Foreman 协调

- [x] Foreman Agent 实现
- [x] 任务分解 Prompt 工程
- [x] 任务树数据结构
- [x] 任务依赖管理（拓扑排序调度）
- [x] 共享上下文读写
- [x] Agent 进度上报

## Phase 3 — Web UI

- [x] 整体布局框架
- [x] Agent 状态面板（实时更新）
- [x] 聊天消息区
- [x] 消息地址选择器（@all @foreman 等）
- [x] 任务树可视化组件
- [x] WebSocket 状态同步

## Phase 4 — MCP 集成

- [x] MCP Server 实现
- [x] 工具注册（发消息、查状态、读上下文等）
- [x] Claude Code 集成测试

## Phase 5 — 开源打磨

- [x] Docker + Docker Compose 一键部署
- [ ] 更多模型适配（Gemini、Ollama 本地模型）
- [ ] 完善 README 和文档
- [ ] GitHub Actions CI/CD

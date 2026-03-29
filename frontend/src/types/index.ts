export type AgentState =
  | "idle"
  | "thinking"
  | "working"
  | "waiting"
  | "done"
  | "failed";

export interface AgentStatus {
  name: string;
  role?: string;
  state: AgentState;
  model_name: string;
  current_task: string | null;
  detail: string | null;
  progress: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  target: string;
  content: string;
  group_id: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "blocked";
  assigned_to: string | null;
  depends_on: string[];
  progress: number;
  children: Task[];
}

export interface Group {
  id: string;
  name: string;
  workspace?: string;
  agents: AgentStatus[];
  context: {
    objective: string;
    tasks: Task[];
    memory: { content: string; author: string; created_at: string }[];
    artifacts: { name: string; type: string; content: string; author: string }[];
  };
}

export interface WSEvent {
  type: string;
  data: Record<string, unknown>;
}

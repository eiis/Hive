import { create } from "zustand";
import type { AgentStatus, Task } from "../types";

interface AgentStore {
  agents: Record<string, AgentStatus>;
  tasks: Task[];
  objective: string;
  selectedAgent: string | null;

  updateAgent: (status: AgentStatus) => void;
  setAgents: (agents: AgentStatus[]) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (task: Task) => void;
  setObjective: (objective: string) => void;
  selectAgent: (name: string | null) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {},
  tasks: [],
  objective: "",
  selectedAgent: null,

  updateAgent: (status) =>
    set((state) => ({
      agents: { ...state.agents, [status.name]: status },
    })),

  setAgents: (agents) =>
    set({
      agents: Object.fromEntries(agents.map((a) => [a.name, a])),
    }),

  setTasks: (tasks) => set({ tasks }),

  updateTask: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    })),

  setObjective: (objective) => set({ objective }),

  selectAgent: (name) => set({ selectedAgent: name }),
}));

import { create } from "zustand";
import type { Group } from "../types";

type Page = { name: "home" } | { name: "create" } | { name: "workspace"; groupId: string };

interface GroupStore {
  groups: Group[];
  currentPage: Page;

  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  removeGroup: (id: string) => void;
  navigate: (page: Page) => void;
}

export const useGroupStore = create<GroupStore>((set) => ({
  groups: [],
  currentPage: { name: "home" },

  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [...s.groups, group] })),
  removeGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
  navigate: (page) => set({ currentPage: page }),
}));

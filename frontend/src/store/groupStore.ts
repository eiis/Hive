import { create } from "zustand";
import type { Group } from "../types";

type Page = { name: "home" } | { name: "create" } | { name: "workspace"; groupId: string };

function pageToUrl(page: Page): string {
  switch (page.name) {
    case "home":
      return "/";
    case "create":
      return "/create";
    case "workspace":
      return `/workspace/${page.groupId}`;
  }
}

function urlToPage(url: string): Page {
  const path = url.replace(/\/$/, "") || "/";
  if (path === "/create") return { name: "create" };
  const wsMatch = path.match(/^\/workspace\/(.+)$/);
  if (wsMatch) return { name: "workspace", groupId: wsMatch[1] };
  return { name: "home" };
}

interface GroupStore {
  groups: Group[];
  currentPage: Page;

  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  removeGroup: (id: string) => void;
  navigate: (page: Page) => void;
  syncFromUrl: () => void;
}

export const useGroupStore = create<GroupStore>((set) => ({
  groups: [],
  currentPage: urlToPage(window.location.pathname),

  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [...s.groups, group] })),
  removeGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),

  navigate: (page) => {
    const url = pageToUrl(page);
    window.history.pushState(null, "", url);
    set({ currentPage: page });
  },

  syncFromUrl: () => {
    set({ currentPage: urlToPage(window.location.pathname) });
  },
}));

import { create } from "zustand";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.detail || "登录失败，请检查用户名和密码");
      }
      const { access_token } = await resp.json();
      localStorage.setItem("token", access_token);
      set({ token: access_token });
      // Fetch user info
      await get().checkAuth();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "登录失败";
      set({ isLoading: false, error: msg });
    }
  },

  register: async (username, password, email) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.detail || "注册失败，请稍后重试");
      }
      // Auto-login after register
      await get().login(username, password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "注册失败";
      set({ isLoading: false, error: msg });
    }
  },

  logout: async () => {
    const { token } = get();
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const { token } = get();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    set({ isLoading: true });
    try {
      const resp = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Token 已失效");
      const user = await resp.json();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

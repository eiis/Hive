import { useState } from "react";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await login(username, password);
    } else {
      await register(username, password, email);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setUsername("");
    setPassword("");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-hive-600/20 border border-hive-600/30 flex items-center justify-center mx-auto mb-4">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-hive-500"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-hive-500">Hive</h1>
          <p className="text-xs text-gray-500 mt-1">Multi-Agent Collaboration</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 animate-in">
          <h2 className="text-lg font-semibold text-gray-200 mb-1">
            {mode === "login" ? "登录" : "注册"}
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            {mode === "login"
              ? "输入凭据以访问工作区"
              : "创建新账号加入 Hive"}
          </p>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-hive-500/50 focus:ring-1 focus:ring-hive-500/30 transition-colors"
                placeholder="请输入用户名"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-hive-500/50 focus:ring-1 focus:ring-hive-500/30 transition-colors"
                  placeholder="请输入邮箱"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-hive-500/50 focus:ring-1 focus:ring-hive-500/30 transition-colors"
                placeholder="请输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-hive-600 hover:bg-hive-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {mode === "login" ? "登录" : "注册"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={switchMode}
              className="text-xs text-gray-500 hover:text-hive-400 transition-colors"
            >
              {mode === "login"
                ? "没有账号？点击注册"
                : "已有账号？点击登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

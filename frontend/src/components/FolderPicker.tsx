import { useState, useEffect } from "react";
import { Folder, ArrowLeft, Check, X, ChevronRight } from "lucide-react";

interface DirEntry {
  name: string;
  path: string;
}

interface BrowseResult {
  current: string;
  parent: string | null;
  dirs: DirEntry[];
}

interface FolderPickerProps {
  open: boolean;
  initial?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function FolderPicker({ open, initial, onSelect, onClose }: FolderPickerProps) {
  const [current, setCurrent] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const browse = async (path: string) => {
    setLoading(true);
    setError("");
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : "";
      const resp = await fetch(`/api/fs/browse${params}`);
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || "无法访问");
      }
      const data: BrowseResult = await resp.json();
      setCurrent(data.current);
      setParent(data.parent);
      setDirs(data.dirs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "浏览失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      browse(initial || "");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-[520px] max-h-[70vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-200">选择工作目录</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>

        {/* Current path */}
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800 flex items-center gap-2">
          {parent && (
            <button
              onClick={() => browse(parent)}
              className="text-gray-500 hover:text-gray-300 shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="text-xs font-mono text-gray-400 truncate">{current}</span>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              加载中...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-400 text-sm">
              {error}
            </div>
          ) : dirs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
              没有子目录
            </div>
          ) : (
            <div className="py-1">
              {dirs.map((d) => (
                <button
                  key={d.path}
                  onClick={() => browse(d.path)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-gray-800/80 transition-colors group"
                >
                  <Folder size={15} className="text-hive-500/70 shrink-0" />
                  <span className="text-sm text-gray-300 truncate flex-1">{d.name}</span>
                  <ChevronRight size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <span className="text-xs text-gray-500 truncate max-w-[300px]">{current}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => { onSelect(current); onClose(); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-hive-600 hover:bg-hive-500 text-white rounded-md transition-colors"
            >
              <Check size={13} />
              选择此目录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                danger ? "bg-red-500/10" : "bg-hive-500/10"
              }`}
            >
              <AlertTriangle
                size={20}
                className={danger ? "text-red-400" : "text-hive-400"}
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-100 mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-400">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger
                ? "bg-red-600 hover:bg-red-500"
                : "bg-hive-600 hover:bg-hive-500"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

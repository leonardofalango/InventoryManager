import { X, AlertTriangle, Info } from "lucide-react";
import { clsx } from "clsx";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 rounded-xl max-w-sm w-full border border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/30">
          <div className="flex items-center gap-2 text-textAccent">
            {isDanger && <AlertTriangle size={25} className="text-red-400" />}
            {!isDanger && <Info size={25} className="text-textAccent" />}
            <h3 className="text-lg font-medium">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-textSecondary hover:text-textAccent transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-textSecondary text-sm">{message}</p>
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={clsx(
              "px-4 py-2 font-medium rounded-lg transition-colors",
              isDanger
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-accent text-textAccent hover:bg-accent/90",
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

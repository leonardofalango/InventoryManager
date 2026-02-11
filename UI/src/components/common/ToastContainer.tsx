import { useFeedbackStore } from "../../store/feedbackStore";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { clsx } from "clsx";

export function ToastContainer() {
  const { notifications, removeFeedback } = useFeedbackStore();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px] animate-in slide-in-from-right",
            n.type === "success" && "bg-green-600",
            n.type === "error" && "bg-red-600",
            n.type === "info" && "bg-blue-600",
          )}
        >
          {n.type === "success" && <CheckCircle size={20} />}
          {n.type === "error" && <AlertCircle size={20} />}
          {n.type === "info" && <Info size={20} />}

          <span className="flex-1 text-sm font-medium">{n.message}</span>

          <button
            onClick={() => removeFeedback(n.id)}
            className="hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

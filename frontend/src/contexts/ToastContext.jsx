import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, "success", duration),
    error: (msg, duration) => addToast(msg, "error", duration),
    info: (msg, duration) => addToast(msg, "info", duration),
    warning: (msg, duration) => addToast(msg, "warning", duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ id, message, type, onRemove }) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      iconColor: "text-green-600 dark:text-green-400",
      textColor: "text-green-800 dark:text-green-300",
    },
    error: {
      icon: XCircle,
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      iconColor: "text-red-600 dark:text-red-400",
      textColor: "text-red-800 dark:text-red-300",
    },
    warning: {
      icon: AlertCircle,
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      textColor: "text-yellow-800 dark:text-yellow-300",
    },
    info: {
      icon: Info,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-blue-800 dark:text-blue-300",
    },
  };

  const { icon: Icon, bg, border, iconColor, textColor } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`${bg} ${border} border rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[320px] max-w-md`}
    >
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <p className={`text-sm ${textColor} whitespace-pre-line`}>{message}</p>
      </div>
      <button
        onClick={() => onRemove(id)}
        className={`${textColor} hover:opacity-70 transition flex-shrink-0`}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

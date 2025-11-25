import React from "react"
import type { Toast } from "../../hooks/use-toast"
import { cn } from "../../utils/cn"

interface ToastContainerProps {
  toasts: Toast[]
  dismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, dismiss }) => {
  const variants = {
    default:
      "border-emerald-200 bg-emerald-50/90 text-emerald-800 shadow-[0_15px_35px_rgba(16,185,129,0.2)]",
    success:
      "border-emerald-200 bg-emerald-50/90 text-emerald-800 shadow-[0_15px_35px_rgba(16,185,129,0.2)]",
    destructive:
      "border-rose-200 bg-rose-50/90 text-rose-700 shadow-[0_15px_35px_rgba(244,63,94,0.2)]",
    info: "border-sky-200 bg-sky-50/90 text-sky-800 shadow-[0_15px_35px_rgba(14,165,233,0.18)]",
  } as const

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[60] flex flex-col gap-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={cn(
            "pointer-events-auto w-full min-w-[280px] max-w-sm rounded-2xl border px-5 py-4 text-left",
            "text-sm font-medium transition-all duration-300",
            "shadow-[0_12px_30px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
            variants[toast.variant ?? "default"]
          )}
          aria-live="assertive"
        >
          <div className="text-base font-semibold">{toast.title}</div>
          {toast.description && <div className="mt-1 text-sm opacity-80">{toast.description}</div>}
        </button>
      ))}
    </div>
  )
}


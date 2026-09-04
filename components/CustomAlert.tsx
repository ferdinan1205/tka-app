"use client"

import { useEffect } from "react"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"

export type AlertType = "success" | "error" | "warning" | "info"

export interface AlertState {
  type: AlertType
  title: string
  message: string
}

interface CustomAlertProps {
  alert: AlertState | null
  onClose: () => void
  duration?: number // auto-close duration in ms, default 4000
}

export default function CustomAlert({ alert, onClose, duration = 4000 }: CustomAlertProps) {
  useEffect(() => {
    if (!alert || duration <= 0) return

    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [alert, duration, onClose])

  if (!alert) return null

  const config = {
    success: {
      border: "border-emerald-200",
      bg: "bg-white",
      iconBg: "bg-emerald-50 text-emerald-600",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      titleColor: "text-slate-900",
      textColor: "text-slate-600",
    },
    error: {
      border: "border-rose-200",
      bg: "bg-white",
      iconBg: "bg-rose-50 text-rose-600",
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
      titleColor: "text-slate-900",
      textColor: "text-slate-600",
    },
    warning: {
      border: "border-amber-200",
      bg: "bg-white",
      iconBg: "bg-amber-50 text-amber-600",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      titleColor: "text-slate-900",
      textColor: "text-slate-600",
    },
    info: {
      border: "border-blue-200",
      bg: "bg-white",
      iconBg: "bg-blue-50 text-blue-600",
      icon: <Info className="w-5 h-5 text-blue-600" />,
      titleColor: "text-slate-900",
      textColor: "text-slate-600",
    },
  }[alert.type]

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-top-3 duration-200">
      <div
        className={`relative flex items-start gap-3.5 p-4 rounded-2xl border shadow-xl shadow-slate-900/5 ${config.bg} ${config.border}`}
        role="alert"
      >
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.iconBg}`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className={`text-sm font-semibold ${config.titleColor}`}>
            {alert.title}
          </h4>
          <p className={`text-xs sm:text-sm mt-0.5 leading-relaxed break-words ${config.textColor}`}>
            {alert.message}
          </p>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

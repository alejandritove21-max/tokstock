"use client"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Check, AlertCircle } from "lucide-react"

export function Notification() {
  const { notification } = useStore()

  if (!notification) return null

  return (
    <div className="fixed left-4 right-4 top-12 z-[200] mx-auto max-w-lg animate-slide-up">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl",
          notification.type === "error"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-success/30 bg-success/10 text-green-400"
        )}
      >
        {notification.type === "error" ? (
          <AlertCircle className="h-4 w-4 shrink-0" />
        ) : (
          <Check className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm font-medium">{notification.message}</span>
      </div>
    </div>
  )
}

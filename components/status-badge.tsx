"use client"

import { cn } from "@/lib/utils"

const config = {
  available: { label: "Disponible", className: "bg-primary/10 text-primary border-primary/20" },
  sold: { label: "Vendida", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  disqualified: { label: "Descalif.", className: "bg-destructive/10 text-destructive border-destructive/20" },
}

export function StatusBadge({ status }: { status: string }) {
  const c = config[status as keyof typeof config] || config.available
  return (
    <span
      className={cn(
        "inline-flex min-w-[60px] items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        c.className
      )}
    >
      {c.label}
    </span>
  )
}

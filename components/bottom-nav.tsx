"use client"

import { Home, Package, BarChart3, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"

const navItems = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "inventario", icon: Package, label: "Stock" },
  { id: "add", icon: Plus, label: "Añadir", isAction: true },
  { id: "reportes", icon: BarChart3, label: "Reportes" },
  { id: "ajustes", icon: Settings, label: "Ajustes" },
]

export function BottomNav() {
  const { activeTab, setActiveTab, setEditingAccount } = useStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => {
                  setEditingAccount(null)
                  setActiveTab("nueva-cuenta")
                }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-95"
              >
                <Icon className="h-5 w-5" />
              </button>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

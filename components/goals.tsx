"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency } from "@/lib/store"

export function Goals() {
  const { goals, setGoals, accounts, setActiveTab } = useStore()
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")

  const sold = accounts.filter(a => a.status === "sold")

  const handleCreate = () => {
    if (!name || !amount) return
    const newGoal = { id: Date.now().toString(), name, amount: parseFloat(amount), createdAt: new Date().toISOString() }
    setGoals([...goals, newGoal])
    setName(""); setAmount("")
  }

  const handleDelete = (id: string) => {
    setGoals(goals.filter(g => g.id !== id))
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={() => setActiveTab("ajustes")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">Metas</h1>
      </header>

      {/* Create */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-4 flex items-center gap-2 font-medium"><Plus className="h-4 w-4" /> Nueva meta</p>
        <div className="flex flex-col gap-3">
          <input placeholder="Nombre (ej: iPhone, Laptop...)" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <input type="number" placeholder="Monto objetivo ($)" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <button onClick={handleCreate} disabled={!name || !amount} className="w-full rounded-xl bg-secondary py-3 text-sm font-medium text-muted-foreground transition-all disabled:opacity-50">Crear meta</button>
        </div>
      </div>

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="flex flex-col gap-3">
          {goals.map(g => {
            const earned = sold
              .filter(a => a.soldDate && new Date(a.soldDate) >= new Date(g.createdAt))
              .reduce((s, a) => s + ((a.realSalePrice || 0) - (a.purchasePrice || 0)), 0)
            const pct = Math.min((earned / g.amount) * 100, 100)
            return (
              <div key={g.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{g.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(earned)} / {formatCurrency(g.amount)}</p>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-right text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-5xl">🎯</div>
          <p className="font-medium">Crea tu primera meta</p>
          <p className="mt-1 text-sm text-muted-foreground">La ganancia se cuenta desde el día que la crees</p>
        </div>
      )}
    </div>
  )
}

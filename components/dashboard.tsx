"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Package, DollarSign, AlertCircle, Wifi, Clock, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, formatFollowers, today, venezuelaDateStr, venezuelaDaysAgo, isOnOrAfter, toVenezuelaKey, type Account } from "@/lib/store"
import { AccountCard } from "./account-card"

export function Dashboard() {
  const { accounts, goals, setActiveTab, setSelectedAccount } = useStore()

  const dateStr = venezuelaDateStr()
  const todayKey = today()

  const available = accounts.filter(a => a.status === "available")
  const soldAll = accounts.filter(a => a.status === "sold")
  const disqAll = accounts.filter(a => a.status === "disqualified")
  const invested = available.reduce((s, a) => s + (a.purchasePrice || 0), 0)
  const estimatedValue = available.reduce((s, a) => s + (a.estimatedSalePrice || 0), 0)
  const totalProfit = soldAll.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0) - disqAll.reduce((s, a) => s + (a.purchasePrice || 0), 0)

  // 30 day cycle
  const sold30 = soldAll.filter(a => isOnOrAfter(a.soldDate, venezuelaDaysAgo(30)))
  const profit30 = sold30.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
  const loss30 = disqAll.filter(a => isOnOrAfter(a.disqualifiedDate, venezuelaDaysAgo(30))).reduce((s, a) => s + (a.purchasePrice || 0), 0)

  // Today stats
  const soldToday = soldAll.filter(a => toVenezuelaKey(a.soldDate) === todayKey)
  const addedToday = accounts.filter(a => toVenezuelaKey(a.createdAt) === todayKey)
  const profitToday = soldToday.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)

  // Last sale
  const lastSale = soldAll.sort((a, b) => (b.soldDate || "").localeCompare(a.soldDate || ""))[0]
  const lastSaleProfit = lastSale ? (lastSale.realSalePrice || 0) - (lastSale.purchasePrice || 0) : 0

  // Last added accounts
  const lastAdded = accounts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5)

  // Days left in 30 day cycle (resets based on first of current month)
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfCycle = new Date(firstOfMonth.getTime() + 30 * 86400000)
  const daysLeft = Math.max(0, Math.ceil((endOfCycle.getTime() - now.getTime()) / 86400000))

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Header */}
      <header>
        <p className="text-xs capitalize text-muted-foreground">{dateStr}</p>
        <h1 className="mt-1 text-2xl font-bold">TokStock</h1>
      </header>

      {/* 30 Day Cycle Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ganancia — Últimos 30 Días</p>
          <span className="flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            <Clock className="h-3 w-3" /> {daysLeft}d restantes
          </span>
        </div>
        <p className={cn("mt-2 text-4xl font-bold", profit30 - loss30 >= 0 ? "text-primary" : "text-destructive")}>
          {profit30 - loss30 >= 0 ? "+" : ""}{formatCurrency(profit30 - loss30)}
        </p>
        <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
          <span>{sold30.length} vendida(s)</span>
          <span>·</span>
          <span>Ganancia: {formatCurrency(profit30)}</span>
          <span>·</span>
          <span>Pérdida: {formatCurrency(loss30)}</span>
        </div>
        {/* Progress bar for 30 day cycle */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary/50">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((30 - daysLeft) / 30) * 100)}%` }} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        <QuickStat label="Disponibles" value={available.length.toString()} />
        <QuickStat label="Vendidas" value={soldAll.length.toString()} />
        <QuickStat label="Hoy" value={`+${formatCurrency(profitToday)}`} highlight={profitToday > 0} />
        <QuickStat label="Invertido" value={formatCurrency(invested)} />
      </div>

      {/* Last Sale */}
      {lastSale && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Última Venta</h3>
          </div>
          <button onClick={() => setSelectedAccount(lastSale)} className="w-full text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">@{lastSale.username}</p>
                <p className="text-[10px] text-muted-foreground">
                  {lastSale.buyer || "?"} · {lastSale.soldDate || "—"} · {formatFollowers(lastSale.followers)} seg
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatCurrency(lastSale.realSalePrice)}</p>
                <p className={cn("text-[10px] font-semibold", lastSaleProfit >= 0 ? "text-primary" : "text-destructive")}>
                  {lastSaleProfit >= 0 ? "+" : ""}{formatCurrency(lastSaleProfit)}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Today Activity */}
      {(soldToday.length > 0 || addedToday.length > 0) && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actividad Hoy</h3>
          {soldToday.map((a, i) => (
            <div key={`s${i}`} className="flex items-center justify-between border-b border-border/30 py-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">💰</span>
                <div>
                  <p className="text-xs font-medium">@{a.username} vendida</p>
                  <p className="text-[10px] text-muted-foreground">→ {a.buyer || "?"}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-primary">+{formatCurrency((a.realSalePrice || 0) - (a.purchasePrice || 0))}</p>
            </div>
          ))}
          {addedToday.map((a, i) => (
            <div key={`a${i}`} className="flex items-center justify-between border-b border-border/30 py-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">📦</span>
                <div>
                  <p className="text-xs font-medium">@{a.username} agregada</p>
                  <p className="text-[10px] text-muted-foreground">{formatFollowers(a.followers)} seg · {a.country || "—"}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{formatCurrency(a.purchasePrice)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Inventory Summary */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Inventario</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/50 p-3 text-center">
            <p className="text-[9px] text-muted-foreground">Invertido</p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(invested)}</p>
          </div>
          <div className="rounded-xl bg-primary/5 p-3 text-center">
            <p className="text-[9px] text-muted-foreground">Valor Estimado</p>
            <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(estimatedValue)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ganancia potencial</span>
          <span className={cn("font-bold", estimatedValue - invested >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(estimatedValue - invested)}</span>
        </div>
      </div>

      {/* Goals progress */}
      {Array.isArray(goals) && goals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Metas</h3>
          {goals.map(g => {
            const earned = soldAll
              .filter(a => a.soldDate && new Date(a.soldDate) >= new Date(g.createdAt))
              .reduce((s, a) => s + ((a.realSalePrice || 0) - (a.purchasePrice || 0)), 0)
            const pct = Math.min((earned / g.amount) * 100, 100)
            return (
              <div key={g.id} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(earned)} / {formatCurrency(g.amount)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Last added accounts */}
      {lastAdded.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Últimas Cuentas</h3>
          <div className="flex flex-col gap-2">
            {lastAdded.map(a => <AccountCard key={a.id} account={a} />)}
          </div>
        </div>
      )}

      {/* Quick access buttons */}
      <div className="grid grid-cols-4 gap-2 pb-4">
        {[
          { label: "Buscar", icon: "🔍", tab: "buscar" },
          { label: "Reportes", icon: "📊", tab: "reportes" },
          { label: "Bodega", icon: "📧", tab: "bodega" },
          { label: "Chat IA", icon: "🤖", tab: "chatbot" },
        ].map(b => (
          <button key={b.tab} onClick={() => setActiveTab(b.tab)} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 transition-all active:scale-95">
            <span className="text-xl">{b.icon}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function QuickStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-2.5 text-center", highlight ? "border-primary/30" : "border-border")}>
      <p className="text-[8px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold", highlight ? "text-primary" : "")}>{value}</p>
    </div>
  )
}

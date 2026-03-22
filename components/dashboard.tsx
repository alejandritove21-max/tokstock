"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Package, DollarSign, AlertCircle, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, formatFollowers, venezuelaDate, type Account } from "@/lib/store"
import { AccountCard } from "./account-card"

const periods = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 Días" },
  { key: "30d", label: "30 Días" },
  { key: "90d", label: "90 Días" },
]

function getPeriodStart(key: string): Date {
  const now = venezuelaDate()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (key === "7d") start.setDate(start.getDate() - 7)
  else if (key === "30d") start.setDate(start.getDate() - 30)
  else if (key === "90d") start.setDate(start.getDate() - 90)
  return start
}

function isInPeriod(dateStr: string | null, start: Date): boolean {
  if (!dateStr) return false
  try {
    const d = new Date(new Date(dateStr).toLocaleString("en-US", { timeZone: "America/Caracas" }))
    return d >= start
  } catch { return false }
}

function calcStats(accounts: Account[], periodKey: string) {
  const start = getPeriodStart(periodKey)
  const sold = accounts.filter(a => a.status === "sold" && isInPeriod(a.soldDate, start))
  const disq = accounts.filter(a => a.status === "disqualified" && isInPeriod(a.disqualifiedDate, start))
  const revenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0)
  const costSold = sold.reduce((s, a) => s + (a.purchasePrice || 0), 0)
  const profit = revenue - costSold
  const lossAmount = disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
  const cashflow = profit - lossAmount
  return { sold: sold.length, disq: disq.length, revenue, profit, lossAmount, cashflow }
}

export function Dashboard() {
  const { accounts, goals, setActiveTab } = useStore()
  const [period, setPeriod] = useState("7d")
  const [locationInfo, setLocationInfo] = useState<{ country: string; flag: string; ip: string } | null>(null)

  const now = venezuelaDate()
  const dateStr = now.toLocaleDateString("es-VE", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Caracas" })

  const available = accounts.filter(a => a.status === "available")
  const soldAll = accounts.filter(a => a.status === "sold")
  const disqAll = accounts.filter(a => a.status === "disqualified")
  const invested = accounts.reduce((s, a) => s + (a.purchasePrice || 0), 0)
  const totalProfit = soldAll.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
    - disqAll.reduce((s, a) => s + (a.purchasePrice || 0), 0)

  const stats = calcStats(accounts, period)
  const recent = accounts.slice(0, 5)

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setLocationInfo({ country: d.country_name, flag: d.country_code, ip: d.ip }))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs capitalize text-muted-foreground">{dateStr}</p>
          {locationInfo && (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
                <span className="text-base">{locationInfo.flag === "VE" ? "🇻🇪" : "🌍"}</span>
                <span>{locationInfo.country}</span>
              </span>
              <span className="font-mono text-[10px]">{locationInfo.ip}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">v2.0</span>
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">
            <Wifi className="h-3 w-3" />
            <span>Sync</span>
          </div>
        </div>
      </header>

      {/* Total Cash Flow */}
      <div className="rounded-2xl border border-primary/20 bg-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Flujo Neto de Caja — Total
        </p>
        <p className={cn("mt-2 text-4xl font-bold", totalProfit >= 0 ? "text-primary" : "text-destructive")}>
          {formatCurrency(totalProfit)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Ingresos - Costos - Pérdidas
        </p>
      </div>

      {/* Goals progress */}
      {Array.isArray(goals) && goals.length > 0 && (
        <div className="flex flex-col gap-2">
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

      {/* Period Selector */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Rendimiento por Período</h2>
        <div className="flex gap-1 rounded-xl bg-secondary p-1">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                period === p.key
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Cash Flow */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Flujo de Caja — {periods.find(p => p.key === period)?.label}
            </p>
            <p className={cn("mt-2 text-3xl font-bold", stats.cashflow >= 0 ? "text-primary" : "text-destructive")}>
              {stats.cashflow >= 0 ? "+" : ""}{formatCurrency(stats.cashflow)}
            </p>
          </div>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", stats.cashflow >= 0 ? "bg-primary/10" : "bg-destructive/10")}>
            {stats.cashflow >= 0 ? <TrendingUp className="h-6 w-6 text-primary" /> : <TrendingDown className="h-6 w-6 text-destructive" />}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Package} label="Vendidas" value={stats.sold.toString()} sub="cuentas" color="blue" />
        <StatCard icon={DollarSign} label="Ingresos" value={formatCurrency(stats.revenue)} sub="por ventas" color="green" />
        <StatCard icon={TrendingUp} label="Ganancia" value={formatCurrency(stats.profit)} sub="neta" color="emerald" />
        <StatCard icon={AlertCircle} label="Pérdidas" value={formatCurrency(stats.lossAmount)} sub={`${stats.disq} descalif.`} color="red" />
      </div>

      {/* Summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Resumen General</h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Disponibles" value={available.length.toString()} dotColor="bg-primary" />
          <SummaryCard label="Vendidas" value={soldAll.length.toString()} dotColor="bg-blue-400" />
          <SummaryCard label="Invertido" value={formatCurrency(invested)} dotColor="bg-yellow-400" />
          <SummaryCard label="Descalif." value={disqAll.length.toString()} dotColor="bg-destructive" />
        </div>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold">Recientes</h2>
          <div className="flex flex-col gap-2">
            {recent.map(a => <AccountCard key={a.id} account={a} />)}
          </div>
        </div>
      )}

      {/* Quick access buttons */}
      <div className="grid grid-cols-3 gap-2 pb-4">
        {[
          { label: "Buscar", icon: "🔍", tab: "buscar" },
          { label: "Metas", icon: "🎯", tab: "metas" },
          { label: "Bodega", icon: "📧", tab: "bodega" },
        ].map(b => (
          <button
            key={b.tab}
            onClick={() => setActiveTab(b.tab)}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 transition-all active:scale-95"
          >
            <span className="text-xl">{b.icon}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  const dotColors: Record<string, string> = { blue: "bg-blue-400", green: "bg-primary", emerald: "bg-emerald-400", red: "bg-destructive" }
  const textColors: Record<string, string> = { blue: "text-blue-400", green: "text-primary", emerald: "text-emerald-400", red: "text-destructive" }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", dotColors[color])} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className={cn("mt-2 text-xl font-bold", textColors[color])}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function SummaryCard({ label, value, dotColor }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={cn("h-2 w-2 rounded-full", dotColor)} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
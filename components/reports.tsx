"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, today, toVenezuelaKey, venezuelaDaysAgo, isOnOrAfter, type Account } from "@/lib/store"

const tabs = ["Diario", "Mensual", "Trimestral"] as const

export function Reports() {
  const { accounts } = useStore()
  const [tab, setTab] = useState<string>("Diario")
  const todayKey = today()

  // ── Daily ──
  const dailyData = () => {
    const days: Record<string, { sold: Account[]; disq: Account[]; added: Account[] }> = {}
    for (let i = 0; i < 14; i++) {
      const key = venezuelaDaysAgo(i)
      days[key] = { sold: [], disq: [], added: [] }
    }
    accounts.forEach(a => {
      const created = toVenezuelaKey(a.createdAt)
      if (created && days[created]) days[created].added.push(a)
      if (a.status === "sold" && a.soldDate) { const k = toVenezuelaKey(a.soldDate); if (k && days[k]) days[k].sold.push(a) }
      if (a.status === "disqualified" && a.disqualifiedDate) { const k = toVenezuelaKey(a.disqualifiedDate); if (k && days[k]) days[k].disq.push(a) }
    })
    return Object.entries(days).map(([date, d]) => {
      const profit = d.sold.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
      const loss = d.disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
      return { date, ...d, profit, loss, net: profit - loss }
    })
  }

  // ── Monthly ──
  const monthlyData = () => {
    const startKey = venezuelaDaysAgo(30)
    const sold = accounts.filter(a => a.status === "sold" && isOnOrAfter(a.soldDate, startKey))
    const disq = accounts.filter(a => a.status === "disqualified" && isOnOrAfter(a.disqualifiedDate, startKey))
    const added = accounts.filter(a => isOnOrAfter(a.createdAt, startKey))
    const revenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0)
    const profit = sold.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
    const loss = disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const invested = added.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    // Top buyer
    const buyers: Record<string, number> = {}
    sold.forEach(a => { if (a.buyer) buyers[a.buyer] = (buyers[a.buyer] || 0) + 1 })
    const topBuyer = Object.entries(buyers).sort((a, b) => b[1] - a[1])[0]
    return { sold: sold.length, disq: disq.length, added: added.length, revenue, profit, loss, invested, net: profit - loss, topBuyer, avgProfit: sold.length ? profit / sold.length : 0 }
  }

  // ── Quarterly ──
  const quarterlyData = () => {
    const startKey = venezuelaDaysAgo(90)
    const sold = accounts.filter(a => a.status === "sold" && isOnOrAfter(a.soldDate, startKey))
    const disq = accounts.filter(a => a.status === "disqualified" && isOnOrAfter(a.disqualifiedDate, startKey))
    const revenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0)
    const profit = sold.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
    const loss = disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    return { sold: sold.length, disq: disq.length, revenue, profit, loss, net: profit - loss }
  }

  const daily = dailyData()
  const monthly = monthlyData()
  const quarterly = quarterlyData()
  const maxProfit = Math.max(...daily.map(d => Math.abs(d.net)), 1)

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <h1 className="text-2xl font-bold">Reportes</h1>

      {/* Tab Selector */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all", tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {/* ═══ DAILY ═══ */}
      {tab === "Diario" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Neto 14d" value={formatCurrency(daily.reduce((s, d) => s + d.net, 0))} highlight />
            <MiniStat label="Vendidas" value={daily.reduce((s, d) => s + d.sold.length, 0).toString()} />
            <MiniStat label="Descalif." value={daily.reduce((s, d) => s + d.disq.length, 0).toString()} />
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold">Ganancia neta por día</h3>
            <div className="flex h-32 items-end justify-between gap-1">
              {daily.slice(0, 7).reverse().map((d, i) => {
                const h = Math.max((Math.abs(d.net) / maxProfit) * 100, 5)
                const dayName = new Date(d.date + "T12:00:00").toLocaleDateString("es", { weekday: "short", timeZone: "America/Caracas" })
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className={cn("text-[9px] font-medium", d.net > 0 ? "text-primary" : d.net < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {d.net > 0 ? `+$${d.net.toFixed(0)}` : d.net < 0 ? `-$${Math.abs(d.net).toFixed(0)}` : "—"}
                    </span>
                    <div className={cn("w-full rounded-t-md transition-all", d.net > 0 ? "bg-primary" : d.net < 0 ? "bg-destructive" : "bg-muted")} style={{ height: `${h}%`, minHeight: 4 }} />
                    <span className="text-[9px] text-muted-foreground">{dayName}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day list */}
          <div className="flex flex-col gap-2">
            {daily.map((d, i) => {
              const dayStr = new Date(d.date + "T12:00:00").toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "short", timeZone: "America/Caracas" })
              const isToday = d.date === todayKey
              return (
                <div key={i} className={cn("flex items-center justify-between rounded-xl border bg-card p-4", isToday ? "border-primary/30 bg-primary/5" : "border-border")}>
                  <div>
                    <p className="text-sm font-medium capitalize">{dayStr}</p>
                    <p className="text-[10px] text-muted-foreground">{d.sold.length}v · {d.disq.length}d · {d.added.length}a</p>
                    {d.sold.map((s, j) => (
                      <p key={j} className="text-[10px] text-muted-foreground">@{s.username}{s.buyer ? ` → ${s.buyer}` : ""}</p>
                    ))}
                  </div>
                  <p className={cn("text-lg font-bold", d.net > 0 ? "text-primary" : d.net < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {d.net > 0 ? `+${formatCurrency(d.net)}` : d.net < 0 ? formatCurrency(d.net) : "—"}
                  </p>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ═══ MONTHLY ═══ */}
      {tab === "Mensual" && (
        <>
          <div className="rounded-2xl border border-primary/20 bg-card p-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ganancia Neta — 30 días</p>
            <p className={cn("mt-2 text-3xl font-bold", monthly.net >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(monthly.net)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <Stat label="Ingresos brutos" value={formatCurrency(monthly.revenue)} />
            <Stat label="Ganancias" value={formatCurrency(monthly.profit)} color="text-primary" />
            <Stat label="Pérdidas" value={formatCurrency(monthly.loss)} color="text-destructive" />
            <Stat label="Invertido" value={formatCurrency(monthly.invested)} />
            <Stat label="Vendidas" value={monthly.sold.toString()} />
            <Stat label="Descalificadas" value={monthly.disq.toString()} />
            <Stat label="Agregadas" value={monthly.added.toString()} />
            <Stat label="Promedio/cuenta" value={formatCurrency(monthly.avgProfit)} color="text-primary" />
            {monthly.topBuyer && <Stat label="Top comprador" value={`${monthly.topBuyer[0]} (${monthly.topBuyer[1]})`} color="text-accent" />}
          </div>
        </>
      )}

      {/* ═══ QUARTERLY ═══ */}
      {tab === "Trimestral" && (
        <>
          <div className="rounded-2xl border border-primary/20 bg-card p-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ganancia Neta — 90 días</p>
            <p className={cn("mt-2 text-3xl font-bold", quarterly.net >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(quarterly.net)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <Stat label="Ingresos brutos" value={formatCurrency(quarterly.revenue)} />
            <Stat label="Ganancias" value={formatCurrency(quarterly.profit)} color="text-primary" />
            <Stat label="Pérdidas" value={formatCurrency(quarterly.loss)} color="text-destructive" />
            <Stat label="Vendidas" value={quarterly.sold.toString()} />
            <Stat label="Descalificadas" value={quarterly.disq.toString()} />
          </div>
        </>
      )}
    </div>
  )
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-3 text-center", highlight ? "border-primary/30" : "border-border")}>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", highlight ? "text-primary" : "")}>{value}</p>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold", color)}>{value}</span>
    </div>
  )
}

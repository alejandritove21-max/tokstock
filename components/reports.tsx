"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, today, toVenezuelaKey, venezuelaDaysAgo, isOnOrAfter, type Account } from "@/lib/store"

export function Reports() {
  const { accounts } = useStore()
  const [tab, setTab] = useState<string>("30 días")
  const todayKey = today()

  // ── Helpers ──
  const soldInRange = (days: number) => {
    const start = venezuelaDaysAgo(days)
    return accounts.filter(a => a.status === "sold" && isOnOrAfter(a.soldDate, start))
  }
  const disqInRange = (days: number) => {
    const start = venezuelaDaysAgo(days)
    return accounts.filter(a => a.status === "disqualified" && isOnOrAfter(a.disqualifiedDate, start))
  }
  const addedInRange = (days: number) => {
    const start = venezuelaDaysAgo(days)
    return accounts.filter(a => isOnOrAfter(a.createdAt, start))
  }

  const calcMetrics = (sold: Account[], disq: Account[], added: Account[]) => {
    const revenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0)
    const cost = sold.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const profit = revenue - cost
    const loss = disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const invested = added.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const buyers: Record<string, number> = {}
    sold.forEach(a => { if (a.buyer) buyers[a.buyer] = (buyers[a.buyer] || 0) + 1 })
    const topBuyer = Object.entries(buyers).sort((a, b) => b[1] - a[1])[0]
    const avgProfit = sold.length ? profit / sold.length : 0
    const roi = cost > 0 ? ((profit / cost) * 100).toFixed(0) : "0"
    return { revenue, profit, loss, invested, net: profit - loss, topBuyer, avgProfit, roi, cost }
  }

  // ── 30 days data ──
  const sold30 = soldInRange(30)
  const disq30 = disqInRange(30)
  const added30 = addedInRange(30)
  const m30 = calcMetrics(sold30, disq30, added30)

  // ── Previous 30 days (for comparison) ──
  const prev30Start = venezuelaDaysAgo(60)
  const prev30End = venezuelaDaysAgo(30)
  const soldPrev = accounts.filter(a => a.status === "sold" && isOnOrAfter(a.soldDate, prev30Start) && !isOnOrAfter(a.soldDate, prev30End))
  const profitPrev = soldPrev.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)

  // ── Daily breakdown (last 14 days) ──
  const dailyData = () => {
    const days: { date: string; sold: Account[]; disq: Account[]; added: Account[] }[] = []
    for (let i = 0; i < 14; i++) {
      const key = venezuelaDaysAgo(i)
      days.push({ date: key, sold: [], disq: [], added: [] })
    }
    accounts.forEach(a => {
      const created = toVenezuelaKey(a.createdAt)
      if (created) { const d = days.find(d => d.date === created); if (d) d.added.push(a) }
      if (a.status === "sold" && a.soldDate) { const k = toVenezuelaKey(a.soldDate); const d = days.find(d => d.date === k); if (d) d.sold.push(a) }
      if (a.status === "disqualified" && a.disqualifiedDate) { const k = toVenezuelaKey(a.disqualifiedDate); const d = days.find(d => d.date === k); if (d) d.disq.push(a) }
    })
    return days.map(d => {
      const profit = d.sold.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
      const loss = d.disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
      return { ...d, profit, loss, net: profit - loss }
    })
  }

  // ── All time ──
  const allSold = accounts.filter(a => a.status === "sold")
  const allDisq = accounts.filter(a => a.status === "disqualified")
  const allAvail = accounts.filter(a => a.status === "available")
  const mAll = calcMetrics(allSold, allDisq, accounts)
  const investedAvail = allAvail.reduce((s, a) => s + (a.purchasePrice || 0), 0)
  const estimatedAvail = allAvail.reduce((s, a) => s + (a.estimatedSalePrice || 0), 0)

  const daily = dailyData()
  const maxNet = Math.max(...daily.map(d => Math.abs(d.net)), 1)

  // ── Avg days to sell ──
  const avgDaysToSell = () => {
    const sold = allSold.filter(a => a.soldDate && a.createdAt)
    if (sold.length === 0) return 0
    const total = sold.reduce((s, a) => {
      const created = new Date(a.createdAt).getTime()
      const soldAt = new Date(a.soldDate! + "T12:00:00").getTime()
      return s + Math.max(0, (soldAt - created) / 86400000)
    }, 0)
    return Math.round(total / sold.length)
  }

  const profitChange = m30.profit - profitPrev
  const profitChangePercent = profitPrev > 0 ? Math.round(((m30.profit - profitPrev) / profitPrev) * 100) : 0

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <h1 className="text-2xl font-bold">Reportes</h1>

      {/* Tab Selector */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        {["30 días", "Diario", "Total"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all", tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {/* ═══ 30 DÍAS ═══ */}
      {tab === "30 días" && (
        <>
          {/* Main metric */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ganancia Neta — Últimos 30 Días</p>
            <p className={cn("mt-2 text-4xl font-bold", m30.net >= 0 ? "text-primary" : "text-destructive")}>{m30.net >= 0 ? "+" : ""}{formatCurrency(m30.net)}</p>
            {profitPrev !== 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                vs 30 días anteriores: <span className={profitChange >= 0 ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                  {profitChange >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(profitChange))} ({profitChangePercent > 0 ? "+" : ""}{profitChangePercent}%)
                </span>
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2">
            <MiniCard label="Vendidas" value={sold30.length.toString()} />
            <MiniCard label="Descalif." value={disq30.length.toString()} />
            <MiniCard label="Agregadas" value={added30.length.toString()} />
            <MiniCard label="ROI" value={`${m30.roi}%`} highlight />
          </div>

          {/* Detailed breakdown */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-0">
            <Row label="Ingresos brutos" value={formatCurrency(m30.revenue)} />
            <Row label="Costo de compra" value={formatCurrency(m30.cost)} />
            <Row label="Ganancia en ventas" value={formatCurrency(m30.profit)} color="text-primary" />
            <Row label="Pérdidas (descalif.)" value={`-${formatCurrency(m30.loss)}`} color="text-destructive" />
            <Row label="Neto (ganancia - pérdida)" value={formatCurrency(m30.net)} color={m30.net >= 0 ? "text-primary" : "text-destructive"} bold />
            <Row label="Invertido en compras" value={formatCurrency(m30.invested)} />
            <Row label="Promedio ganancia/cuenta" value={formatCurrency(m30.avgProfit)} />
            {m30.topBuyer && <Row label="Top comprador" value={`${m30.topBuyer[0]} (${m30.topBuyer[1]})`} />}
          </div>

          {/* Recent sales */}
          {sold30.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Últimas ventas</h3>
              {sold30.slice(0, 10).map((a, i) => {
                const profit = (a.realSalePrice || 0) - (a.purchasePrice || 0)
                return (
                  <div key={i} className="flex items-center justify-between border-b border-border/30 py-2 last:border-0">
                    <div>
                      <p className="text-xs font-medium">@{a.username}</p>
                      <p className="text-[10px] text-muted-foreground">{a.buyer || "?"} · {a.soldDate || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{formatCurrency(a.realSalePrice)}</p>
                      <p className={cn("text-[10px] font-medium", profit >= 0 ? "text-primary" : "text-destructive")}>
                        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ DIARIO ═══ */}
      {tab === "Diario" && (
        <>
          {/* Chart */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold">Ganancia neta — 7 días</h3>
            <div className="flex h-32 items-end justify-between gap-1">
              {daily.slice(0, 7).reverse().map((d, i) => {
                const h = Math.max((Math.abs(d.net) / maxNet) * 100, 5)
                const dayName = new Date(d.date + "T12:00:00").toLocaleDateString("es", { weekday: "short", timeZone: "America/Caracas" })
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className={cn("text-[9px] font-medium", d.net > 0 ? "text-primary" : d.net < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {d.net !== 0 ? `${d.net > 0 ? "+" : ""}$${Math.abs(d.net).toFixed(0)}` : "—"}
                    </span>
                    <div className={cn("w-full rounded-t-md", d.net > 0 ? "bg-primary" : d.net < 0 ? "bg-destructive" : "bg-muted")} style={{ height: `${h}%`, minHeight: 4 }} />
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
              const hasActivity = d.sold.length > 0 || d.disq.length > 0 || d.added.length > 0
              if (!hasActivity && i > 3) return null
              return (
                <div key={i} className={cn("rounded-xl border bg-card p-4", isToday ? "border-primary/30 bg-primary/5" : "border-border")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{dayStr}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.sold.length > 0 && `${d.sold.length} vendida(s) `}
                        {d.disq.length > 0 && `${d.disq.length} descalif. `}
                        {d.added.length > 0 && `${d.added.length} agregada(s)`}
                        {!hasActivity && "Sin actividad"}
                      </p>
                    </div>
                    <p className={cn("text-lg font-bold", d.net > 0 ? "text-primary" : d.net < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {d.net !== 0 ? `${d.net > 0 ? "+" : ""}${formatCurrency(d.net)}` : "—"}
                    </p>
                  </div>
                  {d.sold.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {d.sold.map((s, j) => (
                        <p key={j} className="text-[10px] text-muted-foreground">
                          @{s.username} → {s.buyer || "?"} · {formatCurrency(s.realSalePrice)} (<span className="text-primary">+{formatCurrency((s.realSalePrice || 0) - (s.purchasePrice || 0))}</span>)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ═══ TOTAL ═══ */}
      {tab === "Total" && (
        <>
          {/* Main metric */}
          <div className="rounded-2xl border border-primary/20 bg-card p-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ganancia Total Histórica</p>
            <p className={cn("mt-2 text-4xl font-bold", mAll.net >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(mAll.net)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniCard label="Vendidas" value={allSold.length.toString()} />
            <MiniCard label="Descalif." value={allDisq.length.toString()} />
            <MiniCard label="Disponibles" value={allAvail.length.toString()} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MiniCard label="Invertido disp." value={formatCurrency(investedAvail)} />
            <MiniCard label="Valor estimado" value={formatCurrency(estimatedAvail)} highlight />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-0">
            <Row label="Total cuentas" value={accounts.length.toString()} />
            <Row label="Total invertido" value={formatCurrency(mAll.invested)} />
            <Row label="Total ingresos" value={formatCurrency(mAll.revenue)} />
            <Row label="Ganancia en ventas" value={formatCurrency(mAll.profit)} color="text-primary" />
            <Row label="Pérdidas totales" value={`-${formatCurrency(mAll.loss)}`} color="text-destructive" />
            <Row label="Neto histórico" value={formatCurrency(mAll.net)} color={mAll.net >= 0 ? "text-primary" : "text-destructive"} bold />
            <Row label="ROI total" value={`${mAll.roi}%`} />
            <Row label="Promedio/cuenta" value={formatCurrency(mAll.avgProfit)} />
            <Row label="Días promedio para vender" value={`${avgDaysToSell()} días`} />
            <Row label="Ganancia potencial" value={formatCurrency(estimatedAvail - investedAvail)} color="text-primary" />
            {mAll.topBuyer && <Row label="Top comprador" value={`${mAll.topBuyer[0]} (${mAll.topBuyer[1]})`} />}
          </div>
        </>
      )}
    </div>
  )
}

function MiniCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-3 text-center", highlight ? "border-primary/20 bg-primary/5" : "border-border")}>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", highlight ? "text-primary" : "")}>{value}</p>
    </div>
  )
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/30 py-2.5 last:border-0">
      <span className={cn("text-xs", bold ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs font-semibold", color)}>{value}</span>
    </div>
  )
}

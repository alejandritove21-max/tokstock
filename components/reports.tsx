"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, formatFollowers, today, toVenezuelaKey, venezuelaDaysAgo, isOnOrAfter, type Account } from "@/lib/store"
import { Clock, TrendingUp, TrendingDown, Calendar } from "lucide-react"

export function Reports() {
  const { accounts } = useStore()
  const [tab, setTab] = useState<string>("30 días")
  const todayKey = today()

  // ── 30 day cycle countdown ──
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfCycle = new Date(firstOfMonth.getTime() + 30 * 86400000)
  const daysLeft = Math.max(0, Math.ceil((endOfCycle.getTime() - now.getTime()) / 86400000))
  const daysPassed = 30 - daysLeft
  const cycleProgress = (daysPassed / 30) * 100

  // ── Helpers ──
  const soldInRange = (start: string) => accounts.filter(a => a.status === "sold" && isOnOrAfter(a.soldDate, start))
  const disqInRange = (start: string) => accounts.filter(a => a.status === "disqualified" && isOnOrAfter(a.disqualifiedDate, start))
  const addedInRange = (start: string) => accounts.filter(a => isOnOrAfter(a.createdAt, start))

  const calcMetrics = (sold: Account[], disq: Account[], added: Account[]) => {
    const revenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0)
    const cost = sold.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const profit = revenue - cost
    const loss = disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const invested = added.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const buyers: Record<string, number> = {}
    sold.forEach(a => { if (a.buyer) buyers[a.buyer] = (buyers[a.buyer] || 0) + 1 })
    const topBuyers = Object.entries(buyers).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const avgProfit = sold.length ? profit / sold.length : 0
    const roi = cost > 0 ? ((profit / cost) * 100).toFixed(0) : "0"
    // Best and worst sale
    const bestSale = sold.length > 0 ? sold.reduce((best, a) => ((a.realSalePrice || 0) - (a.purchasePrice || 0)) > ((best.realSalePrice || 0) - (best.purchasePrice || 0)) ? a : best) : null
    const worstSale = sold.length > 0 ? sold.reduce((worst, a) => ((a.realSalePrice || 0) - (a.purchasePrice || 0)) < ((worst.realSalePrice || 0) - (worst.purchasePrice || 0)) ? a : worst) : null
    return { revenue, profit, loss, invested, net: profit - loss, topBuyers, avgProfit, roi, cost, bestSale, worstSale }
  }

  // ── Data for tabs ──
  const start30 = venezuelaDaysAgo(30)
  const sold30 = soldInRange(start30)
  const disq30 = disqInRange(start30)
  const added30 = addedInRange(start30)
  const m30 = calcMetrics(sold30, disq30, added30)

  // Previous 30 days comparison
  const start60 = venezuelaDaysAgo(60)
  const soldPrev = accounts.filter(a => a.status === "sold" && isOnOrAfter(a.soldDate, start60) && !isOnOrAfter(a.soldDate, start30))
  const profitPrev = soldPrev.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
  const profitChange = m30.profit - profitPrev

  // ── Daily (14 days) ──
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
      const revenue = d.sold.reduce((s, a) => s + (a.realSalePrice || 0), 0)
      const loss = d.disq.reduce((s, a) => s + (a.purchasePrice || 0), 0)
      const invested = d.added.reduce((s, a) => s + (a.purchasePrice || 0), 0)
      return { ...d, profit, revenue, loss, invested, net: profit - loss }
    })
  }

  // ── All time ──
  const allSold = accounts.filter(a => a.status === "sold")
  const allDisq = accounts.filter(a => a.status === "disqualified")
  const allAvail = accounts.filter(a => a.status === "available")
  const mAll = calcMetrics(allSold, allDisq, accounts)
  const investedAvail = allAvail.reduce((s, a) => s + (a.purchasePrice || 0), 0)
  const estimatedAvail = allAvail.reduce((s, a) => s + (a.estimatedSalePrice || 0), 0)

  const avgDaysToSell = () => {
    const s = allSold.filter(a => a.soldDate && a.createdAt)
    if (!s.length) return 0
    return Math.round(s.reduce((sum, a) => sum + Math.max(0, (new Date(a.soldDate! + "T12:00:00").getTime() - new Date(a.createdAt).getTime()) / 86400000), 0) / s.length)
  }

  const daily = dailyData()
  const maxNet = Math.max(...daily.map(d => Math.abs(d.net)), 1)

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
          {/* Countdown + main metric */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ciclo Actual — Últimos 30 Días</p>
              <div className="flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold">{daysLeft} días restantes</span>
              </div>
            </div>
            <p className={cn("text-4xl font-bold", m30.net >= 0 ? "text-primary" : "text-destructive")}>
              {m30.net >= 0 ? "+" : ""}{formatCurrency(m30.net)}
            </p>
            {profitPrev !== 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                vs anterior: <span className={cn("font-semibold", profitChange >= 0 ? "text-primary" : "text-destructive")}>
                  {profitChange >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(profitChange))}
                </span>
              </p>
            )}
            {/* Progress bar */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary/50">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${cycleProgress}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
              <span>Día {daysPassed} de 30</span>
              <span>{daysLeft === 0 ? "¡Ciclo completado!" : `${daysLeft}d para reinicio`}</span>
            </div>
          </div>

          {/* Quick metrics */}
          <div className="grid grid-cols-4 gap-2">
            <MiniCard label="Vendidas" value={sold30.length.toString()} />
            <MiniCard label="Descalif." value={disq30.length.toString()} />
            <MiniCard label="Agregadas" value={added30.length.toString()} />
            <MiniCard label="ROI" value={`${m30.roi}%`} highlight />
          </div>

          {/* Financial breakdown */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Desglose Financiero</h3>
            <Row label="Ingresos por ventas" value={formatCurrency(m30.revenue)} />
            <Row label="Costo de las vendidas" value={`-${formatCurrency(m30.cost)}`} />
            <Row label="Ganancia bruta" value={formatCurrency(m30.profit)} color="text-primary" bold />
            <Row label="Pérdidas por descalificación" value={`-${formatCurrency(m30.loss)}`} color="text-destructive" />
            <Row label="GANANCIA NETA" value={formatCurrency(m30.net)} color={m30.net >= 0 ? "text-primary" : "text-destructive"} bold />
            <div className="my-2 border-t border-border/50" />
            <Row label="Invertido en compras" value={formatCurrency(m30.invested)} />
            <Row label="Promedio ganancia/cuenta" value={formatCurrency(m30.avgProfit)} />
            <Row label="Promedio/día" value={formatCurrency(daysPassed > 0 ? m30.net / daysPassed : 0)} />
          </div>

          {/* Best/Worst sale */}
          {(m30.bestSale || m30.worstSale) && (
            <div className="grid grid-cols-2 gap-2">
              {m30.bestSale && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[9px] font-semibold uppercase text-muted-foreground">Mejor Venta</p>
                  <p className="mt-1 text-xs font-bold">@{m30.bestSale.username}</p>
                  <p className="text-sm font-bold text-primary">+{formatCurrency((m30.bestSale.realSalePrice || 0) - (m30.bestSale.purchasePrice || 0))}</p>
                </div>
              )}
              {m30.worstSale && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-[9px] font-semibold uppercase text-muted-foreground">Peor Venta</p>
                  <p className="mt-1 text-xs font-bold">@{m30.worstSale.username}</p>
                  <p className="text-sm font-bold text-destructive">{formatCurrency((m30.worstSale.realSalePrice || 0) - (m30.worstSale.purchasePrice || 0))}</p>
                </div>
              )}
            </div>
          )}

          {/* Top buyers */}
          {m30.topBuyers.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Top Compradores</h3>
              {m30.topBuyers.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between border-b border-border/30 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">{i + 1}</span>
                    <span className="text-xs font-medium">{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{count} compra(s)</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent sales */}
          {sold30.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ventas del Período</h3>
              {sold30.map((a, i) => {
                const p = (a.realSalePrice || 0) - (a.purchasePrice || 0)
                return (
                  <div key={i} className="flex items-center justify-between border-b border-border/30 py-2.5 last:border-0">
                    <div>
                      <p className="text-xs font-medium">@{a.username}</p>
                      <p className="text-[10px] text-muted-foreground">{a.buyer || "?"} · {a.soldDate || "—"} · {a.country || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{formatCurrency(a.realSalePrice)}</p>
                      <p className={cn("text-[10px] font-semibold", p >= 0 ? "text-primary" : "text-destructive")}>{p >= 0 ? "+" : ""}{formatCurrency(p)}</p>
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

          {/* Detailed day cards */}
          <div className="flex flex-col gap-3">
            {daily.map((d, i) => {
              const dayStr = new Date(d.date + "T12:00:00").toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Caracas" })
              const isToday = d.date === todayKey
              const hasActivity = d.sold.length > 0 || d.disq.length > 0 || d.added.length > 0

              return (
                <div key={i} className={cn("rounded-2xl border bg-card overflow-hidden", isToday ? "border-primary/30" : "border-border")}>
                  {/* Day header */}
                  <div className={cn("flex items-center justify-between px-4 py-3", isToday ? "bg-primary/5" : "bg-secondary/30")}>
                    <div>
                      <p className="text-sm font-semibold capitalize">{dayStr}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.sold.length > 0 && `${d.sold.length} venta(s) `}
                        {d.disq.length > 0 && `· ${d.disq.length} descalif. `}
                        {d.added.length > 0 && `· ${d.added.length} agregada(s)`}
                        {!hasActivity && "Sin actividad"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", d.net > 0 ? "text-primary" : d.net < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {d.net !== 0 ? `${d.net > 0 ? "+" : ""}${formatCurrency(d.net)}` : "$0"}
                      </p>
                      {d.revenue > 0 && <p className="text-[10px] text-muted-foreground">Ingresos: {formatCurrency(d.revenue)}</p>}
                    </div>
                  </div>

                  {/* Day details */}
                  {hasActivity && (
                    <div className="px-4 py-2">
                      {/* Sales */}
                      {d.sold.map((s, j) => {
                        const p = (s.realSalePrice || 0) - (s.purchasePrice || 0)
                        return (
                          <div key={`s${j}`} className="flex items-center gap-2 border-b border-border/20 py-2 last:border-0">
                            <span className="text-sm">💰</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">@{s.username}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Vendida a {s.buyer || "?"} · {formatFollowers(s.followers)} seg · {s.country || "—"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-semibold">{formatCurrency(s.realSalePrice)}</p>
                              <p className={cn("text-[10px] font-semibold", p >= 0 ? "text-primary" : "text-destructive")}>{p >= 0 ? "+" : ""}{formatCurrency(p)}</p>
                            </div>
                          </div>
                        )
                      })}
                      {/* Disqualified */}
                      {d.disq.map((q, j) => (
                        <div key={`d${j}`} className="flex items-center gap-2 border-b border-border/20 py-2 last:border-0">
                          <span className="text-sm">❌</span>
                          <div className="flex-1">
                            <p className="text-xs font-medium">@{q.username}</p>
                            <p className="text-[10px] text-muted-foreground">Descalificada · {q.country || "—"}</p>
                          </div>
                          <p className="text-xs font-semibold text-destructive">-{formatCurrency(q.purchasePrice)}</p>
                        </div>
                      ))}
                      {/* Added */}
                      {d.added.map((a, j) => (
                        <div key={`a${j}`} className="flex items-center gap-2 border-b border-border/20 py-2 last:border-0">
                          <span className="text-sm">📦</span>
                          <div className="flex-1">
                            <p className="text-xs font-medium">@{a.username}</p>
                            <p className="text-[10px] text-muted-foreground">{formatFollowers(a.followers)} seg · {a.country || "—"} · {a.niche || "—"}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatCurrency(a.purchasePrice)}</p>
                        </div>
                      ))}
                      {/* Day summary row */}
                      {(d.sold.length > 0 || d.disq.length > 0) && (
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30">
                          <span className="text-[10px] font-semibold text-muted-foreground">Balance del día</span>
                          <span className={cn("text-xs font-bold", d.net >= 0 ? "text-primary" : "text-destructive")}>{d.net >= 0 ? "+" : ""}{formatCurrency(d.net)}</span>
                        </div>
                      )}
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
          <div className="rounded-2xl border border-primary/20 bg-card p-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ganancia Histórica Total</p>
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

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Desglose Total</h3>
            <Row label="Total cuentas procesadas" value={accounts.length.toString()} />
            <Row label="Total invertido" value={formatCurrency(mAll.invested)} />
            <Row label="Total ingresos" value={formatCurrency(mAll.revenue)} />
            <Row label="Ganancia en ventas" value={formatCurrency(mAll.profit)} color="text-primary" />
            <Row label="Pérdidas totales" value={`-${formatCurrency(mAll.loss)}`} color="text-destructive" />
            <Row label="NETO HISTÓRICO" value={formatCurrency(mAll.net)} color={mAll.net >= 0 ? "text-primary" : "text-destructive"} bold />
            <div className="my-2 border-t border-border/50" />
            <Row label="ROI total" value={`${mAll.roi}%`} />
            <Row label="Promedio por cuenta" value={formatCurrency(mAll.avgProfit)} />
            <Row label="Días promedio para vender" value={`${avgDaysToSell()} días`} />
            <Row label="Ganancia potencial (disp.)" value={formatCurrency(estimatedAvail - investedAvail)} color="text-primary" />
          </div>

          {mAll.bestSale && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[9px] font-semibold uppercase text-muted-foreground">Mejor Venta</p>
                <p className="mt-1 text-xs font-bold">@{mAll.bestSale.username}</p>
                <p className="text-sm font-bold text-primary">+{formatCurrency((mAll.bestSale.realSalePrice || 0) - (mAll.bestSale.purchasePrice || 0))}</p>
              </div>
              {mAll.worstSale && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-[9px] font-semibold uppercase text-muted-foreground">Peor Venta</p>
                  <p className="mt-1 text-xs font-bold">@{mAll.worstSale.username}</p>
                  <p className="text-sm font-bold text-destructive">{formatCurrency((mAll.worstSale.realSalePrice || 0) - (mAll.worstSale.purchasePrice || 0))}</p>
                </div>
              )}
            </div>
          )}

          {mAll.topBuyers.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Top Compradores Históricos</h3>
              {mAll.topBuyers.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between border-b border-border/30 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold", i === 0 ? "bg-yellow-500/20 text-yellow-500" : "bg-secondary")}>{i + 1}</span>
                    <span className="text-xs font-medium">{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{count} compra(s)</span>
                </div>
              ))}
            </div>
          )}
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

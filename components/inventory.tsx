"use client"

import { useState, useMemo } from "react"
import { Search, CheckSquare, X, DollarSign, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, today, formatCurrency, formatFollowers, type Account } from "@/lib/store"
import { AccountCard } from "./account-card"

const statusFilters = ["Todas", "Disponibles", "Vendidas", "Descalif."] as const

export function Inventory() {
  const { accounts, categories, notify, updateAccount, whatsappTemplate } = useStore()
  const [search, setSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState<string>("Todas")
  const [activeCats, setActiveCats] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<any[]>([])
  const [batchSell, setBatchSell] = useState(false)
  const [batchBuyer, setBatchBuyer] = useState("")
  const [batchTotalPrice, setBatchTotalPrice] = useState("")
  const [batchPrices, setBatchPrices] = useState<Record<string, string>>({})

  const statusMap: Record<string, string> = {
    Disponibles: "available",
    Vendidas: "sold",
    "Descalif.": "disqualified",
  }

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.username?.toLowerCase().includes(q) || a.profileName?.toLowerCase().includes(q) || a.country?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.niche?.toLowerCase().includes(q) || (a.categories || []).some(c => c.toLowerCase().includes(q))
    const matchStatus = activeStatus === "Todas" || a.status === statusMap[activeStatus]
    const matchCat = activeCats.length === 0 || (a.categories || []).some(c => activeCats.includes(c))
    return matchSearch && matchStatus && matchCat
  })

  const statusCounts: Record<string, number> = {
    Todas: accounts.length,
    Disponibles: accounts.filter(a => a.status === "available").length,
    Vendidas: accounts.filter(a => a.status === "sold").length,
    "Descalif.": accounts.filter(a => a.status === "disqualified").length,
  }

  const toggleCat = (cat: string) => {
    setActiveCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const toggleSelect = (id: any) => {
    const strId = String(id)
    setSelected(prev => prev.map(String).includes(strId) ? prev.filter((x: any) => String(x) !== strId) : [...prev, id])
  }

  const copyLinks = async () => {
    const links = filtered.filter(a => selected.map(String).includes(String(a.id)) && a.profileLink).map(a => a.profileLink).join("\n")
    try { await navigator.clipboard.writeText(links); notify(`${selected.length} links copiados`) } catch {}
  }

  // Selected accounts for batch sell
  const selectedAccounts = useMemo(() => {
    return accounts.filter(a => selected.map(String).includes(String(a.id)) && a.status === "available")
  }, [accounts, selected])

  const totalPurchaseCost = useMemo(() => {
    return selectedAccounts.reduce((sum, a) => sum + (a.purchasePrice || 0), 0)
  }, [selectedAccounts])

  // When total price changes, distribute evenly
  const onTotalPriceChange = (val: string) => {
    setBatchTotalPrice(val)
    const total = Number(val)
    if (total > 0 && selectedAccounts.length > 0) {
      const perAccount = Math.round((total / selectedAccounts.length) * 100) / 100
      const newPrices: Record<string, string> = {}
      selectedAccounts.forEach(a => { newPrices[String(a.id)] = perAccount.toString() })
      setBatchPrices(newPrices)
    }
  }

  // Open batch sell modal
  const openBatchSell = () => {
    // Initialize per-account prices with estimated sale price
    const prices: Record<string, string> = {}
    selectedAccounts.forEach(a => {
      prices[String(a.id)] = (a.estimatedSalePrice || a.purchasePrice || 0).toString()
    })
    setBatchPrices(prices)
    setBatchTotalPrice(selectedAccounts.reduce((sum, a) => sum + (a.estimatedSalePrice || a.purchasePrice || 0), 0).toString())
    setBatchBuyer("")
    setBatchSell(true)
  }

  // Calculate current total from individual prices
  const currentTotal = useMemo(() => {
    return Object.values(batchPrices).reduce((sum, p) => sum + (Number(p) || 0), 0)
  }, [batchPrices])

  const totalProfit = currentTotal - totalPurchaseCost

  // Execute batch sell
  const executeBatchSell = async () => {
    if (!batchBuyer.trim()) { notify("Ingresa el comprador", "error"); return }
    if (currentTotal <= 0) { notify("Ingresa los precios", "error"); return }

    const todayStr = today()
    let credsList = ""
    let count = 0

    for (const acc of selectedAccounts) {
      const price = Number(batchPrices[String(acc.id)] || 0)
      const profit = price - acc.purchasePrice
      await updateAccount(acc.id, {
        ...acc,
        status: "sold",
        realSalePrice: price,
        profit,
        soldDate: todayStr,
        buyer: batchBuyer.trim(),
      })
      credsList += `👤 @${acc.username}\n📧 Email: ${acc.email}\n🔑 Pass TikTok: ${acc.tiktokPassword}\n🔑 Pass Email: ${acc.emailPasswordSame ? acc.tiktokPassword : acc.emailPassword}\n💵 Precio: ${formatCurrency(price)}\n\n`
      count++
    }

    // Add summary at the end
    credsList += `━━━━━━━━━━━━━━━━━━\n📊 RESUMEN COMBO\n🔢 Cuentas: ${count}\n💰 Total: ${formatCurrency(currentTotal)}\n📈 Ganancia: ${formatCurrency(totalProfit)}\n👤 Comprador: ${batchBuyer.trim()}\n━━━━━━━━━━━━━━━━━━`

    try { await navigator.clipboard.writeText(credsList) } catch {}
    notify(`${count} cuentas vendidas por ${formatCurrency(currentTotal)} · Datos copiados`)

    // Open WhatsApp with credentials
    const waMsg = credsList
    window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`, "_blank")

    setBatchSell(false)
    setSelected([])
    setSelectionMode(false)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <button
          onClick={() => { setSelectionMode(!selectionMode); setSelected([]) }}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            selectionMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectionMode ? `${selected.length} sel.` : "Seleccionar"}
        </button>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por usuario, email, país..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all",
              activeStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            {s} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCat(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-all",
              activeCats.includes(cat) ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Selection Actions */}
      {selectionMode && selected.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={copyLinks} className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-medium text-foreground">
              🔗 Links ({selected.length})
            </button>
            <button
              onClick={async () => {
                const accs = filtered.filter(a => selected.map(String).includes(String(a.id)) && a.screenshot)
                if (accs.length === 0) { notify("No hay imágenes", "error"); return }
                if (navigator.share && navigator.canShare) {
                  try {
                    const files = await Promise.all(accs.map(async a => {
                      const res = await fetch(a.screenshot)
                      const blob = await res.blob()
                      return new File([blob], `${a.username}.jpg`, { type: "image/jpeg" })
                    }))
                    if (navigator.canShare({ files })) { await navigator.share({ files }); return }
                  } catch (e: any) { if (e.name === "AbortError") return }
                }
                notify("No se pueden compartir imágenes", "error")
              }}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-medium text-foreground"
            >
              📷 Imágenes ({selected.length})
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={openBatchSell} className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-medium text-primary-foreground">
              💰 Vender ({selected.length})
            </button>
            <button
              onClick={async () => {
                const todayStr = today()
                for (const id of selected) {
                  const acc = accounts.find(a => String(a.id) === String(id))
                  if (acc && acc.status === "available") {
                    await updateAccount(acc.id, { ...acc, status: "disqualified", disqualifiedDate: todayStr })
                  }
                }
                notify(`${selected.length} cuentas descalificadas`)
                setSelected([])
                setSelectionMode(false)
              }}
              className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive"
            >
              ❌ Descalif.
            </button>
            <button onClick={() => { setSelected(filtered.filter(a => a.status === "available").map(a => a.id)) }} className="rounded-xl bg-secondary px-4 py-2.5 text-xs font-medium text-muted-foreground">
              Todas
            </button>
          </div>
        </div>
      )}

      {/* Batch Sell Modal */}
      {batchSell && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setBatchSell(false)}>
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto animate-slide-up rounded-2xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold">Vender combo ({selectedAccounts.length})</h3>
            <p className="mb-4 text-[10px] text-muted-foreground">Costo total de compra: {formatCurrency(totalPurchaseCost)}</p>

            {/* Buyer */}
            <input
              placeholder="Nombre del comprador"
              value={batchBuyer}
              onChange={e => setBatchBuyer(e.target.value)}
              className="mb-3 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            {/* Total Price */}
            <div className="mb-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Precio total del combo ($)</label>
              <input
                type="number"
                placeholder="Precio total de venta"
                value={batchTotalPrice}
                onChange={e => onTotalPriceChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-bold placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Per-account prices */}
            <div className="mb-3">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Precio por cuenta (editable)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedAccounts.map(acc => {
                  const key = String(acc.id)
                  const price = Number(batchPrices[key] || 0)
                  const accProfit = price - acc.purchasePrice
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 p-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-semibold">@{acc.username}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Compra: {formatCurrency(acc.purchasePrice)} · 
                          <span className={accProfit >= 0 ? " text-primary" : " text-destructive"}> {accProfit >= 0 ? "+" : ""}{formatCurrency(accProfit)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={batchPrices[key] || ""}
                          onChange={e => {
                            const newPrices = { ...batchPrices, [key]: e.target.value }
                            setBatchPrices(newPrices)
                            // Update total
                            const newTotal = Object.values(newPrices).reduce((s, p) => s + (Number(p) || 0), 0)
                            setBatchTotalPrice(newTotal.toString())
                          }}
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-xs font-bold focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="mb-4 rounded-xl bg-secondary p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Costo compra</span>
                <span className="font-medium">{formatCurrency(totalPurchaseCost)}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Precio venta</span>
                <span className="font-bold">{formatCurrency(currentTotal)}</span>
              </div>
              <div className="mt-1 border-t border-border/50 pt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ganancia</span>
                <span className={cn("font-bold", totalProfit >= 0 ? "text-primary" : "text-destructive")}>
                  {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setBatchSell(false)} className="flex-1 rounded-xl bg-secondary py-3 font-medium text-muted-foreground">Cancelar</button>
              <button onClick={executeBatchSell} className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground">
                Vender · {formatCurrency(currentTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div className="flex flex-col gap-2">
        {filtered.map((account) => (
          <div key={account.id} className="relative">
            {selectionMode && (
              <button
                onClick={() => toggleSelect(account.id)}
                className={cn(
                  "absolute left-2 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md border-2 transition-all",
                  selected.map(String).includes(String(account.id)) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                )}
              >
                {selected.map(String).includes(String(account.id)) && <X className="h-3 w-3" />}
              </button>
            )}
            <div className={selectionMode ? "pl-8" : ""}>
              <AccountCard account={account} />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No se encontraron cuentas</p>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Search, CheckSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, today, type Account } from "@/lib/store"
import { AccountCard } from "./account-card"

const statusFilters = ["Todas", "Disponibles", "Vendidas", "Descalif."] as const

export function Inventory() {
  const { accounts, categories, notify, updateAccount } = useStore()
  const [search, setSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState<string>("Todas")
  const [activeCats, setActiveCats] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [batchSell, setBatchSell] = useState(false)
  const [batchBuyer, setBatchBuyer] = useState("")
  const [batchPrice, setBatchPrice] = useState("")

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

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const copyLinks = async () => {
    const links = filtered.filter(a => selected.includes(a.id) && a.profileLink).map(a => a.profileLink).join("\n")
    try { await navigator.clipboard.writeText(links); notify(`${selected.length} links copiados`) } catch {}
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
              activeStatus === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
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
              activeCats.includes(cat)
                ? "bg-accent text-accent-foreground"
                : "bg-secondary/50 text-muted-foreground"
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
                // Share images
                const accs = filtered.filter(a => selected.includes(a.id) && a.screenshot)
                if (accs.length === 0) { notify("No hay imágenes para compartir", "error"); return }
                if (navigator.share && navigator.canShare) {
                  try {
                    const files = await Promise.all(accs.map(async a => {
                      const res = await fetch(a.screenshot)
                      const blob = await res.blob()
                      return new File([blob], `${a.username}.jpg`, { type: "image/jpeg" })
                    }))
                    if (navigator.canShare({ files })) {
                      await navigator.share({ files })
                      return
                    }
                  } catch (e: any) { if (e.name === "AbortError") return }
                }
                notify("No se pueden compartir imágenes en este dispositivo", "error")
              }}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-medium text-foreground"
            >
              📷 Imágenes ({selected.length})
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBatchSell(true)}
              className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-medium text-primary-foreground"
            >
              💰 Vender ({selected.length})
            </button>
            <button
              onClick={async () => {
                const todayStr = today()
                for (const id of selected) {
                  const acc = accounts.find(a => a.id === id)
                  if (acc && acc.status === "available") {
                    await updateAccount(id, { ...acc, status: "disqualified", disqualifiedDate: todayStr })
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
            <button onClick={() => { setSelected(filtered.map(a => a.id)) }} className="rounded-xl bg-secondary px-4 py-2.5 text-xs font-medium text-muted-foreground">
              Todas
            </button>
          </div>
        </div>
      )}

      {/* Batch Sell Modal */}
      {batchSell && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setBatchSell(false)}>
          <div className="w-full max-w-sm animate-slide-up rounded-2xl border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">Vender {selected.length} cuentas</h3>
            <input
              placeholder="Nombre del comprador"
              value={batchBuyer}
              onChange={e => setBatchBuyer(e.target.value)}
              className="mb-3 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              placeholder="Precio por cuenta ($)"
              value={batchPrice}
              onChange={e => setBatchPrice(e.target.value)}
              className="mb-4 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setBatchSell(false)} className="flex-1 rounded-xl bg-secondary py-3 font-medium text-muted-foreground">Cancelar</button>
              <button
                onClick={async () => {
                  if (!batchBuyer.trim() || !batchPrice) { notify("Completa todos los campos", "error"); return }
                  const price = Number(batchPrice)
                  const todayStr = today()
                  let credsList = ""
                  for (const id of selected) {
                    const acc = accounts.find(a => a.id === id)
                    if (acc && acc.status === "available") {
                      const profit = price - acc.purchasePrice
                      await updateAccount(id, { ...acc, status: "sold", realSalePrice: price, profit, soldDate: todayStr, buyer: batchBuyer.trim() })
                      credsList += `@${acc.username}\nEmail: ${acc.email}\nPass TikTok: ${acc.tiktokPassword}\nPass Email: ${acc.emailPasswordSame ? acc.tiktokPassword : acc.emailPassword}\n\n`
                    }
                  }
                  try { await navigator.clipboard.writeText(credsList) } catch {}
                  notify(`${selected.length} cuentas vendidas · Credenciales copiadas`)
                  setBatchSell(false)
                  setSelected([])
                  setSelectionMode(false)
                }}
                className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground"
              >
                Confirmar
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
                  selected.includes(account.id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                )}
              >
                {selected.includes(account.id) && <X className="h-3 w-3" />}
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

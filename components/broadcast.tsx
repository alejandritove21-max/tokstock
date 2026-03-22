"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatFollowers, formatCurrency } from "@/lib/store"

export function Broadcast() {
  const { accounts, countries, setActiveTab, notify } = useStore()
  const [shared, setShared] = useState<number[]>([])
  const avail = accounts.filter(a => a.status === "available")

  const shareAccount = async (a: typeof avail[0]) => {
    const flag = countries.find(c => c.name === a.country)?.emoji || ""
    const cats = (a.categories || []).join(", ")
    const text = `*@${a.username}*\n${formatFollowers(a.followers)} seg. · ${flag} ${a.country || "—"}${cats ? `\n${cats}` : ""}\nPrecio: ${formatCurrency(a.estimatedSalePrice || a.purchasePrice)}\n${a.profileLink || ""}`

    if (a.screenshot && navigator.share && navigator.canShare) {
      try {
        const res = await fetch(a.screenshot)
        const blob = await res.blob()
        const file = new File([blob], `${a.username}.jpg`, { type: "image/jpeg" })
        if (navigator.canShare({ files: [file], text })) {
          await navigator.share({ files: [file], text, title: `@${a.username}` })
          setShared(prev => [...prev, a.id])
          return
        }
      } catch (e: any) { if (e.name === "AbortError") return }
    }

    try { await navigator.clipboard.writeText(text) } catch {}
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
    setShared(prev => [...prev, a.id])
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={() => setActiveTab("inicio")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Difusión</h1>
          <p className="text-[10px] text-muted-foreground">{avail.length} disponibles · {shared.length} enviadas</p>
        </div>
      </header>

      {/* Progress */}
      {shared.length > 0 && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-[#25D366] transition-all" style={{ width: `${(shared.length / avail.length) * 100}%` }} />
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{shared.length}/{avail.length}</p>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {avail.map(a => {
          const done = shared.includes(a.id)
          return (
            <div key={a.id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 transition-all", done ? "border-[#25D366]/30 bg-[#25D366]/5 opacity-60" : "border-border")}>
              <div className="h-11 w-11 rounded-xl bg-secondary bg-cover bg-center" style={a.screenshot ? { backgroundImage: `url(${a.screenshot})` } : {}} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">@{a.username}</p>
                <p className="text-[10px] text-muted-foreground">{formatFollowers(a.followers)} · {a.country || "—"} · {formatCurrency(a.estimatedSalePrice || a.purchasePrice)}</p>
              </div>
              <button onClick={() => !done && shareAccount(a)}
                className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all", done ? "bg-[#25D366]" : "bg-[#25D366] active:scale-95")}>
                {done ? (
                  <span className="text-sm font-bold text-white">✓</span>
                ) : (
                  <img src="/whatsapp.png" alt="" className="h-5 w-5" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {avail.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">No hay cuentas disponibles</div>
      )}
    </div>
  )
}

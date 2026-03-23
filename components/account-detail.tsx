"use client"

import { useState } from "react"
import { ArrowLeft, Copy, Eye, EyeOff, Edit, Trash2, Check, X, DollarSign, Ban, RotateCcw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, formatFollowers, today } from "@/lib/store"
import { db } from "@/lib/supabase"

export function AccountDetail() {
  const { selectedAccount: a, setSelectedAccount, setEditingAccount, updateAccount, deleteAccount, setActiveTab, notify, whatsappTemplate, countries } = useStore()
  const [showCreds, setShowCreds] = useState(false)
  const [imgRevealed, setImgRevealed] = useState(false)
  const [loadedScreenshot, setLoadedScreenshot] = useState(a.screenshot || "")
  const [loadingImg, setLoadingImg] = useState(false)
  const [copied, setCopied] = useState("")
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [sellPrice, setSellPrice] = useState("")
  const [sellBuyer, setSellBuyer] = useState("")

  if (!a) return null

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 2000) } catch {}
  }

  const handleSell = async () => {
    const price = Number(sellPrice)
    if (!price || !sellBuyer.trim()) { notify("Ingresa precio y comprador", "error"); return }
    const profit = price - a.purchasePrice
    await updateAccount(a.id, { ...a, status: "sold", realSalePrice: price, profit, soldDate: today(), buyer: sellBuyer.trim() })
    // Copy credentials
    const creds = `Email: ${a.email}\nContraseña TikTok: ${a.tiktokPassword}\nContraseña Email: ${a.emailPasswordSame ? a.tiktokPassword : a.emailPassword}`
    try { await navigator.clipboard.writeText(creds) } catch {}
    notify(`Vendida por ${formatCurrency(price)} · Ganancia: ${formatCurrency(profit)}`)
    setConfirmAction(null)
    // Open WhatsApp
    const msg = whatsappTemplate
      .replace("{username}", a.username || "")
      .replace("{followers}", formatFollowers(a.followers))
      .replace("{niche}", a.niche || "—")
      .replace("{link}", a.profileLink || "")
      .replace("{email}", a.email || "")
      .replace("{tiktokPassword}", a.tiktokPassword || "")
      .replace("{emailPassword}", a.emailPasswordSame ? a.tiktokPassword || "" : a.emailPassword || "")
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  const handleDisqualify = async () => {
    await updateAccount(a.id, { ...a, status: "disqualified", disqualifiedDate: today() })
    notify("Cuenta descalificada")
    setConfirmAction(null)
  }

  const handleRestore = async () => {
    await updateAccount(a.id, { ...a, status: "available", soldDate: null, disqualifiedDate: null, realSalePrice: 0, profit: 0, buyer: "" })
    notify("Cuenta restaurada")
    setConfirmAction(null)
  }

  const handleDelete = async () => {
    await deleteAccount(a.id)
    notify("Cuenta eliminada")
    setSelectedAccount(null)
  }

  const flag = countries.find(c => c.name === a.country)?.emoji || ""

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedAccount(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <img src="/tiktok.png" alt="" className="h-4 w-4" />
            <span className="text-lg font-bold">@{a.username}</span>
            <img src="/verified.png" alt="" className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              a.status === "available" ? "border-primary/20 bg-primary/10 text-primary" :
              a.status === "sold" ? "border-blue-500/20 bg-blue-500/10 text-blue-400" :
              "border-destructive/20 bg-destructive/10 text-destructive"
            )}>
              {a.status === "available" ? "Disponible" : a.status === "sold" ? "Vendida" : "Descalificada"}
            </span>
            {a.buyer && <span className="text-[10px] text-muted-foreground">· Comprador: {a.buyer}</span>}
          </div>
        </div>
      </div>

      {/* Profile Image */}
      {(loadedScreenshot || a.status === "sold") && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-border">
          {loadedScreenshot ? (
            <button
              onClick={() => {
                if (!imgRevealed) { setImgRevealed(true); return }
                window.open(loadedScreenshot, "_blank")
              }}
              className="w-full"
            >
              <img
                src={loadedScreenshot}
                alt=""
                className={cn("h-48 w-full object-cover transition-all duration-300", !imgRevealed && "blur-xl scale-105")}
              />
              {!imgRevealed && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              )}
            </button>
          ) : a.status === "sold" && !loadedScreenshot ? (
            <button
              onClick={async () => {
                setLoadingImg(true)
                try {
                  const screenshot = await db.getAccountScreenshot(a.id)
                  if (screenshot) setLoadedScreenshot(screenshot)
                  else setLoadedScreenshot("")
                } catch {}
                setLoadingImg(false)
              }}
              className="flex h-32 w-full items-center justify-center bg-secondary"
            >
              {loadingImg ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-center">
                  <Eye className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">Cargar imagen</p>
                </div>
              )}
            </button>
          ) : null}
        </div>
      )}

      {/* Public Data */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Datos Públicos</h3>
        {[
          ["Perfil", a.profileName],
          ["Seguidores", formatFollowers(a.followers)],
          ["País", `${flag} ${a.country || "—"}`],
          ["Categorías", (a.categories || []).join(", ") || "—"],
          ["Nicho", a.niche || "—"],
          ["Link", a.profileLink],
        ].map(([label, val]) => val && (
          <div key={label} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
              <span className="max-w-[180px] truncate text-right text-xs font-medium">{val}</span>
              {label === "Link" && <button onClick={() => copy(val as string, "Link")} className="text-muted-foreground"><Copy className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Data */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Datos Financieros</h3>
        {[
          ["Precio Compra", formatCurrency(a.purchasePrice)],
          ["Precio Venta Est.", formatCurrency(a.estimatedSalePrice)],
          a.status === "sold" ? ["Precio Real", formatCurrency(a.realSalePrice)] : null,
          a.status === "sold" ? ["Ganancia", formatCurrency(a.profit)] : null,
          a.buyer ? ["Comprador", a.buyer] : null,
        ].filter(Boolean).map(([label, val]: any) => (
          <div key={label} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn("text-xs font-semibold", label === "Ganancia" && Number(a.profit) >= 0 ? "text-primary" : label === "Ganancia" ? "text-destructive" : "")}>
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Credentials */}
      {(a.email || a.tiktokPassword) && (
        <div className="rounded-2xl border border-warning/20 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/gmail.png" alt="" className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-warning">Credenciales</span>
            </div>
            <button
              onClick={() => setShowCreds(!showCreds)}
              className="flex items-center gap-1 rounded-lg bg-warning/10 px-3 py-1.5 text-[10px] font-semibold text-warning"
            >
              {showCreds ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showCreds ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {showCreds && (
            <div className="space-y-2">
              {[
                ["Email", a.email],
                ["Contraseña TikTok", a.tiktokPassword],
                ["Contraseña Email", a.emailPasswordSame ? "(Misma)" : a.emailPassword],
              ].map(([label, val]) => val && (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="font-mono text-xs font-medium">{val}</p>
                  </div>
                  <button onClick={() => copy(val as string, label as string)} className={cn("rounded-lg p-2", copied === label ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
                    {copied === label ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {a.notes && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notas</h3>
          <p className="text-xs text-muted-foreground">{a.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* WhatsApp */}
        <button
          onClick={() => {
            const msg = whatsappTemplate.replace("{username}", a.username || "").replace("{followers}", formatFollowers(a.followers)).replace("{niche}", a.niche || "—").replace("{link}", a.profileLink || "").replace("{email}", a.email || "").replace("{tiktokPassword}", a.tiktokPassword || "").replace("{emailPassword}", a.emailPasswordSame ? a.tiktokPassword || "" : a.emailPassword || "")
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#1da855] py-3.5 font-semibold text-white transition-all active:scale-[0.98]"
        >
          <img src="/whatsapp.png" alt="" className="h-5 w-5" />
          Enviar por WhatsApp
        </button>

        {/* Sell / Restore / Edit */}
        {a.status === "available" && (
          <button onClick={() => setConfirmAction("sell")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all active:scale-[0.98]">
            <DollarSign className="h-4 w-4" /> Vender
          </button>
        )}
        {a.status === "sold" && (
          <button onClick={() => setConfirmAction("restore")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground">
            <RotateCcw className="h-4 w-4" /> Poner como disponible
          </button>
        )}
        <button onClick={() => { setEditingAccount(a); setActiveTab("nueva-cuenta") }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground">
          <Edit className="h-4 w-4" /> Editar
        </button>
        {a.status === "available" && (
          <button onClick={() => setConfirmAction("disqualify")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-medium text-destructive">
            <Ban className="h-4 w-4" /> Descalificar
          </button>
        )}
        {a.status === "disqualified" && (
          <button onClick={() => setConfirmAction("restore")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground">
            <RotateCcw className="h-4 w-4" /> Restaurar
          </button>
        )}
        <button onClick={() => setConfirmAction("delete")} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-destructive/60">
          <Trash2 className="h-4 w-4" /> Eliminar
        </button>
      </div>

      {/* Confirmation Modals */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="w-full max-w-sm animate-slide-up rounded-2xl border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
            {confirmAction === "sell" && (
              <>
                <h3 className="mb-4 text-lg font-bold">Vender @{a.username}</h3>
                <input placeholder="Nombre del comprador" value={sellBuyer} onChange={e => setSellBuyer(e.target.value)} className="mb-3 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                <input type="number" placeholder="Precio de venta ($)" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="mb-4 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                {sellPrice && <p className="mb-4 text-center text-sm">Ganancia: <span className={cn("font-bold", Number(sellPrice) - a.purchasePrice >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(Number(sellPrice) - a.purchasePrice)}</span></p>}
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl bg-secondary py-3 font-medium text-muted-foreground">Cancelar</button>
                  <button onClick={handleSell} className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground">Confirmar</button>
                </div>
              </>
            )}
            {confirmAction === "disqualify" && (
              <>
                <h3 className="mb-2 text-lg font-bold">Descalificar</h3>
                <p className="mb-4 text-sm text-muted-foreground">¿Seguro que quieres descalificar @{a.username}?</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl bg-secondary py-3 font-medium text-muted-foreground">Cancelar</button>
                  <button onClick={handleDisqualify} className="flex-1 rounded-xl bg-destructive py-3 font-medium text-white">Descalificar</button>
                </div>
              </>
            )}
            {confirmAction === "restore" && (
              <>
                <h3 className="mb-2 text-lg font-bold">Restaurar</h3>
                <p className="mb-4 text-sm text-muted-foreground">¿Restaurar @{a.username} como disponible?</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl bg-secondary py-3 font-medium text-muted-foreground">Cancelar</button>
                  <button onClick={handleRestore} className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground">Restaurar</button>
                </div>
              </>
            )}
            {confirmAction === "delete" && (
              <>
                <h3 className="mb-2 text-lg font-bold">Eliminar</h3>
                <p className="mb-4 text-sm text-muted-foreground">Esta acción no se puede deshacer. ¿Eliminar @{a.username}?</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl bg-secondary py-3 font-medium text-muted-foreground">Cancelar</button>
                  <button onClick={handleDelete} className="flex-1 rounded-xl bg-destructive py-3 font-medium text-white">Eliminar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

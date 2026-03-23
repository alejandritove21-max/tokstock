"use client"

import { useState } from "react"
import { ArrowLeft, Radio, Settings, Trash2, Send, RefreshCw, Loader2, Check, Wifi, WifiOff, Copy, CheckSquare, Square, Edit, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatFollowers, formatCurrency } from "@/lib/store"

export function Broadcast() {
  const { accounts, countries, setActiveTab, notify, whapiConfig, setWhapiConfig, sendToChannel, deleteFromChannel } = useStore()
  const [showConfig, setShowConfig] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [token, setToken] = useState(whapiConfig.token)
  const [channelId, setChannelId] = useState(whapiConfig.channelId)
  const [channelName, setChannelName] = useState(whapiConfig.channelName)
  const [template, setTemplate] = useState(whapiConfig.broadcastTemplate || "💰 *CUENTA DISPONIBLE*\n\n👤 @{username}\n👥 {followers} seguidores\n{flag} {country}\n📂 {categories}\n💵 Precio: {price}\n\n🔗 {link}")
  const [newsletters, setNewsletters] = useState<any[]>([])
  const [loadingNewsletters, setLoadingNewsletters] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [shared, setShared] = useState<number[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<any[]>([])

  const avail = accounts.filter(a => a.status === "available")
  const isConnected = !!(whapiConfig.enabled && whapiConfig.token && whapiConfig.channelId)
  const trackedCount = Object.keys(whapiConfig.messageMap).length

  const toggleSelect = (id: any) => {
    const strId = String(id)
    setSelected(prev => prev.map(String).includes(strId) ? prev.filter(x => String(x) !== strId) : [...prev, id])
  }

  const selectAllTracked = () => {
    const trackedIds = Object.keys(whapiConfig.messageMap)
    setSelected(trackedIds as any[])
  }

  // Load newsletters and groups
  const loadNewsletters = async () => {
    if (!token) { notify("Ingresa tu token de Whapi", "error"); return }
    setLoadingNewsletters(true)
    try {
      let allResults: any[] = []
      try {
        const res = await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "getNewsletters", token }) })
        const json = await res.json()
        const nls = json.newsletters || []
        allResults = [...allResults, ...nls.map((n: any) => ({ id: n.id, name: n.name || n.subject || n.title || "Canal", type: "newsletter" }))]
      } catch {}
      try {
        const res2 = await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "getGroups", token }) })
        const json2 = await res2.json()
        const grps = json2.groups || []
        allResults = [...allResults, ...grps.map((g: any) => ({ id: g.id || g.chat_id, name: g.name || g.chat_name || g.subject || g.title || "Grupo", type: "group" }))]
      } catch {}
      setNewsletters(allResults)
      notify(allResults.length > 0 ? `${allResults.length} canal(es)/grupo(s) encontrado(s)` : "No se encontraron. Pega el ID manualmente.", allResults.length > 0 ? "success" : "error")
    } catch (e: any) { notify(`Error: ${e.message}`, "error") }
    setLoadingNewsletters(false)
  }

  const saveConfig = () => {
    setWhapiConfig({ ...whapiConfig, token, channelId, channelName, enabled: !!(token && channelId) })
    notify("Configuración guardada")
    setShowConfig(false)
  }

  const saveTemplate = () => {
    setWhapiConfig({ ...whapiConfig, broadcastTemplate: template })
    notify("Formato guardado")
    setShowTemplate(false)
  }

  const disconnect = () => {
    setWhapiConfig({ token: "", channelId: "", channelName: "", enabled: false, broadcastTemplate: whapiConfig.broadcastTemplate, messageMap: {} })
    setToken(""); setChannelId(""); setChannelName("")
    notify("Desconectado del canal")
  }

  const sendOne = async (acc: typeof avail[0]) => {
    setSendingId(acc.id)
    await sendToChannel(acc)
    setShared(prev => [...prev, acc.id])
    setSendingId(null)
    notify(`@${acc.username} enviada al canal`)
  }

  const sendAll = async () => {
    if (!isConnected) { notify("Conecta un canal primero", "error"); return }
    setSending(true)
    let sent = 0
    for (const acc of avail) {
      if (whapiConfig.messageMap[acc.id] || whapiConfig.messageMap[String(acc.id)]) continue
      await sendToChannel(acc)
      sent++
      setShared(prev => [...prev, acc.id])
      await new Promise(r => setTimeout(r, 800))
    }
    notify(`${sent} cuenta(s) enviada(s) al canal`)
    setSending(false)
  }

  // Fixed: snapshot the IDs first, delete via API, then clear map
  const deleteAll = async () => {
    if (!isConnected) return
    setDeleting(true)
    const entries = Object.entries(whapiConfig.messageMap)
    let deleted = 0
    for (const [accId, messageId] of entries) {
      if (!messageId) continue
      try {
        await fetch("/api/whapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteMessage", token: whapiConfig.token, messageId }),
        })
        deleted++
      } catch {}
      await new Promise(r => setTimeout(r, 500))
    }
    // Clear the entire map at once
    setWhapiConfig({ ...whapiConfig, messageMap: {} })
    setShared([])
    notify(`${deleted} mensaje(s) borrado(s) del canal`)
    setDeleting(false)
  }

  // Delete only selected accounts
  const deleteSelected = async () => {
    if (!isConnected || selected.length === 0) return
    setDeleting(true)
    let deleted = 0
    const currentMap = { ...whapiConfig.messageMap }
    for (const accId of selected) {
      const key = String(accId)
      const messageId = currentMap[key] || currentMap[accId]
      if (!messageId) continue
      try {
        await fetch("/api/whapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteMessage", token: whapiConfig.token, messageId }),
        })
        delete currentMap[key]
        delete currentMap[accId]
        deleted++
      } catch {}
      await new Promise(r => setTimeout(r, 500))
    }
    setWhapiConfig({ ...whapiConfig, messageMap: currentMap })
    setSelected([])
    setSelectMode(false)
    notify(`${deleted} mensaje(s) borrado(s)`)
    setDeleting(false)
  }

  const copyInviteLink = () => {
    if (channelId) {
      const id = channelId.replace("@newsletter", "").replace("@g.us", "")
      navigator.clipboard.writeText(`https://chat.whatsapp.com/${id}`)
      notify("Link copiado")
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={() => setActiveTab("inicio")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Difusión</h1>
          <p className="text-[10px] text-muted-foreground">{avail.length} disponibles · {trackedCount} en canal</p>
        </div>
        <button onClick={() => setShowTemplate(!showTemplate)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Edit className="h-4 w-4" />
        </button>
        <button onClick={() => setShowConfig(!showConfig)} className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isConnected ? "bg-primary/10 text-primary" : "bg-secondary")}>
          <Settings className="h-4 w-4" />
        </button>
      </header>

      {/* Connection Status */}
      <div className={cn("flex items-center gap-3 rounded-xl border p-3", isConnected ? "border-primary/30 bg-primary/5" : "border-warning/30 bg-warning/5")}>
        {isConnected ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-warning" />}
        <div className="flex-1">
          <p className="text-xs font-semibold">{isConnected ? `Conectado: ${whapiConfig.channelName || "Canal"}` : "No conectado"}</p>
          <p className="text-[10px] text-muted-foreground">{isConnected ? `${trackedCount} mensajes activos en el canal` : "Configura Whapi.cloud para activar"}</p>
        </div>
        {isConnected && <button onClick={copyInviteLink} className="rounded-lg bg-secondary p-2"><Copy className="h-3.5 w-3.5" /></button>}
      </div>

      {/* Template Editor */}
      {showTemplate && (
        <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Formato de Difusión</h3>
            <button onClick={() => setShowTemplate(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={8}
            className="mb-3 w-full rounded-xl border border-border bg-secondary px-4 py-3 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <div className="mb-3 flex flex-wrap gap-1">
            {["{username}", "{followers}", "{country}", "{flag}", "{categories}", "{niche}", "{price}", "{purchasePrice}", "{estimatedPrice}", "{link}"].map(v => (
              <button key={v} onClick={() => setTemplate(prev => prev + v)} className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{v}</button>
            ))}
          </div>
          <button onClick={saveTemplate} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Guardar formato</button>
        </div>
      )}

      {/* Config Panel */}
      {showConfig && (
        <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Configuración Whapi.cloud</h3>
            <button onClick={() => setShowConfig(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Token API</label>
              <input type="password" placeholder="Tu token de Whapi.cloud" value={token} onChange={e => setToken(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Canal / Grupo ID</label>
                <button onClick={loadNewsletters} disabled={loadingNewsletters || !token} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                  {loadingNewsletters ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Buscar
                </button>
              </div>
              {newsletters.length > 0 ? (
                <div className="mb-2 space-y-1 max-h-40 overflow-y-auto">
                  {newsletters.map((n: any) => (
                    <button key={n.id} onClick={() => { setChannelId(n.id); setChannelName(n.name || "Canal") }}
                      className={cn("flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all", channelId === n.id ? "border-primary bg-primary/5" : "border-border")}>
                      <Radio className="h-3 w-3 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-medium">{n.name}</p>
                          <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold", n.type === "newsletter" ? "bg-blue-500/10 text-blue-400" : "bg-primary/10 text-primary")}>{n.type === "newsletter" ? "CANAL" : "GRUPO"}</span>
                        </div>
                        <p className="truncate text-[10px] text-muted-foreground">{n.id}</p>
                      </div>
                      {channelId === n.id && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              ) : (
                <input placeholder="120363xxxx@g.us" value={channelId} onChange={e => setChannelId(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={saveConfig} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Guardar</button>
              {isConnected && <button onClick={disconnect} className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Desconectar</button>}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isConnected && (
        <div className="flex gap-2">
          <button onClick={sendAll} disabled={sending || avail.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Enviando..." : "Enviar todas"}
          </button>
          {trackedCount > 0 && (
            <>
              <button onClick={() => { setSelectMode(!selectMode); setSelected([]) }}
                className={cn("flex items-center justify-center gap-1 rounded-xl px-3 py-3 text-sm font-semibold transition-all", selectMode ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                <CheckSquare className="h-4 w-4" />
              </button>
              <button onClick={deleteAll} disabled={deleting}
                className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-all active:scale-[0.98] disabled:opacity-50">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>
      )}

      {/* Selection bar */}
      {selectMode && selected.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <span className="flex-1 text-xs font-semibold text-destructive">{selected.length} seleccionada(s)</span>
          <button onClick={selectAllTracked} className="rounded-lg bg-destructive/10 px-3 py-1.5 text-[10px] font-semibold text-destructive">Todas</button>
          <button onClick={deleteSelected} disabled={deleting}
            className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-[10px] font-semibold text-white">
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Borrar del canal
          </button>
        </div>
      )}

      {/* Progress */}
      {shared.length > 0 && avail.length > 0 && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-[#25D366] transition-all" style={{ width: `${(shared.length / avail.length) * 100}%` }} />
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{shared.length}/{avail.length} enviadas</p>
        </div>
      )}

      {/* Account List */}
      <div className="flex flex-col gap-2">
        {avail.map(a => {
          const inChannel = !!whapiConfig.messageMap[a.id] || !!whapiConfig.messageMap[String(a.id)]
          const isSending = sendingId === a.id
          const done = shared.includes(a.id) || inChannel
          const flag = countries.find(c => c.name === a.country)?.emoji || ""
          const isSelected = selected.map(String).includes(String(a.id))

          return (
            <div key={a.id} onClick={() => selectMode && inChannel && toggleSelect(a.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
                isSelected ? "border-destructive/50 bg-destructive/5" :
                done ? "border-[#25D366]/30 bg-[#25D366]/5" : "border-border"
              )}>
              {selectMode && inChannel && (
                <div className="shrink-0">
                  {isSelected ? <CheckSquare className="h-5 w-5 text-destructive" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                </div>
              )}
              <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary bg-cover bg-center" style={a.screenshot ? { backgroundImage: `url(${a.screenshot})` } : {}} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">@{a.username}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFollowers(a.followers)} · {flag} {a.country || "—"} · {formatCurrency(a.estimatedSalePrice || a.purchasePrice)}
                </p>
              </div>
              {!selectMode && (
                <div className="flex items-center gap-1.5">
                  {inChannel && <span className="rounded-md bg-[#25D366]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#25D366]">EN CANAL</span>}
                  {isConnected ? (
                    <button onClick={() => !done && !isSending && sendOne(a)} disabled={done || isSending}
                      className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all", done ? "bg-[#25D366]" : "bg-[#25D366] active:scale-95")}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : done ? <Check className="h-4 w-4 text-white" /> : <Send className="h-4 w-4 text-white" />}
                    </button>
                  ) : (
                    <button onClick={async () => {
                      const text = `*@${a.username}*\n${formatFollowers(a.followers)} seg. · ${flag} ${a.country || "—"}\nPrecio: ${formatCurrency(a.estimatedSalePrice || a.purchasePrice)}\n${a.profileLink || ""}`
                      try { await navigator.clipboard.writeText(text) } catch {}
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
                      setShared(prev => [...prev, a.id])
                    }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] active:scale-95">
                      <img src="/whatsapp.png" alt="" className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {avail.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">No hay cuentas disponibles</div>
      )}

      {/* Tracked Messages */}
      {isConnected && trackedCount > 0 && !selectMode && (
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Mensajes en canal ({trackedCount})</p>
          <div className="space-y-1">
            {Object.entries(whapiConfig.messageMap).map(([accId, msgId]) => {
              const acc = accounts.find(a => String(a.id) === String(accId))
              return (
                <div key={accId} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">@{acc?.username || `ID:${accId}`}</span>
                  <span className="font-mono text-[9px] text-muted-foreground/60 max-w-[150px] truncate">{msgId as string}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { ArrowLeft, Settings, Trash2, Send, RefreshCw, Loader2, Check, Wifi, WifiOff, Copy, CheckSquare, Square, Edit, X, Plus, Power, PowerOff, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatFollowers, formatCurrency, type WhapiChannel } from "@/lib/store"

export function Broadcast() {
  const { accounts, countries, setActiveTab, notify, whapiConfig, setWhapiConfig, sendToChannel, deleteFromChannel } = useStore()
  const [showConfig, setShowConfig] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showCustomMsg, setShowCustomMsg] = useState(false)
  const [customMsg, setCustomMsg] = useState("")
  const [token, setToken] = useState(whapiConfig.token)
  const [template, setTemplate] = useState(whapiConfig.broadcastTemplate || "")
  const [newChannelId, setNewChannelId] = useState("")
  const [newChannelName, setNewChannelName] = useState("")
  const [newsletters, setNewsletters] = useState<any[]>([])
  const [loadingNewsletters, setLoadingNewsletters] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingCustom, setSendingCustom] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sendingId, setSendingId] = useState<any>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<any[]>([])

  const avail = accounts.filter(a => a.status === "available")
  const activeChannels = whapiConfig.channels.filter(ch => ch.enabled)
  const isConnected = !!(whapiConfig.token && activeChannels.length > 0)
  const totalTracked = whapiConfig.channels.reduce((sum, ch) => sum + Object.keys(ch.messageMap).length, 0)

  const toggleSelect = (id: any) => {
    const s = String(id)
    setSelected(prev => prev.map(String).includes(s) ? prev.filter((x: any) => String(x) !== s) : [...prev, id])
  }

  const isInAnyChannel = (accId: any) => whapiConfig.channels.some(ch => ch.messageMap[String(accId)])

  // ── Config functions ──
  const loadNewsletters = async () => {
    if (!token) { notify("Ingresa tu token", "error"); return }
    setLoadingNewsletters(true)
    try {
      let all: any[] = []
      try {
        const r1 = await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "getNewsletters", token }) })
        const j1 = await r1.json()
        all.push(...(j1.newsletters || []).map((n: any) => ({ id: n.id, name: n.name || n.subject || "Canal", type: "newsletter" })))
      } catch {}
      try {
        const r2 = await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "getGroups", token }) })
        const j2 = await r2.json()
        all.push(...(j2.groups || []).map((g: any) => ({ id: g.id || g.chat_id, name: g.name || g.chat_name || g.subject || "Grupo", type: "group" })))
      } catch {}
      setNewsletters(all)
      notify(all.length > 0 ? `${all.length} encontrado(s)` : "No se encontraron. Agrega manual.", all.length > 0 ? "success" : "error")
    } catch (e: any) { notify(`Error: ${e.message}`, "error") }
    setLoadingNewsletters(false)
  }

  const saveToken = () => { setWhapiConfig({ ...whapiConfig, token }); notify("Token guardado") }
  const saveTemplate = () => { setWhapiConfig({ ...whapiConfig, broadcastTemplate: template }); notify("Formato guardado"); setShowTemplate(false) }

  const addChannel = (id: string, name: string) => {
    if (!id) return
    if (whapiConfig.channels.find(ch => ch.id === id)) { notify("Ya agregado", "error"); return }
    setWhapiConfig({ ...whapiConfig, channels: [...whapiConfig.channels, { id, name: name || "Canal", enabled: true, messageMap: {} }] })
    setNewChannelId(""); setNewChannelName("")
    notify(`${name || "Canal"} agregado`)
  }

  const removeChannel = (id: string) => { setWhapiConfig({ ...whapiConfig, channels: whapiConfig.channels.filter(ch => ch.id !== id) }); notify("Canal eliminado") }
  const toggleChannel = (id: string) => { setWhapiConfig({ ...whapiConfig, channels: whapiConfig.channels.map(ch => ch.id === id ? { ...ch, enabled: !ch.enabled } : ch) }) }
  const disconnect = () => { setWhapiConfig({ token: "", channels: [], broadcastTemplate: whapiConfig.broadcastTemplate }); setToken(""); notify("Desconectado") }

  // ── Send functions ──
  const sendOne = async (acc: typeof avail[0]) => {
    setSendingId(acc.id)
    await sendToChannel(acc)
    setSendingId(null)
    // Re-read config to check if it was tracked
    const cfg = useStore.getState().whapiConfig
    const tracked = cfg.channels.some(ch => ch.messageMap[String(acc.id)])
    notify(tracked ? `@${acc.username} enviada y registrada` : `@${acc.username} enviada (sin registro)`, tracked ? "success" : "error")
  }

  const sendAll = async () => {
    if (!isConnected) { notify("Conecta un canal primero", "error"); return }
    setSending(true)
    let sent = 0
    for (const acc of avail) {
      if (isInAnyChannel(acc.id)) continue
      await sendToChannel(acc)
      sent++
      await new Promise(r => setTimeout(r, 500))
    }
    notify(`${sent} cuenta(s) enviada(s)`)
    setSending(false)
  }

  const sendCustomMessage = async () => {
    if (!customMsg.trim() || !isConnected) return
    setSendingCustom(true)
    try {
      const res = await fetch("/api/whapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMulti",
          token: whapiConfig.token,
          channelIds: activeChannels.map(ch => ch.id),
          caption: customMsg,
        }),
      })
      const json = await res.json()
      const ok = Object.values(json.results || {}).filter(Boolean).length
      notify(`Mensaje enviado a ${ok} canal(es)`)
      setCustomMsg("")
      setShowCustomMsg(false)
    } catch (e: any) { notify(`Error: ${e.message}`, "error") }
    setSendingCustom(false)
  }

  // ── Delete functions ──
  const deleteAll = async () => {
    if (!isConnected) return
    setDeleting(true)
    const allEntries: { chId: string; msgId: string; accId: string }[] = []
    for (const ch of whapiConfig.channels) {
      for (const [accId, msgId] of Object.entries(ch.messageMap)) {
        allEntries.push({ chId: ch.id, msgId: msgId as string, accId })
      }
    }
    // Delete via API
    const msgIds = allEntries.map(e => e.msgId)
    if (msgIds.length > 0) {
      try {
        await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteMulti", token: whapiConfig.token, messageIds: msgIds }) })
      } catch {}
    }
    setWhapiConfig({ ...whapiConfig, channels: whapiConfig.channels.map(ch => ({ ...ch, messageMap: {} })) })
    notify(`${allEntries.length} mensaje(s) borrado(s)`)
    setDeleting(false)
  }

  const deleteSelected = async () => {
    if (!isConnected || selected.length === 0) return
    setDeleting(true)
    const msgIds: string[] = []
    const updatedChannels = whapiConfig.channels.map(ch => ({ ...ch, messageMap: { ...ch.messageMap } }))
    for (const accId of selected) {
      const key = String(accId)
      for (const ch of updatedChannels) {
        if (ch.messageMap[key]) { msgIds.push(ch.messageMap[key]); delete ch.messageMap[key] }
      }
    }
    if (msgIds.length > 0) {
      try {
        await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteMulti", token: whapiConfig.token, messageIds: msgIds }) })
      } catch {}
    }
    setWhapiConfig({ ...whapiConfig, channels: updatedChannels })
    setSelected([]); setSelectMode(false)
    notify(`${msgIds.length} mensaje(s) borrado(s)`)
    setDeleting(false)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <button onClick={() => setActiveTab("inicio")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Difusión</h1>
          <p className="text-[10px] text-muted-foreground">{avail.length} disponibles · {activeChannels.length} canal(es) · {totalTracked} en canal</p>
        </div>
        <button onClick={() => setShowTemplate(!showTemplate)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><Edit className="h-4 w-4" /></button>
        <button onClick={() => setShowConfig(!showConfig)} className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isConnected ? "bg-primary/10 text-primary" : "bg-secondary")}><Settings className="h-4 w-4" /></button>
      </header>

      {/* Channel Cards */}
      {whapiConfig.channels.length > 0 ? (
        <div className="space-y-2">
          {whapiConfig.channels.map(ch => (
            <div key={ch.id} className={cn("flex items-center gap-3 rounded-xl border p-3", ch.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30")}>
              <button onClick={() => toggleChannel(ch.id)} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", ch.enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                {ch.enabled ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold">{ch.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{Object.keys(ch.messageMap).length} msgs · {ch.id.substring(0, 18)}...</p>
              </div>
              <button onClick={() => removeChannel(ch.id)} className="rounded-lg bg-destructive/10 p-1.5 text-destructive"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <WifiOff className="h-4 w-4 text-warning" />
          <p className="text-xs text-muted-foreground">No hay canales · Configura Whapi.cloud</p>
        </div>
      )}

      {/* Template Editor */}
      {showTemplate && (
        <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Formato de Difusión</h3><button onClick={() => setShowTemplate(false)}><X className="h-4 w-4 text-muted-foreground" /></button></div>
          <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={7} className="mb-3 w-full rounded-xl border border-border bg-secondary px-4 py-3 font-mono text-xs focus:border-primary focus:outline-none" />
          <div className="mb-3 flex flex-wrap gap-1">
            {["{username}", "{followers}", "{country}", "{flag}", "{categories}", "{niche}", "{publico}", "{price}", "{purchasePrice}", "{estimatedPrice}", "{link}"].map(v => (
              <button key={v} onClick={() => setTemplate(p => p + v)} className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{v}</button>
            ))}
          </div>
          <button onClick={saveTemplate} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Guardar formato</button>
        </div>
      )}

      {/* Config Panel */}
      {showConfig && (
        <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Configuración Whapi</h3><button onClick={() => setShowConfig(false)}><X className="h-4 w-4 text-muted-foreground" /></button></div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="password" placeholder="Token API" value={token} onChange={e => setToken(e.target.value)} className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none" />
              <button onClick={saveToken} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">OK</button>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Agregar canal</label>
                <button onClick={loadNewsletters} disabled={loadingNewsletters || !token} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                  {loadingNewsletters ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Buscar
                </button>
              </div>
              {newsletters.length > 0 && (
                <div className="mb-2 space-y-1 max-h-36 overflow-y-auto">
                  {newsletters.map((n: any) => {
                    const added = whapiConfig.channels.find(ch => ch.id === n.id)
                    return (
                      <button key={n.id} onClick={() => !added && addChannel(n.id, n.name)} className={cn("flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs", added ? "border-primary/30 opacity-50" : "border-border")}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{n.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{n.id}</p>
                        </div>
                        {added ? <Check className="h-3 w-3 text-primary" /> : <Plus className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <input placeholder="ID: 120363xxxx@g.us" value={newChannelId} onChange={e => setNewChannelId(e.target.value)} className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs focus:border-primary focus:outline-none" />
                <input placeholder="Nombre" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} className="w-20 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs focus:border-primary focus:outline-none" />
                <button onClick={() => addChannel(newChannelId, newChannelName)} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            {isConnected && <button onClick={disconnect} className="w-full rounded-xl bg-destructive/10 py-2.5 text-xs font-semibold text-destructive">Desconectar todo</button>}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isConnected && (
        <div className="flex gap-2">
          <button onClick={sendAll} disabled={sending || avail.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Enviando..." : `Enviar (${activeChannels.length})`}
          </button>
          <button onClick={() => setShowCustomMsg(!showCustomMsg)}
            className={cn("flex items-center justify-center rounded-xl px-3 py-3", showCustomMsg ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
            <MessageSquare className="h-4 w-4" />
          </button>
          {totalTracked > 0 && (
            <>
              <button onClick={() => { setSelectMode(!selectMode); setSelected([]) }}
                className={cn("flex items-center justify-center rounded-xl px-3 py-3", selectMode ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                <CheckSquare className="h-4 w-4" />
              </button>
              <button onClick={deleteAll} disabled={deleting}
                className="flex items-center justify-center rounded-xl bg-destructive/10 px-3 py-3 text-destructive active:scale-[0.98] disabled:opacity-50">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>
      )}

      {/* Custom Message */}
      {showCustomMsg && isConnected && (
        <div className="rounded-xl border border-border bg-card p-3 animate-fade-in">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Mensaje personalizado</p>
          <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={3} placeholder="Escribe un mensaje para enviar a todos los canales..."
            className="mb-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          <button onClick={sendCustomMessage} disabled={sendingCustom || !customMsg.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {sendingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar mensaje
          </button>
        </div>
      )}

      {/* Selection bar */}
      {selectMode && selected.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <span className="flex-1 text-xs font-semibold text-destructive">{selected.length} seleccionada(s)</span>
          <button onClick={() => { const allIds = new Set<string>(); whapiConfig.channels.forEach(ch => Object.keys(ch.messageMap).forEach(k => allIds.add(k))); setSelected(Array.from(allIds)) }}
            className="rounded-lg bg-destructive/10 px-3 py-1.5 text-[10px] font-semibold text-destructive">Todas</button>
          <button onClick={deleteSelected} disabled={deleting}
            className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-[10px] font-semibold text-white">
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Borrar
          </button>
        </div>
      )}

      {/* Account List */}
      <div className="flex flex-col gap-2">
        {avail.map(a => {
          const inChannel = isInAnyChannel(a.id)
          const isSending = sendingId === a.id
          const flag = countries.find(c => c.name === a.country)?.emoji || ""
          const isSelected = selected.map(String).includes(String(a.id))

          return (
            <div key={a.id} onClick={() => selectMode && inChannel && toggleSelect(a.id)}
              className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
                isSelected ? "border-destructive/50 bg-destructive/5" : inChannel ? "border-[#25D366]/30 bg-[#25D366]/5" : "border-border")}>
              {selectMode && inChannel && (
                <div className="shrink-0">{isSelected ? <CheckSquare className="h-5 w-5 text-destructive" /> : <Square className="h-5 w-5 text-muted-foreground" />}</div>
              )}
              <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary bg-cover bg-center" style={a.screenshot ? { backgroundImage: `url(${a.screenshot})` } : {}} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">@{a.username}</p>
                <p className="text-[10px] text-muted-foreground">{formatFollowers(a.followers)} · {flag} {a.country || "—"} · {formatCurrency(a.estimatedSalePrice || a.purchasePrice)}</p>
              </div>
              {!selectMode && (
                <div className="flex items-center gap-1.5">
                  {inChannel && <span className="rounded-md bg-[#25D366]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#25D366]">EN CANAL</span>}
                  {isConnected && (
                    <button onClick={() => !isSending && sendOne(a)} disabled={isSending}
                      className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all", inChannel ? "bg-[#25D366]" : "bg-[#25D366] active:scale-95")}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : inChannel ? <Check className="h-4 w-4 text-white" /> : <Send className="h-4 w-4 text-white" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {avail.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No hay cuentas disponibles</div>}
    </div>
  )
}

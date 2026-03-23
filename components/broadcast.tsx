"use client"

import { useState } from "react"
import { ArrowLeft, Settings, Trash2, Send, RefreshCw, Loader2, Check, Wifi, WifiOff, Copy, CheckSquare, Square, Edit, X, Plus, Power, PowerOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatFollowers, formatCurrency, type WhapiChannel } from "@/lib/store"

export function Broadcast() {
  const { accounts, countries, setActiveTab, notify, whapiConfig, setWhapiConfig, sendToChannel, deleteFromChannel } = useStore()
  const [showConfig, setShowConfig] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [token, setToken] = useState(whapiConfig.token)
  const [template, setTemplate] = useState(whapiConfig.broadcastTemplate || "")
  const [newChannelId, setNewChannelId] = useState("")
  const [newChannelName, setNewChannelName] = useState("")
  const [newsletters, setNewsletters] = useState<any[]>([])
  const [loadingNewsletters, setLoadingNewsletters] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sendingId, setSendingId] = useState<any>(null)
  const [shared, setShared] = useState<any[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<any[]>([])

  const avail = accounts.filter(a => a.status === "available")
  const activeChannels = whapiConfig.channels.filter(ch => ch.enabled)
  const isConnected = !!(whapiConfig.token && activeChannels.length > 0)
  const totalTracked = whapiConfig.channels.reduce((sum, ch) => sum + Object.keys(ch.messageMap).length, 0)

  const toggleSelect = (id: any) => {
    const strId = String(id)
    setSelected(prev => prev.map(String).includes(strId) ? prev.filter((x: any) => String(x) !== strId) : [...prev, id])
  }

  const selectAllTracked = () => {
    const allIds = new Set<string>()
    whapiConfig.channels.forEach(ch => Object.keys(ch.messageMap).forEach(k => allIds.add(k)))
    setSelected(Array.from(allIds))
  }

  // Load newsletters and groups
  const loadNewsletters = async () => {
    if (!token) { notify("Ingresa tu token", "error"); return }
    setLoadingNewsletters(true)
    try {
      let allResults: any[] = []
      try {
        const res = await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "getNewsletters", token }) })
        const json = await res.json()
        allResults = [...allResults, ...(json.newsletters || []).map((n: any) => ({ id: n.id, name: n.name || n.subject || "Canal", type: "newsletter" }))]
      } catch {}
      try {
        const res2 = await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "getGroups", token }) })
        const json2 = await res2.json()
        allResults = [...allResults, ...(json2.groups || []).map((g: any) => ({ id: g.id || g.chat_id, name: g.name || g.chat_name || g.subject || "Grupo", type: "group" }))]
      } catch {}
      setNewsletters(allResults)
      notify(allResults.length > 0 ? `${allResults.length} encontrado(s)` : "No se encontraron. Agrega manual.", allResults.length > 0 ? "success" : "error")
    } catch (e: any) { notify(`Error: ${e.message}`, "error") }
    setLoadingNewsletters(false)
  }

  const saveToken = () => {
    setWhapiConfig({ ...whapiConfig, token })
    notify("Token guardado")
  }

  const saveTemplate = () => {
    setWhapiConfig({ ...whapiConfig, broadcastTemplate: template })
    notify("Formato guardado")
    setShowTemplate(false)
  }

  const addChannel = (id: string, name: string) => {
    if (!id) return
    if (whapiConfig.channels.find(ch => ch.id === id)) { notify("Canal ya agregado", "error"); return }
    const newCh: WhapiChannel = { id, name: name || "Canal", enabled: true, messageMap: {} }
    setWhapiConfig({ ...whapiConfig, channels: [...whapiConfig.channels, newCh] })
    setNewChannelId("")
    setNewChannelName("")
    notify(`${name || "Canal"} agregado`)
  }

  const removeChannel = (id: string) => {
    setWhapiConfig({ ...whapiConfig, channels: whapiConfig.channels.filter(ch => ch.id !== id) })
    notify("Canal eliminado")
  }

  const toggleChannel = (id: string) => {
    setWhapiConfig({
      ...whapiConfig,
      channels: whapiConfig.channels.map(ch => ch.id === id ? { ...ch, enabled: !ch.enabled } : ch)
    })
  }

  const sendOne = async (acc: typeof avail[0]) => {
    setSendingId(acc.id)
    await sendToChannel(acc)
    setShared(prev => [...prev, acc.id])
    setSendingId(null)
    notify(`@${acc.username} enviada a ${activeChannels.length} canal(es)`)
  }

  const sendAll = async () => {
    if (!isConnected) { notify("Conecta un canal primero", "error"); return }
    setSending(true)
    let sent = 0
    for (const acc of avail) {
      const alreadySent = activeChannels.every(ch => ch.messageMap[String(acc.id)])
      if (alreadySent) continue
      await sendToChannel(acc)
      sent++
      setShared(prev => [...prev, acc.id])
      await new Promise(r => setTimeout(r, 800))
    }
    notify(`${sent} cuenta(s) enviada(s) a ${activeChannels.length} canal(es)`)
    setSending(false)
  }

  const deleteAll = async () => {
    if (!isConnected) return
    setDeleting(true)
    const allIds = new Set<string>()
    whapiConfig.channels.forEach(ch => Object.keys(ch.messageMap).forEach(k => allIds.add(k)))
    let deleted = 0
    for (const accId of allIds) {
      for (const ch of activeChannels) {
        const msgId = ch.messageMap[accId]
        if (!msgId) continue
        try {
          await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteMessage", token: whapiConfig.token, messageId: msgId }) })
        } catch {}
        await new Promise(r => setTimeout(r, 300))
      }
      deleted++
    }
    setWhapiConfig({ ...whapiConfig, channels: whapiConfig.channels.map(ch => ({ ...ch, messageMap: {} })) })
    setShared([])
    notify(`${deleted} cuenta(s) borrada(s) de todos los canales`)
    setDeleting(false)
  }

  const deleteSelected = async () => {
    if (!isConnected || selected.length === 0) return
    setDeleting(true)
    let deleted = 0
    const updatedChannels = whapiConfig.channels.map(ch => ({ ...ch, messageMap: { ...ch.messageMap } }))
    for (const accId of selected) {
      const key = String(accId)
      for (const ch of updatedChannels) {
        const msgId = ch.messageMap[key]
        if (!msgId) continue
        if (activeChannels.find(ac => ac.id === ch.id)) {
          try {
            await fetch("/api/whapi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteMessage", token: whapiConfig.token, messageId: msgId }) })
          } catch {}
          await new Promise(r => setTimeout(r, 300))
        }
        delete ch.messageMap[key]
      }
      deleted++
    }
    setWhapiConfig({ ...whapiConfig, channels: updatedChannels })
    setSelected([])
    setSelectMode(false)
    notify(`${deleted} cuenta(s) borrada(s)`)
    setDeleting(false)
  }

  const isInAnyChannel = (accId: any) => {
    const key = String(accId)
    return whapiConfig.channels.some(ch => ch.messageMap[key])
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={() => setActiveTab("inicio")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Difusión</h1>
          <p className="text-[10px] text-muted-foreground">{avail.length} disponibles · {activeChannels.length} canal(es) · {totalTracked} en canal</p>
        </div>
        <button onClick={() => setShowTemplate(!showTemplate)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Edit className="h-4 w-4" />
        </button>
        <button onClick={() => setShowConfig(!showConfig)} className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isConnected ? "bg-primary/10 text-primary" : "bg-secondary")}>
          <Settings className="h-4 w-4" />
        </button>
      </header>

      {/* Channel Status Cards */}
      {whapiConfig.channels.length > 0 ? (
        <div className="space-y-2">
          {whapiConfig.channels.map(ch => (
            <div key={ch.id} className={cn("flex items-center gap-3 rounded-xl border p-3", ch.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30")}>
              <button onClick={() => toggleChannel(ch.id)} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", ch.enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                {ch.enabled ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold">{ch.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{Object.keys(ch.messageMap).length} mensajes · {ch.id.substring(0, 20)}...</p>
              </div>
              <button onClick={() => removeChannel(ch.id)} className="rounded-lg bg-destructive/10 p-1.5 text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn("flex items-center gap-3 rounded-xl border p-3 border-warning/30 bg-warning/5")}>
          <WifiOff className="h-4 w-4 text-warning" />
          <div>
            <p className="text-xs font-semibold">No hay canales</p>
            <p className="text-[10px] text-muted-foreground">Configura Whapi.cloud y agrega canales</p>
          </div>
        </div>
      )}

      {/* Template Editor */}
      {showTemplate && (
        <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Formato de Difusión</h3>
            <button onClick={() => setShowTemplate(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={8}
            className="mb-3 w-full rounded-xl border border-border bg-secondary px-4 py-3 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <div className="mb-3 flex flex-wrap gap-1">
            {["{username}", "{followers}", "{country}", "{flag}", "{categories}", "{niche}", "{publico}", "{price}", "{purchasePrice}", "{estimatedPrice}", "{link}"].map(v => (
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
            {/* Token */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Token API</label>
              <div className="flex gap-2">
                <input type="password" placeholder="Tu token de Whapi.cloud" value={token} onChange={e => setToken(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                <button onClick={saveToken} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">OK</button>
              </div>
            </div>

            {/* Add Channel */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Agregar Canal / Grupo</label>
                <button onClick={loadNewsletters} disabled={loadingNewsletters || !token} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                  {loadingNewsletters ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Buscar
                </button>
              </div>

              {newsletters.length > 0 && (
                <div className="mb-2 space-y-1 max-h-40 overflow-y-auto">
                  {newsletters.map((n: any) => {
                    const alreadyAdded = whapiConfig.channels.find(ch => ch.id === n.id)
                    return (
                      <button key={n.id} onClick={() => !alreadyAdded && addChannel(n.id, n.name)}
                        className={cn("flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all", alreadyAdded ? "border-primary/30 bg-primary/5 opacity-60" : "border-border")}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium">{n.name}</p>
                            <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold", n.type === "newsletter" ? "bg-blue-500/10 text-blue-400" : "bg-primary/10 text-primary")}>{n.type === "newsletter" ? "CANAL" : "GRUPO"}</span>
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground">{n.id}</p>
                        </div>
                        {alreadyAdded ? <Check className="h-3 w-3 text-primary" /> : <Plus className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Manual add */}
              <div className="flex gap-2">
                <input placeholder="ID: 120363xxxx@g.us" value={newChannelId} onChange={e => setNewChannelId(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                <input placeholder="Nombre" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  className="w-24 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                <button onClick={() => addChannel(newChannelId, newChannelName)} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
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
            {sending ? "Enviando..." : `Enviar todas (${activeChannels.length})`}
          </button>
          {/* Test button — sends "Test" text to all channels */}
          <button onClick={async () => {
            try {
              const res = await fetch("/api/whapi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "sendMulti",
                  token: whapiConfig.token,
                  channelIds: activeChannels.map(ch => ch.id),
                  caption: "🧪 Test desde TokStock - " + new Date().toLocaleTimeString(),
                }),
              })
              const json = await res.json()
              const ok = Object.values(json.results || {}).filter(Boolean).length
              const fail = Object.values(json.results || {}).filter(v => !v).length
              notify(`Test: ${ok} enviado(s), ${fail} fallido(s)`)
              if (json.debug) console.log("[TokStock] Test debug:", JSON.stringify(json.debug))
            } catch (e: any) { notify(`Error: ${e.message}`, "error") }
          }} className="flex items-center justify-center rounded-xl bg-secondary px-3 py-3 text-xs font-semibold text-foreground">
            🧪
          </button>
          {totalTracked > 0 && (
            <>
              <button onClick={() => { setSelectMode(!selectMode); setSelected([]) }}
                className={cn("flex items-center justify-center rounded-xl px-3 py-3 text-sm font-semibold transition-all", selectMode ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
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
            Borrar
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
          const inChannel = isInAnyChannel(a.id)
          const isSending = sendingId === a.id
          const done = shared.includes(a.id) || inChannel
          const flag = countries.find(c => c.name === a.country)?.emoji || ""
          const isSelected = selected.map(String).includes(String(a.id))

          return (
            <div key={a.id} onClick={() => selectMode && inChannel && toggleSelect(a.id)}
              className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
                isSelected ? "border-destructive/50 bg-destructive/5" : done ? "border-[#25D366]/30 bg-[#25D366]/5" : "border-border")}>
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
    </div>
  )
}

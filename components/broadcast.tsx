"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Radio, Settings, Trash2, Send, RefreshCw, Loader2, Check, Wifi, WifiOff, Copy, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatFollowers, formatCurrency } from "@/lib/store"

export function Broadcast() {
  const { accounts, countries, setActiveTab, notify, whapiConfig, setWhapiConfig, sendToChannel, deleteFromChannel } = useStore()
  const [showConfig, setShowConfig] = useState(false)
  const [token, setToken] = useState(whapiConfig.token)
  const [channelId, setChannelId] = useState(whapiConfig.channelId)
  const [channelName, setChannelName] = useState(whapiConfig.channelName)
  const [newsletters, setNewsletters] = useState<any[]>([])
  const [loadingNewsletters, setLoadingNewsletters] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [shared, setShared] = useState<number[]>([])

  const avail = accounts.filter(a => a.status === "available")
  const isConnected = whapiConfig.enabled && whapiConfig.token && whapiConfig.channelId
  const trackedCount = Object.keys(whapiConfig.messageMap).length

  // Load newsletters from Whapi
  const loadNewsletters = async () => {
    if (!token) { notify("Ingresa tu token de Whapi", "error"); return }
    setLoadingNewsletters(true)
    try {
      const res = await fetch("/api/whapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getNewsletters", token }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const list = json.newsletters || json.data || json || []
      setNewsletters(Array.isArray(list) ? list : [])
      if (Array.isArray(list) && list.length > 0) {
        notify(`${list.length} canal(es) encontrado(s)`)
      } else {
        notify("No se encontraron canales", "error")
      }
    } catch (e: any) {
      notify(`Error: ${e.message}`, "error")
    }
    setLoadingNewsletters(false)
  }

  // Save config
  const saveConfig = () => {
    const config = { ...whapiConfig, token, channelId, channelName, enabled: !!(token && channelId) }
    setWhapiConfig(config)
    notify("Configuración guardada")
    setShowConfig(false)
  }

  // Disconnect
  const disconnect = () => {
    setWhapiConfig({ token: "", channelId: "", channelName: "", enabled: false, messageMap: {} })
    setToken("")
    setChannelId("")
    setChannelName("")
    notify("Desconectado del canal")
  }

  // Send single account
  const sendOne = async (acc: typeof avail[0]) => {
    setSendingId(acc.id)
    await sendToChannel(acc)
    setShared(prev => [...prev, acc.id])
    setSendingId(null)
    notify(`@${acc.username} enviada al canal`)
  }

  // Send all available accounts
  const sendAll = async () => {
    if (!isConnected) { notify("Conecta un canal primero", "error"); return }
    setSending(true)
    let sent = 0
    for (const acc of avail) {
      if (whapiConfig.messageMap[acc.id]) continue // Already sent
      await sendToChannel(acc)
      sent++
      setShared(prev => [...prev, acc.id])
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 800))
    }
    notify(`${sent} cuenta(s) enviada(s) al canal`)
    setSending(false)
  }

  // Delete all messages from channel
  const deleteAll = async () => {
    if (!isConnected) return
    setDeleting(true)
    const map = { ...whapiConfig.messageMap }
    let deleted = 0
    for (const [accId, msgId] of Object.entries(map)) {
      await deleteFromChannel(Number(accId))
      deleted++
      await new Promise(r => setTimeout(r, 500))
    }
    notify(`${deleted} mensaje(s) borrado(s) del canal`)
    setDeleting(false)
  }

  // Copy channel invite link
  const copyInviteLink = () => {
    if (channelId) {
      const link = `https://whatsapp.com/channel/${channelId.replace("@newsletter", "")}`
      navigator.clipboard.writeText(link)
      notify("Link del canal copiado")
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
          <p className="text-[10px] text-muted-foreground">
            {avail.length} disponibles · {trackedCount} en canal
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isConnected ? "bg-primary/10 text-primary" : "bg-secondary")}
        >
          <Settings className="h-4 w-4" />
        </button>
      </header>

      {/* Connection Status */}
      <div className={cn("flex items-center gap-3 rounded-xl border p-3", isConnected ? "border-primary/30 bg-primary/5" : "border-warning/30 bg-warning/5")}>
        {isConnected ? (
          <Wifi className="h-4 w-4 text-primary" />
        ) : (
          <WifiOff className="h-4 w-4 text-warning" />
        )}
        <div className="flex-1">
          <p className="text-xs font-semibold">
            {isConnected ? `Conectado: ${whapiConfig.channelName || "Canal"}` : "No conectado"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isConnected ? `${trackedCount} mensajes activos en el canal` : "Configura Whapi.cloud para activar"}
          </p>
        </div>
        {isConnected && (
          <button onClick={copyInviteLink} className="rounded-lg bg-secondary p-2">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
          <h3 className="mb-3 text-sm font-bold">Configuración Whapi.cloud</h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Token API</label>
              <input
                type="password"
                placeholder="Tu token de Whapi.cloud"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Canal ID</label>
                <button
                  onClick={loadNewsletters}
                  disabled={loadingNewsletters || !token}
                  className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
                >
                  {loadingNewsletters ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Buscar canales
                </button>
              </div>

              {newsletters.length > 0 ? (
                <div className="mb-2 space-y-1">
                  {newsletters.map((n: any) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setChannelId(n.id)
                        setChannelName(n.name || n.subject || "Canal")
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all",
                        channelId === n.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <Radio className="h-3 w-3 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{n.name || n.subject || n.id}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{n.id}</p>
                      </div>
                      {channelId === n.id && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  placeholder="120363xxxx@newsletter"
                  value={channelId}
                  onChange={e => setChannelId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={saveConfig} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
                Guardar
              </button>
              {isConnected && (
                <button onClick={disconnect} className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  Desconectar
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-secondary/50 p-3">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>¿Cómo configurar?</strong><br/>
              1. Crea una cuenta en <span className="text-primary">whapi.cloud</span><br/>
              2. Conecta tu número WhatsApp (QR)<br/>
              3. Copia tu API Token del dashboard<br/>
              4. Pégalo aquí y busca tus canales
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isConnected && (
        <div className="flex gap-2">
          <button
            onClick={sendAll}
            disabled={sending || avail.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Enviando..." : "Enviar todas"}
          </button>
          <button
            onClick={deleteAll}
            disabled={deleting || trackedCount === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Limpiar
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
          const inChannel = !!whapiConfig.messageMap[a.id]
          const isSending = sendingId === a.id
          const done = shared.includes(a.id) || inChannel
          const flag = countries.find(c => c.name === a.country)?.emoji || ""

          return (
            <div key={a.id} className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
              done ? "border-[#25D366]/30 bg-[#25D366]/5" : "border-border"
            )}>
              <div className="h-11 w-11 rounded-xl bg-secondary bg-cover bg-center" style={a.screenshot ? { backgroundImage: `url(${a.screenshot})` } : {}} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">@{a.username}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFollowers(a.followers)} · {flag} {a.country || "—"} · {formatCurrency(a.estimatedSalePrice || a.purchasePrice)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {inChannel && (
                  <span className="rounded-md bg-[#25D366]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#25D366]">EN CANAL</span>
                )}
                {isConnected ? (
                  <button
                    onClick={() => !done && !isSending && sendOne(a)}
                    disabled={done || isSending}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                      done ? "bg-[#25D366]" : "bg-[#25D366] active:scale-95"
                    )}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Send className="h-4 w-4 text-white" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const text = `*@${a.username}*\n${formatFollowers(a.followers)} seg. · ${flag} ${a.country || "—"}\nPrecio: ${formatCurrency(a.estimatedSalePrice || a.purchasePrice)}\n${a.profileLink || ""}`
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
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] active:scale-95"
                  >
                    <img src="/whatsapp.png" alt="" className="h-5 w-5" />
                  </button>
                )}
              </div>
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

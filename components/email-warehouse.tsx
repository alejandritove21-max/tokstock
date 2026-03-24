"use client"

import { useState } from "react"
import { ArrowLeft, Upload, Plus, X, Eye, EyeOff, ExternalLink, Copy, Check, Mail, Key } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, today } from "@/lib/store"

const filters = ["Todos", "Disponibles", "Usados"] as const

// Generate login URL for email providers
function getEmailLoginUrl(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  if (domain.includes("hotmail") || domain.includes("outlook") || domain.includes("live") || domain.includes("msn")) {
    return "https://outlook.live.com/mail/"
  }
  if (domain.includes("gmail") || domain.includes("googlemail")) {
    return "https://mail.google.com/"
  }
  if (domain.includes("yahoo")) {
    return "https://mail.yahoo.com/"
  }
  if (domain.includes("icloud") || domain.includes("me.com") || domain.includes("mac.com")) {
    return "https://www.icloud.com/mail/"
  }
  if (domain.includes("aol")) {
    return "https://mail.aol.com/"
  }
  if (domain.includes("proton") || domain.includes("pm.me")) {
    return "https://mail.proton.me/"
  }
  return `https://mail.${domain}/`
}

function getEmailIcon(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  if (domain.includes("hotmail") || domain.includes("outlook") || domain.includes("live")) return "📧"
  if (domain.includes("gmail")) return "📨"
  if (domain.includes("yahoo")) return "📩"
  return "✉️"
}

export function EmailWarehouse() {
  const { emailWarehouse, setEmailWarehouse, setActiveTab, notify } = useStore()
  const [filter, setFilter] = useState<string>("Todos")
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPass, setNewPass] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [activeCodeEmail, setActiveCodeEmail] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState("")
  const [copied, setCopied] = useState("")

  const availCount = emailWarehouse.filter(e => !e.used).length
  const usedCount = emailWarehouse.filter(e => e.used).length
  const counts: Record<string, number> = { Todos: emailWarehouse.length, Disponibles: availCount, Usados: usedCount }

  const filtered = emailWarehouse.filter(e => {
    if (filter === "Disponibles") return !e.used
    if (filter === "Usados") return e.used
    return true
  })

  const addSingle = () => {
    if (!newEmail) return
    if (emailWarehouse.find(e => e.email.toLowerCase() === newEmail.toLowerCase())) return
    setEmailWarehouse([...emailWarehouse, { email: newEmail, password: newPass, used: false, usedBy: "", addedDate: today() }])
    setNewEmail(""); setNewPass("")
  }

  const bulkImport = () => {
    if (!bulkText.trim()) return
    const lines = bulkText.split("\n").filter(l => l.trim() && !l.trim().startsWith("---"))
    const newEmails: typeof emailWarehouse = []
    for (const line of lines) {
      const cleaned = line.replace(/^Account:\s*/i, "").trim()
      let email = "", password = ""
      if (cleaned.includes(":")) { const p = cleaned.split(":"); email = p[0].trim(); password = p.slice(1).join(":").trim() }
      else email = cleaned
      if (email && email.includes("@") && !emailWarehouse.find(e => e.email.toLowerCase() === email.toLowerCase()) && !newEmails.find(e => e.email.toLowerCase() === email.toLowerCase())) {
        newEmails.push({ email, password, used: false, usedBy: "", addedDate: today() })
      }
    }
    if (newEmails.length > 0) {
      setEmailWarehouse([...emailWarehouse, ...newEmails])
      setBulkText(""); setShowBulk(false)
      notify(`${newEmails.length} correos importados`)
    } else notify("No se encontraron correos nuevos", "error")
  }

  const remove = (email: string) => setEmailWarehouse(emailWarehouse.filter(e => e.email !== email))
  const toggle = (email: string) => setEmailWarehouse(emailWarehouse.map(e => e.email === email ? { ...e, used: !e.used, usedBy: e.used ? "" : e.usedBy } : e))

  const copyText = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(label)
    notify(`${label} copiado`)
    setTimeout(() => setCopied(""), 2000)
  }

  // Open email + copy password in one tap
  const quickOpenEmail = async (email: string, password: string) => {
    // Copy password to clipboard so they can paste it to login
    if (password) {
      try { await navigator.clipboard.writeText(password) } catch {}
      notify("Contraseña copiada · Abriendo correo...")
    }
    // Open email provider login
    window.open(getEmailLoginUrl(email), "_blank")
  }

  // Handle code paste - detect if clipboard has a code
  const handleCodePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const match = text.match(/\b(\d{4,6})\b/)
      if (match) {
        setCodeInput(match[1])
        notify(`Código ${match[1]} detectado`)
      }
    } catch {
      // Clipboard read failed, that's ok
    }
  }

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code) } catch {}
    notify(`Código ${code} copiado`)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab("ajustes")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Bodega de Correos</h1>
            <p className="text-[10px] text-muted-foreground">{availCount} disponibles · {usedCount} usados · {emailWarehouse.length} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPasswords(!showPasswords)} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
            {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPasswords ? "Ocultar" : "Ver"}
          </button>
          <button onClick={() => setShowBulk(!showBulk)} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
            <Upload className="h-3.5 w-3.5" />
            {showBulk ? "Individual" : "Masivo"}
          </button>
        </div>
      </header>

      {/* Add form */}
      {showBulk ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Importar masivo</p>
          <p className="mb-3 text-[10px] text-muted-foreground">Formato: Account: email:contraseña</p>
          <textarea rows={6} placeholder={"Account: correo@mail.com:pass123\n-----\nAccount: otro@mail.com:pass456"} value={bulkText} onChange={e => setBulkText(e.target.value)}
            className="mb-3 w-full resize-y rounded-xl border border-border bg-secondary p-3 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <button onClick={bulkImport} disabled={!bulkText.trim()} className="w-full rounded-xl bg-secondary py-3 text-sm font-medium text-muted-foreground disabled:opacity-50">Importar correos</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <input type="email" placeholder="correo@ejemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <input placeholder="Contraseña" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <button onClick={addSingle} disabled={!newEmail} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-medium text-muted-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" /> Agregar correo
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn("flex-1 rounded-full py-2 text-xs font-medium transition-all", filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {filtered.map((e, i) => {
          const isActive = activeCodeEmail === e.email
          const icon = getEmailIcon(e.email)

          return (
            <div key={i} className={cn("rounded-xl border bg-card p-4 transition-all", e.used ? "border-border opacity-60" : "border-border", isActive && "border-primary/30")}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{icon}</span>
                    <p className="truncate text-sm font-medium">{e.email}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-mono text-xs text-muted-foreground">
                      {showPasswords ? (e.password || "Sin contraseña") : (e.password ? "••••••••" : "Sin contraseña")}
                    </p>
                    {e.password && (
                      <button onClick={() => copyText(e.password, "Pass")}
                        className={cn("text-[10px]", copied === "Pass" ? "text-primary" : "text-accent")}>
                        {copied === "Pass" ? "Copiado" : "Copiar"}
                      </button>
                    )}
                  </div>
                  {e.used && e.usedBy && <p className="mt-0.5 text-[10px] text-muted-foreground">Usada por @{e.usedBy}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Quick open email - copies password + opens email provider */}
                  <button
                    onClick={() => quickOpenEmail(e.email, e.password)}
                    className="flex h-8 items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 text-[10px] font-semibold text-blue-400"
                  >
                    <Mail className="h-3 w-3" />
                    Abrir
                  </button>
                  {/* Toggle code input */}
                  <button
                    onClick={() => { setActiveCodeEmail(isActive ? null : e.email); setCodeInput("") }}
                    className={cn("flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold", isActive ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning")}
                  >
                    <Key className="h-3 w-3" />
                  </button>
                  <button onClick={() => toggle(e.email)} className={cn("rounded-full px-2 py-1 text-[10px] font-medium", e.used ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {e.used ? "Usada" : "Disp."}
                  </button>
                  <button onClick={() => remove(e.email)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Code Input Panel */}
              {isActive && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-2 text-[10px] font-semibold text-muted-foreground">1. Toca "Abrir" para ir al correo · 2. Copia el código · 3. Pégalo aquí</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Pega el código aquí"
                      value={codeInput}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                        setCodeInput(val)
                      }}
                      onFocus={handleCodePaste}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] placeholder:text-sm placeholder:tracking-normal focus:border-primary focus:outline-none"
                    />
                    {codeInput.length >= 4 && (
                      <button onClick={() => copyCode(codeInput)}
                        className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">
                        <Copy className="h-3.5 w-3.5" /> Copiar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {filter === "Todos" ? "Agrega correos arriba" : "No hay correos en esta categoría"}
        </div>
      )}
    </div>
  )
}

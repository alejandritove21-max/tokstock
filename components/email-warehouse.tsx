"use client"

import { useState } from "react"
import { ArrowLeft, Upload, Plus, X, Eye, EyeOff, Copy, Check, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, today } from "@/lib/store"

const filters = ["Todos", "Disponibles", "Usados"] as const

export function EmailWarehouse() {
  const { emailWarehouse, setEmailWarehouse, setActiveTab, notify } = useStore()
  const [filter, setFilter] = useState<string>("Todos")
  const [search, setSearch] = useState("")
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPass, setNewPass] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [copied, setCopied] = useState("")

  const availCount = emailWarehouse.filter(e => !e.used).length
  const usedCount = emailWarehouse.filter(e => e.used).length
  const counts: Record<string, number> = { Todos: emailWarehouse.length, Disponibles: availCount, Usados: usedCount }

  const filtered = emailWarehouse.filter(e => {
    if (filter === "Disponibles" && e.used) return false
    if (filter === "Usados" && !e.used) return false
    if (search) {
      const q = search.toLowerCase()
      return e.email.toLowerCase().includes(q) || (e.usedBy || "").toLowerCase().includes(q)
    }
    return true
  })

  const addSingle = () => {
    if (!newEmail) return
    if (emailWarehouse.find(e => e.email.toLowerCase() === newEmail.toLowerCase())) { notify("Este correo ya existe", "error"); return }
    setEmailWarehouse([...emailWarehouse, { email: newEmail, password: newPass, used: false, usedBy: "", addedDate: today() }])
    setNewEmail(""); setNewPass("")
    notify("Correo agregado")
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

  const remove = (email: string) => { setEmailWarehouse(emailWarehouse.filter(e => e.email !== email)); notify("Correo eliminado") }
  const toggle = (email: string) => setEmailWarehouse(emailWarehouse.map(e => e.email === email ? { ...e, used: !e.used, usedBy: e.used ? "" : e.usedBy } : e))

  const copyText = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(label)
    notify("Copiado")
    setTimeout(() => setCopied(""), 1500)
  }

  const copyAll = async (e: typeof emailWarehouse[0]) => {
    const text = `${e.email}:${e.password}`
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(`all-${e.email}`)
    notify("Email:contraseña copiado")
    setTimeout(() => setCopied(""), 1500)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Header */}
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
          <button onClick={() => setShowPasswords(!showPasswords)} className={cn("flex h-9 w-9 items-center justify-center rounded-xl", showPasswords ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button onClick={() => setShowBulk(!showBulk)} className={cn("flex h-9 w-9 items-center justify-center rounded-xl", showBulk ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por email o usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Add form */}
      {showBulk ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Importar masivo</p>
          <p className="mb-3 text-[10px] text-muted-foreground">Formato: email:contraseña (uno por línea)</p>
          <textarea rows={5} placeholder={"correo@mail.com:pass123\notro@mail.com:pass456"} value={bulkText} onChange={e => setBulkText(e.target.value)}
            className="mb-3 w-full resize-y rounded-xl border border-border bg-secondary p-3 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <button onClick={bulkImport} disabled={!bulkText.trim()} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Importar</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="email" placeholder="correo@ejemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-secondary px-3 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <input placeholder="Contraseña" value={newPass} onChange={e => setNewPass(e.target.value)}
            className="w-28 rounded-xl border border-border bg-secondary px-3 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <button onClick={addSingle} disabled={!newEmail} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
            <Plus className="h-5 w-5" />
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
        {filtered.map((e, i) => (
          <div key={i} className={cn("rounded-xl border bg-card p-3 transition-all", e.used ? "border-border/50 opacity-50" : "border-border")}>
            {/* Row 1: Email + status */}
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.email}</p>
              </div>
              <button onClick={() => toggle(e.email)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold", e.used ? "bg-blue-500/10 text-blue-400" : "bg-primary/10 text-primary")}>
                {e.used ? "Usada" : "Disponible"}
              </button>
            </div>

            {/* Row 2: Password + actions */}
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {showPasswords ? (e.password || "—") : (e.password ? "••••••••" : "—")}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {/* Copy email */}
                <button onClick={() => copyText(e.email, `email-${e.email}`)}
                  className={cn("flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-medium", copied === `email-${e.email}` ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
                  {copied === `email-${e.email}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Email
                </button>
                {/* Copy password */}
                {e.password && (
                  <button onClick={() => copyText(e.password, `pass-${e.email}`)}
                    className={cn("flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-medium", copied === `pass-${e.email}` ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
                    {copied === `pass-${e.email}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Pass
                  </button>
                )}
                {/* Copy email:password */}
                {e.password && (
                  <button onClick={() => copyAll(e)}
                    className={cn("flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-medium", copied === `all-${e.email}` ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
                    {copied === `all-${e.email}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Todo
                  </button>
                )}
                {/* Delete */}
                <button onClick={() => remove(e.email)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 active:bg-destructive/10 active:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Used by */}
            {e.used && e.usedBy && (
              <p className="mt-1 text-[10px] text-muted-foreground">Asignada a @{e.usedBy}</p>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search ? "Sin resultados" : filter === "Todos" ? "Agrega correos arriba" : "No hay correos en esta categoría"}
        </div>
      )}
    </div>
  )
}

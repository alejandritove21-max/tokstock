"use client"

import { useState } from "react"
import { ChevronRight, Database, Moon, Brain, MessageSquare, Globe, Tag, Search, Target, Mail, Plus, Trash2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"

export function Settings() {
  const { darkMode, setDarkMode, aiProviders, setAiProviders, countries, setCountries, categories, setCategories, whatsappTemplate, setWhatsappTemplate, setActiveTab } = useStore()
  const [section, setSection] = useState<string | null>(null)

  if (section === "ai") return <AISettings onBack={() => setSection(null)} />
  if (section === "countries") return <ListEditor title="Países" items={countries} onSave={setCountries} onBack={() => setSection(null)} type="country" />
  if (section === "categories") return <ListEditor title="Categorías" items={categories} onSave={setCategories} onBack={() => setSection(null)} type="category" />
  if (section === "whatsapp") return <WhatsAppEditor onBack={() => setSection(null)} />

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <div className="flex flex-col gap-2">
        <SettingRow icon={Database} label="Base de Datos" desc="Conectada y sincronizando" color="bg-green-500" />
        <SettingRow icon={Moon} label="Tema Oscuro" desc="Toca para cambiar" color="bg-cyan-400" toggle={darkMode} onToggle={() => setDarkMode(!darkMode)} />
        <SettingRow icon={Brain} label="Inteligencia Artificial" desc={`${aiProviders.filter(p => p.active).length} proveedor(es) activo(s)`} color="bg-blue-400" arrow onClick={() => setSection("ai")} />
        <SettingRow icon={MessageSquare} label="Formato de Entrega" desc="Plantilla de WhatsApp" color="bg-blue-400" arrow onClick={() => setSection("whatsapp")} />
        <SettingRow icon={Globe} label="Países" desc={`${countries.length} configurados`} color="bg-blue-400" arrow onClick={() => setSection("countries")} />
        <SettingRow icon={Tag} label="Categorías" desc={`${categories.length} etiquetas`} color="bg-blue-400" arrow onClick={() => setSection("categories")} />
      </div>

      {/* Quick Links */}
      <div className="mt-4 flex flex-col gap-2">
        {[
          { label: "Buscar Cuentas", tab: "buscar" },
          { label: "Metas", tab: "metas" },
          { label: "Bodega de Correos", tab: "bodega" },
          { label: "Pagos Pendientes", tab: "pagos" },
          { label: "Difusión WhatsApp", tab: "difusion" },
        ].map(item => (
          <button key={item.tab} onClick={() => setActiveTab(item.tab)} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all active:scale-[0.99]">
            <span className="text-sm font-medium">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-secondary/50 p-6 text-center">
        <h3 className="font-semibold">TokStock</h3>
        <p className="mt-1 text-xs text-muted-foreground">v2.0</p>
      </div>
    </div>
  )
}

function SettingRow({ icon: Icon, label, desc, color, toggle, onToggle, arrow, onClick }: any) {
  return (
    <button onClick={onClick || onToggle} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.99]">
      <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {toggle !== undefined && (
        <div className={cn("relative h-7 w-12 rounded-full transition-colors", toggle ? "bg-primary" : "bg-muted")}>
          <div className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", toggle ? "left-6" : "left-1")} />
        </div>
      )}
      {arrow && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  )
}

function AISettings({ onBack }: { onBack: () => void }) {
  const { aiProviders, setAiProviders } = useStore()
  const [editing, setEditing] = useState<number | null>(null)
  const [key, setKey] = useState("")

  // Ensure we always have exactly 2 providers: ChatGPT and Claude
  const ensureProviders = () => {
    const defaults = [
      { name: "ChatGPT (OpenAI)", key: "", active: false },
      { name: "Claude (Anthropic)", key: "", active: false },
    ]
    if (!aiProviders || aiProviders.length === 0) {
      setAiProviders(defaults)
      return defaults
    }
    // Map existing keys to the fixed providers
    const chatgpt = aiProviders.find(p => p.name.toLowerCase().includes("gpt") || p.name.toLowerCase().includes("openai"))
    const claude = aiProviders.find(p => p.name.toLowerCase().includes("claude") || p.name.toLowerCase().includes("anthropic"))
    const fixed = [
      { name: "ChatGPT (OpenAI)", key: chatgpt?.key || "", active: chatgpt?.active || false },
      { name: "Claude (Anthropic)", key: claude?.key || "", active: claude?.active || false },
    ]
    return fixed
  }

  const providers = ensureProviders()

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Inteligencia Artificial</h1>
      </header>
      <p className="text-xs text-muted-foreground">Solo un proveedor puede estar activo a la vez. Agrega tu API Key y actívalo.</p>
      {providers.map((p, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={i === 0 ? "/chatgpt-icon.png" : "/claude-icon.png"} alt="" className="h-5 w-5" />
              <p className="font-medium">{p.name}</p>
            </div>
            <button onClick={() => {
              // Toggle - only one active at a time
              const updated = providers.map((pr, j) => ({
                ...pr,
                active: j === i ? !pr.active : false,
              }))
              setAiProviders(updated)
            }}
              className={cn("rounded-full px-3 py-1 text-xs font-medium", p.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {p.active ? "Activo" : "Inactivo"}
            </button>
          </div>
          {p.key && !editing && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{p.key.slice(0, 8)}...{p.key.slice(-4)}</p>
          )}
          {editing === i ? (
            <div className="mt-3 flex gap-2">
              <input placeholder={i === 0 ? "sk-..." : "sk-ant-..."} value={key} onChange={e => setKey(e.target.value)} className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none" />
              <button onClick={() => {
                const updated = providers.map((pr, j) => j === i ? { ...pr, key } : pr)
                setAiProviders(updated)
                setEditing(null)
              }} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">Guardar</button>
            </div>
          ) : (
            <button onClick={() => { setKey(p.key); setEditing(i) }} className="mt-2 text-xs text-accent">{p.key ? "Cambiar API Key" : "Agregar API Key"}</button>
          )}
        </div>
      ))}
    </div>
  )
}

function ListEditor({ title, items, onSave, onBack, type }: { title: string; items: any[]; onSave: (v: any) => void; onBack: () => void; type: "country" | "category" }) {
  const [list, setList] = useState(items)
  const [newVal, setNewVal] = useState("")
  const [newEmoji, setNewEmoji] = useState("")

  const add = () => {
    if (!newVal) return
    if (type === "country") { setList([...list, { name: newVal, emoji: newEmoji || "🌍" }]); setNewEmoji("") }
    else setList([...list, newVal])
    setNewVal("")
  }

  const remove = (idx: number) => setList(list.filter((_, i) => i !== idx))

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={() => { onSave(list); onBack() }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>
      <div className="flex gap-2">
        {type === "country" && <input placeholder="🌍" value={newEmoji} onChange={e => setNewEmoji(e.target.value)} className="w-14 rounded-xl border border-border bg-secondary px-2 py-3 text-center text-sm focus:border-primary focus:outline-none" />}
        <input placeholder={type === "country" ? "Nombre del país" : "Nueva categoría"} value={newVal} onChange={e => setNewVal(e.target.value)} className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        <button onClick={add} className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">+</button>
      </div>
      <div className="flex flex-col gap-2">
        {list.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <span className="text-sm font-medium">{type === "country" ? `${item.emoji} ${item.name}` : item}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function WhatsAppEditor({ onBack }: { onBack: () => void }) {
  const { whatsappTemplate, setWhatsappTemplate } = useStore()
  const [text, setText] = useState(whatsappTemplate)

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={() => { setWhatsappTemplate(text); onBack() }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Formato WhatsApp</h1>
      </header>
      <p className="text-xs text-muted-foreground">Variables: {"{username}"}, {"{followers}"}, {"{niche}"}, {"{publico}"}, {"{link}"}, {"{email}"}, {"{tiktokPassword}"}, {"{emailPassword}"}</p>
      <textarea rows={10} value={text} onChange={e => setText(e.target.value)} className="w-full resize-y rounded-xl border border-border bg-secondary p-4 text-sm focus:border-primary focus:outline-none" />
      <button onClick={() => { setWhatsappTemplate(text); onBack() }} className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground">Guardar</button>
    </div>
  )
}

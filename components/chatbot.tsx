"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, formatFollowers, today } from "@/lib/store"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatBot() {
  const { accounts, goals, emailWarehouse, categories, countries, setActiveTab, whatsappTemplate, aiProviders } = useStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "¡Hola! Soy el asistente de TokStock. Tengo acceso completo a tu inventario. Puedo ayudarte con:\n\n• Info detallada de cualquier cuenta (credenciales, precios, fechas)\n• Estadísticas y reportes financieros\n• Estado de la bodega de correos\n• Metas y progreso\n• Recomendaciones de precios\n• Cualquier pregunta sobre la app\n\n¿En qué te puedo ayudar?" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const buildContext = () => {
    const available = accounts.filter(a => a.status === "available")
    const sold = accounts.filter(a => a.status === "sold")
    const disq = accounts.filter(a => a.status === "disqualified")
    const totalRevenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0)
    const totalProfit = sold.reduce((s, a) => s + ((a.realSalePrice || 0) - (a.purchasePrice || 0)), 0)
    const totalInvested = accounts.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const totalInvestedAvailable = available.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const totalEstimatedValue = available.reduce((s, a) => s + (a.estimatedSalePrice || 0), 0)
    const emailsAvail = emailWarehouse.filter(e => !e.used).length
    const emailsUsed = emailWarehouse.filter(e => e.used).length

    // Full account details for available
    const availableDetails = available.map(a =>
      `@${a.username} | ${formatFollowers(a.followers)} seg | ${a.country} | ${(a.categories || []).join(", ")} | Nicho: ${a.niche || "—"} | Compra: ${formatCurrency(a.purchasePrice)} | Venta est.: ${formatCurrency(a.estimatedSalePrice)} | Email: ${a.email || "—"} | Link: ${a.profileLink || "—"} | Fecha: ${a.createdAt ? new Date(a.createdAt).toLocaleDateString("es") : "—"} | Notas: ${a.notes || "—"}`
    ).join("\n")

    // Full account details for sold
    const soldDetails = sold.map(a =>
      `@${a.username} | ${formatFollowers(a.followers)} seg | ${a.country} | Compra: ${formatCurrency(a.purchasePrice)} | Venta: ${formatCurrency(a.realSalePrice)} | Ganancia: ${formatCurrency(a.profit)} | Comprador: ${a.buyer || "?"} | Fecha venta: ${a.soldDate || "—"}`
    ).join("\n")

    // Disqualified details
    const disqDetails = disq.map(a =>
      `@${a.username} | ${formatFollowers(a.followers)} seg | ${a.country} | Compra: ${formatCurrency(a.purchasePrice)} | Fecha descalif.: ${a.disqualifiedDate || "—"}`
    ).join("\n")

    // Email warehouse details
    const warehouseDetails = emailWarehouse.map(e =>
      `${e.email} | ${e.used ? "USADA" : "DISPONIBLE"}`
    ).join("\n")

    // Goals details
    const goalsDetails = goals.map(g =>
      `Meta: ${g.title || g.type} | Objetivo: ${g.target} | Progreso: ${g.current}/${g.target} | Fecha límite: ${g.deadline || "—"}`
    ).join("\n")

    return `Eres el asistente de TokStock, una app de inventario de cuentas TikTok monetizadas. Responde en español, sé conciso y útil. Hoy es ${today()}.

RESUMEN DEL INVENTARIO:
- Cuentas disponibles: ${available.length}
- Cuentas vendidas: ${sold.length}
- Cuentas descalificadas: ${disq.length}
- Total cuentas: ${accounts.length}
- Total invertido (todas): ${formatCurrency(totalInvested)}
- Inversión en disponibles: ${formatCurrency(totalInvestedAvailable)}
- Valor estimado disponibles: ${formatCurrency(totalEstimatedValue)}
- Ganancia potencial disponibles: ${formatCurrency(totalEstimatedValue - totalInvestedAvailable)}
- Ingresos por ventas: ${formatCurrency(totalRevenue)}
- Ganancia total ventas: ${formatCurrency(totalProfit)}
- Margen promedio: ${sold.length > 0 ? Math.round(totalProfit / sold.length) : 0}$/cuenta
- Correos en bodega: ${emailWarehouse.length} total (${emailsAvail} disponibles, ${emailsUsed} usados)
- Categorías: ${categories.join(", ")}
- Países: ${countries.map(c => `${c.emoji} ${c.name}`).join(", ")}
- Metas activas: ${goals.length}

CUENTAS DISPONIBLES (${available.length}):
${availableDetails || "Ninguna"}

CUENTAS VENDIDAS (${sold.length}):
${soldDetails || "Ninguna"}

CUENTAS DESCALIFICADAS (${disq.length}):
${disqDetails || "Ninguna"}

BODEGA DE CORREOS (${emailWarehouse.length}):
${warehouseDetails || "Vacía"}

METAS:
${goalsDetails || "Sin metas"}

INSTRUCCIONES:
- Tienes acceso COMPLETO al inventario con todos los datos
- Si preguntan por una cuenta específica (@usuario), busca en los datos y da toda la info
- Si preguntan por credenciales (email, contraseña), proporciónalas
- Si preguntan por estadísticas, calcula con los datos reales
- Si preguntan recomendaciones de precio, basa tu análisis en los datos de ventas previas
- Sé directo, conciso y útil. Usa emojis moderadamente.`
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const provider = aiProviders.find(p => p.active && p.key)
    if (!provider) {
      setMessages(prev => [...prev, { role: "user", content: input }, { role: "assistant", content: "⚠️ No hay IA configurada. Ve a Ajustes → Inteligencia Artificial para agregar tu API key." }])
      setInput("")
      return
    }

    const userMsg: Message = { role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const isClaude = provider.name.toLowerCase().includes("claude") || provider.name.toLowerCase().includes("anthropic")
      const context = buildContext()

      const history = messages
        .filter((m, i) => !(i === 0 && m.role === "assistant"))
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: isClaude ? "claude" : "openai",
          apiKey: provider.key,
          context,
          messages: [...history, { role: "user", content: input }],
        }),
      })

      const json = await res.json()
      if (json.error) throw new Error(json.error)

      setMessages(prev => [...prev, { role: "assistant", content: json.reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${e.message}` }])
    }
    setLoading(false)
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => setActiveTab("inicio")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">TokStock AI</p>
            <p className="text-[10px] text-muted-foreground">{accounts.length} cuentas · Acceso completo</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              msg.role === "user"
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md bg-card border border-border"
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card/80 p-3 backdrop-blur-xl safe-bottom">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Pregunta algo..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all",
              input.trim() && !loading ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

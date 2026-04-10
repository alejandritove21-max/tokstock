"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, formatFollowers, today, venezuelaDaysAgo, isOnOrAfter } from "@/lib/store"

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

    // Calculate 30-day metrics
    const startKey30 = venezuelaDaysAgo(30)
    const sold30 = sold.filter(a => isOnOrAfter(a.soldDate, startKey30))
    const profit30 = sold30.reduce((s, a) => s + (a.realSalePrice || 0) - (a.purchasePrice || 0), 0)
    const loss30 = disq.filter(a => isOnOrAfter(a.disqualifiedDate, startKey30)).reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const avgDays = (() => {
      const withDates = sold.filter(a => a.soldDate && a.createdAt)
      if (!withDates.length) return 0
      return Math.round(withDates.reduce((s, a) => s + Math.max(0, (new Date(a.soldDate! + "T12:00:00").getTime() - new Date(a.createdAt).getTime()) / 86400000), 0) / withDates.length)
    })()

    // Top buyers
    const buyers: Record<string, { count: number; total: number }> = {}
    sold.forEach(a => { if (a.buyer) { if (!buyers[a.buyer]) buyers[a.buyer] = { count: 0, total: 0 }; buyers[a.buyer].count++; buyers[a.buyer].total += a.realSalePrice || 0 } })
    const topBuyers = Object.entries(buyers).sort((a, b) => b[1].count - a[1].count).slice(0, 5)

    // Country breakdown
    const countryCounts: Record<string, number> = {}
    available.forEach(a => { if (a.country) countryCounts[a.country] = (countryCounts[a.country] || 0) + 1 })

    return `Eres TokBot, el asistente experto de TokStock — una app para gestionar inventario de cuentas TikTok monetizadas. Tu dueño compra cuentas TikTok que ya están monetizadas (cumplen los requisitos del Fondo de Creadores) y las revende a creadores de contenido. Responde SIEMPRE en español. Sé conciso, útil y estratégico. Hoy es ${today()}.

═══ CONOCIMIENTO DEL NEGOCIO ═══

CÓMO FUNCIONA:
- Se compran cuentas TikTok monetizadas (con acceso al Fondo de Creadores o Creativity Program)
- Cada cuenta tiene: email, contraseña TikTok, contraseña del email, seguidores, país, nicho
- Se revenden a compradores (creadores de contenido) a un precio mayor
- La ganancia es: precio de venta - precio de compra
- Una cuenta se "descalifica" cuando pierde la monetización o tiene problemas (eso es una pérdida)
- El "público" de una cuenta puede ser: Latino, Árabe o Mixto
- Los nichos comunes son: entretenimiento, comedia, cocina, moda, gaming, etc.

MÉTRICAS CLAVE:
- ROI = (ganancia / costo) × 100
- Un buen margen es 50-200% de ganancia sobre el costo
- Tiempo promedio de venta: lo ideal es vender rápido (menos de 7 días)
- Tasa de descalificación: si es alta (>30%), hay que mejorar la selección de cuentas

═══ DATOS EN TIEMPO REAL ═══

INVENTARIO:
- Disponibles: ${available.length} cuentas (inversión: ${formatCurrency(totalInvestedAvailable)}, valor estimado: ${formatCurrency(totalEstimatedValue)})
- Vendidas: ${sold.length} cuentas (ingresos: ${formatCurrency(totalRevenue)}, ganancia: ${formatCurrency(totalProfit)})
- Descalificadas: ${disq.length} cuentas (pérdida: ${formatCurrency(disq.reduce((s, a) => s + (a.purchasePrice || 0), 0))})
- Total: ${accounts.length} cuentas

ÚLTIMOS 30 DÍAS:
- Vendidas: ${sold30.length} | Ganancia: ${formatCurrency(profit30)} | Pérdidas: ${formatCurrency(loss30)} | Neto: ${formatCurrency(profit30 - loss30)}

ANÁLISIS:
- Margen promedio: ${sold.length ? formatCurrency(totalProfit / sold.length) : "$0"}/cuenta
- Días promedio para vender: ${avgDays} días
- ROI total: ${totalInvested > 0 ? Math.round((totalProfit / (sold.reduce((s, a) => s + (a.purchasePrice || 0), 0) || 1)) * 100) : 0}%
- Correos en bodega: ${emailsAvail} disponibles, ${emailsUsed} usados

${topBuyers.length > 0 ? `TOP COMPRADORES:\n${topBuyers.map(([name, d]) => `- ${name}: ${d.count} compras, ${formatCurrency(d.total)} total`).join("\n")}` : ""}

${Object.keys(countryCounts).length > 0 ? `PAÍSES DISPONIBLES: ${Object.entries(countryCounts).map(([c, n]) => `${c} (${n})`).join(", ")}` : ""}

CUENTAS DISPONIBLES (${available.length}):
${availableDetails || "Ninguna"}

CUENTAS VENDIDAS RECIENTES (últimas 10):
${sold.slice(0, 10).map(a => `@${a.username} | Venta: ${formatCurrency(a.realSalePrice)} | Ganancia: ${formatCurrency(a.profit)} | Comprador: ${a.buyer || "?"} | ${a.soldDate || "—"}`).join("\n") || "Ninguna"}

BODEGA DE CORREOS (${emailWarehouse.length}):
${emailWarehouse.slice(0, 20).map(e => `${e.email} | ${e.used ? "USADA por @" + e.usedBy : "DISPONIBLE"}`).join("\n") || "Vacía"}

═══ INSTRUCCIONES ═══
- Tienes acceso COMPLETO al inventario. Puedes ver TODOS los datos de cada cuenta.
- Si preguntan por una cuenta (@usuario), busca y da toda la info incluyendo credenciales
- Si preguntan por estadísticas financieras, CALCULA con los datos reales
- Si preguntan recomendaciones de precio, analiza el historial de ventas (margen promedio, país, seguidores)
- Puedes dar consejos de estrategia: qué tipo de cuentas comprar, a qué precio, cómo mejorar el ROI
- Si preguntan "cuánto he ganado", calcula con los datos de ventas
- Si preguntan por un comprador específico, busca en el historial
- Si preguntan por correos/emails, busca en la bodega
- Sé directo y conciso. Usa emojis moderadamente. No inventes datos.`
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

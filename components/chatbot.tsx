"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, formatFollowers } from "@/lib/store"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatBot() {
  const { accounts, goals, emailWarehouse, categories, countries, setActiveTab } = useStore()
  const { aiProviders } = useStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "¡Hola! Soy el asistente de TokStock. Puedo ayudarte con:\n\n• Info sobre tus cuentas disponibles\n• Estadísticas y reportes\n• Estado de la bodega de correos\n• Metas y progreso\n• Cualquier pregunta sobre la app\n\n¿En qué te puedo ayudar?" }
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
    const totalProfit = sold.reduce((s, a) => s + ((a.realSalePrice || 0) - (a.purchasePrice || 0)), 0)
    const totalInvested = accounts.reduce((s, a) => s + (a.purchasePrice || 0), 0)
    const emailsAvail = emailWarehouse.filter(e => !e.used).length

    const accountsList = available.slice(0, 20).map(a =>
      `@${a.username} | ${formatFollowers(a.followers)} seg. | ${a.country} | ${(a.categories || []).join(", ")} | ${formatCurrency(a.estimatedSalePrice || a.purchasePrice)}`
    ).join("\n")

    return `Eres el asistente de TokStock, una app de inventario de cuentas TikTok monetizadas. Responde en español, sé conciso y útil.

DATOS ACTUALES DEL INVENTARIO:
- Cuentas disponibles: ${available.length}
- Cuentas vendidas: ${sold.length}
- Cuentas descalificadas: ${disq.length}
- Total invertido: ${formatCurrency(totalInvested)}
- Ganancia total: ${formatCurrency(totalProfit)}
- Correos disponibles en bodega: ${emailsAvail}/${emailWarehouse.length}
- Categorías: ${categories.join(", ")}
- Países: ${countries.map(c => c.name).join(", ")}
- Metas activas: ${goals.length}

CUENTAS DISPONIBLES:
${accountsList || "No hay cuentas disponibles"}

${sold.length > 0 ? `ÚLTIMAS VENTAS:\n${sold.slice(0, 5).map(a => `@${a.username} → ${a.buyer || "?"} por ${formatCurrency(a.realSalePrice)} (ganancia: ${formatCurrency(a.profit)})`).join("\n")}` : ""}

Responde preguntas sobre el inventario, estadísticas, recomendaciones de precios, o cualquier duda sobre la app. Si te preguntan por una cuenta específica, busca en los datos. Sé directo y útil.`
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

      // Build conversation history (skip the initial greeting)
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
      {/* Header */}
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
            <p className="text-[10px] text-muted-foreground">{accounts.length} cuentas · Asistente</p>
          </div>
        </div>
      </header>

      {/* Messages */}
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

      {/* Input */}
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

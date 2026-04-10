"use client"

import { useState } from "react"
import { ArrowLeft, Plus, X, Check, Trash2, User, DollarSign, Calendar, Edit2, ChevronRight, AlertCircle, CheckCircle, Clock, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatCurrency, today, type Provider, type PendingPayment } from "@/lib/store"

const filters = ["Pendientes", "Pagados", "Todos"] as const

export function PendingPayments() {
  const { providers, setProviders, pendingPayments, setPendingPayments, setActiveTab, notify } = useStore()
  const [filter, setFilter] = useState<string>("Pendientes")
  const [view, setView] = useState<"list" | "providers">("list")
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [editingPayment, setEditingPayment] = useState<PendingPayment | null>(null)
  const [search, setSearch] = useState("")

  // Add payment form
  const [paymentProviderId, setPaymentProviderId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDesc, setPaymentDesc] = useState("")
  const [paymentDueDate, setPaymentDueDate] = useState("")

  // Add provider form
  const [providerName, setProviderName] = useState("")
  const [providerType, setProviderType] = useState<"supplier" | "vendor">("supplier")
  const [providerNotes, setProviderNotes] = useState("")

  const filteredPayments = pendingPayments.filter(p => {
    if (filter === "Pendientes" && p.paid) return false
    if (filter === "Pagados" && !p.paid) return false
    if (search) {
      const q = search.toLowerCase()
      const prov = providers.find(pr => pr.id === p.providerId)
      return p.description?.toLowerCase().includes(q) || prov?.name.toLowerCase().includes(q)
    }
    return true
  })

  // Sort: unpaid first by due date, then paid
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    return (b.createdAt || "").localeCompare(a.createdAt || "")
  })

  // Calculate totals
  const totalOwed = pendingPayments
    .filter(p => !p.paid)
    .reduce((sum, p) => {
      const prov = providers.find(pr => pr.id === p.providerId)
      return sum + (prov?.type === "supplier" ? p.amount : 0)
    }, 0)

  const totalOwedToMe = pendingPayments
    .filter(p => !p.paid)
    .reduce((sum, p) => {
      const prov = providers.find(pr => pr.id === p.providerId)
      return sum + (prov?.type === "vendor" ? p.amount : 0)
    }, 0)

  // Payments grouped by provider (for pendientes)
  const providerTotals = providers.map(pr => {
    const unpaid = pendingPayments.filter(p => p.providerId === pr.id && !p.paid)
    const total = unpaid.reduce((s, p) => s + p.amount, 0)
    const count = unpaid.length
    return { provider: pr, total, count }
  }).filter(pt => pt.count > 0)

  // ── Actions ──
  const addPayment = () => {
    if (!paymentProviderId || !paymentAmount) { notify("Completa los campos obligatorios", "error"); return }
    const newPayment: PendingPayment = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      providerId: paymentProviderId,
      amount: Number(paymentAmount),
      description: paymentDesc,
      date: today(),
      dueDate: paymentDueDate || "",
      paid: false,
      paidDate: "",
      accountIds: [],
      createdAt: new Date().toISOString(),
    }
    setPendingPayments([...pendingPayments, newPayment])
    setPaymentProviderId("")
    setPaymentAmount("")
    setPaymentDesc("")
    setPaymentDueDate("")
    setShowAddPayment(false)
    notify("Pago registrado")
  }

  const togglePaid = (id: string) => {
    setPendingPayments(pendingPayments.map(p => p.id === id ? { ...p, paid: !p.paid, paidDate: !p.paid ? today() : "" } : p))
  }

  const deletePayment = (id: string) => {
    setPendingPayments(pendingPayments.filter(p => p.id !== id))
    notify("Pago eliminado")
  }

  const saveProvider = () => {
    if (!providerName.trim()) { notify("Nombre requerido", "error"); return }
    if (editingProvider) {
      setProviders(providers.map(p => p.id === editingProvider.id ? { ...p, name: providerName.trim(), type: providerType, notes: providerNotes } : p))
      notify("Proveedor actualizado")
    } else {
      const newProvider: Provider = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        name: providerName.trim(),
        type: providerType,
        notes: providerNotes,
        createdAt: new Date().toISOString(),
      }
      setProviders([...providers, newProvider])
      notify("Proveedor agregado")
    }
    setProviderName("")
    setProviderType("supplier")
    setProviderNotes("")
    setEditingProvider(null)
    setShowAddProvider(false)
  }

  const deleteProvider = (id: string) => {
    const hasPayments = pendingPayments.some(p => p.providerId === id && !p.paid)
    if (hasPayments) { notify("No se puede eliminar, tiene pagos pendientes", "error"); return }
    setProviders(providers.filter(p => p.id !== id))
    setPendingPayments(pendingPayments.filter(p => p.providerId !== id))
    notify("Proveedor eliminado")
  }

  const openEditProvider = (p: Provider) => {
    setEditingProvider(p)
    setProviderName(p.name)
    setProviderType(p.type)
    setProviderNotes(p.notes || "")
    setShowAddProvider(true)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <button onClick={() => setActiveTab("inicio")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Pagos Pendientes</h1>
          <p className="text-[10px] text-muted-foreground">{providers.length} proveedor(es) · {pendingPayments.filter(p => !p.paid).length} pendiente(s)</p>
        </div>
      </header>

      {/* View tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        <button onClick={() => setView("list")} className={cn("flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all", view === "list" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground")}>
          Pagos
        </button>
        <button onClick={() => setView("providers")} className={cn("flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all", view === "providers" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground")}>
          Proveedores ({providers.length})
        </button>
      </div>

      {/* ─── PAYMENTS VIEW ─── */}
      {view === "list" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Yo debo</p>
              <p className="mt-1 text-xl font-bold text-destructive">{formatCurrency(totalOwed)}</p>
              <p className="text-[9px] text-muted-foreground">A proveedores</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Me deben</p>
              <p className="mt-1 text-xl font-bold text-primary">{formatCurrency(totalOwedToMe)}</p>
              <p className="text-[9px] text-muted-foreground">De vendedores</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pago o proveedor..."
              className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={cn("flex-1 rounded-full py-2 text-xs font-medium", filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                {f}
              </button>
            ))}
          </div>

          {/* Add payment button */}
          <button onClick={() => setShowAddPayment(true)} disabled={providers.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" /> Registrar Pago
          </button>
          {providers.length === 0 && <p className="text-center text-[10px] text-muted-foreground">Primero agrega un proveedor</p>}

          {/* Totals by provider (only for pendientes) */}
          {filter === "Pendientes" && providerTotals.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total por proveedor</h3>
              {providerTotals.map(({ provider, total, count }) => (
                <div key={provider.id} className="flex items-center justify-between border-b border-border/30 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{provider.type === "supplier" ? "📦" : "💵"}</span>
                    <div>
                      <p className="text-xs font-medium">{provider.name}</p>
                      <p className="text-[10px] text-muted-foreground">{count} pago(s) · {provider.type === "supplier" ? "Yo debo" : "Me debe"}</p>
                    </div>
                  </div>
                  <p className={cn("text-sm font-bold", provider.type === "supplier" ? "text-destructive" : "text-primary")}>
                    {formatCurrency(total)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Payments list */}
          <div className="flex flex-col gap-2">
            {sortedPayments.map(payment => {
              const provider = providers.find(p => p.id === payment.providerId)
              const isSupplier = provider?.type === "supplier"
              const isOverdue = !payment.paid && payment.dueDate && payment.dueDate < today()

              return (
                <div key={payment.id} className={cn("rounded-xl border bg-card p-3",
                  payment.paid ? "border-border/50 opacity-60" : isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{isSupplier ? "📦" : "💵"}</span>
                        <p className="text-sm font-semibold truncate">{provider?.name || "?"}</p>
                        {isOverdue && <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">VENCIDO</span>}
                      </div>
                      {payment.description && <p className="mt-0.5 text-[11px] text-muted-foreground">{payment.description}</p>}
                      <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                        <span>📅 {payment.date}</span>
                        {payment.dueDate && <span>⏰ Vence: {payment.dueDate}</span>}
                        {payment.paid && payment.paidDate && <span className="text-primary">✓ Pagado: {payment.paidDate}</span>}
                      </div>
                    </div>
                    <p className={cn("text-base font-bold shrink-0", payment.paid ? "text-muted-foreground" : isSupplier ? "text-destructive" : "text-primary")}>
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => togglePaid(payment.id)}
                      className={cn("flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold",
                        payment.paid ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary")}>
                      {payment.paid ? <><Clock className="h-3 w-3" /> Desmarcar</> : <><Check className="h-3 w-3" /> Marcar pagado</>}
                    </button>
                    <button onClick={() => deletePayment(payment.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {sortedPayments.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {filter === "Pendientes" ? "No hay pagos pendientes" : filter === "Pagados" ? "No hay pagos completados" : "Sin pagos registrados"}
            </div>
          )}
        </>
      )}

      {/* ─── PROVIDERS VIEW ─── */}
      {view === "providers" && (
        <>
          <button onClick={() => { setEditingProvider(null); setProviderName(""); setProviderType("supplier"); setProviderNotes(""); setShowAddProvider(true) }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Agregar Proveedor
          </button>

          {providers.length === 0 ? (
            <div className="py-12 text-center">
              <User className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin proveedores</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Agrega proveedores (que te dan cuentas) o vendedores (que te compran)</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {providers.map(p => {
                const unpaidCount = pendingPayments.filter(pp => pp.providerId === p.id && !pp.paid).length
                const unpaidTotal = pendingPayments.filter(pp => pp.providerId === p.id && !pp.paid).reduce((s, pp) => s + pp.amount, 0)
                return (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.type === "supplier" ? "📦" : "💵"}</span>
                        <div>
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.type === "supplier" ? "Me da cuentas" : "Me compra"}
                            {unpaidCount > 0 && ` · ${unpaidCount} pendiente(s)`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {unpaidTotal > 0 && (
                          <span className={cn("mr-2 text-xs font-bold", p.type === "supplier" ? "text-destructive" : "text-primary")}>
                            {formatCurrency(unpaidTotal)}
                          </span>
                        )}
                        <button onClick={() => openEditProvider(p)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteProvider(p.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {p.notes && <p className="mt-2 text-[10px] text-muted-foreground">{p.notes}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── ADD PAYMENT MODAL ─── */}
      {showAddPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAddPayment(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">Registrar Pago</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Proveedor *</label>
                <select value={paymentProviderId} onChange={e => setPaymentProviderId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none">
                  <option value="">Seleccionar</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.type === "supplier" ? "📦" : "💵"} {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Monto ($) *</label>
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Descripción</label>
                <input value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} placeholder="Ej: 5 cuentas del 10/04"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fecha de vencimiento</label>
                <input type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowAddPayment(false)} className="flex-1 rounded-xl bg-secondary py-3 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={addPayment} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT PROVIDER MODAL ─── */}
      {showAddProvider && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAddProvider(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">{editingProvider ? "Editar" : "Nuevo"} Proveedor</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nombre *</label>
                <input value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="Ej: Juan"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setProviderType("supplier")}
                    className={cn("rounded-xl border p-3 text-left transition-all", providerType === "supplier" ? "border-primary bg-primary/10" : "border-border bg-secondary")}>
                    <p className="text-sm font-semibold">📦 Proveedor</p>
                    <p className="text-[10px] text-muted-foreground">Me da cuentas (yo le debo)</p>
                  </button>
                  <button onClick={() => setProviderType("vendor")}
                    className={cn("rounded-xl border p-3 text-left transition-all", providerType === "vendor" ? "border-primary bg-primary/10" : "border-border bg-secondary")}>
                    <p className="text-sm font-semibold">💵 Vendedor</p>
                    <p className="text-[10px] text-muted-foreground">Me compra (me debe)</p>
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notas</label>
                <textarea value={providerNotes} onChange={e => setProviderNotes(e.target.value)} rows={2} placeholder="Notas opcionales..."
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setShowAddProvider(false); setEditingProvider(null) }} className="flex-1 rounded-xl bg-secondary py-3 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={saveProvider} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
                {editingProvider ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

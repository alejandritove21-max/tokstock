"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Camera, ChevronRight, Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore, formatFollowers, formatCurrency } from "@/lib/store"

const steps = ["Capturas", "Datos", "Credenciales"] as const

export function AccountForm() {
  const { editingAccount, setEditingAccount, setActiveTab, addAccount, updateAccount, accounts, countries, categories, aiProviders, emailWarehouse, setEmailWarehouse, notify } = useStore()

  const isEditing = !!editingAccount
  const [step, setStep] = useState(0)
  const [img1, setImg1] = useState(editingAccount?.screenshot || "")
  const [img2, setImg2] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState("")
  const [dupWarning, setDupWarning] = useState("")

  const [form, setForm] = useState({
    username: editingAccount?.username || "",
    profileName: editingAccount?.profileName || "",
    followers: editingAccount?.followers?.toString() || "",
    profileLink: editingAccount?.profileLink || "",
    country: editingAccount?.country || "",
    categories: editingAccount?.categories || [],
    niche: editingAccount?.niche || "",
    screenshot: editingAccount?.screenshot || "",
    notes: editingAccount?.notes || "",
    purchasePrice: editingAccount?.purchasePrice?.toString() || "",
    estimatedSalePrice: editingAccount?.estimatedSalePrice?.toString() || "",
    email: editingAccount?.email || "",
    tiktokPassword: editingAccount?.tiktokPassword || "",
    emailPassword: editingAccount?.emailPassword || "",
    emailPasswordSame: editingAccount?.emailPasswordSame || false,
  })

  const upd = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  // ── Image loading ──
  const loadImage = (file: File): Promise<string> => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX = 600
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX } else { w = Math.round(w * MAX / h); h = MAX } }
        canvas.width = w; canvas.height = h
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.7))
      }
      img.src = ev.target!.result as string
    }
    reader.readAsDataURL(file)
  })

  // ── Collage ──
  const createCollage = useCallback(() => {
    if (!img1 || !img2) return
    const imgA = new Image(); const imgB = new Image()
    let loaded = 0
    const onLoad = () => {
      if (++loaded < 2) return
      const canvas = document.createElement("canvas")
      const W = 800
      const hA = Math.round(imgA.height * (W / 2) / imgA.width)
      const hB = Math.round(imgB.height * (W / 2) / imgB.width)
      const H = Math.max(hA, hB)
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H)
      ctx.drawImage(imgA, 0, (H - hA) / 2, W / 2, hA)
      ctx.drawImage(imgB, W / 2, (H - hB) / 2, W / 2, hB)
      upd("screenshot", canvas.toDataURL("image/jpeg", 0.75))
    }
    imgA.onload = onLoad; imgB.onload = onLoad
    imgA.src = img1; imgB.src = img2
  }, [img1, img2])

  useEffect(() => { if (img1 && img2) createCollage() }, [img1, img2, createCollage])

  // ── AI ──
  const analyzeWithAI = async () => {
    const provider = aiProviders.find(p => p.active && p.key)
    if (!provider) { setAiError("No hay IA configurada. Ve a Ajustes."); return }
    const imageToAnalyze = img1 || form.screenshot
    if (!imageToAnalyze) { setAiError("Sube una imagen primero."); return }
    setAnalyzing(true); setAiError("")
    try {
      const base64 = imageToAnalyze.split(",")[1]
      let prov = "openai"
      if (provider.name.includes("Gemini")) prov = "gemini"
      if (provider.name.includes("Claude")) prov = "claude"
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, apiKey: provider.key, provider: prov }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.username) { const u = data.username.replace("@", ""); upd("username", u); upd("profileLink", `https://www.tiktok.com/@${u}`); checkDuplicate("username", u) }
      if (data.profileName) upd("profileName", data.profileName)
      if (data.followers) upd("followers", data.followers.toString())
      if (data.niche) upd("niche", data.niche)
      notify("Datos extraídos con IA")
    } catch (e: any) {
      setAiError(e.name === "AbortError" ? "La IA tardó demasiado." : `Error: ${e.message}`)
    }
    setAnalyzing(false)
  }

  // ── Duplicates ──
  const checkDuplicate = (field: string, val: string) => {
    if (!val) { setDupWarning(""); return }
    const existing = accounts.find(a => a.id !== editingAccount?.id && (field === "username" ? a.username?.toLowerCase() === val.toLowerCase() : a.email?.toLowerCase() === val.toLowerCase()))
    setDupWarning(existing ? `⚠️ Ya existe una cuenta con este ${field === "username" ? "usuario" : "email"}: @${existing.username}` : "")
  }

  // ── Save ──
  const handleSave = async () => {
    if (!form.username) { notify("El usuario es obligatorio", "error"); return }
    if (!form.followers) { notify("Los seguidores son obligatorios", "error"); return }
    if (!form.purchasePrice) { notify("El precio de compra es obligatorio", "error"); return }
    try {
      if (isEditing) {
        await updateAccount(editingAccount!.id, form)
        notify("Cuenta actualizada")
      } else {
        const newAcc = await addAccount(form)
        // Mark email as used in warehouse
        if (form.email) {
          const updated = emailWarehouse.map(e => e.email.toLowerCase() === form.email.toLowerCase() ? { ...e, used: true, usedBy: form.username } : e)
          setEmailWarehouse(updated)
        }
        notify("Cuenta agregada")
      }
      setEditingAccount(null)
      setActiveTab("inventario")
    } catch (e: any) {
      notify(`Error: ${e.message}`, "error")
    }
  }

  const margin = form.estimatedSalePrice && form.purchasePrice ? Number(form.estimatedSalePrice) - Number(form.purchasePrice) : null

  const cancel = () => { setEditingAccount(null); setActiveTab("inicio") }

  return (
    <div className="flex min-h-screen flex-col pb-8 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-4 backdrop-blur-xl">
        <button onClick={cancel} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">{isEditing ? "Editar Cuenta" : "Nueva Cuenta"}</h1>
      </header>

      {/* Progress */}
      <div className="flex gap-2 px-4 py-2">
        {steps.map((s, i) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {/* Duplicate Warning */}
      {dupWarning && (
        <div className="mx-4 mb-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs font-semibold text-warning">{dupWarning}</div>
      )}

      <div className="flex-1 px-4 pt-2">
        {/* ── Step 0: Capturas ── */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold">Capturas de Pantalla</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sube perfil y programa de recompensas</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Image 1: Profile */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Perfil</p>
                {img1 ? (
                  <div className="relative">
                    <img src={img1} className="h-36 w-full rounded-xl border border-border object-cover" />
                    <button onClick={() => { setImg1(""); upd("screenshot", "") }} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-destructive text-white text-xs">✕</button>
                  </div>
                ) : (
                  <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-all hover:border-primary">
                    <span className="text-2xl">📱</span>
                    <span className="mt-1 text-[10px] text-muted-foreground">Perfil</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) setImg1(await loadImage(e.target.files[0])) }} />
                  </label>
                )}
              </div>

              {/* Image 2: Rewards */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recompensas</p>
                {img2 ? (
                  <div className="relative">
                    <img src={img2} className="h-36 w-full rounded-xl border border-border object-cover" />
                    <button onClick={() => { setImg2(""); if (img1) upd("screenshot", img1) }} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-destructive text-white text-xs">✕</button>
                  </div>
                ) : (
                  <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-all hover:border-primary">
                    <span className="text-2xl">💰</span>
                    <span className="mt-1 text-[10px] text-muted-foreground">Recompensas</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) setImg2(await loadImage(e.target.files[0])) }} />
                  </label>
                )}
              </div>
            </div>

            {/* Collage preview */}
            {form.screenshot && img1 && img2 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold text-primary">✅ Collage creado</p>
                <img src={form.screenshot} className="h-28 w-full rounded-xl border border-border object-cover" />
              </div>
            )}

            {/* AI */}
            {(img1 || form.screenshot) && (
              <>
                <button onClick={analyzeWithAI} disabled={analyzing} className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all", analyzing ? "bg-muted text-muted-foreground" : "bg-gradient-to-r from-violet-600 to-purple-700 text-white")}>
                  <Sparkles className="h-4 w-4" />
                  {analyzing ? "Analizando..." : "Analizar con IA"}
                </button>
                {aiError && <p className="rounded-xl bg-destructive/10 px-4 py-2 text-xs text-destructive">{aiError}</p>}
                {!analyzing && form.username && <p className="rounded-xl bg-primary/10 px-4 py-2 text-xs text-primary">✅ @{form.username} · {formatFollowers(Number(form.followers))} seg. · {form.niche || "—"}</p>}
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={cancel} className="flex-1 rounded-xl bg-secondary py-3.5 font-medium text-muted-foreground">Cancelar</button>
              <button onClick={() => { if (!form.screenshot && img1) upd("screenshot", img1); setStep(1) }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground">
                {img1 ? "Siguiente" : "Saltar"} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: General Data ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Datos Generales</h2>

            <Field label="Nombre de usuario *" placeholder="@usuario" value={form.username} onChange={(v) => { upd("username", v.replace("@", "")); upd("profileLink", v ? `https://www.tiktok.com/@${v.replace("@", "")}` : ""); checkDuplicate("username", v.replace("@", "")) }} />
            <Field label="Nombre del perfil" placeholder="Nombre visible" value={form.profileName} onChange={(v) => upd("profileName", v)} />
            <Field label="Seguidores *" placeholder="10000" type="number" value={form.followers} onChange={(v) => upd("followers", v)} />
            <Field label="Link del perfil" placeholder="https://tiktok.com/@..." value={form.profileLink} onChange={(v) => upd("profileLink", v)} />

            {/* Country */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">País</label>
              <select value={form.country} onChange={(e) => upd("country", e.target.value)} className="w-full appearance-none rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none">
                <option value="">Seleccionar país</option>
                {countries.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
              </select>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Precio Compra ($) *" placeholder="0.00" type="number" value={form.purchasePrice} onChange={(v) => upd("purchasePrice", v)} />
              <Field label="Precio Venta Est. ($)" placeholder="0.00" type="number" value={form.estimatedSalePrice} onChange={(v) => upd("estimatedSalePrice", v)} />
            </div>
            {margin !== null && (
              <p className="text-center text-xs">Margen estimado: <span className={cn("font-bold", margin >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(margin)}</span></p>
            )}

            <Field label="Nicho" placeholder="Entretenimiento, Cocina..." value={form.niche} onChange={(v) => upd("niche", v)} />

            {/* Categories */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Categorías</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button key={cat} onClick={() => upd("categories", form.categories.includes(cat) ? form.categories.filter((c: string) => c !== cat) : [...form.categories, cat])}
                    className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-all", form.categories.includes(cat) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Notas" placeholder="Notas internas..." value={form.notes} onChange={(v) => upd("notes", v)} multiline />

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(0)} className="flex-1 rounded-xl bg-secondary py-3.5 font-medium text-muted-foreground">Atrás</button>
              <button onClick={() => setStep(2)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground">
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Credentials ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Credenciales</h2>

            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Email</label>
              <input placeholder="email@ejemplo.com" value={form.email}
                onChange={(e) => {
                  upd("email", e.target.value); checkDuplicate("email", e.target.value)
                  const match = emailWarehouse.find(w => w.email.toLowerCase() === e.target.value.toLowerCase())
                  if (match?.password) { upd("emailPassword", match.password); upd("emailPasswordSame", false) }
                }}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />

              {/* Warehouse suggestions */}
              {emailWarehouse.filter(w => !w.used).length > 0 && !form.email && (
                <div className="mt-2">
                  <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground">📧 Correos de bodega:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {emailWarehouse.filter(w => !w.used).slice(0, 6).map((w, i) => (
                      <button key={i} onClick={() => {
                        upd("email", w.email)
                        if (w.password) { upd("emailPassword", w.password); upd("emailPasswordSame", false) }
                        checkDuplicate("email", w.email)
                      }} className="rounded-lg border border-border bg-card px-2 py-1 text-[10px] text-foreground transition-all active:scale-95">
                        {w.email.split("@")[0]}@...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Field label="Contraseña TikTok" placeholder="Contraseña" value={form.tiktokPassword} onChange={(v) => upd("tiktokPassword", v)} />

            <div className="flex items-center gap-3">
              <button onClick={() => upd("emailPasswordSame", !form.emailPasswordSame)} className={cn("flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all", form.emailPasswordSame ? "border-primary bg-primary" : "border-muted-foreground")}>
                {form.emailPasswordSame && <Check className="h-3 w-3 text-primary-foreground" />}
              </button>
              <span className="text-sm text-muted-foreground">Misma contraseña para email</span>
            </div>

            {!form.emailPasswordSame && (
              <Field label="Contraseña Email" placeholder="Contraseña del email" value={form.emailPassword} onChange={(v) => upd("emailPassword", v)} />
            )}

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl bg-secondary py-3.5 font-medium text-muted-foreground">Atrás</button>
              <button onClick={handleSave} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground">
                <Check className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, type = "text", multiline }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean }) {
  const Comp = multiline ? "textarea" : "input"
  return (
    <div>
      <label className="mb-2 block text-sm text-muted-foreground">{label}</label>
      <Comp type={type} placeholder={placeholder} value={value} onChange={(e: any) => onChange(e.target.value)}
        className={cn("w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary", multiline && "min-h-[80px] resize-none")} />
    </div>
  )
}

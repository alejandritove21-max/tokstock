"use client"

import { useState, useEffect } from "react"
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
  const [aiResult, setAiResult] = useState<any>(null)
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "match" | "mismatch" | "error">("idle")
  const [verifyData, setVerifyData] = useState<any>(null)
  const [dupWarning, setDupWarning] = useState("")

  const [form, setForm] = useState({
    username: editingAccount?.username || "",
    profileName: editingAccount?.profileName || "",
    followers: editingAccount?.followers?.toString() || "",
    profileLink: editingAccount?.profileLink || "",
    country: editingAccount?.country || "",
    categories: editingAccount?.categories || [],
    niche: editingAccount?.niche || "",
    publicType: editingAccount?.publicType || "",
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
  useEffect(() => {
    if (!img1 || !img2) return
    
    const imgA = new Image()
    const imgB = new Image()
    let loadedCount = 0
    let cancelled = false

    const tryCreateCollage = () => {
      loadedCount++
      if (loadedCount < 2 || cancelled) return
      
      try {
        const canvas = document.createElement("canvas")
        const W = 800
        const hA = Math.round(imgA.height * (W / 2) / imgA.width)
        const hB = Math.round(imgB.height * (W / 2) / imgB.width)
        const H = Math.max(hA, hB)
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(imgA, 0, Math.round((H - hA) / 2), W / 2, hA)
        ctx.drawImage(imgB, W / 2, Math.round((H - hB) / 2), W / 2, hB)
        const collageData = canvas.toDataURL("image/jpeg", 0.75)
        setForm(f => ({ ...f, screenshot: collageData }))
      } catch (e) {
        console.error("Collage error:", e)
      }
    }

    imgA.onload = tryCreateCollage
    imgB.onload = tryCreateCollage
    imgA.onerror = () => console.error("Failed to load img1")
    imgB.onerror = () => console.error("Failed to load img2")
    imgA.src = img1
    imgB.src = img2

    return () => { cancelled = true }
  }, [img1, img2])

  // ── AI ──
  const analyzeWithAI = async () => {
    const provider = aiProviders.find(p => p.active && p.key)
    if (!provider) { setAiError("No hay IA configurada. Ve a Ajustes."); return }
    const imageToAnalyze = img1 || form.screenshot
    if (!imageToAnalyze) { setAiError("Sube una imagen primero."); return }
    setAnalyzing(true); setAiError(""); setAiResult(null)
    try {
      // Compress for AI but keep readable (800px max height for profile screenshots)
      const compressForAI = (dataUrl: string): Promise<string> => new Promise(resolve => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX = 800
          let w = img.width, h = img.height
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
          canvas.width = w; canvas.height = h
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1])
        }
        img.src = dataUrl
      })

      const base64 = await compressForAI(imageToAnalyze)
      let prov = "openai"
      if (provider.name.toLowerCase().includes("claude") || provider.name.toLowerCase().includes("anthropic")) prov = "claude"

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, apiKey: provider.key, provider: prov }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      // Set all detected fields
      if (data.username) { 
        const u = data.username.replace("@", "")
        upd("username", u)
        upd("profileLink", `https://www.tiktok.com/@${u}`)
        checkDuplicate("username", u)
      }
      if (data.profileName) upd("profileName", data.profileName)
      if (data.followers) upd("followers", data.followers.toString())
      if (data.niche) upd("niche", data.niche)
      
      setAiResult(data) // Store for verification display
      
      // Verify username by checking TikTok profile
      if (data.username) {
        setVerifyStatus("checking")
        try {
          const vRes = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: data.username }),
          })
          const vData = await vRes.json()
          setVerifyData(vData)
          
          if (vData.verified) {
            // Compare followers if available
            if (vData.followers && data.followers) {
              const aiFollowers = Number(data.followers)
              const realFollowers = vData.followers
              const diff = Math.abs(aiFollowers - realFollowers) / Math.max(aiFollowers, realFollowers, 1)
              if (diff < 0.3) {
                setVerifyStatus("match")
              } else {
                setVerifyStatus("mismatch")
                // Auto-correct followers from real data
                upd("followers", realFollowers.toString())
              }
            } else {
              setVerifyStatus("match")
            }
            // Auto-correct profile name if we got it
            if (vData.profileName && !data.profileName) {
              upd("profileName", vData.profileName)
            }
          } else {
            setVerifyStatus("mismatch")
          }
        } catch {
          setVerifyStatus("error")
        }
      }
      
      notify("Datos extraídos — Verifica que estén correctos")
    } catch (e: any) {
      setAiError(e.name === "AbortError" ? "La IA tardó demasiado. Intenta de nuevo." : e.message || "Error desconocido")
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
              <p className="mt-1 text-sm text-muted-foreground">
                {!img1 && !img2 ? "Selecciona las 2 capturas a la vez (perfil + recompensas)" : img1 && img2 ? "Collage listo" : "Sube la segunda imagen"}
              </p>
            </div>

            {/* Multi-file upload button */}
            {(!img1 || !img2) && (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary/30 py-12 transition-all active:scale-[0.98]">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                  <span className="text-3xl">📷</span>
                </div>
                <div className="text-center">
                  <p className="font-medium">Seleccionar imágenes</p>
                  <p className="text-sm text-muted-foreground">Toca y selecciona las 2 capturas</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) return
                    
                    if (files.length >= 2) {
                      // Load both images
                      const loaded1 = await loadImage(files[0])
                      const loaded2 = await loadImage(files[1])
                      
                      // Auto-detect: profile screenshot is usually taller (more height ratio)
                      // We check which image has a profile-like aspect ratio
                      const getAspect = (dataUrl: string): Promise<number> => new Promise(resolve => {
                        const img = new Image()
                        img.onload = () => resolve(img.height / img.width)
                        img.src = dataUrl
                      })
                      
                      const aspect1 = await getAspect(loaded1)
                      const aspect2 = await getAspect(loaded2)
                      
                      // The taller image (higher h/w ratio) is the profile
                      if (aspect1 >= aspect2) {
                        setImg1(loaded1) // profile (taller)
                        setImg2(loaded2) // rewards
                      } else {
                        setImg1(loaded2) // profile (taller)
                        setImg2(loaded1) // rewards
                      }
                    } else {
                      // Single file - put it as img1 if empty, else img2
                      const loaded = await loadImage(files[0])
                      if (!img1) setImg1(loaded)
                      else setImg2(loaded)
                    }
                    // Reset input so same file can be selected again
                    e.target.value = ""
                  }}
                />
              </label>
            )}

            {/* Preview both images */}
            {(img1 || img2) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">📱 Perfil</p>
                  {img1 ? (
                    <div className="relative">
                      <img src={img1} className="h-36 w-full rounded-xl border border-border object-cover" />
                      <button onClick={() => { setImg1(""); setForm(f => ({ ...f, screenshot: "" })) }} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-destructive text-white text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">Pendiente</div>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">💰 Recompensas</p>
                  {img2 ? (
                    <div className="relative">
                      <img src={img2} className="h-36 w-full rounded-xl border border-border object-cover" />
                      <button onClick={() => { setImg2(""); if (img1) setForm(f => ({ ...f, screenshot: img1 })) }} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-destructive text-white text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">Pendiente</div>
                  )}
                </div>
              </div>
            )}

            {/* Collage preview */}
            {form.screenshot && img1 && img2 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold text-primary">✅ Collage creado automáticamente</p>
                <img src={form.screenshot} className="h-28 w-full rounded-xl border border-primary/30 object-cover" />
              </div>
            )}

            {/* AI */}
            {(img1 || form.screenshot) && (
              <>
                <button onClick={analyzeWithAI} disabled={analyzing} className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all", analyzing ? "bg-muted text-muted-foreground" : "bg-gradient-to-r from-violet-600 to-purple-700 text-white")}>
                  <Sparkles className="h-4 w-4" />
                  {analyzing ? "Analizando..." : aiResult ? "Re-analizar con IA" : "Analizar con IA"}
                </button>
                {aiError && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">{aiError}</p>}
                
                {/* AI Verification Card */}
                {aiResult && !analyzing && (
                  <div className={cn("rounded-xl border p-4", 
                    verifyStatus === "match" ? "border-primary/30 bg-primary/5" :
                    verifyStatus === "mismatch" ? "border-warning/30 bg-warning/5" :
                    "border-primary/30 bg-primary/5"
                  )}>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-primary">
                        {verifyStatus === "checking" ? "⏳ Verificando perfil..." :
                         verifyStatus === "match" ? "✅ Perfil verificado" :
                         verifyStatus === "mismatch" ? "⚠️ Verificación con diferencias" :
                         verifyStatus === "error" ? "❓ No se pudo verificar" :
                         "✅ Datos detectados"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Usuario</span>
                        <span className="font-mono text-xs font-semibold">@{form.username || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Nombre</span>
                        <span className="text-xs font-medium">{form.profileName || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Seguidores (IA)</span>
                        <span className="text-xs font-bold">{Number(form.followers).toLocaleString() || "0"}</span>
                      </div>
                      {verifyData?.followers > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Seguidores (TikTok real)</span>
                          <span className={cn("text-xs font-bold", verifyStatus === "match" ? "text-primary" : "text-warning")}>{verifyData.followers.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Nicho</span>
                        <span className="text-xs">{form.niche || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Público</span>
                        <span className="text-xs">{form.publicType || "—"}</span>
                      </div>
                    </div>
                    {verifyStatus === "mismatch" && (
                      <p className="mt-2 text-[10px] font-medium text-warning">⚠️ Los datos no coinciden exactamente. Revisa el username y seguidores.</p>
                    )}
                    <p className="mt-2 text-[10px] text-muted-foreground">Puedes corregir en el siguiente paso</p>
                  </div>
                )}
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

            {/* Tipo de Público */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Tipo de Público</label>
              <div className="flex flex-wrap gap-2">
                {["Latino", "Árabe", "Mixto"].map(tipo => (
                  <button key={tipo} onClick={() => upd("publicType", form.publicType === tipo ? "" : tipo)}
                    className={cn("rounded-lg px-4 py-2 text-xs font-medium transition-all", form.publicType === tipo ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground")}>
                    {tipo === "Latino" ? "🌎 Latino" : tipo === "Árabe" ? "🕌 Árabe" : "🌍 Mixto"}
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

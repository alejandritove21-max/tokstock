"use client"

import { create } from "zustand"
import { db, supabase, fromDbAccount } from "./supabase"

// ── Types ──

export interface Account {
  id: number
  username: string
  profileName: string
  followers: number
  profileLink: string
  country: string
  categories: string[]
  niche: string
  publicType: string
  screenshot: string
  notes: string
  purchasePrice: number
  estimatedSalePrice: number
  realSalePrice: number
  profit: number
  email: string
  tiktokPassword: string
  emailPassword: string
  emailPasswordSame: boolean
  status: "available" | "sold" | "disqualified"
  soldDate: string | null
  disqualifiedDate: string | null
  buyer: string
  createdAt: string
}

export interface Goal {
  id: string
  name: string
  amount: number
  createdAt: string
}

export interface WarehouseEmail {
  email: string
  password: string
  used: boolean
  usedBy: string
  addedDate: string
}

export interface AIProvider {
  name: string
  key: string
  active: boolean
}

export interface WhapiChannel {
  id: string
  name: string
  enabled: boolean
  // Maps account ID -> WhatsApp message ID for deletion tracking
  messageMap: Record<string, string>
}

export interface WhapiConfig {
  token: string
  channels: WhapiChannel[]
  broadcastTemplate: string
}

interface AppState {
  // Navigation
  activeTab: string
  setActiveTab: (tab: string) => void

  // Accounts
  accounts: Account[]
  loading: boolean
  loadAccounts: () => Promise<void>
  addAccount: (acc: Record<string, any>) => Promise<Account>
  updateAccount: (id: number, acc: Record<string, any>) => Promise<Account>
  deleteAccount: (id: number) => Promise<void>

  // Settings
  countries: { name: string; emoji: string }[]
  categories: string[]
  aiProviders: AIProvider[]
  whatsappTemplate: string
  comboTemplate: string
  goals: Goal[]
  emailWarehouse: WarehouseEmail[]
  darkMode: boolean
  loadSettings: () => Promise<void>
  saveSetting: (key: string, value: any) => Promise<void>
  setCountries: (v: any) => void
  setCategories: (v: any) => void
  setAiProviders: (v: any) => void
  setWhatsappTemplate: (v: string) => void
  setComboTemplate: (v: string) => void
  setGoals: (v: Goal[]) => void
  setEmailWarehouse: (v: WarehouseEmail[]) => void
  setDarkMode: (v: boolean) => void

  // Whapi
  whapiConfig: WhapiConfig
  setWhapiConfig: (v: WhapiConfig) => void
  sendToChannel: (acc: Account) => Promise<void>
  deleteFromChannel: (accountId: number) => Promise<void>

  // UI State
  selectedAccount: Account | null
  setSelectedAccount: (a: Account | null) => void
  editingAccount: Account | null
  setEditingAccount: (a: Account | null) => void
  showMenu: boolean
  setShowMenu: (v: boolean) => void
  notification: { message: string; type: string } | null
  notify: (message: string, type?: string) => void
}

const DEFAULT_COUNTRIES = [
  { name: "Estados Unidos", emoji: "🇺🇸" },
  { name: "Mexico", emoji: "🇲🇽" },
  { name: "España", emoji: "🇪🇸" },
  { name: "Alemania", emoji: "🇩🇪" },
  { name: "Francia", emoji: "🇫🇷" },
  { name: "Brasil", emoji: "🇧🇷" },
]

const DEFAULT_CATEGORIES = [
  "Creator Rewards",
  "Público Latino",
  "Público Árabe",
  "Público Mixto",
  "TikTok Shop",
]

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  activeTab: "inicio",
  setActiveTab: (tab) => set({ activeTab: tab, selectedAccount: null }),

  // Accounts
  accounts: [],
  loading: true,
  loadAccounts: async () => {
    try {
      const fields = "id, username, profile_name, followers, profile_link, country, categories, niche, notes, purchase_price, estimated_sale_price, real_sale_price, profit, email, tiktok_password, email_password, email_password_same, status, sold_date, disqualified_date, buyer, created_at"

      // Available + disqualified: WITH screenshots
      const { data: withImg } = await supabase
        .from("accounts")
        .select(fields + ", screenshot")
        .in("status", ["available", "disqualified"])
        .order("created_at", { ascending: false })

      // Sold: WITHOUT screenshots (lighter)
      const { data: noImg } = await supabase
        .from("accounts")
        .select(fields)
        .eq("status", "sold")
        .order("created_at", { ascending: false })

      const all = [
        ...((withImg || []).map(fromDbAccount)),
        ...((noImg || []).map(fromDbAccount)),
      ]
      set({ accounts: all, loading: false })
    } catch (e) {
      console.error("Failed to load accounts:", e)
      set({ loading: false })
    }
  },
  addAccount: async (acc) => {
    const newAcc = await db.addAccount(acc)
    set((s) => ({ accounts: [newAcc, ...s.accounts] }))
    // Auto-send to WhatsApp channel
    if (newAcc.status === "available") {
      get().sendToChannel(newAcc)
    }
    return newAcc
  },
  updateAccount: async (id, acc) => {
    const updated = await db.updateAccount(id, acc)
    const prevAccount = get().accounts.find(a => a.id === id)
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      selectedAccount: s.selectedAccount?.id === id ? { ...s.selectedAccount, ...updated } : s.selectedAccount,
    }))
    // Auto-delete from WhatsApp channel when sold or disqualified
    if (prevAccount?.status === "available" && (updated.status === "sold" || updated.status === "disqualified")) {
      get().deleteFromChannel(id)
    }
    // Auto-send if restored to available
    if (prevAccount?.status !== "available" && updated.status === "available") {
      get().sendToChannel(updated)
    }
    return updated
  },
  deleteAccount: async (id) => {
    // Auto-delete from channel before removing
    get().deleteFromChannel(id)
    await db.deleteAccount(id)
    set((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
      selectedAccount: s.selectedAccount?.id === id ? null : s.selectedAccount,
    }))
  },

  // Settings
  countries: DEFAULT_COUNTRIES,
  categories: DEFAULT_CATEGORIES,
  aiProviders: [{ name: "OpenAI (GPT-4o)", key: "", active: false }],
  whatsappTemplate: "💵 *CUENTA TIKTOK MONETIZADA*\n\n👤 Usuario: @{username}\n👥 Seguidores: {followers}\n\n📂 Nicho: {niche}\n🔗 Link: {link}\n\n📧 Email: {email}\n\n🔑 Contraseña TikTok: {tiktokPassword}\n\n🔑 Contraseña Email: {emailPassword}\n\n⚠️ *INSTRUCCIONES:*\n• No iniciar sesión en varios dispositivos\n• No usar VPN gratuitos\n• No hacer cambios bruscos de manera inmediata\n\n— TokStock 🔒",
  comboTemplate: "👤 @{username}\n📧 {email}\n🔑 TikTok: {tiktokPassword}\n🔑 Email: {emailPassword}\n💵 {price}\n",
  goals: [],
  emailWarehouse: [],
  darkMode: true,

  loadSettings: async () => {
    try {
      const results = await Promise.allSettled([
        db.getSetting("countries"),
        db.getSetting("categories"),
        db.getSetting("aiProviders"),
        db.getSetting("whatsappTemplate"),
        db.getSetting("goals"),
        db.getSetting("emailWarehouse"),
        db.getSetting("theme"),
        db.getSetting("whapiConfig"),
        db.getSetting("comboTemplate"),
      ])
      const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value : null
        // Migrate old whapiConfig format to new multi-channel format
        let whapiCfg = val(7)
        if (whapiCfg && typeof whapiCfg === "object") {
          if (!Array.isArray(whapiCfg.channels)) {
            const oldChannels = whapiCfg.channelId ? [{ id: whapiCfg.channelId, name: whapiCfg.channelName || "Canal", enabled: whapiCfg.enabled || false, messageMap: whapiCfg.messageMap || {} }] : []
            whapiCfg = { token: whapiCfg.token || "", channels: oldChannels, broadcastTemplate: whapiCfg.broadcastTemplate || get().whapiConfig.broadcastTemplate }
          }
        } else {
          whapiCfg = get().whapiConfig
        }
        set({
          countries: Array.isArray(val(0)) ? val(0) : DEFAULT_COUNTRIES,
          categories: Array.isArray(val(1)) ? val(1) : DEFAULT_CATEGORIES,
          aiProviders: Array.isArray(val(2)) ? val(2) : [{ name: "OpenAI (GPT-4o)", key: "", active: false }],
          whatsappTemplate: typeof val(3) === "string" ? val(3) : get().whatsappTemplate,
          goals: Array.isArray(val(4)) ? val(4) : [],
          emailWarehouse: Array.isArray(val(5)) ? val(5) : [],
          darkMode: val(6) !== "light",
          whapiConfig: whapiCfg,
          comboTemplate: typeof val(8) === "string" ? val(8) : get().comboTemplate,
        })
    } catch (e) {
      console.error("Failed to load settings:", e)
    }
  },

  saveSetting: async (key, value) => {
    await db.setSetting(key, value)
  },

  setCountries: (v) => { set({ countries: v }); db.setSetting("countries", v) },
  setCategories: (v) => { set({ categories: v }); db.setSetting("categories", v) },
  setAiProviders: (v) => { set({ aiProviders: v }); db.setSetting("aiProviders", v) },
  setWhatsappTemplate: (v) => { set({ whatsappTemplate: v }); db.setSetting("whatsappTemplate", v) },
  setComboTemplate: (v) => { set({ comboTemplate: v }); db.setSetting("comboTemplate", v) },
  setGoals: (v) => { set({ goals: v }); db.setSetting("goals", v) },
  setEmailWarehouse: (v) => { set({ emailWarehouse: v }); db.setSetting("emailWarehouse", v) },
  setDarkMode: (v) => { set({ darkMode: v }); db.setSetting("theme", v ? "dark" : "light") },

  // Whapi
  whapiConfig: { token: "", channels: [], broadcastTemplate: "💰 *CUENTA DISPONIBLE*\n\n👤 @{username}\n👥 {followers} seguidores\n{flag} {country}\n📂 {categories}\n💵 Precio: {price}\n\n🔗 {link}" },
  setWhapiConfig: (v) => { set({ whapiConfig: v }); db.setSetting("whapiConfig", v) },

  sendToChannel: async (acc) => {
    const { whapiConfig, countries } = get()
    const activeChannels = whapiConfig.channels.filter(ch => ch.enabled)
    if (!whapiConfig.token || activeChannels.length === 0) return
    try {
      const flag = countries.find(c => c.name === acc.country)?.emoji || ""
      const cats = (acc.categories || []).join(", ")
      const template = whapiConfig.broadcastTemplate || "💰 *CUENTA DISPONIBLE*\n\n👤 @{username}\n👥 {followers} seguidores\n{flag} {country}\n📂 {categories}\n💵 Precio: {price}\n\n🔗 {link}"
      const caption = template
        .replace("{username}", acc.username || "")
        .replace("{followers}", formatFollowers(acc.followers))
        .replace("{country}", acc.country || "—")
        .replace("{flag}", flag)
        .replace("{categories}", cats || "—")
        .replace("{niche}", acc.niche || "—")
        .replace("{price}", formatCurrency(acc.estimatedSalePrice || acc.purchasePrice))
        .replace("{link}", acc.profileLink || "")
        .replace("{purchasePrice}", formatCurrency(acc.purchasePrice))
        .replace("{estimatedPrice}", formatCurrency(acc.estimatedSalePrice))
        .replace("{publico}", acc.publicType || "—")

      // Single API call sends to ALL channels server-side
      const res = await fetch("/api/whapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMulti",
          token: whapiConfig.token,
          channelIds: activeChannels.map(ch => ch.id),
          caption,
          imageBase64: acc.screenshot || null,
        }),
      })
      const json = await res.json()
      const results = json.results || {}
      console.log("[TokStock] sendMulti results:", JSON.stringify(json))

      // Update messageMap for each channel
      let updatedChannels = whapiConfig.channels.map(ch => ({ ...ch, messageMap: { ...ch.messageMap } }))
      for (const ch of activeChannels) {
        const msgId = results[ch.id]
        if (msgId) {
          const idx = updatedChannels.findIndex(c => c.id === ch.id)
          if (idx >= 0) updatedChannels[idx].messageMap[String(acc.id)] = msgId
        }
      }

      const updated = { ...whapiConfig, channels: updatedChannels }
      set({ whapiConfig: updated })
      db.setSetting("whapiConfig", updated)
    } catch (e) {
      console.error("Failed to send to channels:", e)
    }
  },

  deleteFromChannel: async (accountId) => {
    const { whapiConfig } = get()
    const activeChannels = whapiConfig.channels.filter(ch => ch.enabled)
    if (!whapiConfig.token || activeChannels.length === 0) return
    const key = String(accountId)

    // Collect all message IDs to delete across channels
    const messageIds: string[] = []
    for (const ch of activeChannels) {
      const msgId = ch.messageMap[key]
      if (msgId) messageIds.push(msgId)
    }
    if (messageIds.length === 0) return

    try {
      await fetch("/api/whapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteMulti", token: whapiConfig.token, messageIds }),
      })
    } catch (e) { console.error("Failed to delete from channels:", e) }

    // Remove from all channel maps
    const updatedChannels = whapiConfig.channels.map(ch => {
      const newMap = { ...ch.messageMap }
      delete newMap[key]
      return { ...ch, messageMap: newMap }
    })
    const updated = { ...whapiConfig, channels: updatedChannels }
    set({ whapiConfig: updated })
    db.setSetting("whapiConfig", updated)
  },

  // UI State
  selectedAccount: null,
  setSelectedAccount: (a) => set({ selectedAccount: a }),
  editingAccount: null,
  setEditingAccount: (a) => set({ editingAccount: a }),
  showMenu: false,
  setShowMenu: (v) => set({ showMenu: v }),
  notification: null,
  notify: (message, type = "success") => {
    set({ notification: { message, type } })
    setTimeout(() => set({ notification: null }), 3000)
  },
}))

// ── Helpers ──

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0)
}

export function formatFollowers(num: number): string {
  if (!num) return "0"
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" })
}

// Get current date/time parts in Venezuela timezone
export function venezuelaNow() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  })
  return formatter.format(new Date())
}

// Format a date nicely in Venezuela timezone
export function venezuelaDateStr(): string {
  return new Date().toLocaleDateString("es-VE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/Caracas",
  })
}

// Convert any date string to Venezuela date key (YYYY-MM-DD)
export function toVenezuelaKey(dateStr: string | null): string {
  if (!dateStr) return ""
  try {
    // If it's a plain date like "2026-03-22", append noon to avoid UTC midnight shift
    let d: Date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      d = new Date(dateStr + "T12:00:00")
    } else {
      d = new Date(dateStr)
    }
    if (isNaN(d.getTime())) return ""
    return d.toLocaleDateString("en-CA", { timeZone: "America/Caracas" })
  } catch {
    return ""
  }
}

// Get Venezuela date N days ago as YYYY-MM-DD
export function venezuelaDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString("en-CA", { timeZone: "America/Caracas" })
}

// Check if a date string falls on or after a reference date key
export function isOnOrAfter(dateStr: string | null, refKey: string): boolean {
  if (!dateStr || !refKey) return false
  const key = toVenezuelaKey(dateStr)
  return key >= refKey
}

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

export interface WhapiConfig {
  token: string
  channelId: string
  channelName: string
  enabled: boolean
  // Maps account ID -> WhatsApp message ID for deletion tracking
  messageMap: Record<number, string>
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
  goals: Goal[]
  emailWarehouse: WarehouseEmail[]
  darkMode: boolean
  loadSettings: () => Promise<void>
  saveSetting: (key: string, value: any) => Promise<void>
  setCountries: (v: any) => void
  setCategories: (v: any) => void
  setAiProviders: (v: any) => void
  setWhatsappTemplate: (v: string) => void
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
      ])
      const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value : null
      set({
        countries: Array.isArray(val(0)) ? val(0) : DEFAULT_COUNTRIES,
        categories: Array.isArray(val(1)) ? val(1) : DEFAULT_CATEGORIES,
        aiProviders: Array.isArray(val(2)) ? val(2) : [{ name: "OpenAI (GPT-4o)", key: "", active: false }],
        whatsappTemplate: typeof val(3) === "string" ? val(3) : get().whatsappTemplate,
        goals: Array.isArray(val(4)) ? val(4) : [],
        emailWarehouse: Array.isArray(val(5)) ? val(5) : [],
        darkMode: val(6) !== "light",
        whapiConfig: val(7) && typeof val(7) === "object" ? val(7) : get().whapiConfig,
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
  setGoals: (v) => { set({ goals: v }); db.setSetting("goals", v) },
  setEmailWarehouse: (v) => { set({ emailWarehouse: v }); db.setSetting("emailWarehouse", v) },
  setDarkMode: (v) => { set({ darkMode: v }); db.setSetting("theme", v ? "dark" : "light") },

  // Whapi
  whapiConfig: { token: "", channelId: "", channelName: "", enabled: false, messageMap: {} },
  setWhapiConfig: (v) => { set({ whapiConfig: v }); db.setSetting("whapiConfig", v) },

  sendToChannel: async (acc) => {
    const { whapiConfig, countries } = get()
    if (!whapiConfig.enabled || !whapiConfig.token || !whapiConfig.channelId) return
    try {
      const flag = countries.find(c => c.name === acc.country)?.emoji || ""
      const cats = (acc.categories || []).join(", ")
      const caption = `💰 *CUENTA DISPONIBLE*\n\n👤 @${acc.username}\n👥 ${formatFollowers(acc.followers)} seguidores\n${flag} ${acc.country || "—"}${cats ? `\n📂 ${cats}` : ""}\n💵 Precio: ${formatCurrency(acc.estimatedSalePrice || acc.purchasePrice)}${acc.profileLink ? `\n\n🔗 ${acc.profileLink}` : ""}`

      let json: any

      if (acc.screenshot) {
        const res = await fetch("/api/whapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sendImage",
            token: whapiConfig.token,
            channelId: whapiConfig.channelId,
            caption,
            imageBase64: acc.screenshot,
          }),
        })
        json = await res.json()
      } else {
        const res = await fetch("/api/whapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sendMessage",
            token: whapiConfig.token,
            channelId: whapiConfig.channelId,
            body: caption,
          }),
        })
        json = await res.json()
      }

      // Extract message ID - check extractedId first, then dig into _raw
      let msgId = json.extractedId
      if (!msgId && json._raw) {
        msgId = json._raw.id || json._raw.message_id || json._raw.sent?.id
      }
      
      console.log("[TokStock] Sent to channel, response:", JSON.stringify(json).substring(0, 300), "msgId:", msgId)
      
      if (msgId) {
        const updated = { ...whapiConfig, messageMap: { ...whapiConfig.messageMap, [acc.id]: msgId } }
        set({ whapiConfig: updated })
        db.setSetting("whapiConfig", updated)
      }
    } catch (e) {
      console.error("Failed to send to channel:", e)
    }
  },

  deleteFromChannel: async (accountId) => {
    const { whapiConfig } = get()
    if (!whapiConfig.enabled || !whapiConfig.token) return
    const messageId = whapiConfig.messageMap[accountId]
    if (!messageId) {
      console.log("[TokStock] No message ID found for account", accountId, "map:", JSON.stringify(whapiConfig.messageMap))
      return
    }
    try {
      console.log("[TokStock] Deleting message", messageId, "for account", accountId)
      const res = await fetch("/api/whapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMessage",
          token: whapiConfig.token,
          messageId,
        }),
      })
      const json = await res.json()
      console.log("[TokStock] Delete response:", JSON.stringify(json))
      // Remove from map regardless of result
      const newMap = { ...whapiConfig.messageMap }
      delete newMap[accountId]
      const updated = { ...whapiConfig, messageMap: newMap }
      set({ whapiConfig: updated })
      db.setSetting("whapiConfig", updated)
    } catch (e) {
      console.error("Failed to delete from channel:", e)
    }
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

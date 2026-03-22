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
      // Single query - get all accounts, exclude screenshot for sold ones after
      const { data, error } = await supabase
        .from("accounts")
        .select("id, username, profile_name, followers, profile_link, country, categories, niche, notes, purchase_price, estimated_sale_price, real_sale_price, profit, email, tiktok_password, email_password, email_password_same, status, sold_date, disqualified_date, buyer, created_at, screenshot")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase query error:", error)
        // Fallback: try without screenshot column
        const { data: fallback, error: e2 } = await supabase
          .from("accounts")
          .select("id, username, profile_name, followers, profile_link, country, categories, niche, notes, purchase_price, estimated_sale_price, real_sale_price, profit, email, tiktok_password, email_password, email_password_same, status, sold_date, disqualified_date, buyer, created_at")
          .order("created_at", { ascending: false })
        if (e2) { console.error("Fallback also failed:", e2); set({ loading: false }); return }
        set({ accounts: (fallback || []).map(fromDbAccount), loading: false })
        return
      }

      set({ accounts: (data || []).map(fromDbAccount), loading: false })
    } catch (e) {
      console.error("Failed to load accounts:", e)
      set({ loading: false })
    }
  },
  addAccount: async (acc) => {
    const newAcc = await db.addAccount(acc)
    set((s) => ({ accounts: [newAcc, ...s.accounts] }))
    return newAcc
  },
  updateAccount: async (id, acc) => {
    const updated = await db.updateAccount(id, acc)
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      selectedAccount: s.selectedAccount?.id === id ? { ...s.selectedAccount, ...updated } : s.selectedAccount,
    }))
    return updated
  },
  deleteAccount: async (id) => {
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
  whatsappTemplate: "Hola! Te comparto los datos de la cuenta:\n\n*Usuario:* {username}\n*Seguidores:* {followers}\n*Email:* {email}\n*Contraseña TikTok:* {tiktokPassword}\n*Contraseña Email:* {emailPassword}",
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

export function venezuelaDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Caracas" }))
}
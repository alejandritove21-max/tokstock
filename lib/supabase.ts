import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://cmsfgmupmcefrwxlohbw.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtc2ZnbXVwbWNlZnJ3eGxvaGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTA3NjksImV4cCI6MjA4OTEyNjc2OX0.zueZhQqD5O9eY8Ry4INIkNBLdI3oyWqYgybVFio2LGE"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Field mapping: camelCase (app) ↔ snake_case (DB) ──

export function toDbAccount(acc: Record<string, any>) {
  return {
    username: acc.username,
    profile_name: acc.profileName,
    followers: acc.followers ? Number(acc.followers) : 0,
    profile_link: acc.profileLink,
    country: acc.country,
    categories: acc.categories || [],
    niche: acc.niche,
    screenshot: acc.screenshot,
    notes: acc.notes,
    purchase_price: acc.purchasePrice ? Number(acc.purchasePrice) : 0,
    estimated_sale_price: acc.estimatedSalePrice ? Number(acc.estimatedSalePrice) : 0,
    real_sale_price: acc.realSalePrice ? Number(acc.realSalePrice) : 0,
    profit: acc.profit ? Number(acc.profit) : 0,
    email: acc.email,
    tiktok_password: acc.tiktokPassword,
    email_password: acc.emailPassword,
    email_password_same: acc.emailPasswordSame || false,
    status: acc.status || "available",
    sold_date: acc.soldDate,
    disqualified_date: acc.disqualifiedDate,
    buyer: acc.buyer,
  }
}

export function fromDbAccount(row: Record<string, any>) {
  return {
    id: row.id,
    username: row.username,
    profileName: row.profile_name,
    followers: row.followers,
    profileLink: row.profile_link,
    country: row.country,
    categories: row.categories || [],
    niche: row.niche,
    screenshot: row.screenshot,
    notes: row.notes,
    purchasePrice: row.purchase_price,
    estimatedSalePrice: row.estimated_sale_price,
    realSalePrice: row.real_sale_price,
    profit: row.profit,
    email: row.email,
    tiktokPassword: row.tiktok_password,
    emailPassword: row.email_password,
    emailPasswordSame: row.email_password_same,
    status: row.status,
    soldDate: row.sold_date,
    disqualifiedDate: row.disqualified_date,
    buyer: row.buyer,
    createdAt: row.created_at,
  }
}

// ── DB Operations ──

export const db = {
  async getAccounts(includeScreenshots = true) {
    const select = includeScreenshots
      ? "*"
      : "id, username, profile_name, followers, profile_link, country, categories, niche, notes, purchase_price, estimated_sale_price, real_sale_price, profit, email, tiktok_password, email_password, email_password_same, status, sold_date, disqualified_date, buyer, created_at"
    const { data, error } = await supabase
      .from("accounts")
      .select(select)
      .order("created_at", { ascending: false })
    if (error) throw error
    return (data || []).map(fromDbAccount)
  },

  async getAccountScreenshot(id: number) {
    const { data, error } = await supabase
      .from("accounts")
      .select("screenshot")
      .eq("id", id)
      .single()
    if (error) throw error
    return data?.screenshot
  },

  async addAccount(acc: Record<string, any>) {
    const { data, error } = await supabase
      .from("accounts")
      .insert(toDbAccount(acc))
      .select()
      .single()
    if (error) throw error
    return fromDbAccount(data)
  },

  async updateAccount(id: number, acc: Record<string, any>) {
    const dbData = toDbAccount(acc)
    const { data, error } = await supabase
      .from("accounts")
      .update(dbData)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return fromDbAccount(data)
  },

  async deleteAccount(id: number) {
    const { error } = await supabase.from("accounts").delete().eq("id", id)
    if (error) throw error
  },

  async getSetting(key: string) {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .single()
    if (error && error.code !== "PGRST116") throw error
    return data?.value ?? null
  },

  async setSetting(key: string, value: any) {
    const { error } = await supabase
      .from("settings")
      .upsert({ key, value }, { onConflict: "key" })
    if (error) throw error
  },
}

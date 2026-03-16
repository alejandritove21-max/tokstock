import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cmsfgmupmcefrwxlohbw.supabase.co";
const supabaseKey = "sb_publishable_5Bk4n4OzTUVCdORXxQeKBw_KLcjfyJr";

export const supabase = createClient(supabaseUrl, supabaseKey);

// ═══ ACCOUNTS ═══

export async function getAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromDB);
}

export async function addAccount(account) {
  const { data, error } = await supabase
    .from("accounts")
    .insert([toDB(account)])
    .select()
    .single();
  if (error) throw error;
  return fromDB(data);
}

export async function updateAccount(id, updates) {
  const { data, error } = await supabase
    .from("accounts")
    .update(toDB(updates))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDB(data);
}

export async function deleteAccount(id) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

// ═══ SETTINGS ═══

export async function getSetting(key) {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ? JSON.parse(data.value) : null;
}

export async function setSetting(key, value) {
  const { error } = await supabase.from("settings").upsert(
    { key, value: JSON.stringify(value) },
    { onConflict: "key" }
  );
  if (error) throw error;
}

// ═══ DB <-> APP field mapping ═══
// Supabase uses snake_case, our app uses camelCase

function toDB(obj) {
  const map = {
    username: "username",
    profileName: "profile_name",
    followers: "followers",
    profileLink: "profile_link",
    country: "country",
    categories: "categories",
    niche: "niche",
    screenshot: "screenshot",
    notes: "notes",
    purchasePrice: "purchase_price",
    estimatedSalePrice: "estimated_sale_price",
    realSalePrice: "real_sale_price",
    profit: "profit",
    email: "email",
    tiktokPassword: "tiktok_password",
    emailPassword: "email_password",
    emailPasswordSame: "email_password_same",
    status: "status",
    soldDate: "sold_date",
    disqualifiedDate: "disqualified_date",
    buyer: "buyer",
  };
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (map[key] !== undefined) {
      result[map[key]] = val;
    }
  }
  return result;
}

function fromDB(row) {
  if (!row) return null;
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
    status: row.status || "available",
    soldDate: row.sold_date,
    disqualifiedDate: row.disqualified_date,
    buyer: row.buyer,
    createdAt: row.created_at,
  };
}

// ═══ Connection test ═══

export async function testConnection() {
  try {
    const { error } = await supabase.from("accounts").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

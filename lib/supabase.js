import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cmsfgmupmcefrwxlohbw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtc2ZnbXVwbWNlZnJ3eGxvaGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTA3NjksImV4cCI6MjA4OTEyNjc2OX0.zueZhQqD5O9eY8Ry4INIkNBLdI3oyWqYgybVFio2LGE";

export const supabase = createClient(supabaseUrl, supabaseKey);

// ═══ ACCOUNTS ═══

export async function getAccounts() {
  // Load available/disqualified accounts WITH screenshots (these are the ones you need)
  const { data: availData, error: e1 } = await supabase
    .from("accounts")
    .select("*")
    .in("status", ["available", "disqualified"])
    .order("created_at", { ascending: false });
  if (e1) throw e1;

  // Load sold accounts WITHOUT screenshots (don't need images for sold)
  const columns = "id,username,profile_name,followers,profile_link,country,categories,niche,notes,purchase_price,estimated_sale_price,real_sale_price,profit,email,tiktok_password,email_password,email_password_same,status,sold_date,disqualified_date,buyer,created_at";
  const { data: soldData, error: e2 } = await supabase
    .from("accounts")
    .select(columns)
    .eq("status", "sold")
    .order("created_at", { ascending: false });
  if (e2) throw e2;

  const available = (availData || []).map(fromDB);
  const sold = (soldData || []).map(row => ({ ...fromDB(row), screenshot: "" }));
  
  // Merge and sort by created_at desc
  return [...available, ...sold].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt) : 0;
    const db2 = b.createdAt ? new Date(b.createdAt) : 0;
    return db2 - da;
  });
}

// Load single screenshot on demand (for sold accounts when needed)
export async function getScreenshot(id) {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("screenshot")
      .eq("id", id)
      .single();
    if (error || !data) return "";
    return data.screenshot || "";
  } catch {
    return "";
  }
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

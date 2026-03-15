"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as db from "@/lib/supabase";

const DEFAULT_COUNTRIES = [
  { emoji: "🇺🇸", name: "Estados Unidos" },
  { emoji: "🇲🇽", name: "México" },
  { emoji: "🇨🇴", name: "Colombia" },
  { emoji: "🇦🇷", name: "Argentina" },
  { emoji: "🇪🇸", name: "España" },
  { emoji: "🇧🇷", name: "Brasil" },
  { emoji: "🇨🇱", name: "Chile" },
  { emoji: "🇵🇪", name: "Perú" },
  { emoji: "🇻🇪", name: "Venezuela" },
  { emoji: "🇪🇨", name: "Ecuador" },
  { emoji: "🇩🇴", name: "Rep. Dominicana" },
  { emoji: "🇬🇧", name: "Reino Unido" },
  { emoji: "🇫🇷", name: "Francia" },
  { emoji: "🇩🇪", name: "Alemania" },
  { emoji: "🇮🇹", name: "Italia" },
  { emoji: "🇵🇹", name: "Portugal" },
  { emoji: "🇯🇵", name: "Japón" },
  { emoji: "🇰🇷", name: "Corea del Sur" },
  { emoji: "🇮🇳", name: "India" },
  { emoji: "🇨🇦", name: "Canadá" },
];

const DEFAULT_CATEGORIES = [
  "Creator Rare",
  "TikTok Shop",
  "Verificada",
  "Monetizable",
  "Alto Engagement",
  "Vintage 3+",
  "Monetizada",
];

const DEFAULT_AI_PROVIDERS = [
  { id: 1, name: "OpenAI GPT-4V", key: "", active: false },
  { id: 2, name: "Google Gemini", key: "", active: false },
  { id: 3, name: "Anthropic Claude", key: "", active: false },
];

const NICHES = [
  "Fitness", "Gaming", "Moda", "Belleza", "Cocina", "Viajes", "Educación",
  "Humor", "Música", "Deportes", "Tecnología", "Finanzas", "Arte",
  "Mascotas", "Lifestyle", "Noticias", "Entretenimiento", "Salud",
  "Automotriz", "Fotografía", "Otro",
];

// ─── UTILITIES ───
const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (n) => {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (d, n) => {
  const date = new Date(d);
  const ref = new Date();
  ref.setDate(ref.getDate() - n);
  return date >= ref;
};

// ─── CONNECTION STATE ───
let dbConnected = false;

// ─── ICONS (inline SVG components) ───
const Icon = ({ d, size = 20, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  home: <Icon d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />,
  box: <Icon d={<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>} />,
  chart: <Icon d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />,
  search: <Icon d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />,
  settings: <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>} />,
  plus: <Icon d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
  eye: <Icon d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} />,
  eyeOff: <Icon d={<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>} />,
  copy: <Icon d={<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>} />,
  trash: <Icon d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>} />,
  edit: <Icon d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />,
  back: <Icon d={<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>} />,
  whatsapp: <Icon d={<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" stroke="none"/>} />,
  check: <Icon d={<><polyline points="20 6 9 17 4 12"/></>} />,
  x: <Icon d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />,
  dollar: <Icon d={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>} />,
  camera: <Icon d={<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>} />,
  tag: <Icon d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>} />,
  sun: <Icon d={<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>} />,
  moon: <Icon d={<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>} />,
  cloud: <Icon d={<><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></>} />,
  alert: <Icon d={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>} />,
  arrowUp: <Icon d={<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>} />,
  arrowDown: <Icon d={<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>} />,
};

// ─── STYLES ───
const getTheme = (dark) => ({
  bg: dark ? "#0a0a0f" : "#f5f3f0",
  bgCard: dark ? "#16161f" : "#ffffff",
  bgCardAlt: dark ? "#1e1e2a" : "#faf8f5",
  bgInput: dark ? "#1e1e2a" : "#f0ede8",
  text: dark ? "#e8e6e3" : "#1a1a1a",
  textSec: dark ? "#8b8a94" : "#6b6966",
  textTer: dark ? "#55545e" : "#a09d98",
  accent: "#e84545",
  accentSoft: dark ? "#e8454520" : "#e8454515",
  green: "#22c55e",
  greenSoft: dark ? "#22c55e20" : "#22c55e15",
  red: "#ef4444",
  redSoft: dark ? "#ef444420" : "#ef444415",
  yellow: "#f59e0b",
  yellowSoft: dark ? "#f59e0b20" : "#f59e0b15",
  blue: "#3b82f6",
  blueSoft: dark ? "#3b82f620" : "#3b82f615",
  border: dark ? "#2a2a38" : "#e5e2dc",
  borderLight: dark ? "#22222f" : "#f0ede8",
  shadow: dark ? "0 2px 12px rgba(0,0,0,.4)" : "0 2px 12px rgba(0,0,0,.06)",
  shadowLg: dark ? "0 8px 32px rgba(0,0,0,.5)" : "0 8px 32px rgba(0,0,0,.1)",
});

// ─── MAIN APP ───
export default function App() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("home");
  const [accounts, setAccounts] = useState([]);
  const [countries, setCountries] = useState(DEFAULT_COUNTRIES);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [aiProviders, setAiProviders] = useState(DEFAULT_AI_PROVIDERS);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [notification, setNotification] = useState(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState("");

  const t = getTheme(dark);

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const connected = await db.testConnection();
        dbConnected = connected;
        if (connected) {
          const accs = await db.getAccounts();
          setAccounts(accs);
          const savedCountries = await db.getSetting("countries");
          if (savedCountries) setCountries(savedCountries);
          const savedCategories = await db.getSetting("categories");
          if (savedCategories) setCategories(savedCategories);
          const savedAi = await db.getSetting("aiProviders");
          if (savedAi) setAiProviders(savedAi);
          const savedTheme = await db.getSetting("theme");
          if (savedTheme !== null) setDark(savedTheme);
          const savedTemplate = await db.getSetting("whatsappTemplate");
          if (savedTemplate) setWhatsappTemplate(savedTemplate);
        }
      } catch (e) {
        console.error("Load error:", e);
        dbConnected = false;
      }
      setTimeout(() => setLoading(false), 1200);
    })();
  }, []);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const addAccount = async (acc) => {
    setSyncing(true);
    try {
      const newAcc = await db.addAccount(acc);
      setAccounts((prev) => [newAcc, ...prev]);
      notify("Cuenta agregada correctamente");
      setShowForm(false);
    } catch (e) {
      notify("Error al guardar: " + e.message, "error");
    }
    setSyncing(false);
  };

  const updateAccount = async (acc) => {
    setSyncing(true);
    try {
      const updated = await db.updateAccount(acc.id, acc);
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? updated : a)));
      if (selectedAccount?.id === acc.id) setSelectedAccount(updated);
      notify("Cuenta actualizada");
    } catch (e) {
      notify("Error al actualizar: " + e.message, "error");
    }
    setSyncing(false);
  };

  const deleteAccount = async (id) => {
    setSyncing(true);
    try {
      await db.deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setSelectedAccount(null);
      notify("Cuenta eliminada", "error");
    } catch (e) {
      notify("Error al eliminar: " + e.message, "error");
    }
    setSyncing(false);
  };

  const sellAccount = async (id, realPrice) => {
    setSyncing(true);
    try {
      const acc = accounts.find((a) => a.id === id);
      const profit = realPrice - (acc.purchasePrice || 0);
      const updates = { status: "sold", realSalePrice: realPrice, profit, soldDate: today() };
      const updated = await db.updateAccount(id, updates);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSelectedAccount(updated);
      notify(`Vendida — Ganancia: ${fmt(profit)}`);
    } catch (e) {
      notify("Error: " + e.message, "error");
    }
    setSyncing(false);
  };

  const disqualifyAccount = async (id) => {
    setSyncing(true);
    try {
      const updates = { status: "disqualified", disqualifiedDate: today() };
      const updated = await db.updateAccount(id, updates);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSelectedAccount(updated);
      notify("Cuenta descalificada", "error");
    } catch (e) {
      notify("Error: " + e.message, "error");
    }
    setSyncing(false);
  };

  const restoreAccount = async (id) => {
    setSyncing(true);
    try {
      const updates = { status: "available", disqualifiedDate: null };
      const updated = await db.updateAccount(id, updates);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSelectedAccount(updated);
      notify("Cuenta restaurada");
    } catch (e) {
      notify("Error: " + e.message, "error");
    }
    setSyncing(false);
  };

  const toggleTheme = async () => {
    const newDark = !dark;
    setDark(newDark);
    try { await db.setSetting("theme", newDark); } catch {}
  };

  const saveCountries = async (c) => {
    setCountries(c);
    try { await db.setSetting("countries", c); } catch {}
  };
  const saveCategories = async (c) => {
    setCategories(c);
    try { await db.setSetting("categories", c); } catch {}
  };
  const saveAiProviders = async (providers) => {
    setAiProviders(providers);
    try { await db.setSetting("aiProviders", providers); } catch {}
  };
  const saveWhatsappTemplate = async (tmpl) => {
    setWhatsappTemplate(tmpl);
    try { await db.setSetting("whatsappTemplate", tmpl); } catch {}
  };

  // ─── LOADING SCREEN ───
  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(145deg, #0a0a0f 0%, #16161f 50%, #1e1024 100%)",
        fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      }}>
        <div style={{
          fontSize: 56, marginBottom: 16,
          animation: "pulse 1.5s ease-in-out infinite",
        }}>🎵</div>
        <div style={{
          fontSize: 24, fontWeight: 700, color: "#e84545",
          letterSpacing: 2, textTransform: "uppercase",
        }}>TokStock</div>
        <div style={{ fontSize: 12, color: "#8b8a94", marginTop: 8, letterSpacing: 4 }}>
          INVENTORY MANAGER
        </div>
        <div style={{
          marginTop: 32, width: 40, height: 3, background: "#e84545",
          borderRadius: 2, animation: "loading 1s ease-in-out infinite",
        }} />
        <style>{`
          @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
          @keyframes loading { 0%,100% { width: 40px; opacity: .3; } 50% { width: 80px; opacity: 1; } }
        `}</style>
      </div>
    );
  }

  const containerStyle = {
    maxWidth: 430, margin: "0 auto", minHeight: "100vh",
    background: t.bg, color: t.text, position: "relative",
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    paddingBottom: 80, overflow: "hidden",
  };

  return (
    <div style={containerStyle}>
      {/* Syncing indicator */}
      {syncing && (
        <div style={{
          position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
          zIndex: 999, background: t.accent, color: "#fff",
          padding: "6px 20px", borderRadius: "0 0 12px 12px",
          fontSize: 11, fontWeight: 600, letterSpacing: 1,
        }}>
          SINCRONIZANDO...
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 50, left: "50%", transform: "translateX(-50%)",
          zIndex: 998, padding: "10px 24px", borderRadius: 12,
          background: notification.type === "error" ? t.red : t.green,
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: t.shadowLg, animation: "slideDown .3s ease",
        }}>
          {notification.msg}
        </div>
      )}

      {/* Main Content */}
      {selectedAccount ? (
        <AccountDetail
          account={selectedAccount} t={t} dark={dark}
          onBack={() => setSelectedAccount(null)}
          onSell={sellAccount} onDisqualify={disqualifyAccount}
          onRestore={restoreAccount} onDelete={deleteAccount}
          onEdit={(acc) => { setEditingAccount(acc); setShowForm(true); setSelectedAccount(null); }}
          countries={countries} whatsappTemplate={whatsappTemplate}
        />
      ) : showForm ? (
        <AccountForm
          t={t} dark={dark} countries={countries} categories={categories}
          aiProviders={aiProviders} account={editingAccount}
          onSave={(acc) => {
            if (editingAccount) { updateAccount({ ...editingAccount, ...acc }); }
            else { addAccount(acc); }
            setShowForm(false); setEditingAccount(null);
          }}
          onCancel={() => { setShowForm(false); setEditingAccount(null); }}
        />
      ) : (
        <>
          {tab === "home" && <HomeScreen accounts={accounts} t={t} dark={dark} onSelect={setSelectedAccount} />}
          {tab === "stock" && (
            <StockScreen accounts={accounts} t={t} dark={dark}
              onSelect={setSelectedAccount}
              onAdd={() => { setEditingAccount(null); setShowForm(true); }}
              onBulkSell={async (ids, totalPrice) => {
                setSyncing(true);
                try {
                  const priceEach = totalPrice / ids.length;
                  for (const id of ids) {
                    const acc = accounts.find((a) => a.id === id);
                    const profit = priceEach - (acc.purchasePrice || 0);
                    await db.updateAccount(id, { status: "sold", realSalePrice: priceEach, profit, soldDate: today() });
                  }
                  const accs = await db.getAccounts();
                  setAccounts(accs);
                  notify(`${ids.length} cuentas vendidas — ${fmt(totalPrice)} total`);
                } catch (e) { notify("Error: " + e.message, "error"); }
                setSyncing(false);
              }}
              onBulkDisqualify={async (ids) => {
                setSyncing(true);
                try {
                  for (const id of ids) {
                    await db.updateAccount(id, { status: "disqualified", disqualifiedDate: today() });
                  }
                  const accs = await db.getAccounts();
                  setAccounts(accs);
                  notify(`${ids.length} cuentas descalificadas`, "error");
                } catch (e) { notify("Error: " + e.message, "error"); }
                setSyncing(false);
              }}
            />
          )}
          {tab === "reports" && <ReportsScreen accounts={accounts} t={t} dark={dark} />}
          {tab === "search" && <SearchScreen accounts={accounts} t={t} dark={dark} onSelect={setSelectedAccount} />}
          {tab === "config" && (
            <ConfigScreen
              t={t} dark={dark} toggleTheme={toggleTheme}
              countries={countries} saveCountries={saveCountries}
              categories={categories} saveCategories={saveCategories}
              aiProviders={aiProviders} setAiProviders={setAiProviders}
              saveAiProviders={saveAiProviders}
              whatsappTemplate={whatsappTemplate} saveWhatsappTemplate={saveWhatsappTemplate}
            />
          )}

          {/* Bottom Tab Bar */}
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            maxWidth: 430, width: "100%", zIndex: 100,
            background: t.bgCard, borderTop: `1px solid ${t.border}`,
            display: "flex", justifyContent: "space-around", padding: "8px 0 20px",
            backdropFilter: "blur(20px)",
          }}>
            {[
              { id: "home", icon: Icons.home, label: "Inicio" },
              { id: "stock", icon: Icons.box, label: "Stock" },
              { id: "reports", icon: Icons.chart, label: "Reportes" },
              { id: "search", icon: Icons.search, label: "Buscar" },
              { id: "config", icon: Icons.settings, label: "Config" },
            ].map((t2) => (
              <button
                key={t2.id}
                onClick={() => setTab(t2.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  color: tab === t2.id ? t.accent : t.textSec,
                  opacity: tab === t2.id ? 1 : 0.6,
                  transition: "all .2s",
                }}
              >
                <div style={{ transform: tab === t2.id ? "scale(1.15)" : "scale(1)", transition: "transform .2s" }}>
                  {t2.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{t2.label}</span>
              </button>
            ))}
          </div>

          {/* FAB Add button */}
          {(tab === "home" || tab === "stock") && (
            <button
              onClick={() => { setEditingAccount(null); setShowForm(true); }}
              style={{
                position: "fixed", bottom: 90, right: "calc(50% - 195px)",
                width: 56, height: 56, borderRadius: "50%",
                background: `linear-gradient(135deg, ${t.accent}, #ff6b6b)`,
                border: "none", cursor: "pointer", zIndex: 101,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 20px ${t.accent}60`,
                transition: "transform .2s",
              }}
              onMouseEnter={(e) => e.target.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
            >
              {Icons.plus}
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, select, textarea { font-family: inherit; }
        ::-webkit-scrollbar { width: 0; }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}

// ─── STATUS BADGE ───
function StatusBadge({ status, t }) {
  const config = {
    available: { label: "Disponible", bg: t.greenSoft, color: t.green },
    sold: { label: "Vendida", bg: t.blueSoft, color: t.blue },
    disqualified: { label: "Descalificada", bg: t.redSoft, color: t.red },
  };
  const c = config[status] || config.available;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 8px",
      borderRadius: 6, background: c.bg, color: c.color,
      textTransform: "uppercase", letterSpacing: 0.5,
    }}>
      {c.label}
    </span>
  );
}

// ─── CARD COMPONENT ───
function Card({ t, children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: t.bgCard, borderRadius: 16, padding: 16,
        border: `1px solid ${t.border}`, cursor: onClick ? "pointer" : "default",
        transition: "all .2s", ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── ACCOUNT CARD IN LIST ───
function AccountListItem({ account, t, onSelect }) {
  const a = account;
  return (
    <Card t={t} onClick={() => onSelect(a)} style={{ marginBottom: 10, animation: "fadeIn .4s ease" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: a.screenshot ? `url(${a.screenshot}) center/cover` : `linear-gradient(135deg, ${t.accent}30, ${t.accent}10)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0,
        }}>
          {!a.screenshot && "🎵"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>
              @{a.username || "sin_nombre"}
            </span>
            <StatusBadge status={a.status} t={t} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: t.textSec }}>
            <span>{fmtK(a.followers)} seg.</span>
            <span>•</span>
            <span>{a.country || "—"}</span>
            {a.categories?.[0] && <><span>•</span><span style={{ color: t.accent }}>{a.categories[0]}</span></>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>
            {fmt(a.estimatedSalePrice || a.purchasePrice)}
          </div>
          <div style={{ fontSize: 10, color: t.textSec }}>
            {a.status === "sold" ? "vendida" : "estimado"}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── HOME SCREEN ───
function HomeScreen({ accounts, t, dark, onSelect }) {
  const [period, setPeriod] = useState("today");

  const stats = useMemo(() => {
    const sold = accounts.filter((a) => a.status === "sold");
    const disq = accounts.filter((a) => a.status === "disqualified");
    const avail = accounts.filter((a) => a.status === "available");
    const totalInvested = accounts.reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const totalRevenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0);
    const costSold = sold.reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const costDisq = disq.reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const netCashFlow = totalRevenue - costSold - costDisq;
    return { sold, disq, avail, totalInvested, totalRevenue, netCashFlow, costSold, costDisq };
  }, [accounts]);

  // ─── Period-based metrics ───
  const periodStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const calcPeriod = (numDays) => {
      const isToday = numDays === 0;
      const soldInPeriod = accounts.filter((a) => {
        if (a.status !== "sold" || !a.soldDate) return false;
        if (isToday) return a.soldDate === todayStr;
        return daysAgo(a.soldDate, numDays);
      });
      const disqInPeriod = accounts.filter((a) => {
        if (a.status !== "disqualified" || !a.disqualifiedDate) return false;
        if (isToday) return a.disqualifiedDate === todayStr;
        return daysAgo(a.disqualifiedDate, numDays);
      });
      const revenue = soldInPeriod.reduce((s, a) => s + (a.realSalePrice || 0), 0);
      const profit = soldInPeriod.reduce((s, a) => s + (a.profit || 0), 0);
      const losses = disqInPeriod.reduce((s, a) => s + (a.purchasePrice || 0), 0);
      const costSold = soldInPeriod.reduce((s, a) => s + (a.purchasePrice || 0), 0);
      const netCash = revenue - costSold - losses;
      return {
        soldCount: soldInPeriod.length,
        disqCount: disqInPeriod.length,
        revenue,
        profit,
        losses,
        netCash,
      };
    };

    return {
      today: calcPeriod(0),
      week: calcPeriod(7),
      month: calcPeriod(30),
      quarter: calcPeriod(90),
    };
  }, [accounts]);

  const currentPeriod = periodStats[period];
  const periodLabels = {
    today: "Hoy",
    week: "7 Días",
    month: "30 Días",
    quarter: "90 Días",
  };

  const recent = accounts.slice(0, 5);

  return (
    <div style={{ padding: "16px 16px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: t.textSec, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" }}>
          TokStock
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>
          Panel General
        </div>
      </div>

      {/* Net Cash Flow (all time) */}
      <Card t={t} style={{
        marginBottom: 12,
        background: `linear-gradient(135deg, ${dark ? "#16161f" : "#fff"}, ${stats.netCashFlow >= 0 ? t.greenSoft : t.redSoft})`,
      }}>
        <div style={{ fontSize: 11, color: t.textSec, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
          Flujo Neto de Caja — Total
        </div>
        <div style={{
          fontSize: 32, fontWeight: 800, marginTop: 4,
          color: stats.netCashFlow >= 0 ? t.green : t.red,
        }}>
          {fmt(stats.netCashFlow)}
        </div>
        <div style={{ fontSize: 11, color: t.textSec, marginTop: 4 }}>
          Ingresos - Costo vendidas - Pérdidas descalificadas
        </div>
      </Card>

      {/* ═══ PERIOD PERFORMANCE SECTION ═══ */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📈</span>
          <span>Rendimiento por Período</span>
        </div>

        {/* Period Selector Tabs */}
        <div style={{
          display: "flex", gap: 3, marginBottom: 12,
          background: t.bgInput, borderRadius: 12, padding: 3,
        }}>
          {["today", "week", "month", "quarter"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, border: "none",
                cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: period === p ? t.accent : "transparent",
                color: period === p ? "#fff" : t.textSec,
                transition: "all .2s",
              }}
            >{periodLabels[p]}</button>
          ))}
        </div>

        {/* Period Net Cash Flow */}
        <Card t={t} style={{
          marginBottom: 8,
          background: `linear-gradient(135deg, ${dark ? "#16161f" : "#fff"}, ${currentPeriod.netCash >= 0 ? (dark ? "#0a2a15" : "#e8fce8") : (dark ? "#2a0a0a" : "#fce8e8")})`,
          border: `1px solid ${currentPeriod.netCash >= 0 ? t.green + "30" : t.red + "30"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: t.textSec, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                Flujo de Caja — {periodLabels[period]}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 800, marginTop: 4,
                color: currentPeriod.netCash >= 0 ? t.green : t.red,
              }}>
                {currentPeriod.netCash >= 0 ? "+" : ""}{fmt(currentPeriod.netCash)}
              </div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: currentPeriod.netCash >= 0 ? t.greenSoft : t.redSoft,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24,
            }}>
              {currentPeriod.netCash >= 0 ? "📈" : "📉"}
            </div>
          </div>
        </Card>

        {/* Period Detail Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {/* Cuentas Vendidas */}
          <Card t={t} style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>💰</span>
              <span style={{ fontSize: 10, color: t.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Vendidas</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.blue }}>
              {currentPeriod.soldCount}
            </div>
            <div style={{ fontSize: 10, color: t.textSec, marginTop: 2 }}>
              cuenta{currentPeriod.soldCount !== 1 ? "s" : ""}
            </div>
          </Card>

          {/* Ingresos por Ventas */}
          <Card t={t} style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>💵</span>
              <span style={{ fontSize: 10, color: t.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Ingresos</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.green }}>
              {fmt(currentPeriod.revenue)}
            </div>
            <div style={{ fontSize: 10, color: t.textSec, marginTop: 2 }}>
              por ventas
            </div>
          </Card>

          {/* Ganancia */}
          <Card t={t} style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontSize: 10, color: t.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Ganancia</span>
            </div>
            <div style={{
              fontSize: 18, fontWeight: 800,
              color: currentPeriod.profit >= 0 ? t.green : t.red,
            }}>
              {fmt(currentPeriod.profit)}
            </div>
            <div style={{ fontSize: 10, color: t.textSec, marginTop: 2 }}>
              neta de ventas
            </div>
          </Card>

          {/* Pérdidas */}
          <Card t={t} style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🚫</span>
              <span style={{ fontSize: 10, color: t.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Pérdidas</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: currentPeriod.losses > 0 ? t.red : t.textSec }}>
              {currentPeriod.losses > 0 ? "-" : ""}{fmt(currentPeriod.losses)}
            </div>
            <div style={{ fontSize: 10, color: t.textSec, marginTop: 2 }}>
              {currentPeriod.disqCount} descalif.
            </div>
          </Card>
        </div>

        {/* Period Summary Bar */}
        {(currentPeriod.soldCount > 0 || currentPeriod.disqCount > 0) && (
          <Card t={t} style={{ padding: 12, marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: t.textSec }}>
                Resumen {periodLabels[period].toLowerCase()}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                <span style={{ color: t.green, fontWeight: 700 }}>↑ {fmt(currentPeriod.revenue)}</span>
                {currentPeriod.losses > 0 && (
                  <span style={{ color: t.red, fontWeight: 700 }}>↓ {fmt(currentPeriod.losses)}</span>
                )}
              </div>
            </div>
            {/* Mini visual bar */}
            <div style={{ display: "flex", gap: 2, marginTop: 8, height: 6, borderRadius: 3, overflow: "hidden" }}>
              {currentPeriod.revenue > 0 && (
                <div style={{
                  flex: currentPeriod.revenue,
                  background: `linear-gradient(90deg, ${t.green}, ${t.green}cc)`,
                  borderRadius: 3,
                }} />
              )}
              {currentPeriod.losses > 0 && (
                <div style={{
                  flex: currentPeriod.losses,
                  background: `linear-gradient(90deg, ${t.red}, ${t.red}cc)`,
                  borderRadius: 3,
                }} />
              )}
              {currentPeriod.revenue === 0 && currentPeriod.losses === 0 && (
                <div style={{ flex: 1, background: t.bgInput, borderRadius: 3 }} />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: t.textTer }}>
              <span>Ingresos</span>
              <span>Pérdidas</span>
            </div>
          </Card>
        )}

        {currentPeriod.soldCount === 0 && currentPeriod.disqCount === 0 && (
          <Card t={t} style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: t.textSec }}>
              Sin actividad {period === "today" ? "hoy" : `en los últimos ${periodLabels[period].toLowerCase()}`}
            </div>
          </Card>
        )}
      </div>

      {/* Stats Grid (all time) */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span>📦</span>
        <span>Resumen General</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Total Cuentas", value: accounts.length, icon: "📦" },
          { label: "Disponibles", value: stats.avail.length, icon: "🟢" },
          { label: "Vendidas", value: stats.sold.length, icon: "💰", sub: fmt(stats.totalRevenue) },
          { label: "Invertido Total", value: fmt(stats.totalInvested), icon: "📊" },
        ].map((s, i) => (
          <Card t={t} key={i}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: t.textSec, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 11, color: t.green, fontWeight: 600 }}>{s.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Connection Status */}
      <Card t={t} style={{ marginBottom: 16, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: dbConnected ? t.green : t.red,
          }} />
          <span style={{ fontSize: 12, color: t.textSec, fontWeight: 500 }}>
            Base de datos: {dbConnected ? "Conectada" : "Sin conexión"}
          </span>
        </div>
      </Card>

      {/* Recent Accounts */}
      {recent.length > 0 && (
        <>
          <div style={{
            fontSize: 14, fontWeight: 700, marginBottom: 10,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>Últimas Agregadas</span>
            <span style={{
              fontSize: 10, background: t.accentSoft, color: t.accent,
              padding: "2px 8px", borderRadius: 6, fontWeight: 700,
            }}>{recent.length}</span>
          </div>
          {recent.map((a) => (
            <AccountListItem key={a.id} account={a} t={t} onSelect={onSelect} />
          ))}
        </>
      )}

      {accounts.length === 0 && (
        <Card t={t} style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Sin cuentas aún</div>
          <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
            Toca el botón + para agregar tu primera cuenta
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── STOCK SCREEN ───
function StockScreen({ accounts, t, dark, onSelect, onAdd, onBulkSell, onBulkDisqualify }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [showBulkSell, setShowBulkSell] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");

  const filtered = useMemo(() => {
    let list = accounts;
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    if (query) list = list.filter((a) =>
      (a.username || "").toLowerCase().includes(query.toLowerCase()) ||
      (a.profileName || "").toLowerCase().includes(query.toLowerCase())
    );
    return list;
  }, [accounts, filter, query]);

  const filters = [
    { id: "all", label: "Todas", count: accounts.length },
    { id: "available", label: "Disponibles", count: accounts.filter((a) => a.status === "available").length },
    { id: "sold", label: "Vendidas", count: accounts.filter((a) => a.status === "sold").length },
    { id: "disqualified", label: "Desc.", count: accounts.filter((a) => a.status === "disqualified").length },
  ];

  const toggleSelect = (id) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const selectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((a) => a.id));
  };

  const selectedAccounts = accounts.filter((a) => selected.includes(a.id));

  const shareLinks = () => {
    const links = selectedAccounts.map((a) => a.profileLink || `https://www.tiktok.com/@${a.username}`).join("\n");
    if (navigator.clipboard) navigator.clipboard.writeText(links);
    alert(`${selected.length} links copiados al portapapeles`);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected([]);
  };

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>Inventario</div>
        <button
          onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
          style={{
            padding: "6px 14px", borderRadius: 10, border: "none",
            cursor: "pointer", fontSize: 12, fontWeight: 700,
            background: selectMode ? t.accent : t.bgInput,
            color: selectMode ? "#fff" : t.textSec,
          }}
        >
          {selectMode ? "✕ Cancelar" : "☑ Seleccionar"}
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: t.bgInput, borderRadius: 12, padding: "10px 14px",
        marginBottom: 12, border: `1px solid ${t.border}`,
      }}>
        {Icons.search}
        <input
          placeholder="Buscar por usuario..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          style={{
            border: "none", outline: "none", background: "none",
            color: t.text, fontSize: 14, width: "100%",
          }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px", borderRadius: 20, border: "none",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              whiteSpace: "nowrap",
              background: filter === f.id ? t.accent : t.bgInput,
              color: filter === f.id ? "#fff" : t.textSec,
              transition: "all .2s",
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Select All */}
      {selectMode && (
        <button
          onClick={selectAll}
          style={{
            width: "100%", padding: 8, borderRadius: 10, marginBottom: 10,
            border: `1px solid ${t.border}`, background: t.bgInput,
            cursor: "pointer", fontSize: 12, fontWeight: 600, color: t.textSec,
          }}
        >
          {selected.length === filtered.length ? "Deseleccionar todas" : `Seleccionar todas (${filtered.length})`}
        </button>
      )}

      {/* List */}
      {filtered.map((a) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {selectMode && (
            <button
              onClick={() => toggleSelect(a.id)}
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                border: `2px solid ${selected.includes(a.id) ? t.accent : t.border}`,
                background: selected.includes(a.id) ? t.accent : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14,
              }}
            >
              {selected.includes(a.id) ? "✓" : ""}
            </button>
          )}
          <div style={{ flex: 1 }}>
            <AccountListItem account={a} t={t} onSelect={selectMode ? () => toggleSelect(a.id) : onSelect} />
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <Card t={t} style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.textSec }}>
            No se encontraron cuentas
          </div>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectMode && selected.length > 0 && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          maxWidth: 410, width: "calc(100% - 32px)", zIndex: 150,
          background: t.bgCard, borderRadius: 16, padding: 12,
          border: `1px solid ${t.border}`, boxShadow: t.shadowLg,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, marginBottom: 8, textAlign: "center" }}>
            {selected.length} cuenta{selected.length !== 1 ? "s" : ""} seleccionada{selected.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={shareLinks} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none",
              background: t.blueSoft, cursor: "pointer",
              color: t.blue, fontSize: 11, fontWeight: 700,
            }}>
              🔗 Copiar Links
            </button>
            <button onClick={() => setShowBulkSell(true)} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none",
              background: t.greenSoft, cursor: "pointer",
              color: t.green, fontSize: 11, fontWeight: 700,
            }}>
              💰 Vender ({selected.length})
            </button>
            <button onClick={() => { onBulkDisqualify(selected); exitSelectMode(); }} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none",
              background: t.redSoft, cursor: "pointer",
              color: t.red, fontSize: 11, fontWeight: 700,
            }}>
              🚫 Descalificar
            </button>
          </div>
        </div>
      )}

      {/* Bulk Sell Modal */}
      {showBulkSell && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: t.bgCard, borderRadius: 20, padding: 24,
            maxWidth: 360, width: "100%", border: `1px solid ${t.border}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Venta en Lote</div>
            <div style={{ fontSize: 12, color: t.textSec, marginBottom: 4 }}>
              {selected.length} cuenta{selected.length !== 1 ? "s" : ""} seleccionada{selected.length !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 11, color: t.textSec, marginBottom: 16 }}>
              Costo total de compra: {fmt(selectedAccounts.reduce((s, a) => s + (a.purchasePrice || 0), 0))}
            </div>
            <input
              type="number" placeholder="Precio TOTAL de venta ($)"
              value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)}
              style={{
                width: "100%", padding: 12, borderRadius: 10,
                border: `1px solid ${t.border}`, background: t.bgInput,
                color: t.text, fontSize: 16, fontWeight: 700,
                marginBottom: 8, outline: "none",
              }}
            />
            {bulkPrice && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                  <span style={{ color: t.textSec }}>Precio por cuenta:</span>
                  <span style={{ fontWeight: 700 }}>{fmt(Number(bulkPrice) / selected.length)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                  <span style={{ color: t.textSec }}>Ganancia total:</span>
                  <span style={{
                    fontWeight: 700,
                    color: (Number(bulkPrice) - selectedAccounts.reduce((s, a) => s + (a.purchasePrice || 0), 0)) >= 0 ? t.green : t.red,
                  }}>
                    {fmt(Number(bulkPrice) - selectedAccounts.reduce((s, a) => s + (a.purchasePrice || 0), 0))}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                  <span style={{ color: t.textSec }}>Ganancia por cuenta:</span>
                  <span style={{
                    fontWeight: 700,
                    color: ((Number(bulkPrice) / selected.length) - (selectedAccounts.reduce((s, a) => s + (a.purchasePrice || 0), 0) / selected.length)) >= 0 ? t.green : t.red,
                  }}>
                    {fmt((Number(bulkPrice) - selectedAccounts.reduce((s, a) => s + (a.purchasePrice || 0), 0)) / selected.length)}
                  </span>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setShowBulkSell(false); setBulkPrice(""); }}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.border}`,
                  background: t.bgInput, cursor: "pointer", color: t.textSec, fontWeight: 600,
                }}
              >Cancelar</button>
              <button
                onClick={() => {
                  if (bulkPrice && Number(bulkPrice) > 0) {
                    onBulkSell(selected, Number(bulkPrice));
                    setShowBulkSell(false);
                    setBulkPrice("");
                    exitSelectMode();
                  }
                }}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, border: "none",
                  background: t.green, cursor: "pointer", color: "#fff", fontWeight: 700,
                }}
              >Confirmar Venta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ACCOUNT DETAIL ───
function AccountDetail({ account, t, dark, onBack, onSell, onDisqualify, onRestore, onDelete, onEdit, countries, whatsappTemplate }) {
  const [showCreds, setShowCreds] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [copied, setCopied] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const a = account;

  const profileLink = a.profileLink || (a.username ? `https://www.tiktok.com/@${a.username}` : "");

  const copyText = (text, label) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const sendWhatsApp = () => {
    const template = whatsappTemplate || `🎵 *CUENTA TIKTOK*\n\n👤 Usuario: @{username}\n👥 Seguidores: {followers}\n🌍 País: {country}\n📂 Nicho: {niche}\n🔗 Link: {link}\n\n📧 Email: {email}\n🔑 Contraseña TikTok: {tiktokPassword}\n🔑 Contraseña Email: {emailPassword}\n\n⚠️ *INSTRUCCIONES:*\n• No cambiar la contraseña\n• No vincular número de teléfono\n• No reclamar la cuenta\n\n— TokStock 🔒`;
    const msg = template
      .replace(/{username}/g, a.username || "—")
      .replace(/{followers}/g, fmtK(a.followers))
      .replace(/{country}/g, a.country || "—")
      .replace(/{niche}/g, a.niche || "—")
      .replace(/{link}/g, profileLink || "—")
      .replace(/{email}/g, a.email || "—")
      .replace(/{tiktokPassword}/g, a.tiktokPassword || "—")
      .replace(/{emailPassword}/g, a.emailPasswordSame ? "(Misma que TikTok)" : (a.emailPassword || "—"))
      .replace(/{profileName}/g, a.profileName || "—")
      .replace(/{price}/g, fmt(a.realSalePrice || a.estimatedSalePrice || 0));
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{ padding: "16px 16px 0", animation: "fadeIn .3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: t.bgInput, border: "none", cursor: "pointer",
          width: 36, height: 36, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: t.text,
        }}>{Icons.back}</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>@{a.username}</div>
          <StatusBadge status={a.status} t={t} />
        </div>
      </div>

      {/* Profile Image */}
      {a.screenshot && (
        <div style={{
          width: "100%", height: 180, borderRadius: 16, marginBottom: 16,
          background: `url(${a.screenshot}) center/cover`,
          border: `1px solid ${t.border}`,
        }} />
      )}

      {/* Copy Link Button */}
      {profileLink && (
        <button
          onClick={() => copyText(profileLink, "link")}
          style={{
            width: "100%", padding: 12, borderRadius: 12, marginBottom: 8,
            background: copied === "link" ? t.greenSoft : t.bgCardAlt,
            border: `1px solid ${copied === "link" ? t.green + "40" : t.border}`,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            color: copied === "link" ? t.green : t.text,
            fontSize: 13, fontWeight: 600, transition: "all .2s",
          }}
        >
          {copied === "link" ? "✅ Link copiado!" : `🔗 Copiar link: tiktok.com/@${a.username}`}
        </button>
      )}

      {/* Copy Image Button */}
      {a.screenshot && (
        <button
          onClick={async () => {
            try {
              const res = await fetch(a.screenshot);
              const blob = await res.blob();
              await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
              ]);
              setCopied("image");
              setTimeout(() => setCopied(null), 1500);
            } catch (e) {
              const link = document.createElement("a");
              link.href = a.screenshot;
              link.download = `${a.username || "cuenta"}_${(a.categories || [])[0] || "tiktok"}.png`;
              link.click();
              setCopied("image");
              setTimeout(() => setCopied(null), 1500);
            }
          }}
          style={{
            width: "100%", padding: 12, borderRadius: 12, marginBottom: 12,
            background: copied === "image" ? t.greenSoft : t.bgCardAlt,
            border: `1px solid ${copied === "image" ? t.green + "40" : t.border}`,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            color: copied === "image" ? t.green : t.text,
            fontSize: 13, fontWeight: 600, transition: "all .2s",
          }}
        >
          {copied === "image"
            ? "✅ Imagen copiada!"
            : `📷 Copiar imagen${(a.categories || [])[0] ? ` — ${a.categories[0]}` : ""}`}
        </button>
      )}

      {/* Public Data */}
      <Card t={t} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, marginBottom: 10, letterSpacing: 1 }}>
          DATOS PÚBLICOS
        </div>
        {[
          ["Perfil", a.profileName],
          ["Seguidores", fmtK(a.followers)],
          ["País", a.country],
          ["Nicho", a.niche],
          ["Link", a.profileLink],
        ].map(([l, v], i) => v && (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.borderLight}` }}>
            <span style={{ fontSize: 12, color: t.textSec }}>{l}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        {a.categories?.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {a.categories.map((c, i) => (
              <span key={i} style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 6,
                background: t.accentSoft, color: t.accent, fontWeight: 600,
              }}>{c}</span>
            ))}
          </div>
        )}
        {a.notes && (
          <div style={{ marginTop: 10, fontSize: 12, color: t.textSec, fontStyle: "italic" }}>
            📝 {a.notes}
          </div>
        )}
      </Card>

      {/* Financial Data */}
      <Card t={t} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.green, marginBottom: 10, letterSpacing: 1 }}>
          DATOS FINANCIEROS
        </div>
        {[
          ["Precio de Compra", fmt(a.purchasePrice), t.text],
          ["Precio Estimado", fmt(a.estimatedSalePrice), t.text],
          a.status === "sold" && ["Precio de Venta Real", fmt(a.realSalePrice), t.blue],
          a.status === "sold" && ["Ganancia", fmt(a.profit), a.profit >= 0 ? t.green : t.red],
        ].filter(Boolean).map(([l, v, c], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.borderLight}` }}>
            <span style={{ fontSize: 12, color: t.textSec }}>{l}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
          </div>
        ))}
        {a.estimatedSalePrice && a.purchasePrice && a.status !== "sold" && (
          <div style={{ marginTop: 8, fontSize: 12, color: t.textSec }}>
            Margen estimado: <span style={{
              fontWeight: 700,
              color: (a.estimatedSalePrice - a.purchasePrice) >= 0 ? t.green : t.red,
            }}>{fmt(a.estimatedSalePrice - a.purchasePrice)}</span>
          </div>
        )}
      </Card>

      {/* Credentials */}
      <Card t={t} style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.yellow, letterSpacing: 1 }}>
            CREDENCIALES 🔒
          </div>
          <button
            onClick={() => setShowCreds(!showCreds)}
            style={{
              background: t.yellowSoft, border: "none", cursor: "pointer",
              padding: "4px 10px", borderRadius: 8, color: t.yellow,
              fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {showCreds ? Icons.eyeOff : Icons.eye}
            {showCreds ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {showCreds ? (
          <>
            {[
              ["Email", a.email],
              ["Contraseña TikTok", a.tiktokPassword],
              ["Contraseña Email", a.emailPasswordSame ? "(Misma que TikTok)" : a.emailPassword],
            ].map(([l, v], i) => v && (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: `1px solid ${t.borderLight}`,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: t.textSec }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{v}</div>
                </div>
                <button
                  onClick={() => copyText(v, l)}
                  style={{
                    background: copied === l ? t.greenSoft : t.bgInput,
                    border: "none", cursor: "pointer", padding: 6, borderRadius: 8,
                    color: copied === l ? t.green : t.textSec,
                  }}
                >
                  {copied === l ? Icons.check : Icons.copy}
                </button>
              </div>
            ))}
          </>
        ) : (
          <div style={{ fontSize: 12, color: t.textSec, textAlign: "center", padding: 8 }}>
            Toca "Mostrar" para ver las credenciales
          </div>
        )}
      </Card>

      {/* Dates */}
      {(a.soldDate || a.disqualifiedDate || a.createdAt) && (
        <Card t={t} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textSec, marginBottom: 8, letterSpacing: 1 }}>
            FECHAS
          </div>
          {a.createdAt && <div style={{ fontSize: 12, color: t.textSec, marginBottom: 4 }}>Agregada: {new Date(a.createdAt).toLocaleDateString()}</div>}
          {a.soldDate && <div style={{ fontSize: 12, color: t.blue, marginBottom: 4 }}>Vendida: {a.soldDate}</div>}
          {a.disqualifiedDate && <div style={{ fontSize: 12, color: t.red }}>Descalificada: {a.disqualifiedDate}</div>}
        </Card>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {a.status === "available" && (
          <button
            onClick={() => setShowSellModal(true)}
            style={{
              width: "100%", padding: 14, borderRadius: 12,
              background: `linear-gradient(135deg, ${t.green}, #16a34a)`,
              border: "none", cursor: "pointer", color: "#fff",
              fontSize: 14, fontWeight: 700,
            }}
          >
            💰 Registrar Venta
          </button>
        )}
        <button
          onClick={sendWhatsApp}
          style={{
            width: "100%", padding: 14, borderRadius: 12,
            background: `linear-gradient(135deg, #25D366, #128C7E)`,
            border: "none", cursor: "pointer", color: "#fff",
            fontSize: 14, fontWeight: 700,
          }}
        >
          📲 Enviar por WhatsApp
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(a)} style={{
            flex: 1, padding: 12, borderRadius: 12,
            background: t.bgInput, border: `1px solid ${t.border}`,
            cursor: "pointer", color: t.text, fontSize: 13, fontWeight: 600,
          }}>
            ✏️ Editar
          </button>
          {a.status !== "disqualified" && (
            <button onClick={() => onDisqualify(a.id)} style={{
              flex: 1, padding: 12, borderRadius: 12,
              background: t.redSoft, border: `1px solid ${t.red}30`,
              cursor: "pointer", color: t.red, fontSize: 13, fontWeight: 600,
            }}>
              🚫 Descalificar
            </button>
          )}
          {a.status === "disqualified" && (
            <button onClick={() => onRestore(a.id)} style={{
              flex: 1, padding: 12, borderRadius: 12,
              background: t.greenSoft, border: `1px solid ${t.green}30`,
              cursor: "pointer", color: t.green, fontSize: 13, fontWeight: 600,
            }}>
              ♻️ Restaurar
            </button>
          )}
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            width: "100%", padding: 12, borderRadius: 12,
            background: "transparent", border: `1px solid ${t.red}40`,
            cursor: "pointer", color: t.red, fontSize: 13, fontWeight: 600,
          }}
        >
          🗑️ Eliminar Cuenta
        </button>
      </div>

      {/* Sell Modal */}
      {showSellModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: t.bgCard, borderRadius: 20, padding: 24,
            maxWidth: 360, width: "100%", border: `1px solid ${t.border}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Registrar Venta</div>
            <div style={{ fontSize: 12, color: t.textSec, marginBottom: 16 }}>
              Precio de compra: {fmt(a.purchasePrice)}
            </div>
            <input
              type="number" placeholder="Precio de venta real ($)"
              value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
              style={{
                width: "100%", padding: 12, borderRadius: 10,
                border: `1px solid ${t.border}`, background: t.bgInput,
                color: t.text, fontSize: 16, fontWeight: 700,
                marginBottom: 12, outline: "none",
              }}
            />
            {sellPrice && (
              <div style={{
                textAlign: "center", fontSize: 16, fontWeight: 800, marginBottom: 12,
                color: (Number(sellPrice) - (a.purchasePrice || 0)) >= 0 ? t.green : t.red,
              }}>
                Ganancia: {fmt(Number(sellPrice) - (a.purchasePrice || 0))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowSellModal(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.border}`,
                  background: t.bgInput, cursor: "pointer", color: t.textSec, fontWeight: 600,
                }}
              >Cancelar</button>
              <button
                onClick={() => { if (sellPrice) { onSell(a.id, Number(sellPrice)); setShowSellModal(false); } }}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, border: "none",
                  background: t.green, cursor: "pointer", color: "#fff", fontWeight: 700,
                }}
              >Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: t.bgCard, borderRadius: 20, padding: 24,
            maxWidth: 320, width: "100%", textAlign: "center",
            border: `1px solid ${t.border}`,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>¿Eliminar cuenta?</div>
            <div style={{ fontSize: 13, color: t.textSec, marginBottom: 16 }}>Esta acción no se puede deshacer</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{
                flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.border}`,
                background: t.bgInput, cursor: "pointer", color: t.textSec, fontWeight: 600,
              }}>Cancelar</button>
              <button onClick={() => { onDelete(a.id); setConfirmDelete(false); }} style={{
                flex: 1, padding: 12, borderRadius: 10, border: "none",
                background: t.red, cursor: "pointer", color: "#fff", fontWeight: 700,
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ACCOUNT FORM (3 Steps) ───
function AccountForm({ t, dark, countries, categories, aiProviders, account, onSave, onCancel }) {
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");
  const [form, setForm] = useState({
    username: account?.username || "",
    profileName: account?.profileName || "",
    followers: account?.followers || "",
    profileLink: account?.profileLink || "",
    country: account?.country || "",
    categories: account?.categories || [],
    niche: account?.niche || "",
    screenshot: account?.screenshot || "",
    notes: account?.notes || "",
    purchasePrice: account?.purchasePrice || "",
    estimatedSalePrice: account?.estimatedSalePrice || "",
    email: account?.email || "",
    tiktokPassword: account?.tiktokPassword || "",
    emailPassword: account?.emailPassword || "",
    emailPasswordSame: account?.emailPasswordSame || false,
  });

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleCategory = (cat) => {
    const cur = form.categories;
    upd("categories", cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => upd("screenshot", ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // ─── AI Image Analysis ───
  const analyzeWithAI = async () => {
    const activeProvider = aiProviders.find((p) => p.active && p.key);
    if (!activeProvider) {
      setAiError("No hay IA configurada. Ve a Config → Inteligencia Artificial.");
      return;
    }
    if (!form.screenshot) {
      setAiError("Sube una imagen primero.");
      return;
    }

    setAnalyzing(true);
    setAiError("");
    const base64 = form.screenshot.split(",")[1];
    
    let provider = "openai";
    if (activeProvider.name.includes("Gemini")) provider = "gemini";
    if (activeProvider.name.includes("Claude")) provider = "claude";

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          apiKey: activeProvider.key,
          provider: provider,
        }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      if (data.username) {
        const cleanUser = data.username.replace("@", "");
        setForm((f) => ({ ...f, username: cleanUser, profileLink: `https://www.tiktok.com/@${cleanUser}` }));
      }
      if (data.profileName) setForm((f) => ({ ...f, profileName: data.profileName }));
      if (data.followers) setForm((f) => ({ ...f, followers: data.followers }));
      if (data.niche) setForm((f) => ({ ...f, niche: data.niche }));
      if (data.categories?.length) setForm((f) => ({ ...f, categories: data.categories }));
    } catch (e) {
      setAiError("Error IA: " + (e.message || "No se pudo analizar"));
    }
    setAnalyzing(false);
  };

  const inputStyle = {
    width: "100%", padding: 12, borderRadius: 10,
    border: `1px solid ${t.border}`, background: t.bgInput,
    color: t.text, fontSize: 14, outline: "none",
    marginBottom: 12,
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 4, display: "block" };

  const margin = form.estimatedSalePrice && form.purchasePrice
    ? Number(form.estimatedSalePrice) - Number(form.purchasePrice) : null;

  return (
    <div style={{ padding: "16px 16px 0", animation: "fadeIn .3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onCancel} style={{
          background: t.bgInput, border: "none", cursor: "pointer",
          width: 36, height: 36, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center", color: t.text,
        }}>{Icons.back}</button>
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          {account ? "Editar Cuenta" : "Nueva Cuenta"}
        </div>
      </div>

      {/* Step Indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: step >= s ? t.accent : t.bgInput,
            transition: "background .3s",
          }} />
        ))}
      </div>

      {/* Step 1: Image */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📸 Captura de Pantalla</div>
          <div style={{ fontSize: 12, color: t.textSec, marginBottom: 16 }}>
            Sube un screenshot del perfil TikTok (opcional)
          </div>
          {form.screenshot ? (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <img src={form.screenshot} style={{
                width: "100%", height: 200, objectFit: "cover", borderRadius: 16,
                border: `1px solid ${t.border}`,
              }} />
              <button
                onClick={() => upd("screenshot", "")}
                style={{
                  position: "absolute", top: 8, right: 8,
                  background: t.red, border: "none", cursor: "pointer",
                  width: 28, height: 28, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}
              >{Icons.x}</button>
              {/* AI Analyze Button */}
              <button
                onClick={analyzeWithAI}
                disabled={analyzing}
                style={{
                  width: "100%", marginTop: 10, padding: 12, borderRadius: 10,
                  border: "none", cursor: analyzing ? "wait" : "pointer",
                  background: analyzing
                    ? t.bgInput
                    : `linear-gradient(135deg, #8b5cf6, #6d28d9)`,
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  opacity: analyzing ? 0.7 : 1,
                }}
              >
                {analyzing ? "🔄 Analizando con IA..." : "🤖 Analizar con IA"}
              </button>
              {aiError && (
                <div style={{
                  marginTop: 8, fontSize: 12, color: t.red,
                  background: t.redSoft, padding: 8, borderRadius: 8,
                }}>
                  {aiError}
                </div>
              )}
              {!analyzing && form.username && form.screenshot && (
                <div style={{
                  marginTop: 8, fontSize: 11, color: t.green,
                  background: t.greenSoft, padding: 8, borderRadius: 8,
                }}>
                  ✅ Datos extraídos: @{form.username} • {fmtK(form.followers)} seg. • {form.niche || "—"}
                </div>
              )}
            </div>
          ) : (
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: 40, borderRadius: 16, border: `2px dashed ${t.border}`,
              cursor: "pointer", marginBottom: 16,
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Toca para subir imagen</div>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            </label>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel} style={{
              flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.bgInput, cursor: "pointer", color: t.textSec, fontWeight: 600,
            }}>Cancelar</button>
            <button onClick={() => setStep(2)} style={{
              flex: 1, padding: 12, borderRadius: 10, border: "none",
              background: t.accent, cursor: "pointer", color: "#fff", fontWeight: 700,
            }}>{form.screenshot ? "Siguiente" : "Saltar →"}</button>
          </div>
        </div>
      )}

      {/* Step 2: General Data */}
      {step === 2 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📝 Datos Generales</div>

          <label style={labelStyle}>Nombre de usuario</label>
          <input placeholder="@usuario" value={form.username} onChange={(e) => {
            const val = e.target.value.replace("@", "");
            setForm((f) => ({ ...f, username: val, profileLink: val ? `https://www.tiktok.com/@${val}` : "" }));
          }} style={inputStyle} />

          <label style={labelStyle}>Nombre del perfil</label>
          <input placeholder="Nombre visible" value={form.profileName} onChange={(e) => upd("profileName", e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Seguidores</label>
          <input type="number" placeholder="10000" value={form.followers} onChange={(e) => upd("followers", e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Link del perfil</label>
          <input placeholder="https://tiktok.com/@..." value={form.profileLink} onChange={(e) => upd("profileLink", e.target.value)} style={inputStyle} />

          <label style={labelStyle}>País</label>
          <select value={form.country} onChange={(e) => upd("country", e.target.value)} style={inputStyle}>
            <option value="">Seleccionar país</option>
            {countries.map((c, i) => (
              <option key={i} value={c.name}>{c.emoji} {c.name}</option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Precio Compra ($)</label>
              <input type="number" placeholder="0.00" value={form.purchasePrice} onChange={(e) => upd("purchasePrice", e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Precio Venta Est. ($)</label>
              <input type="number" placeholder="0.00" value={form.estimatedSalePrice} onChange={(e) => upd("estimatedSalePrice", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {margin !== null && (
            <div style={{
              padding: 10, borderRadius: 10, marginBottom: 12,
              background: margin >= 0 ? t.greenSoft : t.redSoft,
              textAlign: "center", fontSize: 13, fontWeight: 700,
              color: margin >= 0 ? t.green : t.red,
            }}>
              Margen estimado: {fmt(margin)}
            </div>
          )}

          <label style={labelStyle}>Nicho</label>
          <select value={form.niche} onChange={(e) => upd("niche", e.target.value)} style={inputStyle}>
            <option value="">Seleccionar nicho</option>
            {NICHES.map((n, i) => <option key={i} value={n}>{n}</option>)}
          </select>

          <label style={labelStyle}>Categorías</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {categories.map((c, i) => (
              <button
                key={i}
                onClick={() => toggleCategory(c)}
                style={{
                  padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                  border: "none", cursor: "pointer",
                  background: form.categories.includes(c) ? t.accent : t.bgInput,
                  color: form.categories.includes(c) ? "#fff" : t.textSec,
                }}
              >{c}</button>
            ))}
          </div>

          <label style={labelStyle}>Notas internas</label>
          <textarea
            placeholder="Notas sobre esta cuenta..."
            value={form.notes} onChange={(e) => upd("notes", e.target.value)}
            rows={3} style={{ ...inputStyle, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{
              flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.bgInput, cursor: "pointer", color: t.textSec, fontWeight: 600,
            }}>← Atrás</button>
            <button onClick={() => setStep(3)} style={{
              flex: 1, padding: 12, borderRadius: 10, border: "none",
              background: t.accent, cursor: "pointer", color: "#fff", fontWeight: 700,
            }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 3: Credentials */}
      {step === 3 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔐 Credenciales</div>

          <label style={labelStyle}>Email de la cuenta</label>
          <input type="email" placeholder="email@ejemplo.com" value={form.email} onChange={(e) => upd("email", e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Contraseña de TikTok</label>
          <input type="text" placeholder="Contraseña" value={form.tiktokPassword} onChange={(e) => upd("tiktokPassword", e.target.value)} style={inputStyle} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox" checked={form.emailPasswordSame}
              onChange={(e) => upd("emailPasswordSame", e.target.checked)}
              style={{ width: 18, height: 18, accentColor: t.accent }}
            />
            <label style={{ fontSize: 13, color: t.textSec }}>La contraseña del email es la misma</label>
          </div>

          {!form.emailPasswordSame && (
            <>
              <label style={labelStyle}>Contraseña del email</label>
              <input type="text" placeholder="Contraseña del email" value={form.emailPassword} onChange={(e) => upd("emailPassword", e.target.value)} style={inputStyle} />
            </>
          )}

          {/* Preview */}
          <Card t={t} style={{ marginBottom: 16, background: t.bgCardAlt }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, marginBottom: 8, letterSpacing: 1 }}>
              VISTA PREVIA — DATOS DE ENTREGA
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.8, color: t.textSec }}>
              <div>👤 @{form.username || "..."}</div>
              <div>👥 {fmtK(form.followers || 0)} seguidores</div>
              <div>🌍 {form.country || "—"} • {form.niche || "—"}</div>
              <div>📧 {form.email || "—"}</div>
              <div>🔑 TikTok: {form.tiktokPassword || "—"}</div>
              <div>🔑 Email: {form.emailPasswordSame ? "(Misma)" : (form.emailPassword || "—")}</div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(2)} style={{
              flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.bgInput, cursor: "pointer", color: t.textSec, fontWeight: 600,
            }}>← Atrás</button>
            <button
              onClick={() => {
                const data = {
                  ...form,
                  followers: Number(form.followers) || 0,
                  purchasePrice: Number(form.purchasePrice) || 0,
                  estimatedSalePrice: Number(form.estimatedSalePrice) || 0,
                };
                onSave(data);
              }}
              style={{
                flex: 1, padding: 12, borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${t.accent}, #ff6b6b)`,
                cursor: "pointer", color: "#fff", fontWeight: 700,
              }}
            >
              {account ? "Guardar Cambios" : "✓ Guardar Cuenta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS SCREEN ───
function ReportsScreen({ accounts, t, dark }) {
  const [view, setView] = useState("daily");

  // ─ Daily: last 7 days
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("es", { weekday: "short", day: "numeric" });
      const sold = accounts.filter((a) => a.status === "sold" && a.soldDate === ds);
      const disq = accounts.filter((a) => a.status === "disqualified" && a.disqualifiedDate === ds);
      const revenue = sold.reduce((s, a) => s + (a.realSalePrice || 0), 0);
      const losses = disq.reduce((s, a) => s + (a.purchasePrice || 0), 0);
      const net = revenue - losses;
      days.push({ label, sold: sold.length, revenue, losses, net, disq: disq.length });
    }
    return days;
  }, [accounts]);

  // ─ Monthly: last 30 days
  const monthlyData = useMemo(() => {
    const now = new Date();
    const sold30 = accounts.filter((a) => a.status === "sold" && a.soldDate && daysAgo(a.soldDate, 30));
    const disq30 = accounts.filter((a) => a.status === "disqualified" && a.disqualifiedDate && daysAgo(a.disqualifiedDate, 30));
    const bought30 = accounts.filter((a) => a.createdAt && daysAgo(a.createdAt, 30));
    const totalRevenue = sold30.reduce((s, a) => s + (a.realSalePrice || 0), 0);
    const totalProfit = sold30.reduce((s, a) => s + (a.profit || 0), 0);
    const totalLoss = disq30.reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const totalInvested = bought30.reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const netProfit = totalProfit - totalLoss;
    const avgProfit = sold30.length ? totalProfit / sold30.length : 0;

    // Weeks
    const weeks = [0, 1, 2, 3].map((w) => {
      const start = new Date(now);
      start.setDate(start.getDate() - 30 + w * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const ws = accounts.filter((a) => {
        if (a.status === "sold" && a.soldDate) {
          const d = new Date(a.soldDate);
          return d >= start && d < end;
        }
        return false;
      });
      const wd = accounts.filter((a) => {
        if (a.status === "disqualified" && a.disqualifiedDate) {
          const d = new Date(a.disqualifiedDate);
          return d >= start && d < end;
        }
        return false;
      });
      return {
        label: `Sem ${w + 1}`,
        profit: ws.reduce((s, a) => s + (a.profit || 0), 0),
        loss: wd.reduce((s, a) => s + (a.purchasePrice || 0), 0),
        net: ws.reduce((s, a) => s + (a.profit || 0), 0) - wd.reduce((s, a) => s + (a.purchasePrice || 0), 0),
      };
    });

    return { totalRevenue, totalProfit, totalLoss, totalInvested, netProfit, avgProfit, soldCount: sold30.length, disqCount: disq30.length, weeks };
  }, [accounts]);

  // ─ Quarterly: last 90 days
  const quarterData = useMemo(() => {
    const sold90 = accounts.filter((a) => a.status === "sold" && a.soldDate && daysAgo(a.soldDate, 90));
    const disq90 = accounts.filter((a) => a.status === "disqualified" && a.disqualifiedDate && daysAgo(a.disqualifiedDate, 90));
    const totalRevenue = sold90.reduce((s, a) => s + (a.realSalePrice || 0), 0);
    const totalProfit = sold90.reduce((s, a) => s + (a.profit || 0), 0);
    const totalLoss = disq90.reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const totalInvested = [...sold90, ...disq90].reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const netProfit = totalProfit - totalLoss;

    const months = [0, 1, 2].map((m) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (2 - m));
      const label = d.toLocaleDateString("es", { month: "short" });
      const mo = d.getMonth();
      const yr = d.getFullYear();
      const ms = sold90.filter((a) => { const sd = new Date(a.soldDate); return sd.getMonth() === mo && sd.getFullYear() === yr; });
      const md = disq90.filter((a) => { const dd = new Date(a.disqualifiedDate); return dd.getMonth() === mo && dd.getFullYear() === yr; });
      const profit = ms.reduce((s, a) => s + (a.profit || 0), 0);
      const loss = md.reduce((s, a) => s + (a.purchasePrice || 0), 0);
      return { label, profit, loss, net: profit - loss };
    });

    const best = months.reduce((b, m) => (m.net > b.net ? m : b), months[0]);
    const worst = months.reduce((w, m) => (m.net < w.net ? m : w), months[0]);

    return {
      totalRevenue, totalProfit, totalLoss, totalInvested, netProfit,
      avgMonthly: netProfit / 3,
      soldCount: sold90.length, disqCount: disq90.length,
      months, best, worst,
    };
  }, [accounts]);

  // ─ Bar Chart Component
  const BarChart = ({ data, valueKey = "net", labelKey = "label" }) => {
    const maxVal = Math.max(...data.map((d) => Math.abs(d[valueKey])), 1);
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120, padding: "10px 0" }}>
        {data.map((d, i) => {
          const val = d[valueKey];
          const height = Math.max((Math.abs(val) / maxVal) * 80, 4);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: val >= 0 ? t.green : t.red }}>
                {fmt(val)}
              </div>
              <div style={{
                width: "100%", maxWidth: 40, height,
                borderRadius: 6,
                background: val >= 0
                  ? `linear-gradient(to top, ${t.green}40, ${t.green})`
                  : `linear-gradient(to top, ${t.red}40, ${t.red})`,
              }} />
              <div style={{ fontSize: 10, color: t.textSec, fontWeight: 500 }}>{d[labelKey]}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const StatRow = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.borderLight}` }}>
      <span style={{ fontSize: 12, color: t.textSec }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: color || t.text }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Reportes</div>

      {/* View Selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: t.bgInput, borderRadius: 12, padding: 4 }}>
        {[
          { id: "daily", label: "7 Días" },
          { id: "monthly", label: "30 Días" },
          { id: "quarterly", label: "90 Días" },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              flex: 1, padding: 10, borderRadius: 10, border: "none",
              cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: view === v.id ? t.accent : "transparent",
              color: view === v.id ? "#fff" : t.textSec,
              transition: "all .2s",
            }}
          >{v.label}</button>
        ))}
      </div>

      {/* Daily View */}
      {view === "daily" && (
        <>
          <Card t={t} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Ganancia Neta — Últimos 7 Días</div>
            <BarChart data={dailyData} />
          </Card>
          {dailyData.map((d, i) => (
            <Card t={t} key={i} style={{ marginBottom: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: t.textSec }}>
                    {d.sold} vendida{d.sold !== 1 ? "s" : ""} • {d.disq} desc.
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: d.net >= 0 ? t.green : t.red }}>
                    {fmt(d.net)}
                  </div>
                  {d.revenue > 0 && <div style={{ fontSize: 10, color: t.textSec }}>Ingreso: {fmt(d.revenue)}</div>}
                </div>
              </div>
            </Card>
          ))}
          {dailyData.every((d) => d.sold === 0 && d.disq === 0) && (
            <Card t={t} style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, color: t.textSec }}>Sin actividad en los últimos 7 días</div>
            </Card>
          )}
        </>
      )}

      {/* Monthly View */}
      {view === "monthly" && (
        <>
          <Card t={t} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Ganancia Neta del Mes</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: monthlyData.netProfit >= 0 ? t.green : t.red }}>
              {fmt(monthlyData.netProfit)}
            </div>
          </Card>
          <Card t={t} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Por Semana</div>
            <BarChart data={monthlyData.weeks} />
          </Card>
          <Card t={t} style={{ marginBottom: 12 }}>
            <StatRow label="Ganancias brutas" value={fmt(monthlyData.totalProfit)} color={t.green} />
            <StatRow label="Pérdidas (descalificadas)" value={fmt(monthlyData.totalLoss)} color={t.red} />
            <StatRow label="Invertido en el mes" value={fmt(monthlyData.totalInvested)} />
            <StatRow label="Ingresos brutos" value={fmt(monthlyData.totalRevenue)} />
            <StatRow label="Cuentas vendidas" value={monthlyData.soldCount} />
            <StatRow label="Cuentas descalificadas" value={monthlyData.disqCount} />
            <StatRow label="Ganancia promedio/cuenta" value={fmt(monthlyData.avgProfit)} color={t.green} />
          </Card>
        </>
      )}

      {/* Quarterly View */}
      {view === "quarterly" && (
        <>
          <Card t={t} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Ganancia Neta del Trimestre</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: quarterData.netProfit >= 0 ? t.green : t.red }}>
              {fmt(quarterData.netProfit)}
            </div>
          </Card>
          <Card t={t} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Por Mes</div>
            <BarChart data={quarterData.months} />
          </Card>
          <Card t={t} style={{ marginBottom: 12 }}>
            <StatRow label="Ganancias brutas" value={fmt(quarterData.totalProfit)} color={t.green} />
            <StatRow label="Pérdidas (descalificadas)" value={fmt(quarterData.totalLoss)} color={t.red} />
            <StatRow label="Invertido en el trimestre" value={fmt(quarterData.totalInvested)} />
            <StatRow label="Ingresos brutos" value={fmt(quarterData.totalRevenue)} />
            <StatRow label="Cuentas vendidas" value={quarterData.soldCount} />
            <StatRow label="Cuentas descalificadas" value={quarterData.disqCount} />
            <StatRow label="Promedio mensual" value={fmt(quarterData.avgMonthly)} color={quarterData.avgMonthly >= 0 ? t.green : t.red} />
            <StatRow label="Mejor mes" value={`${quarterData.best.label}: ${fmt(quarterData.best.net)}`} color={t.green} />
            <StatRow label="Peor mes" value={`${quarterData.worst.label}: ${fmt(quarterData.worst.net)}`} color={t.red} />
          </Card>
        </>
      )}
    </div>
  );
}

// ─── SEARCH SCREEN ───
function SearchScreen({ accounts, t, dark, onSelect }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return accounts.filter((a) =>
      (a.username || "").toLowerCase().includes(q) ||
      (a.profileName || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.country || "").toLowerCase().includes(q) ||
      (a.niche || "").toLowerCase().includes(q)
    );
  }, [accounts, query]);

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Buscar</div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: t.bgInput, borderRadius: 12, padding: "12px 14px",
        marginBottom: 16, border: `1px solid ${t.border}`,
      }}>
        {Icons.search}
        <input
          placeholder="Usuario, email, país, nicho..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{
            border: "none", outline: "none", background: "none",
            color: t.text, fontSize: 14, width: "100%",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{
            background: "none", border: "none", cursor: "pointer", color: t.textSec,
          }}>{Icons.x}</button>
        )}
      </div>

      {query && (
        <div style={{ fontSize: 12, color: t.textSec, marginBottom: 12 }}>
          {results.length} resultado{results.length !== 1 ? "s" : ""}
        </div>
      )}

      {results.map((a) => (
        <AccountListItem key={a.id} account={a} t={t} onSelect={onSelect} />
      ))}

      {query && results.length === 0 && (
        <Card t={t} style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.textSec }}>
            No se encontraron resultados
          </div>
        </Card>
      )}

      {!query && (
        <Card t={t} style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔎</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.textSec }}>
            Escribe para buscar cuentas
          </div>
          <div style={{ fontSize: 12, color: t.textTer, marginTop: 4 }}>
            Por usuario, email, país o nicho
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── CONFIG SCREEN ───
function ConfigScreen({ t, dark, toggleTheme, countries, saveCountries, categories, saveCategories, aiProviders, setAiProviders, saveAiProviders, whatsappTemplate, saveWhatsappTemplate }) {
  const [section, setSection] = useState(null);
  const [newCountry, setNewCountry] = useState({ emoji: "", name: "" });
  const [newCategory, setNewCategory] = useState("");
  const [templateDraft, setTemplateDraft] = useState(whatsappTemplate || "");

  if (section === "countries") {
    return (
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setSection(null)} style={{
            background: t.bgInput, border: "none", cursor: "pointer",
            width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", color: t.text,
          }}>{Icons.back}</button>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Países</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input placeholder="🇪🇸" value={newCountry.emoji} onChange={(e) => setNewCountry({ ...newCountry, emoji: e.target.value })}
            style={{ width: 50, padding: 10, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontSize: 18, textAlign: "center", outline: "none" }} />
          <input placeholder="Nombre del país" value={newCountry.name} onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
            style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontSize: 14, outline: "none" }} />
          <button onClick={() => {
            if (newCountry.name) {
              saveCountries([...countries, { ...newCountry }]);
              setNewCountry({ emoji: "", name: "" });
            }
          }} style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: t.accent, color: "#fff", cursor: "pointer", fontWeight: 700,
          }}>+</button>
        </div>

        {countries.map((c, i) => (
          <Card t={t} key={i} style={{ marginBottom: 6, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{c.emoji} {c.name}</span>
              <button onClick={() => saveCountries(countries.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", color: t.red }}>
                {Icons.trash}
              </button>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (section === "categories") {
    return (
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setSection(null)} style={{
            background: t.bgInput, border: "none", cursor: "pointer",
            width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", color: t.text,
          }}>{Icons.back}</button>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Categorías</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input placeholder="Nueva categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
            style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontSize: 14, outline: "none" }} />
          <button onClick={() => {
            if (newCategory) {
              saveCategories([...categories, newCategory]);
              setNewCategory("");
            }
          }} style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: t.accent, color: "#fff", cursor: "pointer", fontWeight: 700,
          }}>+</button>
        </div>

        {categories.map((c, i) => (
          <Card t={t} key={i} style={{ marginBottom: 6, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c}</span>
              <button onClick={() => saveCategories(categories.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", color: t.red }}>
                {Icons.trash}
              </button>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (section === "whatsapp") {
    const defaultTmpl = `🎵 *CUENTA TIKTOK*\n\n👤 Usuario: @{username}\n👥 Seguidores: {followers}\n🌍 País: {country}\n📂 Nicho: {niche}\n🔗 Link: {link}\n\n📧 Email: {email}\n🔑 Contraseña TikTok: {tiktokPassword}\n🔑 Contraseña Email: {emailPassword}\n\n⚠️ *INSTRUCCIONES:*\n• No cambiar la contraseña\n• No vincular número de teléfono\n• No reclamar la cuenta\n\n— TokStock 🔒`;
    return (
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setSection(null)} style={{
            background: t.bgInput, border: "none", cursor: "pointer",
            width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", color: t.text,
          }}>{Icons.back}</button>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Formato de Entrega</div>
        </div>

        <div style={{ fontSize: 12, color: t.textSec, marginBottom: 12 }}>
          Edita el mensaje que se envía por WhatsApp al comprador. Usa estas variables y se reemplazan automáticamente con los datos de la cuenta:
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {["{username}", "{followers}", "{country}", "{niche}", "{link}", "{email}", "{tiktokPassword}", "{emailPassword}", "{profileName}", "{price}"].map((v, i) => (
            <span key={i} style={{
              fontSize: 10, padding: "3px 8px", borderRadius: 6,
              background: t.accentSoft, color: t.accent, fontWeight: 600, fontFamily: "monospace",
            }}>{v}</span>
          ))}
        </div>

        <textarea
          value={templateDraft || defaultTmpl}
          onChange={(e) => setTemplateDraft(e.target.value)}
          rows={14}
          style={{
            width: "100%", padding: 12, borderRadius: 10,
            border: `1px solid ${t.border}`, background: t.bgInput,
            color: t.text, fontSize: 12, fontFamily: "monospace",
            outline: "none", resize: "vertical", lineHeight: 1.6, marginBottom: 12,
          }}
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setTemplateDraft(defaultTmpl)}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              border: `1px solid ${t.border}`, background: t.bgInput,
              cursor: "pointer", color: t.textSec, fontWeight: 600, fontSize: 13,
            }}
          >
            Restaurar original
          </button>
          <button
            onClick={() => { saveWhatsappTemplate(templateDraft || defaultTmpl); setSection(null); }}
            style={{
              flex: 1, padding: 12, borderRadius: 10, border: "none",
              background: t.accent, cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 13,
            }}
          >
            💾 Guardar Formato
          </button>
        </div>
      </div>
    );
  }

  if (section === "ai") {
    return (
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setSection(null)} style={{
            background: t.bgInput, border: "none", cursor: "pointer",
            width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", color: t.text,
          }}>{Icons.back}</button>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Inteligencia Artificial</div>
        </div>

        <div style={{ fontSize: 12, color: t.textSec, marginBottom: 16 }}>
          Configura proveedores de IA para el análisis automático de screenshots.
        </div>

        {aiProviders.map((p, i) => (
          <Card t={t} key={p.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: p.key ? t.green : t.red,
              }} />
            </div>
            <input
              placeholder="Pega tu API Key aquí..."
              value={p.key}
              onChange={(e) => {
                const updated = [...aiProviders];
                updated[i] = { ...p, key: e.target.value };
                setAiProviders(updated);
              }}
              style={{
                width: "100%", padding: 10, borderRadius: 8,
                border: `1px solid ${t.border}`, background: t.bgInput,
                color: t.text, fontSize: 12, fontFamily: "monospace", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                onClick={async () => {
                  const updated = aiProviders.map((prov, j) => ({
                    ...prov,
                    active: j === i ? true : false,
                  }));
                  setAiProviders(updated);
                  await saveAiProviders(updated);
                }}
                style={{
                  flex: 1, padding: 8, borderRadius: 8,
                  border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: p.active ? t.greenSoft : t.bgInput,
                  color: p.active ? t.green : t.textSec,
                }}
              >
                {p.active ? "✅ Usando esta IA" : "Usar esta IA"}
              </button>
              <button
                onClick={async () => {
                  const updated = [...aiProviders];
                  updated[i] = { ...updated[i] };
                  await saveAiProviders(updated);
                  alert("Key guardada correctamente");
                }}
                style={{
                  flex: 1, padding: 8, borderRadius: 8,
                  border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: p.key ? t.accent : t.bgInput,
                  color: p.key ? "#fff" : t.textSec,
                }}
              >
                💾 Guardar
              </button>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Configuración</div>

      {/* Connection Status */}
      <Card t={t} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: dbConnected ? t.green : t.red,
          }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Base de Datos</div>
            <div style={{ fontSize: 11, color: t.textSec }}>
              {dbConnected ? "Conectada y sincronizando" : "Sin conexión"}
            </div>
          </div>
        </div>
      </Card>

      {/* Theme Toggle */}
      <Card t={t} onClick={toggleTheme} style={{ marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{dark ? "🌙" : "☀️"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Tema {dark ? "Oscuro" : "Claro"}</div>
              <div style={{ fontSize: 11, color: t.textSec }}>Toca para cambiar</div>
            </div>
          </div>
          <div style={{
            width: 44, height: 24, borderRadius: 12,
            background: dark ? t.accent : t.bgInput,
            position: "relative", transition: "background .3s",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              background: "#fff", position: "absolute", top: 3,
              left: dark ? 23 : 3, transition: "left .3s",
            }} />
          </div>
        </div>
      </Card>

      {/* AI Config */}
      <Card t={t} onClick={() => setSection("ai")} style={{ marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Inteligencia Artificial</div>
              <div style={{ fontSize: 11, color: t.textSec }}>
                {aiProviders.filter((p) => p.active).length} proveedor(es) activo(s)
              </div>
            </div>
          </div>
          <span style={{ color: t.textSec }}>›</span>
        </div>
      </Card>

      {/* WhatsApp Template */}
      <Card t={t} onClick={() => setSection("whatsapp")} style={{ marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📲</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Formato de Entrega</div>
              <div style={{ fontSize: 11, color: t.textSec }}>Personalizar mensaje de WhatsApp</div>
            </div>
          </div>
          <span style={{ color: t.textSec }}>›</span>
        </div>
      </Card>

      {/* Countries */}
      <Card t={t} onClick={() => setSection("countries")} style={{ marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌍</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Países</div>
              <div style={{ fontSize: 11, color: t.textSec }}>{countries.length} países configurados</div>
            </div>
          </div>
          <span style={{ color: t.textSec }}>›</span>
        </div>
      </Card>

      {/* Categories */}
      <Card t={t} onClick={() => setSection("categories")} style={{ marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏷️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Categorías</div>
              <div style={{ fontSize: 11, color: t.textSec }}>{categories.length} etiquetas</div>
            </div>
          </div>
          <span style={{ color: t.textSec }}>›</span>
        </div>
      </Card>

      {/* About */}
      <Card t={t} style={{ marginBottom: 16, textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🎵</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: t.accent }}>TokStock</div>
        <div style={{ fontSize: 11, color: t.textSec, letterSpacing: 2, marginTop: 4 }}>
          INVENTORY MANAGER v1.0
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: t.textSec }}>
          Gestión de inventario para cuentas TikTok
        </div>
      </Card>
    </div>
  );
}

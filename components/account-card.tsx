"use client"

import { useStore, formatFollowers, formatCurrency, type Account } from "@/lib/store"
import { StatusBadge } from "./status-badge"

export function AccountCard({ account }: { account: Account }) {
  const { setSelectedAccount } = useStore()
  const price = account.status === "sold" ? account.realSalePrice : (account.estimatedSalePrice || account.purchasePrice)
  const cat = account.categories?.[0] || ""

  return (
    <button
      onClick={() => setSelectedAccount(account)}
      className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all active:scale-[0.99]"
    >
      {/* Avatar */}
      <div
        className="h-10 w-10 rounded-xl bg-secondary bg-cover bg-center"
        style={account.screenshot ? { backgroundImage: `url(${account.screenshot})` } : {}}
      />

      {/* Info */}
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">@{account.username}</span>
          <img src="/verified.png" alt="" className="h-3.5 w-3.5 shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={account.status} />
          <span className="text-[11px] text-muted-foreground">{formatFollowers(account.followers)}</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="truncate text-[11px] text-muted-foreground">{account.country || "—"}</span>
        </div>
      </div>

      {/* Price */}
      <div className="text-right">
        <p className="text-sm font-bold">{formatCurrency(price)}</p>
        {cat && <p className="text-[10px] text-accent">{cat}</p>}
      </div>
    </button>
  )
}

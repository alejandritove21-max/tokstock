"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useStore } from "@/lib/store"
import { AccountCard } from "./account-card"

export function SearchView() {
  const { accounts } = useStore()
  const [query, setQuery] = useState("")

  const results = query.length > 0 ? accounts.filter(a => {
    const q = query.toLowerCase()
    return a.username?.toLowerCase().includes(q) || a.profileName?.toLowerCase().includes(q) || a.country?.toLowerCase().includes(q) || a.niche?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || (a.categories || []).some(c => c.toLowerCase().includes(q))
  }) : []

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
      <h1 className="text-2xl font-bold">Buscar</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Usuario, email, país, nicho..." value={query} onChange={e => setQuery(e.target.value)} autoFocus
          className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {query.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">Buscar cuentas</p>
          <p className="mt-1 text-sm text-muted-foreground">Por usuario, email, país o nicho</p>
        </div>
      ) : results.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{results.length} resultado{results.length !== 1 ? "s" : ""}</p>
          {results.map(a => <AccountCard key={a.id} account={a} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4"><Search className="h-6 w-6 text-muted-foreground" /></div>
          <p className="text-sm text-muted-foreground">Sin resultados para &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  )
}

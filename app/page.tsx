"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"
import { BottomNav } from "@/components/bottom-nav"
import { Dashboard } from "@/components/dashboard"
import { Inventory } from "@/components/inventory"
import { AccountDetail } from "@/components/account-detail"
import { AccountForm } from "@/components/account-form"
import { Reports } from "@/components/reports"
import { Goals } from "@/components/goals"
import { EmailWarehouse } from "@/components/email-warehouse"
import { SearchView } from "@/components/search-view"
import { Settings } from "@/components/settings"
import { Broadcast } from "@/components/broadcast"
import { ChatBot } from "@/components/chatbot"
import { PendingPayments } from "@/components/pending-payments"
import { Notification } from "@/components/notification"
import { LoadingScreen } from "@/components/loading-screen"

export default function Home() {
  const { activeTab, loading, loadAccounts, loadSettings, selectedAccount, editingAccount } = useStore()

  useEffect(() => {
    loadAccounts()
    loadSettings()
  }, [])

  if (loading) return <LoadingScreen />

  // Chatbot is fullscreen
  if (activeTab === "chatbot") {
    return (
      <main className="h-screen bg-background">
        <div className="mx-auto h-full max-w-lg">
          <ChatBot />
        </div>
      </main>
    )
  }

  // If editing/creating account
  if (editingAccount !== null || activeTab === "nueva-cuenta") {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg">
          <AccountForm />
        </div>
        <Notification />
      </main>
    )
  }

  // If viewing account detail
  if (selectedAccount) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg">
          <AccountDetail />
        </div>
        <Notification />
      </main>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "inicio": return <Dashboard />
      case "inventario": return <Inventory />
      case "reportes": return <Reports />
      case "ajustes": return <Settings />
      case "buscar": return <SearchView />
      case "metas": return <Goals />
      case "bodega": return <EmailWarehouse />
      case "difusion": return <Broadcast />
      case "chatbot": return <ChatBot />
      case "pagos": return <PendingPayments />
      default: return <Dashboard />
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg">
        {renderContent()}
      </div>
      <BottomNav />
      <Notification />
    </main>
  )
}

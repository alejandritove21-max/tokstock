"use client"

export function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background">
      <img src="/tiktok.png" alt="" className="mb-5 h-14 w-14 animate-pulse-glow" />
      <div className="h-1 w-10 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-[#25F4EE] to-[#FE2C55]" />
      </div>
    </div>
  )
}

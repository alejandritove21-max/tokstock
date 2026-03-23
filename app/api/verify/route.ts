import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 15

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()
    if (!username) return NextResponse.json({ error: "No username" }, { status: 400 })

    const clean = username.replace("@", "").trim()
    const url = `https://www.tiktok.com/@${clean}`

    // Fetch TikTok profile page
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      redirect: "follow",
    })

    if (!res.ok) {
      return NextResponse.json({ verified: false, reason: "Perfil no encontrado" })
    }

    const html = await res.text()

    // Extract data from meta tags or JSON-LD
    let profileName = ""
    let followers = 0
    let exists = false

    // Check if profile exists (TikTok redirects or shows 404 for non-existent)
    if (html.includes(`@${clean}`) || html.includes(`"uniqueId":"${clean}"`)) {
      exists = true
    }

    // Try to extract from JSON data in page
    const jsonMatch = html.match(/"stats":\s*\{[^}]*"followerCount":\s*(\d+)/i)
    if (jsonMatch) {
      followers = parseInt(jsonMatch[1]) || 0
    }

    // Try meta description for follower count  
    const metaMatch = html.match(/content="[^"]*?(\d+(?:\.\d+)?[KMkm]?)\s*(?:Followers|Seguidores|followers)/i)
    if (metaMatch && !followers) {
      const str = metaMatch[1]
      if (str.toLowerCase().includes("k")) followers = Math.round(parseFloat(str) * 1000)
      else if (str.toLowerCase().includes("m")) followers = Math.round(parseFloat(str) * 1000000)
      else followers = parseInt(str) || 0
    }

    // Extract profile name from title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
    if (titleMatch) {
      const title = titleMatch[1]
      const nameMatch = title.match(/^(.+?)\s*\(@/)
      if (nameMatch) profileName = nameMatch[1].trim()
    }

    // Also try og:title
    const ogMatch = html.match(/property="og:title"\s+content="([^"]+)"/i)
    if (ogMatch && !profileName) {
      const nameMatch = ogMatch[1].match(/^(.+?)\s*\(@/)
      if (nameMatch) profileName = nameMatch[1].trim()
    }

    return NextResponse.json({
      verified: exists,
      username: clean,
      profileName,
      followers,
      url,
    })
  } catch (e: any) {
    return NextResponse.json({ verified: false, reason: e.message }, { status: 500 })
  }
}

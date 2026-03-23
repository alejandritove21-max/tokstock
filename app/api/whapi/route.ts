import { NextRequest, NextResponse } from "next/server"

const WHAPI_BASE = "https://gate.whapi.cloud"

export async function POST(req: NextRequest) {
  try {
    const { action, token, channelId, body, messageId } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "No Whapi token provided" }, { status: 400 })
    }

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    }

    // Get list of newsletters (channels)
    if (action === "getNewsletters") {
      const res = await fetch(`${WHAPI_BASE}/newsletters?count=100`, { headers })
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        // Whapi may return { newsletters: [...] } or { data: [...] } or just [...]
        let list = []
        if (Array.isArray(json)) list = json
        else if (json.newsletters && Array.isArray(json.newsletters)) list = json.newsletters
        else if (json.data && Array.isArray(json.data)) list = json.data
        else if (json.count !== undefined && json.newsletters) list = json.newsletters
        return NextResponse.json({ newsletters: list, raw: json })
      } catch {
        return NextResponse.json({ error: "Invalid response from Whapi", raw: text }, { status: 500 })
      }
    }

    // Get all groups (fallback if newsletters empty)
    if (action === "getGroups") {
      const res = await fetch(`${WHAPI_BASE}/groups?count=100`, { headers })
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        let list = []
        if (Array.isArray(json)) list = json
        else if (json.groups && Array.isArray(json.groups)) list = json.groups
        else if (json.data && Array.isArray(json.data)) list = json.data
        return NextResponse.json({ groups: list, raw: json })
      } catch {
        return NextResponse.json({ error: "Invalid response", raw: text }, { status: 500 })
      }
    }

    // Send text message to channel
    if (action === "sendMessage") {
      if (!channelId || !body) {
        return NextResponse.json({ error: "channelId and body required" }, { status: 400 })
      }
      const res = await fetch(`${WHAPI_BASE}/messages/text`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: channelId,
          body,
        }),
      })
      const json = await res.json()
      if (json.error) {
        return NextResponse.json({ error: json.error?.message || JSON.stringify(json.error) }, { status: 500 })
      }
      return NextResponse.json(json)
    }

    // Delete message from channel
    if (action === "deleteMessage") {
      if (!messageId) {
        return NextResponse.json({ error: "messageId required" }, { status: 400 })
      }
      const res = await fetch(`${WHAPI_BASE}/messages/${messageId}`, {
        method: "DELETE",
        headers,
      })
      const json = await res.json()
      return NextResponse.json(json)
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 })
  }
}

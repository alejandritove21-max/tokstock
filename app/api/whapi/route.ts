import { NextRequest, NextResponse } from "next/server"

const WHAPI_BASE = "https://gate.whapi.cloud"

function extractMessageId(json: any): string | null {
  // Whapi can return the ID in different places depending on version
  return json.message_id || json.id || json.sent?.id || json.sent?.message_id || json.msgId || null
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { action, token } = data

    if (!token) {
      return NextResponse.json({ error: "No Whapi token provided" }, { status: 400 })
    }

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    }

    // ── Get newsletters ──
    if (action === "getNewsletters") {
      const res = await fetch(`${WHAPI_BASE}/newsletters?count=100`, { headers })
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        let list: any[] = []
        if (Array.isArray(json)) list = json
        else if (json.newsletters && Array.isArray(json.newsletters)) list = json.newsletters
        else if (json.data && Array.isArray(json.data)) list = json.data
        return NextResponse.json({ newsletters: list })
      } catch {
        return NextResponse.json({ error: "Invalid response", raw: text }, { status: 500 })
      }
    }

    // ── Get groups ──
    if (action === "getGroups") {
      const res = await fetch(`${WHAPI_BASE}/groups?count=100`, { headers })
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        let list: any[] = []
        if (Array.isArray(json)) list = json
        else if (json.groups && Array.isArray(json.groups)) list = json.groups
        else if (json.data && Array.isArray(json.data)) list = json.data
        if (list.length === 0) {
          const res2 = await fetch(`${WHAPI_BASE}/chats?count=100`, { headers })
          const json2 = await res2.json()
          const chats = Array.isArray(json2) ? json2 : json2.chats || json2.data || []
          list = chats.filter((c: any) => c.id?.includes("@g.us") || c.type === "group")
        }
        return NextResponse.json({ groups: list })
      } catch {
        return NextResponse.json({ error: "Invalid response", raw: text }, { status: 500 })
      }
    }

    // ── Send image + caption (primary for accounts with screenshots) ──
    if (action === "sendImage") {
      const { channelId, caption, imageBase64 } = data
      if (!channelId) {
        return NextResponse.json({ error: "channelId required" }, { status: 400 })
      }

      const payload: any = {
        to: channelId,
        caption: caption || "",
      }

      // imageBase64 should be the full data URI: "data:image/jpeg;base64,/9j/..."
      if (imageBase64) {
        payload.media = imageBase64
      }

      const res = await fetch(`${WHAPI_BASE}/messages/image`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) {
        return NextResponse.json({ error: json.error?.message || JSON.stringify(json.error) }, { status: 500 })
      }
      return NextResponse.json({ ...json, extractedId: extractMessageId(json) })
    }

    // ── Send text only (fallback for accounts without screenshots) ──
    if (action === "sendMessage") {
      const { channelId, body } = data
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
      return NextResponse.json({ ...json, extractedId: extractMessageId(json) })
    }

    // ── Delete message ──
    if (action === "deleteMessage") {
      const { messageId } = data
      if (!messageId) {
        return NextResponse.json({ error: "messageId required" }, { status: 400 })
      }
      const res = await fetch(`${WHAPI_BASE}/messages/${messageId}`, {
        method: "DELETE",
        headers,
      })
      const text = await res.text()
      let json: any = {}
      try { json = JSON.parse(text) } catch {}
      return NextResponse.json({ success: res.ok, status: res.status, ...json })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 })
  }
}

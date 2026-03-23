import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

const WHAPI_BASE = "https://gate.whapi.cloud"

// Whapi returns message ID in different places. This walks the full response to find it.
function extractMessageId(json: any): string | null {
  if (!json || typeof json !== "object") return null
  // Direct fields
  if (json.message_id) return json.message_id
  if (typeof json.id === "string" && json.id.includes("@")) return json.id
  // Nested in sent
  if (json.sent?.id) return json.sent.id
  if (json.sent?.message_id) return json.sent.message_id
  // Nested in message
  if (json.message?.id) return json.message.id
  if (json.message?.message_id) return json.message.message_id
  // Some versions return { id: "true_xxx@g.us_ABCDEF" }
  if (typeof json.id === "string") return json.id
  // Walk first level looking for anything that looks like a message ID
  for (const key of Object.keys(json)) {
    const val = json[key]
    if (typeof val === "string" && (val.includes("true_") || val.includes("false_") || val.length > 20)) {
      return val
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      if (val.id) return val.id
      if (val.message_id) return val.message_id
    }
  }
  return null
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

    // ── Send to MULTIPLE channels in one server call ──
    if (action === "sendMulti") {
      const { channelIds, caption, imageBase64 } = data
      if (!Array.isArray(channelIds) || channelIds.length === 0) {
        return NextResponse.json({ error: "channelIds array required" }, { status: 400 })
      }
      const results: Record<string, string | null> = {}
      for (const chId of channelIds) {
        try {
          let res: Response
          if (imageBase64) {
            res = await fetch(`${WHAPI_BASE}/messages/image`, {
              method: "POST",
              headers,
              body: JSON.stringify({ to: chId, caption: caption || "", media: imageBase64 }),
            })
          } else {
            res = await fetch(`${WHAPI_BASE}/messages/text`, {
              method: "POST",
              headers,
              body: JSON.stringify({ to: chId, body: caption || "" }),
            })
          }
          const json = await res.json()
          results[chId] = extractMessageId(json)
          // Wait between sends to avoid rate limiting
          await new Promise(r => setTimeout(r, 1500))
        } catch {
          results[chId] = null
        }
      }
      return NextResponse.json({ results })
    }

    // ── Delete from MULTIPLE channels in one server call ──
    if (action === "deleteMulti") {
      const { messageIds } = data
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return NextResponse.json({ error: "messageIds array required" }, { status: 400 })
      }
      let deleted = 0
      for (const msgId of messageIds) {
        try {
          await fetch(`${WHAPI_BASE}/messages/${encodeURIComponent(msgId)}`, { method: "DELETE", headers })
          deleted++
        } catch {}
        await new Promise(r => setTimeout(r, 500))
      }
      return NextResponse.json({ deleted })
    }

    // ── Send image + caption (single channel) ──
    if (action === "sendImage") {
      const { channelId, caption, imageBase64 } = data
      if (!channelId) {
        return NextResponse.json({ error: "channelId required" }, { status: 400 })
      }
      const payload: any = {
        to: channelId,
        caption: caption || "",
      }
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
      const msgId = extractMessageId(json)
      // Return full response for debugging + extracted ID
      return NextResponse.json({ extractedId: msgId, _raw: json })
    }

    // ── Send text only ──
    if (action === "sendMessage") {
      const { channelId, body } = data
      if (!channelId || !body) {
        return NextResponse.json({ error: "channelId and body required" }, { status: 400 })
      }
      const res = await fetch(`${WHAPI_BASE}/messages/text`, {
        method: "POST",
        headers,
        body: JSON.stringify({ to: channelId, body }),
      })
      const json = await res.json()
      if (json.error) {
        return NextResponse.json({ error: json.error?.message || JSON.stringify(json.error) }, { status: 500 })
      }
      const msgId = extractMessageId(json)
      return NextResponse.json({ extractedId: msgId, _raw: json })
    }

    // ── Delete message ──
    if (action === "deleteMessage") {
      const { messageId } = data
      if (!messageId) {
        return NextResponse.json({ error: "messageId required" }, { status: 400 })
      }
      // Whapi delete endpoint: DELETE /messages/{MessageID}
      const res = await fetch(`${WHAPI_BASE}/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        headers,
      })
      const text = await res.text()
      let json: any = {}
      try { json = JSON.parse(text) } catch {}
      return NextResponse.json({ success: res.ok, status: res.status, deletedId: messageId, ...json })
    }

    // ── Debug: see what's stored ──
    if (action === "debug") {
      return NextResponse.json({ message: "Whapi proxy working", token: token.substring(0, 4) + "..." })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 })
  }
}

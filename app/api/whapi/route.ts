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
      const json = await res.json()
      return NextResponse.json(json)
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

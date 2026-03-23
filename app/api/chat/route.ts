import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, context, messages } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided" }, { status: 400 })
    }

    const isClaude = provider === "claude"

    if (isClaude) {
      // Try haiku first, then sonnet
      const models = ["claude-haiku-4-5-20251001", "claude-sonnet-4-20250514"]
      let lastError = ""

      for (const model of models) {
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 1000,
              system: context,
              messages,
            }),
          })

          const json = await res.json()
          if (json.error) {
            lastError = json.error.message
            continue
          }

          const reply = (json.content || [])
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("")

          return NextResponse.json({ reply })
        } catch {
          lastError = `Failed with model ${model}`
          continue
        }
      }
      return NextResponse.json({ error: lastError }, { status: 500 })

    } else {
      // OpenAI
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: context }, ...messages],
          max_tokens: 1000,
        }),
      })

      const json = await res.json()
      if (json.error) {
        return NextResponse.json({ error: json.error.message }, { status: 500 })
      }

      const reply = json.choices?.[0]?.message?.content || "Sin respuesta"
      return NextResponse.json({ reply })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 })
  }
}

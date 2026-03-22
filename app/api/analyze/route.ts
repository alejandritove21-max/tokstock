import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { image, apiKey, provider } = await req.json()

    if (!image || !apiKey) {
      return NextResponse.json({ error: "Missing image or API key" }, { status: 400 })
    }

    const prompt = `Analyze this TikTok profile screenshot. Extract:
- username (the @handle)
- profileName (display name)
- followers (number only, convert "12.6K" to 12600, "1.2M" to 1200000)
- niche (content category in Spanish)

Return ONLY valid JSON: {"username":"","profileName":"","followers":0,"niche":""}`

    let data: any

    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "image/jpeg", data: image } },
              ],
            }],
          }),
        }
      )
      const json = await res.json()
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const match = text.match(/\{[\s\S]*\}/)
      data = match ? JSON.parse(match[0]) : {}
    } else if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              { type: "text", text: prompt },
            ],
          }],
        }),
      })
      const json = await res.json()
      const text = json?.content?.[0]?.text || ""
      const match = text.match(/\{[\s\S]*\}/)
      data = match ? JSON.parse(match[0]) : {}
    } else {
      // OpenAI
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            ],
          }],
          max_tokens: 300,
        }),
      })
      const json = await res.json()
      const text = json?.choices?.[0]?.message?.content || ""
      const match = text.match(/\{[\s\S]*\}/)
      data = match ? JSON.parse(match[0]) : {}
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

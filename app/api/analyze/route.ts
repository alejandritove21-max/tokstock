import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { image, apiKey, provider } = await req.json()

    if (!image || !apiKey) {
      return NextResponse.json({ error: "Falta imagen o API key" }, { status: 400 })
    }

    const prompt = `Esta es una captura de pantalla de un perfil de TikTok.

EXTRAE estos datos EXACTOS de la imagen:

1. USERNAME: El texto que empieza con @ (está en gris, debajo del nombre grande)
   - COPIA CADA CARÁCTER EXACTO: letras, números, puntos (.), guiones bajos (_), guiones (-)
   - Ejemplo: si ves "@dr.friedrich_wolf99" el username es "dr.friedrich_wolf99"
   - Ejemplo: si ves "@love.fashion_46" el username es "love.fashion_46"  
   - Ejemplo: si ves "@crontyrte0n" el username es "crontyrte0n"
   - NO cambies, NO corrijas, NO omitas ningún carácter especial
   - Los puntos (.) y guiones bajos (_) son MUY comunes en usernames de TikTok

2. NOMBRE: El texto grande en blanco arriba del @username

3. SEGUIDORES: El número al lado de "Seguidores"
   - "12.6 mil" = 12600
   - "1.2M" = 1200000
   - "856" = 856

4. NICHO: Tipo de contenido (1-2 palabras en español)

Responde SOLO con JSON válido (sin backticks ni texto extra):
{"username":"COPIA_EXACTA_DEL_HANDLE","profileName":"NOMBRE","followers":NUMERO,"niche":"NICHO"}`

    let data: any = {}

    if (provider === "claude") {
      const models = ["claude-haiku-4-5-20251001", "claude-sonnet-4-20250514"]
      
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
              max_tokens: 500,
              messages: [{
                role: "user",
                content: [
                  { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
                  { type: "text", text: prompt },
                ],
              }],
            }),
          })

          if (!res.ok) continue

          const json = await res.json()
          if (json.type === "error" || json.error) continue

          const text = (json.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("")
          const match = text.match(/\{[\s\S]*?\}/)
          if (match) {
            data = JSON.parse(match[0])
            break
          }
        } catch {
          continue
        }
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "Claude no pudo analizar. Verifica tu API key." }, { status: 400 })
      }

    } else {
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
          max_tokens: 500,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `OpenAI: ${err.slice(0, 200)}` }, { status: 400 })
      }

      const json = await res.json()
      if (json.error) return NextResponse.json({ error: `OpenAI: ${json.error.message}` }, { status: 400 })
      const text = json?.choices?.[0]?.message?.content || ""
      const match = text.match(/\{[\s\S]*?\}/)
      data = match ? JSON.parse(match[0]) : {}
    }

    // Clean followers
    if (data.followers != null && typeof data.followers === "string") {
      const str = data.followers.toLowerCase().trim()
      if (str.includes("mil") || str.includes("k")) {
        data.followers = Math.round(parseFloat(str.replace(/[^0-9.]/g, "")) * 1000)
      } else if (str.includes("m")) {
        data.followers = Math.round(parseFloat(str.replace(/[^0-9.]/g, "")) * 1000000)
      } else {
        data.followers = parseInt(str.replace(/[^0-9]/g, "")) || 0
      }
    }
    if (typeof data.followers !== "number" || isNaN(data.followers)) data.followers = 0

    // Clean username - only remove @ prefix, keep ALL other characters
    if (data.username) {
      data.username = data.username.replace(/^@/, "").trim()
      // Do NOT remove dots, underscores, hyphens, or numbers
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error" }, { status: 500 })
  }
}

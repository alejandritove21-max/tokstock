import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { image, apiKey, provider } = await req.json()

    if (!image || !apiKey) {
      return NextResponse.json({ error: "Falta imagen o API key" }, { status: 400 })
    }

    const prompt = `Eres un OCR experto. Analiza esta captura de pantalla de un perfil de TikTok y extrae los datos con PRECISIÓN ABSOLUTA.

REGLAS CRÍTICAS:
- MIRA LA IMAGEN CON CUIDADO antes de responder
- El USERNAME está en texto gris, DEBAJO del nombre grande en blanco
- Empieza con @ y puede contener: letras, números, puntos (.), guiones bajos (_), guiones (-)
- TRANSCRIBE CARÁCTER POR CARÁCTER sin asumir, corregir ni cambiar NADA
- Diferencia entre: 0 (cero) y O (letra), l (ele) e I (i mayúscula), 1 (uno) y l (ele)
- Si el username tiene caracteres árabes, coreanos u otros idiomas, cópialos tal cual

DATOS A EXTRAER:

1. USERNAME (sin el @):
   - Lee cada carácter del texto gris bajo el nombre
   - Ejemplos reales: "dr.friedrich_wolf99", "amor.y_paz-3", "مريم_احمد", "cook_master.01"

2. NOMBRE DE PERFIL: El texto grande en blanco/bold arriba del @username

3. SEGUIDORES: El número que aparece sobre la palabra "Seguidores" o "Followers"
   - Convierte: "12.6 mil" → 12600, "1.2M" → 1200000, "856" → 856
   - "12,6 mil" → 12600, "5.4K" → 5400
   - Si dice "mil" o "K" multiplica por 1000
   - Si dice "M" multiplica por 1000000

4. NICHO: Describe el tipo de contenido en 1-3 palabras en español (Entretenimiento, Cocina, Moda, Comedia, etc.)

RESPONDE ÚNICAMENTE con este JSON (sin backticks, sin texto antes o después):
{"username":"USERNAME_EXACTO","profileName":"NOMBRE","followers":NUMERO,"niche":"NICHO"}`

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

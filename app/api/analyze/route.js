export async function POST(request) {
  try {
    const { image, apiKey, provider } = await request.json();

    if (!image || !apiKey) {
      return Response.json({ error: "Faltan datos" }, { status: 400 });
    }

    const prompt = `Analyze this TikTok profile screenshot. Extract and return ONLY a JSON object with these fields (no extra text, no markdown, no code blocks):
{"username": "the @username without @", "profileName": "display name", "followers": number, "niche": "content category like Fitness/Gaming/Moda/Belleza/Cocina/Viajes/Educación/Humor/Música/Deportes/Tecnología/Finanzas/Arte/Mascotas/Lifestyle/Entretenimiento/Salud/Otro", "categories": ["array of applicable tags from: Creator Rare, TikTok Shop, Verificada, Monetizable, Alto Engagement, Vintage 3+, Monetizada"]}
If you cannot determine a field, use null. Return ONLY valid JSON, nothing else.`;

    let result = null;

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
            ]
          }],
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      if (data.error) return Response.json({ error: data.error.message }, { status: 400 });
      result = data.choices?.[0]?.message?.content;
    }
    else if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: image } }
          ]}],
        }),
      });
      const data = await res.json();
      if (data.error) return Response.json({ error: data.error.message }, { status: 400 });
      result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    }
    else if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: prompt }
          ]}],
        }),
      });
      const data = await res.json();
      if (data.error) return Response.json({ error: data.error?.message }, { status: 400 });
      result = data.content?.[0]?.text;
    }

    if (!result) {
      return Response.json({ error: "No se recibió respuesta de la IA" }, { status: 500 });
    }

    const clean = result.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return Response.json(parsed);

  } catch (e) {
    return Response.json({ error: e.message || "Error desconocido" }, { status: 500 });
  }
}

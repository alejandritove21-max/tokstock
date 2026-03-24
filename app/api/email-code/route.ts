import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 25

// IMAP settings for common providers
function getImapConfig(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  
  // Hotmail / Outlook / Live
  if (domain.includes("hotmail") || domain.includes("outlook") || domain.includes("live") || domain.includes("msn")) {
    return { host: "outlook.office365.com", port: 993, secure: true }
  }
  // Gmail
  if (domain.includes("gmail") || domain.includes("googlemail")) {
    return { host: "imap.gmail.com", port: 993, secure: true }
  }
  // Yahoo
  if (domain.includes("yahoo")) {
    return { host: "imap.mail.yahoo.com", port: 993, secure: true }
  }
  // iCloud
  if (domain.includes("icloud") || domain.includes("me.com") || domain.includes("mac.com")) {
    return { host: "imap.mail.me.com", port: 993, secure: true }
  }
  // AOL
  if (domain.includes("aol")) {
    return { host: "imap.aol.com", port: 993, secure: true }
  }
  // Zoho
  if (domain.includes("zoho")) {
    return { host: "imap.zoho.com", port: 993, secure: true }
  }
  // ProtonMail — no IMAP support
  if (domain.includes("proton") || domain.includes("pm.me")) {
    return null
  }
  // Generic — try common pattern
  return { host: `imap.${domain}`, port: 993, secure: true }
}

// Extract verification code from email body
function extractCode(text: string): string | null {
  if (!text) return null
  
  // TikTok verification codes are typically 6 digits
  // Look for patterns like "code is 123456" or "código: 123456" or just standalone 6 digits
  const patterns = [
    /(?:verification|verify|código|code|Código de verificación|验证码)[:\s]*(\d{4,6})/i,
    /(?:one-time|OTP|contraseña temporal)[:\s]*(\d{4,6})/i,
    /\b(\d{6})\b/,  // Any standalone 6-digit number
    /\b(\d{4})\b/,  // Any standalone 4-digit number (some use 4 digits)
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 })
    }

    const imapConfig = getImapConfig(email)
    if (!imapConfig) {
      return NextResponse.json({ error: "Este proveedor de correo no soporta IMAP (ProtonMail)" }, { status: 400 })
    }

    // Dynamic import to avoid issues with serverless bundling
    const { ImapFlow } = await import("imapflow")

    const client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: imapConfig.secure,
      auth: {
        user: email,
        pass: password,
      },
      logger: false,
      tls: {
        rejectUnauthorized: false,
      },
    })

    try {
      await client.connect()
    } catch (e: any) {
      const msg = e.message || ""
      if (msg.includes("AUTHENTICATIONFAILED") || msg.includes("Invalid credentials") || msg.includes("LOGIN")) {
        // For Hotmail: might need App Password
        const isHotmail = email.includes("hotmail") || email.includes("outlook") || email.includes("live")
        return NextResponse.json({ 
          error: "Credenciales incorrectas" + (isHotmail ? ". Hotmail/Outlook puede requerir una 'Contraseña de aplicación' en lugar de tu contraseña normal. Ve a account.microsoft.com → Seguridad → Contraseñas de aplicación." : ""),
          needsAppPassword: isHotmail,
        }, { status: 401 })
      }
      return NextResponse.json({ error: `No se pudo conectar: ${msg}` }, { status: 500 })
    }

    try {
      const lock = await client.getMailboxLock("INBOX")
      
      try {
        // Search for recent TikTok emails (last 24 hours)
        const since = new Date()
        since.setHours(since.getHours() - 24)
        
        // Search for TikTok verification emails
        const messages = await client.search({
          since,
          or: [
            { from: "tiktok" },
            { from: "TikTok" },
            { from: "verify@tiktok.com" },
            { from: "no-reply@tiktok.com" },
            { subject: "TikTok" },
            { subject: "verification" },
            { subject: "código" },
            { subject: "code" },
          ],
        })

        if (!messages || messages.length === 0) {
          // Try broader search
          const allRecent = await client.search({ since })
          
          // Get last 10 messages and check for codes
          const recentUids = allRecent.slice(-10)
          let foundCode: string | null = null
          let foundSubject = ""
          let foundFrom = ""
          let foundDate = ""

          for (const uid of recentUids.reverse()) {
            const msg = await client.fetchOne(uid, { source: true, envelope: true })
            if (msg) {
              const text = msg.source?.toString() || ""
              const subject = msg.envelope?.subject || ""
              const from = msg.envelope?.from?.[0]?.address || ""
              
              // Check if it's from TikTok or contains a code
              const isTikTok = from.toLowerCase().includes("tiktok") || subject.toLowerCase().includes("tiktok")
              const code = extractCode(text)
              
              if (code && (isTikTok || !foundCode)) {
                foundCode = code
                foundSubject = subject
                foundFrom = from
                foundDate = msg.envelope?.date?.toISOString() || ""
                if (isTikTok) break // Prefer TikTok emails
              }
            }
          }

          if (foundCode) {
            return NextResponse.json({ 
              code: foundCode, 
              from: foundFrom,
              subject: foundSubject,
              date: foundDate,
              source: "recent",
            })
          }

          return NextResponse.json({ 
            error: "No se encontraron códigos de TikTok en las últimas 24 horas",
            totalEmails: allRecent.length,
          }, { status: 404 })
        }

        // Get the most recent TikTok email
        const lastUid = messages[messages.length - 1]
        const msg = await client.fetchOne(lastUid, { source: true, envelope: true })
        
        if (!msg) {
          return NextResponse.json({ error: "No se pudo leer el mensaje" }, { status: 500 })
        }

        const text = msg.source?.toString() || ""
        const code = extractCode(text)
        const subject = msg.envelope?.subject || ""
        const from = msg.envelope?.from?.[0]?.address || ""
        const date = msg.envelope?.date?.toISOString() || ""

        if (code) {
          return NextResponse.json({ code, from, subject, date, source: "tiktok" })
        }

        return NextResponse.json({ 
          error: "Se encontró un email de TikTok pero no se pudo extraer el código",
          subject,
          from,
          date,
        }, { status: 404 })

      } finally {
        lock.release()
      }
    } finally {
      await client.logout()
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 })
  }
}

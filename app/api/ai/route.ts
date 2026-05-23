export const runtime = "nodejs"

import { NextResponse } from "next/server"

// =========================
// STRIP HTML → TEKS
// =========================
function stripHtml(html: string): string {
  if (!html) return ""
  return html
    .replace(/<table[^>]*>/gi, "\n[TABEL]\n")
    .replace(/<\/table>/gi, "\n[/TABEL]\n")
    .replace(/<tr[^>]*>/gi, "\n")
    .replace(/<\/tr>/gi, "")
    .replace(/<th[^>]*>/gi, " | ")
    .replace(/<\/th>/gi, "")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<\/td>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// =========================
// BACA GAMBAR (Claude Vision)
// =========================
async function readImageWithClaude(imageUrls: string[]): Promise<string> {
  if (!imageUrls || imageUrls.length === 0) return ""
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return ""

  const imageContents = imageUrls.map((url) => ({
    type: "image",
    source: { type: "url", url },
  }))

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            ...imageContents,
            {
              type: "text",
              text: "Ekstrak semua data dari gambar/tabel ini. Tuliskan isinya secara lengkap dan terstruktur dalam teks biasa.",
            },
          ],
        },
      ],
    }),
  })

  const data = await response.json()
  return data?.content?.[0]?.text || ""
}

// =========================
// MAIN
// =========================
export async function POST(req: Request) {
  try {
    const { soal, jawaban_benar, pertanyaan, images } = await req.json()

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ text: "API KEY belum diisi" })

    // Baca gambar jika ada
    let imageData = ""
    if (images && images.length > 0) {
      imageData = await readImageWithClaude(images)
    }

    // Soal bersih (HTML → teks)
    const soalBersih = stripHtml(soal)

    let systemPrompt = ""
    let userPrompt = ""

    // =========================
    // MODE CHAT
    // =========================
    if (pertanyaan) {
      systemPrompt = `
Kamu adalah guru les privat yang ramah dan natural.
Jawab pertanyaan siswa dengan singkat, jelas, santai, dan langsung ke inti.
JANGAN mengulang seluruh soal terus menerus.
Kalau siswa bertanya lanjutan:
- fokus jawab pertanyaannya saja
- jangan ulang pembahasan panjang
- gunakan bahasa mudah dipahami siswa
`
      userPrompt = `
Soal:
${soalBersih}
${imageData ? `\nData dari gambar/tabel:\n${imageData}` : ""}

Jawaban benar: ${jawaban_benar}

Pertanyaan siswa: ${pertanyaan}
`
    }

    // =========================
    // MODE PEMBAHASAN
    // =========================
    else {
      systemPrompt = `
Kamu adalah guru TKA profesional.
Buat pembahasan yang rapi, jelas, step by step, mudah dipahami siswa.
`
      userPrompt = `
Soal:
${soalBersih}
${imageData ? `\nData dari gambar/tabel:\n${imageData}` : ""}

Jawaban benar: ${jawaban_benar}

Jelaskan pembahasannya.
`
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content

    return NextResponse.json({ text: text || "AI tidak merespon" })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ text: "Server Error" })
  }
}
export const runtime = "nodejs"

import { NextResponse } from "next/server"

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

async function urlToBase64(url: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[AI] Gagal fetch gambar: ${url} → ${res.status}`)
      return null
    }
    const contentType = res.headers.get("content-type") || "image/jpeg"
    let mediaType = "image/jpeg"
    if (contentType.includes("png"))  mediaType = "image/png"
    if (contentType.includes("gif"))  mediaType = "image/gif"
    if (contentType.includes("webp")) mediaType = "image/webp"

    const arrayBuffer = await res.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    return { base64, mediaType }
  } catch (err) {
    console.warn(`[AI] Error fetch gambar: ${url}`, err)
    return null
  }
}

async function readImageWithVision(imageUrls: string[]): Promise<string> {
  if (!imageUrls || imageUrls.length === 0) return ""

  const apiKey = process.env.OPENROUTER_API_KEY
  console.log("[AI] OPENROUTER_API_KEY:", apiKey ? apiKey.slice(0, 15) + "..." : "UNDEFINED / KOSONG")

  if (!apiKey) {
    console.warn("[AI] OPENROUTER_API_KEY tidak ada — skip Vision")
    return ""
  }

  const imageResults = await Promise.all(imageUrls.map(urlToBase64))
  const validImages = imageResults.filter(Boolean) as { base64: string; mediaType: string }[]

  if (validImages.length === 0) {
    console.warn("[AI] Tidak ada gambar yang berhasil di-fetch")
    return ""
  }

  console.log(`[AI] Mengirim ${validImages.length} gambar ke OpenRouter Vision`)

  const content: any[] = validImages.map((img) => ({
    type: "image_url",
    image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
  }))

  content.push({
    type: "text",
    text: "Ekstrak semua data dari gambar/tabel ini. Tuliskan isinya secara lengkap dan terstruktur dalam teks biasa. Sertakan semua angka, label, persentase, atau data lain yang terlihat.",
  })

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://localhost:3000",
      "X-Title": "TKA App",
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [{ role: "user", content }],
    }),
  })

  const data = await response.json()
  console.log("[AI] OpenRouter response status:", response.status)

  if (data?.error) {
    console.warn("[AI] OpenRouter Vision error:", data.error)
    return ""
  }

  const result = data?.choices?.[0]?.message?.content || ""
  console.log("[AI] Hasil Vision OpenRouter:", result.slice(0, 200))
  return result
}

export async function POST(req: Request) {
  try {
   const { soal, jawaban_benar, pertanyaan, images, opsi } = await req.json()

    console.log("[AI] POST diterima — images:", images)

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ text: "GROQ API KEY belum diisi" })

    let imageData = ""
    if (images && images.length > 0) {
      imageData = await readImageWithVision(images)
    }

    console.log("[AI] imageData (50 char):", imageData.slice(0, 50) || "(kosong)")

    const soalBersih = stripHtml(soal)

    let systemPrompt = ""
    let userPrompt = ""

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
${opsi ? `\nPilihan jawaban:\nA. ${opsi.a}\nB. ${opsi.b}\nC. ${opsi.c}\nD. ${opsi.d}${opsi.e ? `\nE. ${opsi.e}` : ""}` : ""}

Pertanyaan siswa: ${pertanyaan}
`
    } else {
      systemPrompt = `
Kamu adalah guru TKA profesional.
Buat pembahasan yang rapi, jelas, step by step, mudah dipahami siswa.
${imageData ? "Gunakan data dari gambar yang sudah diekstrak untuk membuat pembahasan yang akurat dan spesifik." : ""}
`
      userPrompt = `
Soal:
${soalBersih}
${imageData ? `\nData dari gambar/tabel:\n${imageData}` : ""}

Jawaban benar: ${jawaban_benar}
${opsi ? `\nPilihan jawaban:\nA. ${opsi.a}\nB. ${opsi.b}\nC. ${opsi.c}\nD. ${opsi.d}${opsi.e ? `\nE. ${opsi.e}` : ""}` : ""}

Jelaskan pembahasannya secara lengkap dan akurat berdasarkan data di atas.
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
        max_tokens: 1500,
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
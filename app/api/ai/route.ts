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

// Bersihkan HTML & newline dari satu opsi jawaban, supaya jadi teks 1 baris rapi
// (mencegah "A." dan isinya terpisah baris, atau tanda kurung kepotong)
function cleanOption(html: string): string {
  if (!html) return ""
  return stripHtml(html).replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim()
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

  const apiKey = process.env.SUMOPOD_API_KEY
  console.log("[AI] SUMOPOD_API_KEY:", apiKey ? apiKey.slice(0, 15) + "..." : "UNDEFINED / KOSONG")

  if (!apiKey) {
    console.warn("[AI] SUMOPOD_API_KEY tidak ada — skip Vision")
    return ""
  }

  const imageResults = await Promise.all(imageUrls.map(urlToBase64))
  const validImages = imageResults.filter(Boolean) as { base64: string; mediaType: string }[]

  if (validImages.length === 0) {
    console.warn("[AI] Tidak ada gambar yang berhasil di-fetch")
    return ""
  }

  console.log(`[AI] Mengirim ${validImages.length} gambar ke Sumopod Vision`)

  const content: any[] = validImages.map((img) => ({
    type: "image_url",
    image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
  }))

  content.push({
    type: "text",
    text: "Ekstrak SEMUA data dari gambar/tabel ini secara lengkap dan presisi, baris per baris. Kalau ini tabel, tuliskan ulang setiap baris data secara eksplisit (misal: 'Siswa 1: Jam Belajar=5, Nilai=65'), jangan dirangkum atau digeneralisir jadi rentang. Sertakan semua angka, label, persentase, atau data lain yang terlihat persis seperti aslinya.",
  })

  const response = await fetch("https://ai.sumopod.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content }],
    }),
  })

  const data = await response.json()
  console.log("[AI] Sumopod Vision response status:", response.status)

  if (data?.error) {
    console.warn("[AI] Sumopod Vision error:", data.error)
    return ""
  }

  const result = data?.choices?.[0]?.message?.content || ""
  console.log("[AI] Hasil Vision Sumopod:", result.slice(0, 200))
  return result
}

export async function POST(req: Request) {
  try {
    const {
      soal,
      jawaban_benar,
      jawaban_user,

      jawaban_benar_huruf,
      jawaban_user_huruf,

      pertanyaan,
      images,
      opsi,
      opsi_raw,
    } = await req.json()

    console.log("[AI] POST diterima — images:", images)

    const apiKey = process.env.SUMOPOD_API_KEY
    if (!apiKey) return NextResponse.json({ text: "SUMOPOD API KEY belum diisi" })

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

INSTRUKSI PENTING:
1. Pertama, tuliskan ulang SOAL dengan ringkas
2. Tuliskan semua OPSI JAWABAN yang tersedia (A, B, C, D, E)
3. Tunjukkan JAWABAN SISWA dan JAWABAN BENAR
4. Jelaskan LANGKAH PENYELESAIAN yang benar
5. Jelaskan MENGAPA jawaban benar itu benar
6. Jelaskan MENGAPA jawaban siswa salah (jika salah)
7. Berikan TIPS untuk mengerjakan soal serupa

ATURAN KEDALAMAN ANALISIS (WAJIB, JANGAN DILANGGAR):
- Kalau ada data mentah (tabel/angka) dari soal atau dari hasil ekstraksi gambar, WAJIB kutip data itu SECARA SPESIFIK per-item/per-baris (misal: "Siswa 4 belajar 10 jam → nilai 90", "Siswa 3 belajar 3 jam → nilai 60"), BUKAN cuma rentang umum seperti "jam belajar rendah nilai 60-70".
- Urutkan atau kelompokkan data itu sedemikian rupa sehingga polanya kelihatan jelas dan bisa dibuktikan dari angka aslinya, bukan cuma diklaim.
- Kalau relevan (misal soal tentang korelasi/asosiasi/tren), jelaskan pola itu dengan membandingkan minimal 3 pasang data konkret, bukan generalisasi.
- Jangan mengarang angka. Kalau data mentahnya tidak lengkap/tidak ada, katakan itu dengan jujur, jangan menebak.

ATURAN FORMAT WAJIB (PENTING, JANGAN DILANGGAR):
- Huruf opsi dan isinya harus SELALU berada di baris yang SAMA. Contoh yang BENAR: "A. 10°". Contoh yang SALAH: "A." lalu baris baru "10°".
- Jangan pernah menaruh baris kosong di antara huruf opsi dan isi opsi, atau di antara label (misalnya "JAWABAN SISWA:") dan isinya.
- Tulis daftar opsi sebagai list markdown satu baris per opsi, contoh:
  - A. 10°
  - B. 30°
  - C. 45°
  - D. 60°
- "JAWABAN SISWA: A. 10°" dan "JAWABAN BENAR: D. 60°" masing-masing HARUS satu baris utuh, jangan dipecah.
- Judul section seperti "### ❌ Jawaban Siswa (...)" HARUS ditutup dalam baris yang sama, jangan biarkan tanda kurung penutup ")" turun ke baris berikutnya sendirian.

Gunakan format MARKDOWN dengan:
- **teks tebal** untuk poin penting
- \`kode\` untuk rumus
- > untuk kutipan
- ### untuk subjudul
`

      // Bersihkan opsi (hapus HTML, satukan jadi 1 baris) sebelum dipakai di prompt
      const opsiClean = opsi_raw
        ? {
            a: cleanOption(opsi_raw.a),
            b: cleanOption(opsi_raw.b),
            c: cleanOption(opsi_raw.c),
            d: cleanOption(opsi_raw.d),
            e: cleanOption(opsi_raw.e),
          }
        : null

      // Format jawaban user dan jawaban benar dengan opsi lengkap (sudah bersih)
      let jawabanUserText = jawaban_user || ""
      let jawabanBenarText = jawaban_benar || ""

      if (opsiClean && jawaban_user_huruf) {
        const key = jawaban_user_huruf.toLowerCase() as "a" | "b" | "c" | "d" | "e"
        const userText = opsiClean[key] || ""
        jawabanUserText = `${jawaban_user_huruf.toUpperCase()}. ${userText}`
      }

      if (opsiClean && jawaban_benar_huruf) {
        const key = jawaban_benar_huruf.toLowerCase() as "a" | "b" | "c" | "d" | "e"
        const benarText = opsiClean[key] || ""
        jawabanBenarText = `${jawaban_benar_huruf.toUpperCase()}. ${benarText}`
      }

      // Format opsi jawaban dengan rapi (sudah bersih, satu baris per opsi)
      let opsiFormatted = ""
      if (opsiClean) {
        opsiFormatted = `A. ${opsiClean.a}
B. ${opsiClean.b}
C. ${opsiClean.c}
D. ${opsiClean.d}
${opsiClean.e ? `E. ${opsiClean.e}` : ""}`
      } else if (opsi) {
        opsiFormatted = opsi
      }

      userPrompt = `
SOAL:
${soalBersih}
${imageData ? `\nDATA MENTAH DARI GAMBAR/TABEL (WAJIB dikutip spesifik per-baris di pembahasan, jangan dirangkum jadi rentang umum):\n${imageData}` : ""}

OPSI JAWABAN:
${opsiFormatted || "Tidak tersedia"}

JAWABAN SISWA: ${jawabanUserText}
JAWABAN BENAR: ${jawabanBenarText}

BUAT PEMBAHASAN LENGKAP MENGGUNAKAN FORMAT MARKDOWN, dengan struktur berikut (ingat: huruf opsi dan isinya dalam SATU baris, contoh "A. 10°", jangan dipisah baris; dan tanda kurung penutup harus tetap satu baris dengan judulnya):
### 📝 Ringkasan Soal
### 📋 Opsi Jawaban
### ❌ Jawaban Siswa (${jawabanUserText})
### ✅ Jawaban Benar (${jawabanBenarText})
### 📚 Langkah Penyelesaian
(WAJIB kutip data spesifik per-item/per-baris di sini, bandingkan minimal 3 pasang data konkret untuk membuktikan pola)
### 💡 Penjelasan Mengapa Jawaban Benar
### 🔍 Mengapa Jawaban Siswa ${jawaban_user && jawaban_user !== jawaban_benar ? "Salah" : "Benar"}
### 🎯 Tips Mengerjakan
`
    }

    const response = await fetch("https://ai.sumopod.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    const data = await response.json()

    // Log lengkap supaya kelihatan di terminal kalau ada masalah
    console.log("[AI] Sumopod status:", response.status)
    console.log("[AI] Sumopod raw response:", JSON.stringify(data))

    if (data?.error) {
      // Provider balikin error eksplisit (key invalid, model tidak ada, rate limit, dll)
      return NextResponse.json({
        text: `AI Error: ${data.error.message || JSON.stringify(data.error)}`,
      })
    }

    const text = data?.choices?.[0]?.message?.content

    return NextResponse.json({ text: text || `AI tidak merespon (status: ${response.status})` })
  } catch (error) {
    console.log("[AI] Exception:", error)
    return NextResponse.json({ text: "Server Error: " + (error as Error).message })
  }
}
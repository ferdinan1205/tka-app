export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function POST(req: Request) {

  try {

    const {
      soal,
      jawaban_benar,
      pertanyaan
    } = await req.json()

    const apiKey =
      process.env.GROQ_API_KEY

    if (!apiKey) {

      return NextResponse.json({
        text:
          "API KEY belum diisi"
      })

    }

    let systemPrompt = ""
    let userPrompt = ""

    // =========================
    // MODE CHAT AI
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
${soal}

Jawaban benar:
${jawaban_benar}

Pertanyaan siswa:
${pertanyaan}
`

    }

    // =========================
    // MODE PEMBAHASAN
    // =========================

    else {

      systemPrompt = `
Kamu adalah guru TKA profesional.

Buat pembahasan yang:
- rapi
- jelas
- step by step
- mudah dipahami siswa
`

      userPrompt = `
Soal:
${soal}

Jawaban benar:
${jawaban_benar}

Jelaskan pembahasannya.
`

    }

    const response =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`
          },

          body: JSON.stringify({

            model:
              "llama-3.3-70b-versatile",

            messages: [

              {
                role: "system",
                content:
                  systemPrompt
              },

              {
                role: "user",
                content:
                  userPrompt
              }

            ],

            temperature: 0.7,
            max_tokens: 800

          })
        }
      )

    const data =
      await response.json()

    const text =
      data?.choices?.[0]
        ?.message?.content

    return NextResponse.json({
      text:
        text ||
        "AI tidak merespon"
    })

  } catch (error) {

    console.log(error)

    return NextResponse.json({
      text:
        "Server Error"
    })

  }

}
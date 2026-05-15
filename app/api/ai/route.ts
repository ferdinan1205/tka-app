import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { soal, jawaban_benar } = await req.json()

    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        text: "API KEY GROQ belum diisi"
      })
    }

    const prompt = `
Kamu adalah guru profesional.

Jelaskan soal berikut dengan bahasa sederhana agar siswa paham.

Soal:
${soal}

Jawaban benar:
${jawaban_benar}

Berikan pembahasan singkat, jelas, dan mudah dipahami.
`

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4
      })
    })

    const data = await res.json()

    console.log("GROQ RESPONSE:", data)

    if (data.error) {
      return NextResponse.json({
        text: "Error: " + data.error.message
      })
    }

    const text =
      data?.choices?.[0]?.message?.content

    return NextResponse.json({
      text: text || "AI tidak memberi respon"
    })

  } catch (error) {
    console.log(error)

    return NextResponse.json({
      text: "Server Error"
    })
  }
}
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 })
    }

    // 🔥 AKAL-IN: hanya ambil metadata file saja (tanpa parsing PDF)
    const result = {
      name: file.name,
      size: file.size,
      type: file.type
    }

    return NextResponse.json({
      message: "PDF diterima (mode aman deploy)",
      data: result
    })

  } catch (err) {
    return NextResponse.json(
      { error: "Upload gagal" },
      { status: 500 }
    )
  }
}
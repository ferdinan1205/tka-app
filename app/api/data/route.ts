import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {

  const raw = req.cookies.get("sso_data")?.value

  // Cookie tidak ada
  if (!raw) {
    return NextResponse.json({ error: "no_data" }, { status: 401 })
  }

  try {
    const data = JSON.parse(raw)

    // Hapus cookie setelah dibaca — single use
    const res = NextResponse.json(data)
    res.cookies.set("sso_data", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    })

    return res

  } catch (e) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 })
  }
}
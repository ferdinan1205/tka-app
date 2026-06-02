import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

export async function GET(req: NextRequest) {

  const token = req.nextUrl.searchParams.get("token")

  // Tidak ada token → tolak
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {

    const SECRET = new TextEncoder().encode(process.env.SSO_SECRET_KEY)

    // Decode dan verifikasi token dari Laravel
    const { payload } = await jwtVerify(token, SECRET)
    const { nama, email, password } = payload as {
      nama: string
      email: string
      password: string
    }

    // Validasi isi token
    if (!nama || !email || !password) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Simpan ke cookie httpOnly (aman, tidak bisa dibaca JS)
    // Cookie expires 5 menit — cukup untuk proses login/register
    const res = NextResponse.redirect(new URL("/sso/process", req.url))

    res.cookies.set("sso_data", JSON.stringify({ nama, email, password }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    })

    return res

  } catch (e) {
    // Token invalid, expired, atau kunci salah → tolak
    console.error("SSO token error:", e)
    return NextResponse.redirect(new URL("/login", req.url))
  }
}
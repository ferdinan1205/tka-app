import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {

  // Validasi secret key dari header
  const secret = req.headers.get("x-api-key")
  if (secret !== process.env.SSO_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { nama, email, password } = body

  if (!nama || !email || !password) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
  }

  // Cek apakah user sudah ada
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single()

  if (!existingUser) {
    // Belum ada → auto register via admin
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    const { error: profileError } = await supabase.from("profiles").insert([{
      id: newUser.user.id,
      nama,
      email,
      role: "siswa",
    }])

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
  }

  // Kembalikan login_url ke Laravel
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sso/process?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`

  return NextResponse.json({
    success: true,
    login_url: loginUrl
  })
}
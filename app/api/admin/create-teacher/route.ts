import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// POST /api/admin/create-teacher
//
// Dipanggil SEKALI SAJA dari sistem Lampung Cerdas (server-to-server).
// Dalam satu kali panggilan ini, sistem akan:
//   1. Membuat akun baru kalau email belum terdaftar (aman dipanggil berulang)
//   2. Langsung membuka akses kelas (kalau kelas_id disertakan)
//   3. Mengembalikan login_url untuk auto-login user
//
// Body: { nama, email, password, token_kelas? }
// Header: x-api-key: <SSO_SECRET_KEY>

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Validasi secret key dari header
  const secret = req.headers.get("x-api-key")
  if (secret !== process.env.SSO_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { nama, email, password, token_kelas } = body

  if (!nama || !email || !password) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
  }

  // 2. Cek apakah user sudah ada
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  let userId: string

  if (existingUser) {
    // User sudah ada, tinggal pakai id-nya
    userId = existingUser.id
  } else {
    // Belum ada → auto register via admin
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: createError?.message || "Gagal membuat user" },
        { status: 500 }
      )
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

    userId = newUser.user.id
  }

  // 3. Kalau token_kelas disertakan, langsung buka akses kelasnya juga
  //    (ini yang menggantikan pemanggilan unlock-kelas secara terpisah).
  //    Lampung Cerdas cukup kirim token kelas, tidak perlu tahu id internal.
  if (token_kelas) {
    const { data: kelas, error: kelasError } = await supabase
      .from("kelas")
      .select("id")
      .eq("token", token_kelas)
      .maybeSingle()

    if (kelasError) {
      return NextResponse.json({ error: kelasError.message }, { status: 500 })
    }

    if (!kelas) {
      return NextResponse.json({ error: "Token kelas tidak ditemukan" }, { status: 404 })
    }

    const { error: aksesError } = await supabase
      .from("akses_kelas")
      .upsert(
        { user_id: userId, kelas_id: kelas.id },
        { onConflict: "user_id,kelas_id" }
      )

    if (aksesError) {
      return NextResponse.json({ error: aksesError.message }, { status: 500 })
    }
  }

  // 4. Kembalikan login_url ke Laravel — dipakai untuk auto-login (SSO)
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sso/process?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`

  return NextResponse.json({
    success: true,
    login_url: loginUrl,
    kelas_terbuka: !!token_kelas,
  })
}
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// POST /api/admin/unlock-kelas
// Dipanggil dari sistem Lampung Cerdas (Laravel) via server-to-server,
// BUKAN dari browser user. User tidak pernah lihat/ketik apapun.
//
// Body: { email: string, kelas_id: number }
// Header: x-api-key: <SSO_SECRET_KEY>

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

const secret = req.headers.get("x-api-key")
if (secret !== process.env.SSO_SECRET_KEY) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

  const body = await req.json()
  const { email, kelas_id } = body

  if (!email || !kelas_id) {
    return NextResponse.json(
      { error: "email dan kelas_id wajib diisi" },
      { status: 400 }
    )
  }

  // 2. Cari user berdasarkan email di profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!profile) {
    // User belum pernah register di sistem TKA sama sekali.
    // Ini kondisi wajar kalau Laravel manggil unlock-kelas SEBELUM
    // user pernah lewat proses create-teacher/SSO. Kasih pesan jelas
    // supaya gampang di-debug dari sisi Laravel.
    return NextResponse.json(
      { error: "User dengan email ini belum terdaftar di sistem TKA" },
      { status: 404 }
    )
  }

  // 3. Pastikan kelas-nya memang ada
  const { data: kelas, error: kelasError } = await supabase
    .from("kelas")
    .select("id")
    .eq("id", kelas_id)
    .maybeSingle()

  if (kelasError) {
    return NextResponse.json({ error: kelasError.message }, { status: 500 })
  }

  if (!kelas) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
  }

  // 4. Insert / update akses_kelas — ini yang bikin "masuk kelas"
  //    otomatis skip layar token buat user ini.
  const { error: aksesError } = await supabase
    .from("akses_kelas")
    .upsert(
      { user_id: profile.id, kelas_id: kelas.id },
      { onConflict: "user_id,kelas_id" }
    )

  if (aksesError) {
    return NextResponse.json({ error: aksesError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: "Akses kelas berhasil dibuka",
  })
}
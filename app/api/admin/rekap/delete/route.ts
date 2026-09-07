import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Verifikasi admin via Supabase auth token
    const authHeader = req.headers.get("authorization")
    const token = authHeader?.replace(/^Bearer\s+/i, "")

    if (!token) {
      return NextResponse.json({ error: "Token otentikasi tidak ditemukan" }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah kedaluwarsa" }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Hanya admin yang dapat menghapus data ini" }, { status: 403 })
    }

    // 2. Parse body
    const body = await req.json()
    const { ids } = body as { ids?: number[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Daftar ID data tidak boleh kosong" }, { status: 400 })
    }

    // 3. Ambil data hasil yang akan dihapus terlebih dahulu untuk sinkronisasi
    const { data: hasilList, error: fetchError } = await supabaseAdmin
      .from("hasil")
      .select("id, user_id, kategori, package_id, skor")
      .in("id", ids)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!hasilList || hasilList.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "Data tidak ditemukan atau sudah terhapus" })
    }

    // 4. Hapus token_used terkait (jika ada) agar status pengerjaan sinkron
    for (const h of hasilList) {
      let query = supabaseAdmin.from("token_used").delete().eq("user_id", h.user_id).eq("kategori", h.kategori)
      if (h.package_id) {
        query = query.eq("package_id", h.package_id)
      }
      await query
    }

    // 5. Hapus data dari tabel hasil
    const { error: deleteError } = await supabaseAdmin
      .from("hasil")
      .delete()
      .in("id", ids)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 6. Sinkronisasi ranking_tka untuk paket yang terdampak
    const affectedUserPackages = new Map<string, { user_id: string; package_id: number }>()
    for (const h of hasilList) {
      if (h.package_id && h.user_id) {
        const key = `${h.user_id}_${h.package_id}`
        affectedUserPackages.set(key, { user_id: h.user_id, package_id: h.package_id })
      }
    }

    for (const { user_id, package_id } of affectedUserPackages.values()) {
      const { data: remainingHasil } = await supabaseAdmin
        .from("hasil")
        .select("skor")
        .eq("user_id", user_id)
        .eq("package_id", package_id)

      if (!remainingHasil || remainingHasil.length === 0) {
        // Hapus entri ranking jika seluruh ujian pada paket dihapus
        await supabaseAdmin
          .from("ranking_tka")
          .delete()
          .eq("user_id", user_id)
          .eq("package_id", package_id)
      } else {
        // Perbarui total skor & jumlah ujian pada ranking_tka
        const total = remainingHasil.reduce((sum, item) => sum + (item.skor || 0), 0)
        const count = remainingHasil.length
        await supabaseAdmin
          .from("ranking_tka")
          .update({
            total_skor: total,
            jumlah_ujian: count,
            selesai: count >= 4,
          })
          .eq("user_id", user_id)
          .eq("package_id", package_id)
      }
    }

    return NextResponse.json({
      success: true,
      count: hasilList.length,
      message: `Berhasil menghapus ${hasilList.length} data hasil simulasi`,
    })
  } catch (err: any) {
    console.error("API /api/admin/rekap/delete error:", err)
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan internal pada server" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const [
      { data: hasilData, error: hasilError },
      { data: profileData, error: profileError },
      { data: packagesData, error: pkgError },
      { data: rankData, error: rankError },
    ] = await Promise.all([
      supabaseAdmin
        .from("hasil")
        .select("id, user_id, kategori, skor, paket, package_id, tanggal")
        .order("tanggal", { ascending: false }),
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin
        .from("packages")
        .select("id, nama_paket")
        .order("id", { ascending: true }),
      supabaseAdmin
        .from("ranking_tka")
        .select("*")
        .eq("selesai", true)
        .order("total_skor", { ascending: false }),
    ])

    if (hasilError) throw hasilError
    if (profileError) throw profileError
    if (pkgError) throw pkgError
    if (rankError) throw rankError

    return NextResponse.json({
      hasil: hasilData || [],
      profiles: profileData || [],
      packages: packagesData || [],
      rankingTka: rankData || [],
    })
  } catch (error: any) {
    console.error("API /api/ranking-hasil Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

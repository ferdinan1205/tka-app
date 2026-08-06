"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

type Paket = {
  id: number
  nama_paket: string
  token: string
  image_url?: string
}

type KelasType = {
  id: number
  nama_kelas: string
  deskripsi?: string
}

function formatNamaPaket(nama: string): string {
  const n = nama.toLowerCase().trim()
  const match = n.match(/^paket\s+(ipa|ips|smk|bahasa)(?:\s+(\d+))?$/)
  if (!match) return nama
  const jurusan = match[1].charAt(0).toUpperCase() + match[1].slice(1)
  const nomor = match[2] || "1"
  return `${jurusan} ${nomor}`
}

type PaketTheme = {
  badge: string
  icon: string
  tag: string
  desc: string
  img: string
  accent: string
  soft: string
}

function getPaketTheme(nama: string): PaketTheme {
  const n = nama.toLowerCase()

  if (n.includes("ipa")) return {
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    icon: "🔬",
    tag: "Sains",
    desc: "Kimia · Fisika · Biologi",
    img: "https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?q=80&w=600&auto=format&fit=crop",
    accent: "#10B981",
    soft: "#ECFDF5",
  }

  if (n.includes("ips")) return {
    badge: "bg-orange-50 text-orange-600 border-orange-200",
    icon: "📰",
    tag: "Sosial",
    desc: "Ekonomi · Geografi · Sosiologi",
    img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop",
    accent: "#F97316",
    soft: "#FFF7ED",
  }

  if (n.includes("smk")) return {
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    icon: "🏫",
    tag: "Kejuruan",
    desc: "PPKN · PKK",
    img: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=600&auto=format&fit=crop",
    accent: "#3B82F6",
    soft: "#EFF6FF",
  }

  if (n.includes("bahasa")) return {
    badge: "bg-purple-50 text-purple-600 border-purple-200",
    icon: "✏️",
    tag: "Bahasa",
    desc: "Jerman · Jepang · Arab",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop",
    accent: "#A855F7",
    soft: "#FAF5FF",
  }

  return {
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "🎓",
    tag: "Umum",
    desc: "Mata Pelajaran Umum",
    img: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=600&auto=format&fit=crop",
    accent: "#64748B",
    soft: "#F8FAFC",
  }
}

export default function KelasDetailPage() {
  const params = useParams()
  const router = useRouter()
  const kelasId = parseInt(params.id as string)

  const [loading, setLoading] = useState(true)
  const [kelas, setKelas] = useState<KelasType | null>(null)
  const [paketList, setPaketList] = useState<Paket[]>([])

  useEffect(() => {
    if (isNaN(kelasId)) { setLoading(false); return }
    init()
  }, [kelasId])

  async function init() {
    try {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) { router.push("/login"); return }

      // ── Guard: pastikan user sudah unlock kelas ini ──
      const { data: akses } = await supabase
        .from("akses_kelas")
        .select("id")
        .eq("user_id", user.id)
        .eq("kelas_id", kelasId)
        .maybeSingle()

      if (!akses) {
        router.replace(`/kelas/${kelasId}/masuk`)
        return
      }

      // Ambil info kelas
      const { data: kelasData, error: kelasError } = await supabase
        .from("kelas")
        .select("id, nama_kelas, deskripsi")
        .eq("id", kelasId)
        .maybeSingle()

      if (kelasError || !kelasData) { setKelas(null); setLoading(false); return }
      setKelas(kelasData)

      // Ambil paket yang ada di kelas ini
      const { data: relasiData } = await supabase
        .from("kelas_paket")
        .select("package_id")
        .eq("kelas_id", kelasId)

      const paketIds = (relasiData || []).map((r: any) => r.package_id)

      if (paketIds.length > 0) {
        const { data: paketData } = await supabase
          .from("packages")
          .select("id, nama_paket, token, image_url")
          .in("id", paketIds)
          .order("id", { ascending: true })
        setPaketList((paketData as Paket[]) || [])
      } else {
        setPaketList([])
      }

      setLoading(false)
    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
          <p className="text-slate-500 text-xs">Memuat kelas...</p>
        </div>
      </div>
    )
  }

  if (!kelas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full shadow-sm">
          <div className="text-4xl mb-3">😢</div>
          <h1 className="text-lg font-bold mb-1 text-slate-900">Kelas Tidak Ditemukan</h1>
          <p className="text-slate-500 text-sm mb-5">Cek kembali link yang kamu gunakan</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 text-sm font-bold transition hover:bg-indigo-100"
          >
            ← Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="w-full max-w-5xl mx-auto px-3 py-4 md:px-8 md:py-8 space-y-5 md:space-y-7">

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center text-sm shrink-0 hover:bg-slate-100 transition shadow-sm"
          >
            ←
          </button>
          <div className="min-w-0">
            <p className="text-[9px] tracking-[3px] text-indigo-500 uppercase font-bold leading-none">Kelas</p>
            <h1 className="text-lg md:text-2xl font-extrabold text-slate-900 leading-tight mt-0.5 truncate">
              {kelas.nama_kelas}
            </h1>
          </div>
        </div>

        {/* HERO STRIP */}
        <div
          style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #172554 55%, #0B1120 100%)" }}
          className="relative overflow-hidden rounded-2xl p-4 md:p-6 shadow-sm"
        >
          <div className="absolute top-0 right-0 w-56 h-32 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xl shrink-0">
              🔓
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Kelas sudah terbuka</p>
              <p className="text-blue-200 text-xs mt-0.5">
                {kelas.deskripsi || "Semua paket di bawah bisa langsung diakses tanpa token paket."}
              </p>
            </div>
          </div>
        </div>

        {/* DAFTAR PAKET */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm md:text-base font-extrabold text-slate-900">Paket di Kelas Ini</h2>
              <p className="text-slate-400 text-[10px] mt-0.5">{paketList.length} paket tersedia</p>
            </div>
          </div>

          {paketList.length === 0 ? (
            <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-slate-500 text-sm">Belum ada paket di kelas ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
              {paketList.map((item) => {
                const theme = getPaketTheme(item.nama_paket)
                const labelNama = formatNamaPaket(item.nama_paket)
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/ujian/package/${item.id}?via_kelas=${kelasId}`)}
                    className="group relative overflow-hidden rounded-xl md:rounded-2xl text-left border border-slate-200 bg-white transition-all duration-300 active:scale-[0.96] hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 10px 24px -10px ${theme.accent}40`
                      e.currentTarget.style.borderColor = theme.accent + "60"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = ""
                      e.currentTarget.style.borderColor = ""
                    }}
                  >
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3", background: theme.soft }}>
                      <img
                        src={item.image_url || theme.img}
                        alt={labelNama}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                      <div
                        className="absolute top-1.5 left-1.5 md:top-2.5 md:left-2.5 w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-sm md:text-base backdrop-blur-sm bg-white/90 border border-slate-200 shadow-sm"
                      >
                        {theme.icon}
                      </div>

                      <div
                        className={`absolute top-1.5 right-1.5 md:top-2.5 md:right-2.5 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md border backdrop-blur-sm bg-white/90 ${theme.badge}`}
                      >
                        {theme.tag}
                      </div>

                      {/* Badge kecil: sudah terbuka lewat kelas, tanpa token */}
                      <div className="absolute bottom-1.5 left-1.5 md:bottom-2.5 md:left-2.5 text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 backdrop-blur-sm">
                        🔓 Tanpa Token
                      </div>
                    </div>

                    <div className="p-2 md:p-3">
                      <p className="text-slate-900 font-extrabold text-xs md:text-sm leading-tight">
                        {labelNama}
                      </p>
                      <p className="text-slate-500 text-[9px] md:text-[10px] mt-0.5 truncate">
                        {theme.desc}
                      </p>

                      <div
                        className="mt-1.5 w-full py-1 md:py-1.5 rounded-lg text-center text-[9px] md:text-[10px] font-bold text-white transition-all duration-200 group-hover:brightness-110"
                        style={{ background: theme.accent }}
                      >
                        Masuk →
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
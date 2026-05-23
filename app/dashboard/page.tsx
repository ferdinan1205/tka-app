"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type Hasil = {
  id: number
  skor: number
  tanggal: string
  user_id: string
  kategori: string
}

const paketList = [
  {
    id: 1,
    fullNama: "Paket IPA",
    desc: "Kimia · Fisika · Biologi",
    icon: "🧪",
    accent: "#10B981",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=900&auto=format&fit=crop",
    gradientOverlay: "from-emerald-950/90 via-emerald-900/50 to-transparent",
    bar: "from-emerald-500 to-teal-500",
  },
  {
    id: 2,
    fullNama: "Paket IPS",
    desc: "Ekonomi · Geografi · Sosiologi",
    icon: "📊",
    accent: "#F97316",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=900&auto=format&fit=crop",
    gradientOverlay: "from-orange-950/90 via-orange-900/50 to-transparent",
    bar: "from-orange-500 to-amber-500",
  },
  {
    id: 3,
    fullNama: "Paket SMK",
    desc: "Produktif · Kejuruan",
    icon: "🛠️",
    accent: "#60A5FA",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=900&auto=format&fit=crop",
    gradientOverlay: "from-blue-950/90 via-blue-900/50 to-transparent",
    bar: "from-blue-500 to-indigo-500",
  },
  {
    id: 5,
    fullNama: "Paket Bahasa",
    desc: "Jerman · Jepang · Arab",
    icon: "🌍",
    accent: "#C084FC",
    image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=900&auto=format&fit=crop",
    gradientOverlay: "from-purple-950/90 via-purple-900/50 to-transparent",
    bar: "from-purple-500 to-fuchsia-500",
  },
]

export default function Dashboard() {
  const router = useRouter()
  const [hasil, setHasil] = useState<Hasil[]>([])
  const [nama, setNama] = useState("")
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    await getProfile(data.user.id)
    await getHasil(data.user.id)
    setLoading(false)
  }

  async function getProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (data) setNama(data.nama || "")
  }

  async function getHasil(userId: string) {
    const { data } = await supabase.from("hasil").select("*").eq("user_id", userId)
    setHasil((data as Hasil[]) || [])
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#06080F]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 rounded-full border-2 border-[#60A5FA]/20 border-t-[#60A5FA] animate-spin" />
        <p className="text-[#60A5FA]/50 text-xs">Memuat...</p>
      </div>
    </div>
  )

  const inisial = nama
    ? nama.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U"
  const rataRata = hasil.length
    ? Math.round(hasil.reduce((a, b) => a + b.skor, 0) / hasil.length)
    : 0

  return (
    <div className="min-h-screen bg-[#06080F] text-white">

      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-60
        bg-[#0B0F1A] border-r border-white/[0.06]
        flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}>
        <div className="px-5 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[8px] tracking-[4px] text-white/20 uppercase font-bold">Platform</p>
              <p className="text-sm font-extrabold text-white leading-none mt-0.5">Lampung Cerdas</p>
            </div>
            <button onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-7 h-7 rounded-lg bg-white/5 text-white/40 flex items-center justify-center text-xs hover:bg-white/10 transition">
              ✕
            </button>
          </div>
          <button onClick={() => router.push("/profile")}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-xs font-bold shrink-0">
              {inisial}
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{nama || "Pengguna"}</p>
              <p className="text-[10px] text-white/30">Lihat profil</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <NavLabel>Menu</NavLabel>
          <NavBtn icon="⊞" label="Dashboard" active onClick={() => {}} />
          <NavLabel>Belajar</NavLabel>
          <NavBtn icon="◈" label="Materi" onClick={() => router.push("/materi")} />
          <NavBtn icon="◉" label="Ranking" onClick={() => router.push("/ranking")} />
          <NavBtn icon="◎" label="Progress" onClick={() => router.push("/progress")} />
          <NavLabel>Laporan</NavLabel>
          <NavBtn icon="◳" label="Rekap Nilai" onClick={() => router.push("/rekap")} />
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <button onClick={logout}
            className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition flex items-center justify-center gap-2 border border-red-500/10">
            ⏻ Keluar
          </button>
        </div>
      </aside>

      {/* ── CONTENT AREA ── */}
      <div className="lg:ml-60 flex flex-col min-h-screen">

        {/* TOPBAR MOBILE */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#06080F]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 h-12 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/60 flex items-center justify-center text-sm hover:bg-white/10 transition">
            ☰
          </button>
          <p className="text-sm font-bold text-white flex-1">Lampung Cerdas</p>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-[10px] font-bold">
            {inisial}
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 px-3 py-4 md:px-8 md:py-8 space-y-5 md:space-y-8 w-full max-w-5xl mx-auto">

          {/* ── HERO ── */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#0F1729] border border-white/[0.06] p-4 md:p-10">
            <div className="absolute top-0 right-0 w-64 h-40 bg-[#6366F1]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-32 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />
            {/* Grid bg */}
            <div className="absolute inset-0 opacity-[0.025]"
              style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

            <div className="relative z-10 flex items-center justify-between gap-3">
              {/* Text */}
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-[#6366F1]/15 border border-[#6366F1]/20 rounded-full px-2.5 py-0.5 mb-2 md:mb-3">
                  <span className="w-1 h-1 rounded-full bg-[#818CF8] animate-pulse" />
                  <span className="text-[9px] md:text-[10px] font-bold tracking-widest text-[#818CF8] uppercase">Selamat Datang</span>
                </div>
                <h1 className="text-xl md:text-4xl font-extrabold text-white leading-tight">
                  Halo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] to-[#C084FC]">{nama.split(" ")[0]}</span>! 👋
                </h1>
                <p className="mt-1 text-white/35 text-xs md:text-sm">
                  Siap belajar hari ini? 🚀
                </p>
              </div>

              {/* Stats — simpel di mobile */}
              <div className="flex gap-2 md:gap-3 shrink-0">
                {[
                  { label: "Ujian", value: hasil.length },
                  { label: "Skor", value: rataRata },
                ].map((s) => (
                  <div key={s.label}
                    className="flex flex-col items-center bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 md:px-5 md:py-3">
                    <span className="text-base md:text-2xl font-extrabold text-white">{s.value}</span>
                    <span className="text-[9px] md:text-[10px] text-white/30 mt-0.5">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SECTION TITLE ── */}
          <div>
            <h2 className="text-base md:text-xl font-extrabold text-white">Paket Belajar</h2>
            <p className="text-white/30 text-xs mt-0.5">Pilih paket dan mulai latihan soal ✨</p>
          </div>

          {/* ── PAKET CARDS ──
              Mobile : 2 kolom, kartu compact (tinggi 150px)
              Desktop: 2 kolom, kartu besar  (tinggi 260px)
          ── */}
          <div className="grid grid-cols-2 gap-3 md:gap-5">
            {paketList.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/ujian/package/${item.id}`)}
                className="group relative overflow-hidden rounded-2xl md:rounded-3xl text-left border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Image */}
                <div className="relative h-[150px] md:h-[260px] w-full overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.fullNama}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* gradient from bottom */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${item.gradientOverlay}`} />
                  {/* dark top vignette */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

                  {/* Icon — top left */}
                  <div
                    className="absolute top-2.5 left-2.5 md:top-4 md:left-4 w-8 h-8 md:w-11 md:h-11 rounded-xl md:rounded-2xl flex items-center justify-center text-base md:text-2xl border border-white/20 backdrop-blur-sm"
                    style={{ background: item.accent + "30" }}
                  >
                    {item.icon}
                  </div>
                </div>

                {/* Bottom info — absolute over image */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-5">
                  <p className="text-xs md:text-lg font-extrabold text-white leading-tight drop-shadow">
                    {item.fullNama}
                  </p>
                  {/* desc hanya tampil di desktop */}
                  <p className="hidden md:block text-white/50 text-xs mt-0.5 mb-3">{item.desc}</p>
                  {/* desc mobile — 1 baris ringkas */}
                  <p className="md:hidden text-white/40 text-[10px] mt-0.5 mb-2 truncate">{item.desc}</p>

                  {/* CTA */}
                  <div className={`
                    w-full py-1.5 md:py-2.5 rounded-xl text-center font-bold
                    text-[10px] md:text-sm
                    bg-gradient-to-r ${item.bar} text-white
                    flex items-center justify-center gap-1
                    transition-all duration-300 group-hover:gap-2
                  `}>
                    Masuk Paket <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* ── RIWAYAT ── */}
          {hasil.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base md:text-xl font-extrabold text-white">Riwayat Ujian</h2>
                  <p className="text-white/30 text-[10px] mt-0.5">3 ujian terakhir</p>
                </div>
                <button onClick={() => router.push("/rekap")}
                  className="text-[11px] text-[#818CF8] hover:text-[#A5B4FC] font-semibold transition">
                  Lihat semua →
                </button>
              </div>
              <div className="space-y-2">
                {hasil.slice(-3).reverse().map((h) => {
                  const sc = h.skor >= 70 ? "#10B981" : h.skor >= 50 ? "#F97316" : "#EF4444"
                  const sbg = h.skor >= 70
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : h.skor >= 50
                      ? "bg-orange-500/10 border-orange-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  return (
                    <div key={h.id}
                      className="flex items-center gap-3 bg-[#0B0F1A] border border-white/[0.06] rounded-xl p-3 hover:border-white/10 transition">
                      <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-sm shrink-0">
                        📝
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{h.kategori || "Ujian Umum"}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {new Date(h.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className={`shrink-0 px-2.5 py-1.5 rounded-lg border ${sbg} text-center`}>
                        <p className="text-sm font-extrabold leading-none" style={{ color: sc }}>{h.skor}</p>
                        <p className="text-[9px] text-white/25 mt-0.5">poin</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 bg-[#0B0F1A] border border-white/[0.06] rounded-2xl">
              <div className="text-3xl md:text-5xl mb-3">🎯</div>
              <p className="text-white font-bold text-sm md:text-base">Belum ada riwayat ujian</p>
              <p className="text-white/30 text-xs mt-1">Pilih paket di atas dan mulai!</p>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

function NavLabel({ children }: { children: string }) {
  return (
    <p className="text-[8px] font-bold tracking-[3px] text-white/15 uppercase px-3 pt-4 pb-1.5">
      {children}
    </p>
  )
}

function NavBtn({ icon, label, active, onClick }: {
  icon: string; label: string; active?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
        ${active
          ? "bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/20"
          : "text-white/35 hover:text-white/65 hover:bg-white/[0.04]"
        }
      `}>
      <span className="text-sm w-4 text-center shrink-0">{icon}</span>
      {label}
    </button>
  )
}
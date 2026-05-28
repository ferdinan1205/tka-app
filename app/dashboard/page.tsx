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

type Paket = {
  id: number
  nama_paket: string
  token: string
}

// Rename paket: "Paket ipa" → "IPA 1", "Paket ipa 2" → "IPA 2", dst
function formatNamaPaket(nama: string): string {
  const n = nama.toLowerCase().trim()
  const map: { match: string; label: string }[] = [
    { match: "paket ipa 2",    label: "IPA 2"     },
    { match: "paket ipa 3",    label: "IPA 3"     },
    { match: "paket ipa",      label: "IPA 1"     },
    { match: "paket ips 2",    label: "IPS 2"     },
    { match: "paket ips 3",    label: "IPS 3"     },
    { match: "paket ips",      label: "IPS 1"     },
    { match: "paket smk 2",    label: "SMK 2"     },
    { match: "paket smk",      label: "SMK 1"     },
    { match: "paket bahasa 2", label: "Bahasa 2"  },
    { match: "paket bahasa 3", label: "Bahasa 3"  },
    { match: "paket bahasa",   label: "Bahasa 1"  },
  ]
  const found = map.find((m) => n === m.match || n.startsWith(m.match))
  return found ? found.label : nama
}

type PaketTheme = {
  bg: string
  card: string
  badge: string
  icon: string
  tag: string
  desc: string
  img: string
  accent: string
}

function getPaketTheme(nama: string): PaketTheme {
  const n = nama.toLowerCase()
  if (n.includes("ipa")) return {
    bg:    "from-emerald-900/80 to-teal-900/60",
    card:  "border-emerald-500/20 hover:border-emerald-400/40",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon:  "🧪",
    tag:   "Sains",
    desc:  "Kimia · Fisika · Biologi",
    img:   "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop",
    accent: "#10B981",
  }
  if (n.includes("ips")) return {
    bg:    "from-orange-900/80 to-amber-900/60",
    card:  "border-orange-500/20 hover:border-orange-400/40",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    icon:  "📊",
    tag:   "Sosial",
    desc:  "Ekonomi · Geografi · Sosiologi",
    img:   "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop",
    accent: "#F97316",
  }
  if (n.includes("smk")) return {
    bg:    "from-blue-900/80 to-indigo-900/60",
    card:  "border-blue-500/20 hover:border-blue-400/40",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon:  "🛠️",
    tag:   "Kejuruan",
    desc:  "Produktif · Teknik",
    img:   "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop",
    accent: "#60A5FA",
  }
  if (n.includes("bahasa")) return {
    bg:    "from-purple-900/80 to-fuchsia-900/60",
    card:  "border-purple-500/20 hover:border-purple-400/40",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon:  "🌍",
    tag:   "Bahasa",
    desc:  "Jerman · Jepang · Arab",
    img:   "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=600&auto=format&fit=crop",
    accent: "#C084FC",
  }
  return {
    bg:    "from-slate-800/80 to-slate-900/60",
    card:  "border-slate-500/20 hover:border-slate-400/40",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon:  "📚",
    tag:   "Umum",
    desc:  "Mata Pelajaran Umum",
    img:   "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=600&auto=format&fit=crop",
    accent: "#94A3B8",
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [hasil, setHasil]       = useState<Hasil[]>([])
  const [nama, setNama]         = useState("")
  const [paketList, setPaketList] = useState<Paket[]>([])
  const [loading, setLoading]   = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    await Promise.all([
      getProfile(data.user.id),
      getHasil(data.user.id),
      getPaket(),
    ])
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

  async function getPaket() {
    const { data } = await supabase.from("packages").select("*").order("id", { ascending: true })
    setPaketList((data as Paket[]) || [])
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
        <div onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden" />
      )}

      {/* SIDEBAR */}
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
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition">
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
          <NavBtn icon="◈" label="Materi"   onClick={() => router.push("/materi")} />
          <NavBtn icon="◉" label="Ranking"  onClick={() => router.push("/ranking")} />
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

      {/* CONTENT */}
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

        <main className="flex-1 px-3 py-4 md:px-8 md:py-8 space-y-5 md:space-y-7 w-full max-w-5xl mx-auto">

          {/* HERO */}
          <div className="relative overflow-hidden rounded-2xl bg-[#0F1729] border border-white/[0.06] p-4 md:p-8">
            <div className="absolute top-0 right-0 w-64 h-40 bg-[#6366F1]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-32 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]"
              style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-[#6366F1]/15 border border-[#6366F1]/20 rounded-full px-2.5 py-0.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-pulse" />
                  <span className="text-[9px] font-bold tracking-widest text-[#818CF8] uppercase">Selamat Datang</span>
                </div>
                <h1 className="text-xl md:text-3xl font-extrabold text-white leading-tight">
                  Halo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] to-[#C084FC]">{nama.split(" ")[0]}</span>! 👋
                </h1>
                <p className="mt-1 text-white/35 text-xs">Siap belajar hari ini? 🚀</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {[
                  { label: "Ujian", value: hasil.length },
                  { label: "Skor",  value: rataRata },
                ].map((s) => (
                  <div key={s.label}
                    className="flex flex-col items-center bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2">
                    <span className="text-base md:text-xl font-extrabold text-white">{s.value}</span>
                    <span className="text-[9px] text-white/30 mt-0.5">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PAKET SECTION */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm md:text-base font-extrabold text-white">Paket Belajar</h2>
                <p className="text-white/30 text-[10px] mt-0.5">{paketList.length} paket tersedia ✨</p>
              </div>
            </div>

            {paketList.length === 0 ? (
              <div className="text-center py-10 bg-[#0B0F1A] border border-white/[0.06] rounded-2xl">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-white/50 text-sm">Belum ada paket tersedia</p>
              </div>
            ) : (
              // 3 kolom di mobile, 4 kolom di desktop
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {paketList.map((item) => {
                  const theme      = getPaketTheme(item.nama_paket)
                  const labelNama  = formatNamaPaket(item.nama_paket)
                  return (
                    <button
                      key={item.id}
                      onClick={() => router.push(`/ujian/package/${item.id}`)}
                      className={`group relative overflow-hidden rounded-xl md:rounded-2xl text-left border transition-all duration-300 active:scale-[0.96] ${theme.card}`}
                      style={{ background: "#0D1220" }}
                    >
                      {/* Gambar */}
                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
                        <img
                          src={theme.img}
                          alt={labelNama}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        {/* Overlay gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${theme.bg}`} />

                        {/* Icon */}
                        <div className="absolute top-1.5 left-1.5 md:top-2.5 md:left-2.5 w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-sm md:text-base backdrop-blur-sm border border-white/20"
                          style={{ background: theme.accent + "30" }}>
                          {theme.icon}
                        </div>

                        {/* Tag */}
                        <div className={`absolute top-1.5 right-1.5 md:top-2.5 md:right-2.5 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md border backdrop-blur-sm ${theme.badge}`}>
                          {theme.tag}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2 md:p-3">
                        <p className="text-white font-extrabold text-xs md:text-sm leading-tight">{labelNama}</p>
                        <p className="text-white/40 text-[9px] md:text-[10px] mt-0.5 truncate">{theme.desc}</p>

                        {/* CTA */}
                        <div
                          className="mt-1.5 w-full py-1 md:py-1.5 rounded-lg text-center text-[9px] md:text-[10px] font-bold text-white transition-all duration-200"
                          style={{ background: `linear-gradient(135deg, ${theme.accent}99, ${theme.accent}60)`, border: `1px solid ${theme.accent}40` }}
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

          {/* RIWAYAT */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm md:text-base font-extrabold text-white">Riwayat Ujian</h2>
                <p className="text-white/30 text-[10px] mt-0.5">3 ujian terakhir</p>
              </div>
              {hasil.length > 0 && (
                <button onClick={() => router.push("/rekap")}
                  className="text-[11px] text-[#818CF8] hover:text-[#A5B4FC] font-semibold transition">
                  Lihat semua →
                </button>
              )}
            </div>

            {hasil.length > 0 ? (
              <div className="space-y-2">
                {hasil.slice(-3).reverse().map((h) => {
                  const sc  = h.skor >= 70 ? "#10B981" : h.skor >= 50 ? "#F97316" : "#EF4444"
                  const sbg = h.skor >= 70
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : h.skor >= 50
                    ? "bg-orange-500/10 border-orange-500/20"
                    : "bg-red-500/10 border-red-500/20"
                  return (
                    <div key={h.id}
                      className="flex items-center gap-3 bg-[#0B0F1A] border border-white/[0.06] rounded-xl p-3 hover:border-white/10 transition">
                      <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-sm shrink-0">
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
            ) : (
              <div className="text-center py-8 bg-[#0B0F1A] border border-white/[0.06] rounded-2xl">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-white font-bold text-sm">Belum ada riwayat ujian</p>
                <p className="text-white/30 text-xs mt-1">Pilih paket di atas dan mulai!</p>
              </div>
            )}
          </div>

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
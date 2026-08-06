"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Activity,
  ClipboardList,
  LogOut,
  X,
  Menu,
  Search,
} from "lucide-react"

type Materi = {
  id: number
  judul: string
  kategori: string
  tipe: string
  link: string
  gambar?: string
}

const kategoriList = [
  { label: "Semua", icon: "✦" },
  { label: "Matematika", icon: "∑" },
  { label: "Bahasa Indonesia", icon: "A" },
  { label: "Bahasa Inggris", icon: "E" },
  { label: "TPS", icon: "◈" },
  { label: "Literasi", icon: "◎" },
]

const tipeColor: Record<string, string> = {
  video:   "#F43F5E",
  artikel: "#F59E0B",
  pdf:     "#10B981",
  kuis:    "#8B5CF6",
  latihan: "#0EA5E9",
}

type KategoriTheme = { accent: string; soft: string; from: string; to: string; symbol: string }

const kategoriTheme: Record<string, KategoriTheme> = {
  Matematika:         { accent: "#6366F1", soft: "#EEF2FF", from: "#6366F1", to: "#8B5CF6", symbol: "∑" },
  "Bahasa Indonesia": { accent: "#F43F5E", soft: "#FFF1F2", from: "#FB7185", to: "#F43F5E", symbol: "A" },
  "Bahasa Inggris":   { accent: "#10B981", soft: "#ECFDF5", from: "#34D399", to: "#0EA5E9", symbol: "E" },
  TPS:                { accent: "#F59E0B", soft: "#FFFBEB", from: "#FBBF24", to: "#F97316", symbol: "◈" },
  Literasi:           { accent: "#8B5CF6", soft: "#F5F3FF", from: "#A78BFA", to: "#6366F1", symbol: "◎" },
  Semua:              { accent: "#6366F1", soft: "#EEF2FF", from: "#6366F1", to: "#8B5CF6", symbol: "✦" },
}

function getKategoriTheme(kategori: string): KategoriTheme {
  return kategoriTheme[kategori] || kategoriTheme.Semua
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materi", label: "Materi", icon: BookOpen },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/rekap", label: "Rekap Nilai", icon: ClipboardList },
]

export default function MateriPage() {
  const [materi, setMateri]               = useState<Materi[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState("")
  const [kategoriAktif, setKategoriAktif] = useState("Semua")
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [nama, setNama]                   = useState("")
  const [foto, setFoto]                   = useState("")
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    await Promise.all([getProfile(data.user.id), getMateri()])
    setLoading(false)
  }

  async function getProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (data) {
      setNama(data.nama || "")
      setFoto(data.foto || "")
    }
  }

  async function getMateri() {
    const { data } = await supabase
      .from("materi")
      .select("*")
      .order("id", { ascending: false })
    setMateri(data || [])
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const filteredMateri = materi.filter((item) => {
    const cocokKategori = kategoriAktif === "Semua" ? true : item.kategori === kategoriAktif
    const cocokSearch   = item.judul.toLowerCase().includes(search.toLowerCase())
    return cocokKategori && cocokSearch
  })

  const inisial = nama
    ? nama.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  /* ─── LOADING ─── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
        <p className="text-slate-500 text-xs">Memuat...</p>
      </div>
    </div>
  )

  /* ─── MAIN ─── */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        .dash-content { margin-left: 0; }
        @media (min-width: 1024px) {
          .dash-content { margin-left: 256px; }
        }
        .sb-hide::-webkit-scrollbar { display:none; }
        .sb-hide { -ms-overflow-style:none; scrollbar-width:none; }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .mc-card { animation: fadeUp 0.4s ease both; }
        .mc-card:nth-child(1) { animation-delay:0.02s; }
        .mc-card:nth-child(2) { animation-delay:0.05s; }
        .mc-card:nth-child(3) { animation-delay:0.08s; }
        .mc-card:nth-child(4) { animation-delay:0.11s; }
        .mc-card:nth-child(5) { animation-delay:0.14s; }
        .mc-card:nth-child(6) { animation-delay:0.17s; }
        .img-zoom { transition: transform 0.5s ease; }
        .mc-card:hover .img-zoom { transform: scale(1.06); }
        .dot-live {
          width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block;
          animation: pulse-dot 1.5s ease-in-out infinite; flex-shrink:0;
        }
        @keyframes pulse-dot {
          0%,100% { transform:scale(1); opacity:1; }
          50%     { transform:scale(1.5); opacity:0.5; }
        }
      `}</style>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR — sama seperti Dashboard */}
      <aside
        style={{ background: "linear-gradient(180deg, #1E3A8A 0%, #172554 55%, #0B1120 100%)" }}
        className={`
        fixed top-0 left-0 z-50 h-screen w-64
        shadow-2xl shadow-blue-950/30
        flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}>
        <div className="px-6 pt-7 pb-6 flex items-start justify-between">
          <div>
            <p className="text-white font-bold text-lg tracking-tight">Lampung Cerdas</p>
            <p className="text-xs mt-1 text-blue-300">Portal Belajar Siswa</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-lg bg-white/10 text-blue-200 flex items-center justify-center shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 mb-2">
          <button
            onClick={() => router.push("/profile")}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            {foto ? (
              <img src={foto} alt={nama} className="w-9 h-9 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold shrink-0 text-white">
                {inisial}
              </div>
            )}
            <div className="text-left min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{nama || "Pengguna"}</p>
              <p className="text-[10px] text-blue-300">Lihat profil</p>
            </div>
          </button>
        </div>

        <nav className="px-3 mt-2 flex-1 overflow-y-auto">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2 text-blue-400">
            Menu Utama
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <button
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                      color: isActive ? "#FFFFFF" : "#C4CCDE",
                      borderLeft: isActive ? "3px solid #F59E0B" : "3px solid transparent",
                    }}
                  >
                    <Icon size={17} strokeWidth={2} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="px-3 pb-5 mt-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition"
            style={{ color: "#C4CCDE", borderLeft: "3px solid transparent" }}
          >
            <LogOut size={17} strokeWidth={2} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <div className="dash-content flex flex-col min-h-screen bg-slate-50">

        {/* TOPBAR MOBILE */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <Menu size={16} />
          </button>
          <p className="text-sm font-bold text-slate-800 flex-1">Materi Pembelajaran</p>
          {foto ? (
            <img src={foto} alt={nama} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
              {inisial}
            </div>
          )}
        </header>

        <main className="flex-1 w-full px-4 py-4 md:px-10 md:py-8">
          <div className="space-y-6 md:space-y-8">

            {/* HERO */}
            <div
              style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #172554 55%, #0B1120 100%)" }}
              className="relative overflow-hidden rounded-2xl p-4 md:p-8 shadow-sm"
            >
              <div className="absolute top-0 right-0 w-72 h-40 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-32 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-2.5 py-0.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[9px] font-bold tracking-widest text-blue-200 uppercase">
                      Pusat Belajar
                    </span>
                  </div>
                  <h1 className="text-xl md:text-3xl font-extrabold text-white leading-tight">
                    Temukan{" "}
                    <span
                      style={{
                        backgroundImage: "linear-gradient(90deg, #FCD34D, #FB923C)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "transparent",
                      }}
                    >
                      Materi Terbaik
                    </span>{" "}
                    untuk kamu 📚
                  </h1>
                  <p className="mt-1 text-blue-300 text-xs max-w-md">
                    Video, artikel, PDF, dan latihan soal untuk persiapan ujian yang lebih efektif.
                  </p>
                </div>

                <div className="flex gap-2 md:gap-3 shrink-0">
                  {[
                    { label: "Total", val: materi.length },
                    { label: "Kategori", val: kategoriList.length - 1 },
                    { label: "Tersedia", val: filteredMateri.length },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="text-center min-w-[64px] md:min-w-[80px] rounded-xl px-2.5 py-2 md:px-3.5 md:py-3"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      <p className="text-base md:text-xl font-extrabold text-white leading-none">{s.val}</p>
                      <p className="text-[8px] md:text-[10px] text-blue-300 mt-1 font-semibold">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SEARCH + FILTER */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2.5 md:hidden">
                <div className="flex items-center gap-1.5">
                  <span className="dot-live" />
                  <span className="text-[10px] font-semibold text-slate-500">
                    {filteredMateri.length} materi tersedia
                  </span>
                </div>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-200"
                  >
                    × Reset
                  </button>
                )}
              </div>

              <div className="flex gap-2.5 items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari materi matematika, TPS, bahasa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 md:h-11 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="hidden md:flex h-11 px-4 rounded-xl text-sm font-bold items-center gap-1.5 shrink-0 transition bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                  >
                    × Reset
                  </button>
                )}
              </div>

              <div className="mt-3 overflow-x-auto sb-hide">
                <div className="flex gap-2 min-w-max pb-0.5">
                  {kategoriList.map((k) => {
                    const active = kategoriAktif === k.label
                    const kt = getKategoriTheme(k.label)
                    return (
                      <button
                        key={k.label}
                        onClick={() => setKategoriAktif(k.label)}
                        className="h-8 md:h-9 px-3 md:px-4 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all"
                        style={
                          active
                            ? { background: `linear-gradient(135deg, ${kt.from}, ${kt.to})`, color: "#fff", boxShadow: `0 4px 14px -4px ${kt.accent}80` }
                            : { background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
                        }
                      >
                        <span>{k.icon}</span>
                        {k.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* EMPTY */}
            {filteredMateri.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-5xl mb-4">📭</div>
                <h2 className="text-base md:text-lg font-extrabold text-slate-900 mb-1">
                  Materi Tidak Ditemukan
                </h2>
                <p className="text-sm text-slate-500">Coba kata kunci atau kategori lain</p>
                <button
                  onClick={() => { setSearch(""); setKategoriAktif("Semua") }}
                  className="mt-4 inline-flex px-5 h-9 rounded-xl text-sm font-bold text-white items-center"
                  style={{ background: "linear-gradient(135deg, #6366F1, #06B6D4)" }}
                >
                  Lihat Semua
                </button>
              </div>
            ) : (
              <>
                {/* MOBILE: horizontal list */}
                <div className="flex flex-col gap-3 md:hidden">
                  {filteredMateri.map((item) => {
                    const kt     = getKategoriTheme(item.kategori)
                    const tipeBg = tipeColor[item.tipe?.toLowerCase()] || "#6366F1"
                    return (
                      <div key={item.id} className="mc-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex">
                          <div className="relative shrink-0 w-[100px]" style={{ minHeight: 100, background: kt.soft }}>
                            {item.gambar ? (
                              <img src={item.gambar} alt={item.judul} className="img-zoom w-full h-full object-cover" style={{ minHeight: 100 }} />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ minHeight: 100, background: `linear-gradient(135deg, ${kt.from}, ${kt.to})` }}
                              >
                                <span className="text-2xl text-white opacity-90 font-extrabold">{kt.symbol}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                <span
                                  className="text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider"
                                  style={{ background: tipeBg }}
                                >
                                  {item.tipe}
                                </span>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: kt.soft, color: kt.accent }}>
                                  {item.kategori}
                                </span>
                              </div>
                              <h2 className="text-sm font-extrabold leading-snug line-clamp-2 text-slate-900">
                                {item.judul}
                              </h2>
                            </div>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2.5 h-8 rounded-lg text-[11px] font-bold text-white flex items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${kt.from}, ${kt.to})` }}
                            >
                              Buka Materi →
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* DESKTOP/TABLET: grid cards */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {filteredMateri.map((item) => {
                    const kt     = getKategoriTheme(item.kategori)
                    const tipeBg = tipeColor[item.tipe?.toLowerCase()] || "#6366F1"
                    return (
                      <div
                        key={item.id}
                        className="mc-card flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = `0 16px 32px -14px ${kt.accent}55`
                          e.currentTarget.style.borderColor = kt.accent + "60"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = ""
                          e.currentTarget.style.borderColor = ""
                        }}
                      >
                        <div className="relative overflow-hidden" style={{ height: 170, background: kt.soft }}>
                          {item.gambar ? (
                            <img src={item.gambar} alt={item.judul} className="img-zoom w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${kt.from}, ${kt.to})` }}
                            >
                              <span style={{ fontSize: 56, opacity: 0.35, fontWeight: 900, color: "#fff" }}>
                                {kt.symbol}
                              </span>
                            </div>
                          )}

                          <div className="absolute top-3 left-3">
                            <span
                              className="text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
                              style={{ background: tipeBg }}
                            >
                              {item.tipe}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 p-4 md:p-5 flex flex-col justify-between gap-3">
                          <div>
                            <span
                              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-2"
                              style={{ background: kt.soft, color: kt.accent }}
                            >
                              {item.kategori}
                            </span>
                            <h2 className="text-sm md:text-base font-extrabold leading-snug line-clamp-2 text-slate-900">
                              {item.judul}
                            </h2>
                            <p className="text-xs leading-relaxed line-clamp-2 text-slate-500 mt-1.5">
                              Materi pembelajaran untuk membantu siswa belajar lebih mudah dan efektif.
                            </p>
                          </div>

                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 md:h-11 rounded-xl text-sm font-bold text-white w-full flex items-center justify-center transition-all"
                            style={{ background: `linear-gradient(135deg, ${kt.from}, ${kt.to})` }}
                          >
                            📚 Buka Materi
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className="h-4" />
          </div>
        </main>
      </div>
    </div>
  )
}
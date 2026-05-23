"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

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
  video:    "bg-rose-500",
  artikel:  "bg-amber-500",
  pdf:      "bg-emerald-500",
  kuis:     "bg-violet-500",
  latihan:  "bg-sky-500",
}

const kategoriGradient: Record<string, string> = {
  Matematika:         "from-blue-600 to-indigo-700",
  "Bahasa Indonesia": "from-rose-500 to-pink-700",
  "Bahasa Inggris":   "from-emerald-500 to-teal-700",
  TPS:                "from-amber-500 to-orange-700",
  Literasi:           "from-violet-500 to-purple-700",
  Semua:              "from-blue-600 to-violet-700",
}

const kategoriSymbol: Record<string, string> = {
  Matematika:         "∑",
  "Bahasa Indonesia": "A",
  "Bahasa Inggris":   "E",
  TPS:                "◈",
  Literasi:           "◎",
}

export default function MateriPage() {
  const [materi, setMateri]           = useState<Materi[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState("")
  const [kategoriAktif, setKategoriAktif] = useState("Semua")
  const router = useRouter()

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    await getMateri()
    setLoading(false)
  }

  async function getMateri() {
    const { data } = await supabase
      .from("materi")
      .select("*")
      .order("id", { ascending: false })
    setMateri(data || [])
  }

  const filteredMateri = materi.filter((item) => {
    const cocokKategori = kategoriAktif === "Semua" ? true : item.kategori === kategoriAktif
    const cocokSearch   = item.judul.toLowerCase().includes(search.toLowerCase())
    return cocokKategori && cocokSearch
  })

  /* ─── LOADING ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <style>{`
          @keyframes spin-ring { to { transform: rotate(360deg); } }
          @keyframes pulse-glow {
            0%,100% { box-shadow: 0 0 20px rgba(99,102,241,0.4); }
            50%      { box-shadow: 0 0 44px rgba(99,102,241,0.85); }
          }
          .loader-ring {
            width:56px; height:56px;
            border:3px solid transparent;
            border-top:3px solid #6366f1;
            border-right:3px solid #06b6d4;
            border-radius:50%;
            animation: spin-ring 0.8s linear infinite, pulse-glow 1.5s ease-in-out infinite;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <div className="loader-ring" />
          <p style={{ color:"#818cf8", fontSize:12, fontWeight:800, letterSpacing:"0.18em" }}>MEMUAT…</p>
        </div>
      </div>
    )
  }

  /* ─── MAIN ─── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');

        *, *::before, *::after { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }

        :root {
          --bg:       #0a0f1e;
          --card:     #111827;
          --border:   rgba(99,102,241,0.15);
          --accent:   #6366f1;
          --accent2:  #06b6d4;
          --text:     #f1f5f9;
          --muted:    #64748b;
        }

        /* ── animations ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes float {
          0%,100% { transform:translateY(0);    }
          50%     { transform:translateY(-8px); }
        }
        @keyframes pulse-dot {
          0%,100% { transform:scale(1);   opacity:1;   }
          50%     { transform:scale(1.5); opacity:0.5; }
        }
        @keyframes shimmer-slide {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        /* ── card ── */
        .mc-card {
          animation: fadeUp 0.45s ease both;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .mc-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 24px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(99,102,241,0.35);
          border-color: rgba(99,102,241,0.45);
        }

        /* ── top bar ── */
        .mc-topbar {
          background: rgba(10,15,30,0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(99,102,241,0.12);
        }

        /* ── search input ── */
        .mc-search {
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(99,102,241,0.2);
          color: #f1f5f9;
          transition: all 0.3s ease;
          width: 100%;
          border-radius: 14px;
          padding: 0 16px 0 44px;
          outline: none;
        }
        .mc-search:focus {
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
        }
        .mc-search::placeholder { color: #475569; }

        /* ── chip ── */
        .mc-chip {
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          white-space: nowrap;
          border-radius: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .mc-chip-on {
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          color: #fff;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
          transform: scale(1.06);
        }
        .mc-chip-off {
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .mc-chip-off:hover {
          background: rgba(99,102,241,0.15);
          color: #c7d2fe;
          border-color: rgba(99,102,241,0.3);
        }

        /* ── open button ── */
        .mc-btn {
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          color: #fff;
          font-weight: 800;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          text-decoration: none;
        }
        .mc-btn::before {
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(135deg,#818cf8,#22d3ee);
          opacity:0;
          transition: opacity 0.3s;
        }
        .mc-btn:hover::before { opacity:1; }
        .mc-btn:active { transform: scale(0.97); }
        .mc-btn span { position:relative; z-index:1; }

        /* ── dot live ── */
        .dot-live {
          width:7px; height:7px;
          background:#10b981;
          border-radius:50%;
          display:inline-block;
          animation: pulse-dot 1.5s ease-in-out infinite;
          flex-shrink:0;
        }

        /* ── empty float ── */
        .empty-float { animation: float 3s ease-in-out infinite; }

        /* ── hero banner (desktop only) ── */
        .mc-hero {
          background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #0c1a2e 100%);
          border-bottom: 1px solid rgba(99,102,241,0.15);
          position: relative;
          overflow: hidden;
        }
        .mc-hero::before {
          content:'';
          position:absolute;
          width:600px; height:600px;
          background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%);
          top:-200px; right:-100px;
          pointer-events:none;
        }
        .mc-hero::after {
          content:'';
          position:absolute;
          width:400px; height:400px;
          background: radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%);
          bottom:-150px; left:-50px;
          pointer-events:none;
        }

        /* ── stat card ── */
        .mc-stat {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 16px 20px;
          transition: all 0.3s ease;
        }
        .mc-stat:hover {
          background: rgba(99,102,241,0.1);
          border-color: rgba(99,102,241,0.25);
          transform: translateY(-2px);
        }

        /* ── scrollbar hide ── */
        .sb-hide::-webkit-scrollbar { display:none; }
        .sb-hide { -ms-overflow-style:none; scrollbar-width:none; }

        /* ── image hover zoom ── */
        .img-zoom { transition: transform 0.5s ease; }
        .mc-card:hover .img-zoom { transform: scale(1.07); }

        /* ── stagger delays ── */
        .mc-card:nth-child(1)  { animation-delay:0.04s; }
        .mc-card:nth-child(2)  { animation-delay:0.08s; }
        .mc-card:nth-child(3)  { animation-delay:0.12s; }
        .mc-card:nth-child(4)  { animation-delay:0.16s; }
        .mc-card:nth-child(5)  { animation-delay:0.20s; }
        .mc-card:nth-child(6)  { animation-delay:0.24s; }
        .mc-card:nth-child(7)  { animation-delay:0.28s; }
        .mc-card:nth-child(8)  { animation-delay:0.32s; }
        .mc-card:nth-child(9)  { animation-delay:0.36s; }
      `}</style>

      <div className="min-h-screen pb-10" style={{ background:"var(--bg)" }}>

        {/* ═══════════ TOP BAR ═══════════ */}
        <div className="sticky top-0 z-50 mc-topbar">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">

            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background:"linear-gradient(135deg,#6366f1,#06b6d4)" }}>
                📚
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] font-black"
                  style={{ color:"var(--accent2)" }}>
                  Lampung Cerdas
                </p>
                <h1 className="text-sm md:text-xl font-black truncate leading-tight"
                  style={{ color:"var(--text)" }}>
                  Materi Pembelajaran
                </h1>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Count – desktop only */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                <span className="dot-live" />
                <span className="text-xs font-bold" style={{ color:"var(--muted)" }}>
                  {filteredMateri.length} Materi
                </span>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                style={{
                  background:"rgba(99,102,241,0.15)",
                  color:"#a5b4fc",
                  border:"1px solid rgba(99,102,241,0.25)"
                }}>
                ← Dashboard
              </button>
            </div>

          </div>
        </div>

        {/* ═══════════ HERO BANNER (desktop) ═══════════ */}
        <div className="mc-hero hidden md:block">
          <div className="max-w-7xl mx-auto px-8 py-10 relative z-10">
            <div className="flex items-end justify-between gap-6">

              {/* Left text */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2"
                  style={{ color:"var(--accent2)" }}>
                  ✦ Pusat Belajar Interaktif
                </p>
                <h2 className="text-4xl font-black leading-tight mb-3"
                  style={{ color:"var(--text)" }}>
                  Temukan Materi<br />
                  <span style={{ background:"linear-gradient(135deg,#818cf8,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    Terbaik Untuk Kamu
                  </span>
                </h2>
                <p className="text-sm" style={{ color:"var(--muted)", maxWidth:480 }}>
                  Koleksi lengkap video, artikel, PDF, dan latihan soal untuk mempersiapkan ujian dengan lebih efektif dan menyenangkan.
                </p>
              </div>

              {/* Stat cards */}
              <div className="flex gap-3 shrink-0">
                {[
                  { label:"Total Materi",  val: materi.length,          icon:"📚" },
                  { label:"Kategori",      val: kategoriList.length - 1, icon:"🗂️" },
                  { label:"Tersedia",      val: filteredMateri.length,   icon:"✅" },
                ].map((s) => (
                  <div key={s.label} className="mc-stat text-center min-w-[90px]">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-2xl font-black" style={{ color:"var(--text)" }}>{s.val}</div>
                    <div className="text-[10px] font-semibold mt-0.5" style={{ color:"var(--muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* ═══════════ SEARCH + FILTER ═══════════ */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-6">

          <div className="rounded-2xl p-3 md:p-5 mb-4 md:mb-6"
            style={{ background:"var(--card)", border:"1px solid var(--border)" }}>

            {/* Mobile count */}
            <div className="flex items-center justify-between mb-3 md:hidden">
              <div className="flex items-center gap-1.5">
                <span className="dot-live" />
                <span className="text-[10px] font-semibold" style={{ color:"var(--muted)" }}>
                  {filteredMateri.length} materi tersedia
                </span>
              </div>
              {search && (
                <button onClick={() => setSearch("")}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ background:"rgba(239,68,68,0.15)", color:"#fca5a5" }}>
                  × Reset
                </button>
              )}
            </div>

            {/* Search row – desktop has reset inline */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                  style={{ color:"var(--muted)" }}>🔍</span>
                <input
                  type="text"
                  placeholder="Cari materi matematika, TPS, bahasa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mc-search"
                  style={{ height:48, fontSize:14 }}
                />
              </div>

              {/* Desktop reset */}
              {search && (
                <button onClick={() => setSearch("")}
                  className="hidden md:flex h-12 px-5 rounded-xl text-sm font-bold items-center gap-2 shrink-0 transition-all hover:scale-105"
                  style={{ background:"rgba(239,68,68,0.15)", color:"#fca5a5", border:"1px solid rgba(239,68,68,0.2)" }}>
                  × Reset
                </button>
              )}
            </div>

            {/* Chips */}
            <div className="mt-3 md:mt-4 overflow-x-auto sb-hide">
              <div className="flex gap-2 min-w-max pb-0.5">
                {kategoriList.map((k) => (
                  <button
                    key={k.label}
                    onClick={() => setKategoriAktif(k.label)}
                    className={`mc-chip px-3 md:px-4 text-xs md:text-sm ${
                      kategoriAktif === k.label ? "mc-chip-on" : "mc-chip-off"
                    }`}
                    style={{ height: 36 }}>
                    <span>{k.icon}</span>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════ EMPTY ═══════════ */}
          {filteredMateri.length === 0 ? (
            <div className="text-center py-20 rounded-2xl"
              style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
              <div className="empty-float text-6xl mb-5">📭</div>
              <h2 className="text-lg md:text-xl font-black mb-2" style={{ color:"var(--text)" }}>
                Materi Tidak Ditemukan
              </h2>
              <p className="text-sm" style={{ color:"var(--muted)" }}>
                Coba kata kunci atau kategori lain
              </p>
              <button
                onClick={() => { setSearch(""); setKategoriAktif("Semua") }}
                className="mc-btn mt-5 inline-flex px-6 h-10 text-sm"
                style={{ borderRadius:12 }}>
                <span>Lihat Semua</span>
              </button>
            </div>

          ) : (

            /* ═══════════ GRID ═══════════
               Mobile  → 1 col horizontal card
               Tablet  → 2 col vertical card
               Desktop → 3 col vertical card          */
            <>
              {/* ── MOBILE: horizontal list ── */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredMateri.map((item, i) => {
                  const grad   = kategoriGradient[item.kategori] || "from-blue-600 to-indigo-700"
                  const tipeBg = tipeColor[item.tipe?.toLowerCase()] || "bg-indigo-500"
                  return (
                    <div key={item.id} className="mc-card" style={{ animationDelay:`${i*0.06}s` }}>
                      <div className="flex overflow-hidden">
                        {/* Thumb */}
                        <div className="relative shrink-0 w-[110px]" style={{ minHeight:110 }}>
                          {item.gambar && item.gambar !== "" ? (
                            <img src={item.gambar} alt={item.judul}
                              className="img-zoom w-full h-full object-cover" style={{ minHeight:110 }} />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}
                              style={{ minHeight:110 }}>
                              <span className="text-3xl opacity-80">
                                {kategoriSymbol[item.kategori] || "A"}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#111827]/60" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              <span className={`${tipeBg} text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider`}>
                                {item.tipe}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                                style={{ background:"rgba(255,255,255,0.07)", color:"#94a3b8" }}>
                                {item.kategori}
                              </span>
                            </div>
                            <h2 className="text-sm font-black leading-snug line-clamp-2" style={{ color:"var(--text)" }}>
                              {item.judul}
                            </h2>
                          </div>
                          <a href={item.link} target="_blank" rel="noopener noreferrer"
                            className="mc-btn mt-2.5 h-8 text-[11px]" style={{ borderRadius:10 }}>
                            <span>Buka Materi →</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── DESKTOP/TABLET: vertical grid cards ── */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMateri.map((item, i) => {
                  const grad   = kategoriGradient[item.kategori] || "from-blue-600 to-indigo-700"
                  const tipeBg = tipeColor[item.tipe?.toLowerCase()] || "bg-indigo-500"
                  return (
                    <div key={item.id} className="mc-card flex flex-col" style={{ animationDelay:`${i*0.06}s` }}>

                      {/* Image area */}
                      <div className="relative overflow-hidden" style={{ height:200 }}>
                        {item.gambar && item.gambar !== "" ? (
                          <img src={item.gambar} alt={item.judul}
                            className="img-zoom w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                            <span style={{ fontSize:64, opacity:0.25, fontWeight:900, color:"#fff" }}>
                              {kategoriSymbol[item.kategori] || "A"}
                            </span>
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />

                        {/* Tipe badge top-left */}
                        <div className="absolute top-3 left-3">
                          <span className={`${tipeBg} text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider`}>
                            {item.tipe}
                          </span>
                        </div>

                        {/* Kategori bottom-left */}
                        <div className="absolute bottom-3 left-4">
                          <p className="text-xs font-bold" style={{ color:"rgba(255,255,255,0.7)" }}>
                            {item.kategori}
                          </p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 flex flex-col justify-between gap-3">
                        <div>
                          <h2 className="text-base font-black leading-snug line-clamp-2 mb-2"
                            style={{ color:"var(--text)" }}>
                            {item.judul}
                          </h2>
                          <p className="text-xs leading-relaxed line-clamp-2"
                            style={{ color:"var(--muted)" }}>
                            Materi pembelajaran untuk membantu siswa belajar lebih mudah dan efektif.
                          </p>
                        </div>

                        <a href={item.link} target="_blank" rel="noopener noreferrer"
                          className="mc-btn h-11 text-sm w-full" style={{ borderRadius:12 }}>
                          <span>📚 Buka Materi</span>
                        </a>
                      </div>

                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="h-6" />
        </div>
      </div>
    </>
  )
}
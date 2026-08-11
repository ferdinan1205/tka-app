"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"

type Ranking = {
  user_id: string
  package_id: string
  email: string
  nama: string
  skor: number
  kategori: string
  foto?: string
}

type Package = {
  id: number
  nama_paket: string
}

const MENU = [
  { label: "Dashboard",      icon: "⌂",  path: "/admin"         },
  { label: "Kelola Soal",    icon: "✎",  path: "/admin/soal"    },
  { label: "Materi",         icon: "◈",  path: "/admin/materi"  },
  { label: "Kelas",          icon: "▤",  path: "/admin/kelas"   },   // ← tambahin ini
  { label: "Ranking",        icon: "◎",  path: "/admin/ranking" },
  { label: "Rekap Nilai",    icon: "≋",  path: "/admin/rekap"   },
  { label: "Manajemen User", icon: "◉",  path: "/admin/users"   },
  { label: "Token Ujian",    icon: "⟐",  path: "/admin/token"   },
]

const G = {
  teal:   "linear-gradient(135deg,#0ea5e9,#0d9488)",
  violet: "linear-gradient(135deg,#7c3aed,#4f46e5)",
  amber:  "linear-gradient(135deg,#f59e0b,#ef4444)",
  hero:   "linear-gradient(135deg,#0a0f1e 0%,#0d1b3e 60%,#0a2040 100%)",
}

/* avatar gradient palette per initial — sama seperti dashboard */
const AVATAR_COLORS = [
  ["#0ea5e9","#0284c7"],["#7c3aed","#4f46e5"],["#f59e0b","#ef4444"],
  ["#10b981","#059669"],["#f43f5e","#e11d48"],["#06b6d4","#0891b2"],
  ["#8b5cf6","#6d28d9"],["#ec4899","#db2777"],
]
const avatarGrad = (name: string) => {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  const [a, b] = AVATAR_COLORS[idx]
  return `linear-gradient(135deg,${a},${b})`
}

export default function RankingAdmin() {
  const router   = useRouter()
  const pathname = usePathname()

  const [ranking,         setRanking        ] = useState<Ranking[]>([])
  const [packages,        setPackages       ] = useState<Package[]>([])
  const [loading,         setLoading        ] = useState(true)
  const [search,          setSearch         ] = useState("")
  const [selectedPackage, setSelectedPackage] = useState<string>("all")
  const [adminName,       setAdminName      ] = useState("Admin")
  const [sidebarOpen,     setSidebarOpen    ] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", data.user.id).single()

    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak")
      router.push("/dashboard")
      return
    }

    setAdminName(profile.nama || "Admin")
    await getRanking()
    setLoading(false)
  }

  async function getRanking() {
    const { data: rankingData, error: rankingError } = await supabase
      .from("ranking_tka").select("*").eq("selesai", true)
      .order("total_skor", { ascending: false })

    if (rankingError) { console.log(rankingError); return }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles").select("*")

    if (profileError) { console.log(profileError); return }

    const { data: packagesData } = await supabase
      .from("packages").select("id, nama_paket").order("id", { ascending: true })

    const profiles    = (profileData  || []) as any[]
    const pkgs        = (packagesData || []) as Package[]
    setPackages(pkgs)

    const finalRanking = (rankingData || []).map((item: any) => {
      const user  = profiles.find((p) => p.id === item.user_id)
      const paket = pkgs.find((p) => String(p.id) === String(item.package_id))
      return {
        user_id:    item.user_id,
        package_id: String(item.package_id || ""),
        skor:       item.total_skor || 0,
        kategori:   paket?.nama_paket || user?.paket || "Paket",
        email:      user?.email || "-",
        nama:       user?.nama  || "Siswa",
        foto:       user?.foto  || "",
      }
    })

    setRanking(finalRanking)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const filtered = ranking
    .filter((item) =>
      selectedPackage === "all" ? true : item.package_id === selectedPackage
    )
    .filter((item) =>
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase())
    )

  const top1 = filtered[0]
  const top2 = filtered[1]
  const top3 = filtered[2]

  /* ─── Sidebar (identik dengan dashboard admin) ─── */
  const Sidebar = () => (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .sb-nav-item { transition: all .2s cubic-bezier(.4,0,.2,1); border-left: 2px solid transparent; }
        .sb-nav-item:hover { background: rgba(255,255,255,.07); transform: translateX(2px); }
        .sb-nav-item.sb-active {
          background: linear-gradient(90deg,rgba(56,189,248,.16),rgba(56,189,248,.04));
          border-left-color: #38bdf8;
        }
        .sb-active .sb-label { color: #f0f9ff !important; }
        .sb-active .sb-icon  { color: #38bdf8 !important; }

        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { opacity:0; animation: fadeUp .5s cubic-bezier(.4,0,.2,1) forwards; }
        .d1{animation-delay:.04s}.d2{animation-delay:.10s}.d3{animation-delay:.16s}.d4{animation-delay:.22s}

        .rk-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .rk-row  { transition: background .15s ease, transform .15s ease; }
        .rk-row:hover { background: rgba(14,165,233,.06); transform: translateX(2px); }
        .rk-chip { transition: all .18s ease; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 4px; }
      `}</style>

      <aside
        style={{
          fontFamily: "'DM Sans', sans-serif",
          background: "linear-gradient(180deg,#0c1a35 0%,#0f2040 100%)",
          borderRight: "1px solid rgba(56,189,248,.12)",
        }}
        className={`
          fixed top-0 left-0 z-40 h-screen w-60
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(56,189,248,.1)" }}>
          <div className="flex items-center gap-3">
            <div style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", boxShadow: "0 4px 14px rgba(56,189,248,.4)" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-lg">
              🎓
            </div>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", letterSpacing: "0.04em", color: "#f8fafc" }}
                className="font-semibold text-[13px] leading-none">LAMPUNG</p>
              <p style={{ color: "#7dd3fc", letterSpacing: "1.5px" }}
                className="text-[10px] mt-1 font-normal">Smart Education</p>
            </div>
          </div>
        </div>

        {/* Admin badge */}
        <div className="px-3 pt-4 pb-2">
          <div style={{ background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.18)" }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div style={{ background: avatarGrad(adminName), boxShadow: "0 3px 10px rgba(0,0,0,.3)" }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ color: "#f0f9ff" }} className="text-xs font-semibold truncate">{adminName}</p>
              <p style={{ color: "#7dd3fc" }} className="text-[10px] mt-0.5 font-medium">Administrator</p>
            </div>
            <div className="pulse-dot w-2 h-2 rounded-full bg-teal-400 shrink-0" />
          </div>
        </div>

        <p style={{ color: "#7dabc9", letterSpacing: "1.5px" }}
          className="px-5 mt-4 mb-2 text-[10px] font-medium uppercase">Navigation</p>

        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {MENU.map((item) => {
            const isActive = pathname === item.path
            return (
              <button key={item.path}
                onClick={() => { router.push(item.path); setSidebarOpen(false) }}
                className={`sb-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-r-xl text-left ${isActive ? "sb-active" : ""}`}
              >
                <span className={`sb-icon text-sm w-5 text-center ${isActive ? "text-sky-400" : "text-slate-300"}`}>
                  {item.icon}
                </span>
                <span style={{ fontSize: "13px" }}
                  className={`sb-label font-medium ${isActive ? "text-sky-100" : "text-slate-200"}`}>
                  {item.label}
                </span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 opacity-70 shrink-0" />}
              </button>
            )
          })}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid rgba(56,189,248,.1)" }}>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] font-medium transition-all"
            style={{ color: "#94a3b8" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fca5a5"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <span className="text-sm w-5 text-center">↩</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  )

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060f22" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-11 h-11">
            <div className="absolute inset-0 rounded-full border-2 border-sky-900" />
            <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          </div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "1px", color: "#7dabc9" }}
            className="text-xs font-medium">Memuat ranking</p>
        </div>
      </div>
    )
  }

  /* ─── Main ─── */
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#eef2f7" }} className="min-h-screen">

      <Sidebar />

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 h-14 flex items-center px-4 gap-3"
        style={{ background: "rgba(238,242,247,.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(15,23,42,.08)" }}>
        <button onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm">
          ☰
        </button>
        <div style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)" }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow">🎓</div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: "13px" }}
          className="font-semibold text-slate-800">Ranking</p>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-7 max-w-5xl mx-auto space-y-5">

          {/* ── PAGE HEADER ── */}
          <div className="fade-up d1 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p style={{ color: "#0284c7", letterSpacing: "1px", fontSize: "10px" }}
                className="font-medium uppercase">Admin</p>
              <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "19px" }}
                className="font-semibold text-slate-900 mt-0.5">Ranking Siswa</h1>
            </div>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{ background: "rgba(14,165,233,.1)", color: "#0369a1" }}>
              {filtered.length} siswa
            </span>
          </div>

          {/* ── FILTER PAKET ── */}
          <div className="fade-up d2 flex flex-wrap gap-2">
            <FilterBtn
              label="Semua paket"
              active={selectedPackage === "all"}
              onClick={() => setSelectedPackage("all")}
            />
            {packages.map((pkg) => (
              <FilterBtn
                key={pkg.id}
                label={pkg.nama_paket}
                active={selectedPackage === String(pkg.id)}
                onClick={() => setSelectedPackage(String(pkg.id))}
              />
            ))}
          </div>

          {/* ── SEARCH ── */}
          <div className="fade-up d2 relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email siswa..."
              className="w-full h-11 rounded-xl bg-white px-4 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition"
              style={{ border: "1px solid rgba(15,23,42,.08)" }}
              onFocus={e => { e.currentTarget.style.border = "1px solid rgba(14,165,233,.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,165,233,.1)" }}
              onBlur={e => { e.currentTarget.style.border = "1px solid rgba(15,23,42,.08)"; e.currentTarget.style.boxShadow = "none" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          </div>

          {/* ── SECTION LABEL ── */}
          <p className="fade-up d3 text-sm font-medium text-slate-600">
            {selectedPackage === "all"
              ? "Semua paket — leaderboard gabungan"
              : packages.find((p) => String(p.id) === selectedPackage)?.nama_paket
            }
          </p>

          {/* ── PODIUM ── */}
          {filtered.length >= 1 && (
            <div className="fade-up d3 grid grid-cols-3 gap-3 items-end">
              {top2 ? <PodiumCard data={top2} rank={2} /> : <div />}
              {top1 ? <PodiumCard data={top1} rank={1} /> : <div />}
              {top3 ? <PodiumCard data={top3} rank={3} /> : <div />}
            </div>
          )}

          {/* ── LIST ── */}
          <div className="fade-up d4 bg-white rounded-2xl p-3 shadow-sm" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
            <div className="flex flex-col gap-1.5">
              {filtered.map((item, index) => (
                <RankItem
                  key={`${item.user_id}_${item.package_id}`}
                  item={item}
                  index={index}
                  onClick={() => router.push(`/admin/siswa/${item.user_id}`)}
                />
              ))}

              {filtered.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3">🏆</div>
                  <p className="text-sm font-medium text-slate-700">Ranking belum tersedia</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedPackage === "all"
                      ? "Data ranking siswa belum ada"
                      : "Belum ada siswa yang selesai di paket ini"}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

// ── sub-components ────────────────────────────────────────────

function FilterBtn({
  label, active, onClick
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rk-chip h-8 px-4 rounded-full text-xs font-medium"
      style={active
        ? { background: "linear-gradient(135deg,#0ea5e9,#0d9488)", color: "#fff", boxShadow: "0 4px 12px rgba(14,165,233,.28)" }
        : { background: "#fff", color: "#475569", border: "1px solid rgba(15,23,42,.08)" }
      }
    >
      {label}
    </button>
  )
}

// ── PODIUM CARD ───────────────────────────────────────────────
const PODIUM_STYLE = {
  1: { grad: "linear-gradient(135deg,#f59e0b,#ef4444)", glow: "#f59e0b", badgeBg: "rgba(245,158,11,.12)", badgeText: "#b45309" },
  2: { grad: "linear-gradient(135deg,#0ea5e9,#0d9488)", glow: "#0ea5e9", badgeBg: "rgba(14,165,233,.12)", badgeText: "#0369a1" },
  3: { grad: "linear-gradient(135deg,#7c3aed,#4f46e5)", glow: "#7c3aed", badgeBg: "rgba(124,58,237,.12)", badgeText: "#6d28d9" },
} as const

const AVATAR_COLORS_PODIUM = [
  ["#0ea5e9","#0284c7"],["#7c3aed","#4f46e5"],["#f59e0b","#ef4444"],
  ["#10b981","#059669"],["#f43f5e","#e11d48"],["#06b6d4","#0891b2"],
  ["#8b5cf6","#6d28d9"],["#ec4899","#db2777"],
]
const avatarGradFor = (name: string) => {
  const idx = name.charCodeAt(0) % AVATAR_COLORS_PODIUM.length
  const [a, b] = AVATAR_COLORS_PODIUM[idx]
  return `linear-gradient(135deg,${a},${b})`
}

function PodiumCard({ data, rank }: { data: Ranking; rank: 1 | 2 | 3 }) {
  const s       = PODIUM_STYLE[rank]
  const isFirst = rank === 1

  return (
    <div
      className="rk-card bg-white rounded-2xl text-center relative overflow-hidden"
      style={{
        border: "1px solid rgba(15,23,42,.08)",
        boxShadow: isFirst ? `0 10px 26px ${s.glow}22` : "0 4px 14px rgba(15,23,42,.04)",
        padding: isFirst ? "22px 12px 18px" : "16px 8px",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: s.grad }} />

      {isFirst && <div className="text-lg mb-2">👑</div>}

      {/* avatar */}
      {data.foto ? (
        <img
          src={data.foto}
          alt="foto"
          className={`rounded-full object-cover mx-auto mb-2 ${isFirst ? "w-14 h-14" : "w-11 h-11"}`}
          style={{ border: `2px solid ${s.glow}44` }}
        />
      ) : (
        <div
          className={`rounded-full flex items-center justify-center font-bold text-white mx-auto mb-2 ${isFirst ? "w-14 h-14 text-sm" : "w-11 h-11 text-xs"}`}
          style={{ background: avatarGradFor(data.nama) }}
        >
          {data.nama.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* rank badge */}
      <span
        className="inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full mb-1.5"
        style={{ background: s.badgeBg, color: s.badgeText }}
      >
        #{rank}
      </span>

      {/* nama */}
      <p className={`font-semibold text-slate-800 truncate leading-tight ${isFirst ? "text-sm" : "text-xs"}`}>
        {data.nama}
      </p>
      {/* paket */}
      <p className="text-[10px] text-slate-400 truncate mt-0.5 mb-2 px-1">
        {data.kategori}
      </p>

      {/* skor */}
      <p className="text-[9px] text-slate-400 uppercase tracking-widest">Skor</p>
      <p className={`font-bold ${isFirst ? "text-2xl" : "text-lg"}`} style={{ color: s.glow }}>
        {data.skor}
      </p>
    </div>
  )
}

// ── RANK ITEM (list row) ──────────────────────────────────────
const RANK_NUM_STYLE: Record<number, { bg: string; text: string }> = {
  0: { bg: "rgba(245,158,11,.12)", text: "#b45309" },
  1: { bg: "rgba(14,165,233,.12)", text: "#0369a1" },
  2: { bg: "rgba(124,58,237,.12)", text: "#6d28d9" },
}
const RANK_SCORE_COLOR: Record<number, string> = {
  0: "#d97706",
  1: "#0284c7",
  2: "#7c3aed",
}

function RankItem({
  item, index, onClick
}: { item: Ranking; index: number; onClick: () => void }) {
  const numStyle   = RANK_NUM_STYLE[index]   ?? { bg: "#f1f5f9", text: "#64748b" }
  const scoreColor = RANK_SCORE_COLOR[index] ?? "#334155"

  return (
    <div
      onClick={onClick}
      className="rk-row flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
    >
      {/* rank number */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
        style={{ background: numStyle.bg, color: numStyle.text }}
      >
        #{index + 1}
      </div>

      {/* avatar */}
      {item.foto ? (
        <img
          src={item.foto}
          alt="foto"
          className="w-9 h-9 rounded-xl object-cover shrink-0"
          style={{ border: "1px solid rgba(15,23,42,.08)" }}
        />
      ) : (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: avatarGradFor(item.nama) }}
        >
          {item.nama.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* info */}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: "13px" }} className="font-semibold text-slate-900 truncate leading-tight">{item.nama}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span style={{ fontSize: "10.5px" }} className="text-slate-400 truncate max-w-[150px]">{item.email}</span>
          <span
            style={{ fontSize: "10px", background: "#f1f5f9", color: "#64748b" }}
            className="rounded-full px-2 py-px shrink-0"
          >
            {item.kategori}
          </span>
          {index === 0 && (
            <span
              style={{ fontSize: "10px", background: "rgba(245,158,11,.12)", color: "#b45309" }}
              className="rounded-full px-2 py-px shrink-0 font-medium"
            >
              Top 1
            </span>
          )}
        </div>
      </div>

      {/* skor */}
      <div className="text-right shrink-0">
        <p style={{ fontSize: "9px", color: "#94a3b8" }} className="font-medium tracking-widest uppercase">Skor</p>
        <p style={{ fontFamily: "'Inter',sans-serif", color: scoreColor }} className="text-xl font-bold">{item.skor}</p>
      </div>
    </div>
  )
}
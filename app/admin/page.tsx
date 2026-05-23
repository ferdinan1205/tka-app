"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

type TopUser = {
  skor: number
  user_id: string
  email: string
  nama: string
  foto?: string
}

const MENU = [
  { label: "Dashboard",      icon: "⌂",  path: "/admin"         },
  { label: "Kelola Soal",    icon: "✎",  path: "/admin/soal"    },
  { label: "Materi",         icon: "◈",  path: "/admin/materi"  },
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

/* avatar gradient palette per initial */
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

/* custom bar tooltip */
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#0a0f1e",
      border: "1px solid rgba(56,189,248,.25)",
      borderRadius: 10,
      padding: "8px 14px",
      fontFamily: "'DM Sans',sans-serif",
      fontSize: 12,
      color: "#e2e8f0",
      boxShadow: "0 8px 24px rgba(0,0,0,.3)",
    }}>
      <p style={{ color: "#94a3b8", marginBottom: 3, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</p>
      <p style={{ color: "#38bdf8", fontWeight: 800, fontSize: 16 }}>{payload[0].value} <span style={{ color: "#64748b", fontSize: 10, fontWeight: 400 }}>ujian</span></p>
    </div>
  )
}

export default function AdminDashboard() {
  const router   = useRouter()
  const pathname = usePathname()

  const [totalSoal,   setTotalSoal  ] = useState(0)
  const [totalUser,   setTotalUser  ] = useState(0)
  const [totalHasil,  setTotalHasil ] = useState(0)
  const [chartData,   setChartData  ] = useState<any[]>([])
  const [topUser,     setTopUser    ] = useState<TopUser[]>([])
  const [adminName,   setAdminName  ] = useState("Admin")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading,     setLoading    ] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", data.user.id).single()
    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak!"); router.push("/dashboard"); return
    }
    setAdminName(profile.nama || "Admin")
    await Promise.all([getStats(), getChart(), getTopUser()])
    setLoading(false)
  }

  async function getStats() {
    const [{ count: soal }, { count: user }, { count: hasil }] =
      await Promise.all([
        supabase.from("soal"    ).select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("hasil"   ).select("*", { count: "exact", head: true }),
      ])
    setTotalSoal(soal   || 0)
    setTotalUser(user   || 0)
    setTotalHasil(hasil || 0)
  }

  async function getChart() {
    const { data } = await supabase
      .from("hasil").select("tanggal,skor").order("tanggal", { ascending: true })
    /* group by date: store { jumlah, maxSkor } */
    const map: Record<string, { jumlah: number; maxSkor: number }> = {}
    data?.forEach((item: any) => {
      const tgl = new Date(item.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      if (!map[tgl]) map[tgl] = { jumlah: 0, maxSkor: 0 }
      map[tgl].jumlah++
      if ((item.skor || 0) > map[tgl].maxSkor) map[tgl].maxSkor = item.skor || 0
    })
    setChartData(Object.keys(map).map((k) => ({
      tanggal: k,
      jumlah:  map[k].jumlah,
      maxSkor: map[k].maxSkor,
    })))
  }

  async function getTopUser() {
    const [{ data: hasilData }, { data: profiles }] = await Promise.all([
      supabase.from("hasil").select("*").order("skor", { ascending: false }),
      supabase.from("profiles").select("*"),
    ])
    if (!hasilData || !profiles) return
    const bestMap: Record<string, any> = {}
    hasilData.forEach((item: any) => {
      if (!bestMap[item.user_id] || item.skor > bestMap[item.user_id].skor)
        bestMap[item.user_id] = item
    })
    const final = Object.values(bestMap)
      .map((item: any) => {
        const user = profiles.find((p: any) => p.id === item.user_id)
        return { user_id: item.user_id, skor: item.skor, email: user?.email || "-", nama: user?.nama || "Siswa", foto: user?.foto || "" }
      })
      .sort((a: any, b: any) => b.skor - a.skor)
      .slice(0, 5)
    setTopUser(final)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  /* ─── rank badge ─── */
  const rankStyle = (i: number) =>
    i === 0 ? { bg: "rgba(251,191,36,.15)", text: "#f59e0b", border: "rgba(251,191,36,.3)",  medal: "🥇" }
    : i === 1 ? { bg: "rgba(148,163,184,.1)",  text: "#94a3b8", border: "rgba(148,163,184,.2)", medal: "🥈" }
    : i === 2 ? { bg: "rgba(251,146,60,.12)", text: "#fb923c", border: "rgba(251,146,60,.25)", medal: "🥉" }
    : { bg: "rgba(100,116,139,.06)", text: "#64748b", border: "rgba(100,116,139,.15)", medal: "" }

  /* ─── bar color per index ─── */
  const BAR_COLORS = ["#0ea5e9","#38bdf8","#7dd3fc","#bae6fd","#e0f2fe","#f0f9ff","#cffafe","#a5f3fc"]

  /* ─── Sidebar ─── */
  const Sidebar = () => (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* ── sidebar nav ── */
        .sb-nav-item { transition: all .2s cubic-bezier(.4,0,.2,1); border-left: 2px solid transparent; }
        .sb-nav-item:hover { background: rgba(255,255,255,.05); transform: translateX(2px); }
        .sb-nav-item.sb-active {
          background: linear-gradient(90deg,rgba(56,189,248,.12),rgba(56,189,248,.03));
          border-left-color: #38bdf8;
        }
        .sb-active .sb-label { color: #e0f2fe !important; }
        .sb-active .sb-icon  { color: #38bdf8 !important; }

        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }

        /* ── page entrance ── */
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { opacity:0; animation: fadeUp .5s cubic-bezier(.4,0,.2,1) forwards; }
        .d1{animation-delay:.04s}.d2{animation-delay:.10s}.d3{animation-delay:.16s}
        .d4{animation-delay:.22s}.d5{animation-delay:.28s}.d6{animation-delay:.34s}

        /* ── stat card ── */
        .stat-card { transition: transform .22s ease, box-shadow .22s ease; }
        .stat-card:hover { transform: translateY(-3px); }

        /* ── quick menu ── */
        .qm-card { transition: transform .18s ease, box-shadow .18s ease; }
        .qm-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,.1); }

        /* ── leaderboard row ── */
        .tu-row { transition: background .15s ease; border-radius: 12px; }
        .tu-row:hover { background: rgba(14,165,233,.05); }

        /* ── score badge ── */
        .score-badge {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 15px;
          min-width: 40px;
          text-align: right;
          line-height: 1;
          letter-spacing: -.5px;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,.2); border-radius: 4px; }

        /* recharts bar radius fix */
        .recharts-bar-rectangle path { transition: opacity .15s; }
        .recharts-bar-rectangle:hover path { opacity: .85; }
      `}</style>

      <aside
        style={{
          fontFamily: "'DM Sans', sans-serif",
          /* lighter navy — still professional but not pitch-black */
          background: "linear-gradient(180deg,#0c1a35 0%,#0f2040 100%)",
          borderRight: "1px solid rgba(56,189,248,.08)",
        }}
        className={`
          fixed top-0 left-0 z-40 h-screen w-60
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(56,189,248,.07)" }}>
          <div className="flex items-center gap-3">
            <div style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", boxShadow: "0 4px 14px rgba(56,189,248,.35)" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-lg">
              🎓
            </div>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", letterSpacing: "0.1em", color: "#f0f9ff" }}
                className="font-black text-[13px] leading-none">LAMPUNG</p>
              <p style={{ color: "#4a7fa8", letterSpacing: "3px" }}
                className="text-[8px] mt-1 uppercase">Smart Education</p>
            </div>
          </div>
        </div>

        {/* Admin badge */}
        <div className="px-3 pt-4 pb-2">
          <div style={{ background: "rgba(56,189,248,.07)", border: "1px solid rgba(56,189,248,.12)" }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div style={{ background: avatarGrad(adminName), boxShadow: "0 3px 10px rgba(0,0,0,.25)" }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ color: "#e0f2fe" }} className="text-xs font-semibold truncate">{adminName}</p>
              <p style={{ color: "#4a7fa8" }} className="text-[10px] mt-0.5">Administrator</p>
            </div>
            <div className="pulse-dot w-2 h-2 rounded-full bg-teal-400 shrink-0" />
          </div>
        </div>

        <p style={{ color: "#2d5a7a", letterSpacing: "3px" }}
          className="px-5 mt-4 mb-2 text-[8px] font-bold uppercase">Navigation</p>

        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {MENU.map((item) => {
            const isActive = pathname === item.path
            return (
              <button key={item.path}
                onClick={() => { router.push(item.path); setSidebarOpen(false) }}
                className={`sb-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-r-xl text-left ${isActive ? "sb-active" : ""}`}
              >
                <span className={`sb-icon text-sm w-5 text-center ${isActive ? "text-sky-400" : "text-slate-500"}`}>
                  {item.icon}
                </span>
                <span style={{ fontSize: "13px" }}
                  className={`sb-label font-medium ${isActive ? "text-sky-100" : "text-slate-400"}`}>
                  {item.label}
                </span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 opacity-60 shrink-0" />}
              </button>
            )
          })}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid rgba(56,189,248,.06)" }}>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] font-medium transition-all"
            style={{ color: "#64748b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <span className="text-sm w-5 text-center">↩</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  )

  /* ─── Loading ─── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060f22" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-11 h-11">
          <div className="absolute inset-0 rounded-full border-2 border-sky-900" />
          <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "3px", color: "#2d5a7a" }}
          className="text-[9px] font-semibold uppercase">Memuat dashboard</p>
      </div>
    </div>
  )

  const STATS = [
    { title: "Total Soal",    value: totalSoal,  sub: "soal tersedia",   grad: G.teal,   glow: "#0ea5e9" },
    { title: "Total Siswa",   value: totalUser,  sub: "siswa terdaftar", grad: G.violet, glow: "#7c3aed" },
    { title: "Ujian Selesai", value: totalHasil, sub: "ujian selesai",   grad: G.amber,  glow: "#f59e0b" },
  ]

  const QUICK = [
    { title: "Kelola Soal", icon: "📝", path: "/admin/soal",    color: "#0ea5e9" },
    { title: "Materi",      icon: "📚", path: "/admin/materi",  color: "#7c3aed" },
    { title: "Ranking",     icon: "🏆", path: "/admin/ranking", color: "#f59e0b" },
    { title: "Rekap Nilai", icon: "📊", path: "/admin/rekap",   color: "#10b981" },
    { title: "Users",       icon: "👤", path: "/admin/users",   color: "#f43f5e" },
    { title: "Token",       icon: "🔑", path: "/admin/token",   color: "#06b6d4" },
  ]

  /* max value for bar highlight */
  const maxJumlah = Math.max(...chartData.map(d => d.jumlah), 1)

  return (
    <>
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#eef2f7" }}
        className="min-h-screen">

        <Sidebar />

        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile topbar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-20 h-14 flex items-center px-4 gap-3"
          style={{ background: "rgba(238,242,247,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
          <button onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
            ☰
          </button>
          <div style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)" }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow">🎓</div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: "13px" }}
            className="font-black text-slate-800 tracking-widest uppercase">Admin</p>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <main className="lg:ml-60 pt-14 lg:pt-0">
          <div className="p-4 md:p-6 lg:p-7 max-w-7xl mx-auto space-y-5">

            {/* ── HERO ── */}
            <div className="fade-up d1 relative rounded-2xl overflow-hidden" style={{ background: G.hero }}>
              {/* grid */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(rgba(56,189,248,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.04) 1px,transparent 1px)",
                  backgroundSize: "32px 32px",
                }} />
              {/* glows */}
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(56,189,248,.15),transparent 70%)" }} />
              <div className="absolute bottom-0 left-32 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(129,140,248,.1),transparent 70%)" }} />
              {/* top line */}
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: "linear-gradient(90deg,transparent,rgba(56,189,248,.5),rgba(129,140,248,.35),transparent)" }} />

              <div className="relative px-6 py-7 md:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase mb-3"
                    style={{ background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.18)", color: "#38bdf8" }}>
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-sky-400" />
                    Academic Management System
                  </div>
                  <h1 style={{ fontFamily: "'Syne',sans-serif", lineHeight: "1.15", fontSize: "26px" }}
                    className="font-black text-white">
                    Selamat datang,{" "}
                    <span style={{ background: "linear-gradient(90deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {adminName}
                    </span>
                  </h1>
                  <p style={{ fontWeight: 300, color: "#4a7fa8" }} className="mt-2 text-sm max-w-md leading-relaxed">
                    Kelola aktivitas pembelajaran, ujian siswa, dan monitoring akademik secara modern dan efisien.
                  </p>
                </div>

                <div className="flex flex-row lg:flex-col gap-2 lg:w-48">
                  {[
                    { label: "Soal Aktif",    value: totalSoal,  color: "#38bdf8" },
                    { label: "Siswa",         value: totalUser,  color: "#34d399" },
                    { label: "Ujian Selesai", value: totalHasil, color: "#fbbf24" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl flex-1 lg:flex-none"
                      style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <div className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                      <p style={{ color: "#4a7fa8" }} className="text-xs flex-1">{s.label}</p>
                      <p style={{ fontFamily: "'Syne',sans-serif", color: "#fff" }}
                        className="font-black text-base">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STATS.map((s, idx) => (
                <div key={s.title}
                  className={`stat-card fade-up d${idx + 2} rounded-2xl p-5 text-white relative overflow-hidden`}
                  style={{ background: s.grad, boxShadow: `0 8px 28px ${s.glow}28` }}>
                  <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,.08)" }} />
                  <div className="absolute -right-2 top-8 w-16 h-16 rounded-full"  style={{ background: "rgba(255,255,255,.05)" }} />
                  <div className="relative">
                    <p style={{ letterSpacing: "2px", fontSize: "10px" }} className="font-semibold uppercase text-white/60">{s.title}</p>
                    <p style={{ fontFamily: "'Syne',sans-serif" }} className="text-4xl font-black mt-1.5">{s.value}</p>
                    <p className="text-xs text-white/50 mt-0.5">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── BAR CHART + TOP USER ── */}
            <div className="fade-up d5 grid grid-cols-1 xl:grid-cols-5 gap-5">

              {/* ── Bar Chart ── */}
              <div className="xl:col-span-3 bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: "1px solid rgba(0,0,0,.06)" }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p style={{ color: "#0ea5e9", letterSpacing: "3px", fontSize: "10px" }}
                      className="font-bold uppercase">Analytics</p>
                    <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "17px" }}
                      className="font-bold text-slate-800 mt-0.5">Ujian Per Hari</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#0ea5e9" }} />
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>jumlah ujian</span>
                    <span className="ml-2 text-[11px] text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
                      {chartData.length} hari
                    </span>
                  </div>
                </div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="tanggal"
                        tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'DM Sans',sans-serif" }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'DM Sans',sans-serif" }}
                        axisLine={false} tickLine={false} allowDecimals={false}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(14,165,233,.06)", radius: 6 }} />
                      <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.jumlah === maxJumlah ? "#0ea5e9" : "#bae6fd"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", textAlign: "center" }}>
                  Bar berwarna biru tua = hari dengan ujian terbanyak
                </p>
              </div>

              {/* ── Top Siswa ── */}
              <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: "1px solid rgba(0,0,0,.06)" }}>
                <div className="mb-4">
                  <p style={{ color: "#7c3aed", letterSpacing: "3px", fontSize: "10px" }}
                    className="font-bold uppercase">Leaderboard</p>
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "17px" }}
                    className="font-bold text-slate-800 mt-0.5">Top Siswa</h2>
                </div>

                <div className="space-y-1">
                  {topUser.map((u, i) => {
                    const rs = rankStyle(i)
                    return (
                      <div key={i} className="tu-row flex items-center gap-2.5 px-2 py-2 cursor-pointer">

                        {/* rank medal */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
                          style={{ background: rs.bg, border: `1px solid ${rs.border}` }}>
                          {i < 3
                            ? <span>{rs.medal}</span>
                            : <span style={{ fontSize: "11px", fontWeight: 800, color: rs.text }}>{i + 1}</span>
                          }
                        </div>

                        {/* avatar */}
                        {u.foto
                          ? <img src={u.foto} className="w-8 h-8 rounded-xl object-cover shrink-0" alt="" />
                          : (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white"
                              style={{ background: avatarGrad(u.nama) }}>
                              {u.nama.charAt(0).toUpperCase()}
                            </div>
                          )
                        }

                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: "13px" }} className="font-semibold text-slate-800 truncate leading-tight">{u.nama}</p>
                          <p style={{ fontSize: "10px" }} className="text-slate-400 truncate mt-0.5">{u.email}</p>
                        </div>

                        {/* score — clean badge, no berantakan */}
                        <div className="shrink-0 flex items-center justify-center rounded-lg px-2.5 py-1"
                          style={{ background: "rgba(14,165,233,.08)", border: "1px solid rgba(14,165,233,.15)", minWidth: "48px" }}>
                          <span className="score-badge" style={{ color: "#0284c7" }}>{u.skor}</span>
                        </div>
                      </div>
                    )
                  })}

                  {topUser.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
                  )}
                </div>

                {/* legend */}
                <div className="mt-4 pt-3 flex items-center gap-1.5"
                  style={{ borderTop: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>Skor tertinggi per siswa</span>
                  <span style={{ fontSize: "10px", color: "#cbd5e1", marginLeft: "auto" }}>dari semua ujian</span>
                </div>
              </div>
            </div>

            {/* ── QUICK MENU ── */}
            <div className="fade-up d6">
              <p style={{ fontSize: "10px", letterSpacing: "3px", color: "#94a3b8" }}
                className="font-bold uppercase mb-3">Menu Cepat</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {QUICK.map((m) => (
                  <button key={m.path} onClick={() => router.push(m.path)}
                    className="qm-card bg-white rounded-2xl p-4 text-center"
                    style={{ border: "1px solid rgba(0,0,0,.06)" }}>
                    <div className="w-11 h-11 mx-auto rounded-xl flex items-center justify-center text-xl mb-2.5"
                      style={{ background: `${m.color}14`, border: `1px solid ${m.color}20` }}>
                      {m.icon}
                    </div>
                    <p style={{ fontSize: "11.5px" }} className="font-semibold text-slate-700 leading-tight">{m.title}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}
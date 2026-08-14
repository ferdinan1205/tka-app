"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts"
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Activity,
  ClipboardList,
  LogOut,
  X,
  Menu,
} from "lucide-react"

type HasilType = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  package_id?: number | null
}
type PackageType = { id: number; nama_paket: string }

const COLORS = ["#6366F1", "#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"]

const STAT_CFG = [
  { key: "total",    title: "Total Ujian", icon: "📝", from: "#6366F1", to: "#3B82F6" },
  { key: "tinggi",   title: "Tertinggi",   icon: "🏆", from: "#FBBF24", to: "#F97316" },
  { key: "terakhir", title: "Terakhir",    icon: "📈", from: "#EC4899", to: "#F43F5E" },
  { key: "rata",     title: "Rata-rata",   icon: "⭐", from: "#34D399", to: "#0D9488" },
]

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materi", label: "Materi", icon: BookOpen },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/rekap", label: "Rekap Nilai", icon: ClipboardList },
]

export default function ProgressPage() {
  const router   = useRouter()
  const pathname = usePathname()
  const [loading, setLoading]             = useState(true)
  const [nama, setNama]                   = useState("Siswa")
  const [foto, setFoto]                   = useState("")
  const [userId, setUserId]               = useState<string | null>(null)
  const [hasil, setHasil]                 = useState<HasilType[]>([])
  const [packages, setPackages]           = useState<PackageType[]>([])
  const [selectedPaket, setSelectedPaket] = useState("Semua")
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [isLive, setIsLive]               = useState(false)

  useEffect(() => { init() }, [])

  // Realtime subscription — jalan setelah userId kebaca
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`hasil-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hasil",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          getHasil(userId)
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function init() {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) { router.push("/login"); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setNama(profile?.nama || "Siswa")
      setFoto(profile?.foto || "")
      await getHasil(user.id)
      const { data: packageData } = await supabase.from("packages").select("*")
      setPackages(packageData || [])
    } catch (e) { console.log(e) }
    finally { setLoading(false) }
  }

  async function getHasil(uid: string) {
    const { data: hasilData } = await supabase
      .from("hasil")
      .select("*")
      .eq("user_id", uid)
      .order("tanggal", { ascending: true })
    setHasil(hasilData || [])
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  function getPackageName(id?: number | null) {
    if (!id) return "Tanpa Paket"
    return packages.find(x => x.id === id)?.nama_paket || "Tanpa Paket"
  }

  const filteredData = useMemo(() => {
    if (selectedPaket === "Semua") return hasil
    return hasil.filter(item => getPackageName(item.package_id) === selectedPaket)
  }, [hasil, selectedPaket, packages])

  const totalUjian     = filteredData.length
  const nilaiTertinggi = filteredData.length > 0 ? Math.max(...filteredData.map(x => x.skor)) : 0
  const nilaiTerakhir  = filteredData.length > 0 ? filteredData[filteredData.length - 1]?.skor : 0
  const rataRata       = filteredData.length > 0 ? Math.round(filteredData.reduce((a, b) => a + b.skor, 0) / filteredData.length) : 0

  const statValues: Record<string, number> = { total: totalUjian, tinggi: nilaiTertinggi, terakhir: nilaiTerakhir, rata: rataRata }

  const chartData = filteredData.map(item => ({
    tanggal: new Date(item.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    skor: item.skor,
    kategori: item.kategori,
    paket: getPackageName(item.package_id),
  }))

  const pieRaw = filteredData.reduce<Record<string, number>>((acc, item) => {
    acc[item.kategori] = (acc[item.kategori] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(pieRaw).map(([name, value]) => ({ name, value }))

  const inisial = nama
    ? nama.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg">
        <p className="text-slate-400 text-[11px] mb-1">{d.tanggal} · {d.kategori}</p>
        <p className="text-indigo-600 text-2xl font-black leading-none">{d.skor}</p>
        <p className="text-slate-400 text-[11px] mt-1">{d.paket}</p>
      </div>
    )
  }

  /* ── LOADING ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
        <p className="text-slate-500 text-xs">Memuat...</p>
      </div>
    </div>
  )

  /* ── MAIN ── */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        .dash-content { margin-left: 0; }
        @media (min-width: 1024px) {
          .dash-content { margin-left: 256px; }
        }
        .sb-hide::-webkit-scrollbar { display:none; }
        .sb-hide { -ms-overflow-style:none; scrollbar-width:none; }
        @keyframes pulse-dot {
          0%,100% { transform:scale(1); opacity:1; }
          50%     { transform:scale(1.5); opacity:0.5; }
        }
        .dot-live {
          width:6px; height:6px; border-radius:50%; display:inline-block;
          animation: pulse-dot 1.5s ease-in-out infinite; flex-shrink:0;
        }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-7px); } }
        .pg-float { animation: float 3s ease-in-out infinite; }
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical   line { stroke:#E2E8F0 !important; }
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
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-lampung-cerdas.png"
              alt="Lampung Cerdas"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div>
              <p className="text-white font-bold text-lg tracking-tight leading-tight">Lampung Cerdas</p>
              <p className="text-xs mt-0.5 text-blue-300">Portal Belajar Siswa</p>
            </div>
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
          <p className="text-sm font-bold text-slate-800 flex-1">Progress Akademik</p>
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
                      Pantau Perkembanganmu
                    </span>
                  </div>
                  <h1 className="text-xl md:text-3xl font-extrabold text-white leading-tight">
                    Lihat Seberapa Jauh{" "}
                    <span
                      style={{
                        backgroundImage: "linear-gradient(90deg, #fbfbfb, #FB923C)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "transparent",
                      }}
                    >
                      Kamu Berkembang
                    </span>{" "}
                  </h1>
                  <p className="mt-1 text-blue-300 text-xs max-w-md">
                    Pantau grafik nilai, distribusi mapel, dan riwayat ujian kamu dalam satu halaman.
                  </p>
                </div>

                {/* filter paket — desktop */}
                <div className="hidden md:block relative shrink-0">
                  <select
                    value={selectedPaket}
                    onChange={(e) => setSelectedPaket(e.target.value)}
                    className="h-11 w-56 rounded-xl pl-4 pr-9 text-sm font-bold outline-none appearance-none cursor-pointer bg-white/10 border border-white/20 text-white"
                  >
                    <option className="text-slate-900" value="Semua">Semua Paket</option>
                    {packages.map((p) => (
                      <option className="text-slate-900" key={p.id} value={p.nama_paket}>{p.nama_paket}</option>
                    ))}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-200 pointer-events-none text-xs">▾</span>
                </div>
              </div>
            </div>

            {/* filter paket — mobile */}
            <div className="md:hidden bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="dot-live" style={{ background: isLive ? "#10b981" : "#cbd5e1" }} />
                <span className="text-[11px] font-semibold text-slate-500">{totalUjian} ujian tercatat</span>
              </div>
              <div className="relative">
                <select
                  value={selectedPaket}
                  onChange={(e) => setSelectedPaket(e.target.value)}
                  className="h-9 w-32 rounded-lg pl-3 pr-7 text-xs font-bold outline-none appearance-none cursor-pointer bg-slate-50 border border-slate-200 text-slate-700"
                >
                  <option value="Semua">Semua</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.nama_paket}>{p.nama_paket}</option>
                  ))}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▾</span>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
              {STAT_CFG.map((s) => (
                <div
                  key={s.key}
                  className="relative bg-white border border-slate-200 rounded-2xl p-3.5 md:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {s.title}
                  </p>
                  <p className="text-2xl md:text-4xl font-black text-slate-900 leading-none">
                    {statValues[s.key]}
                  </p>
                  <div
                    className="absolute top-6 right-3 md:top-7 md:right-4 w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-base md:text-lg shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
                  >
                    {s.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 md:gap-5">

              {/* AREA CHART */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
                <div className="mb-3 md:mb-4">
                  <h2 className="text-base md:text-xl font-extrabold text-slate-900">Grafik Nilai</h2>
                  <p className="text-slate-400 text-[11px] md:text-xs mt-0.5">Perkembangan nilai ujian dari waktu ke waktu</p>
                </div>
                {chartData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2">
                    <div className="pg-float text-4xl">📉</div>
                    <p className="text-slate-900 font-bold text-sm">Belum Ada Data</p>
                    <p className="text-slate-400 text-xs">Kerjakan ujian agar grafik muncul</p>
                  </div>
                ) : (
                  <div className="w-full h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="tanggal" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone" dataKey="skor" stroke="#6366F1" strokeWidth={3}
                          fillOpacity={1} fill="url(#cScore)"
                          dot={{ r: 4, fill: "#6366F1", stroke: "#fff", strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: "#06B6D4", stroke: "#fff", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* PIE CHART */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
                <div className="mb-3 md:mb-4">
                  <h2 className="text-sm md:text-lg font-extrabold text-slate-900">Distribusi Mapel</h2>
                  <p className="text-slate-400 text-[11px] md:text-xs mt-0.5">Sebaran ujian per kategori</p>
                </div>
                {pieData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center">
                    <p className="text-slate-400 text-sm">Belum ada data</p>
                  </div>
                ) : (
                  <>
                    <div className="w-full h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, color: "#0F172A", fontSize: 12 }}
                            itemStyle={{ color: "#4338CA" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-3">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-slate-500 text-[11px] font-semibold truncate">{d.name}</span>
                          </div>
                          <span className="text-slate-900 text-xs font-extrabold shrink-0">{d.value}×</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* HISTORY */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-base md:text-xl font-extrabold text-slate-900">Riwayat Ujian</h2>
                  <p className="text-slate-400 text-[11px] mt-0.5">{filteredData.length} hasil ditemukan</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="dot-live" style={{ background: isLive ? "#10b981" : "#cbd5e1" }} />
                  <span className="text-slate-400 text-[11px] font-semibold">
                    {isLive ? "Live sync" : "Menghubungkan..."}
                  </span>
                </div>
              </div>

              {filteredData.length === 0 ? (
                <div className="text-center py-10">
                  <div className="pg-float text-4xl mb-3">📘</div>
                  <p className="text-slate-900 font-bold text-sm mb-1">Belum Ada Riwayat</p>
                  <p className="text-slate-400 text-xs">Kerjakan ujian untuk melihat histori nilai</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-1">
                  {filteredData.slice().reverse().map((item, i) => {
                    const scColor = item.skor >= 80 ? "#10B981" : item.skor >= 60 ? "#F59E0B" : "#EF4444"
                    const scBg    = item.skor >= 80 ? "linear-gradient(135deg,#10B981,#059669)" : item.skor >= 60 ? "linear-gradient(135deg,#F59E0B,#D97706)" : "linear-gradient(135deg,#EF4444,#DC2626)"
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-black text-sm md:text-base shrink-0"
                            style={{ background: scBg }}
                          >
                            {item.skor}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-900 font-extrabold text-[13px] md:text-sm truncate">{item.kategori}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5 truncate">{getPackageName(item.package_id)}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">
                              {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 min-w-[60px]">
                          <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden mb-1 ml-auto">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${item.skor}%`, background: "linear-gradient(90deg,#6366F1,#06B6D4)" }}
                            />
                          </div>
                          <span className="text-slate-400 text-[10px] font-bold">{item.skor}/100</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
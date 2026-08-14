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
} from "lucide-react"

/* ─────────────────────────────────────
   TYPES
───────────────────────────────────── */
type Ranking = {
  id: number
  user_id: string
  total_skor: number
  jumlah_ujian: number
  selesai: boolean
  nama: string
  email: string
  foto?: string
  paket?: string
}

type Profile = {
  id: string
  nama: string
  email: string
  foto?: string
  paket?: string
}

/* ─────────────────────────────────────
   NAV
───────────────────────────────────── */
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materi", label: "Materi", icon: BookOpen },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/rekap", label: "Rekap Nilai", icon: ClipboardList },
]

/* ─────────────────────────────────────
   HELPERS
───────────────────────────────────── */
function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

/* ─────────────────────────────────────
   AVATAR
───────────────────────────────────── */
type AvatarSize = "sm" | "md" | "lg" | "xl"

const avatarSize: Record<AvatarSize, { box: string; font: string }> = {
  sm: { box: "w-9 h-9", font: "text-xs" },
  md: { box: "w-10 h-10", font: "text-sm" },
  lg: { box: "w-16 h-16", font: "text-base" },
  xl: { box: "w-20 h-20", font: "text-xl" },
}

function Avatar({
  foto, nama, size = "md", ring = false,
}: { foto?: string; nama: string; size?: AvatarSize; ring?: boolean }) {
  const { box, font } = avatarSize[size]
  const ringCls = ring ? "ring-[3px] ring-white ring-offset-2 ring-offset-transparent" : ""

  if (foto) {
    return (
      <img
        src={foto}
        alt={nama}
        className={`${box} ${ringCls} rounded-full object-cover shrink-0`}
      />
    )
  }

  return (
    <div
      className={`
        ${box} ${font} ${ringCls}
        rounded-full shrink-0 flex items-center justify-center
        font-black bg-gradient-to-br from-indigo-500 to-purple-500 text-white
      `}
    >
      {getInitials(nama)}
    </div>
  )
}

/* ─────────────────────────────────────
   PODIUM CARD
───────────────────────────────────── */
const PODIUM_CONFIG = {
  1: {
    grad: "linear-gradient(135deg,#FCD34D,#F59E0B)",
    accent: "#F59E0B",
    soft: "#FFFBEB",
    label: "1st",
    medal: "🥇",
  },
  2: {
    grad: "linear-gradient(135deg,#E2E8F0,#94A3B8)",
    accent: "#64748B",
    soft: "#F8FAFC",
    label: "2nd",
    medal: "🥈",
  },
  3: {
    grad: "linear-gradient(135deg,#FBBF24,#B45309)",
    accent: "#B45309",
    soft: "#FFFBEB",
    label: "3rd",
    medal: "🥉",
  },
} as const

function PodiumCard({
  data,
  rank,
  isTop = false,
}: {
  data: Ranking
  rank: 1 | 2 | 3
  isTop?: boolean
}) {
  const cfg = PODIUM_CONFIG[rank]

  return (
    <div className="flex flex-col items-center gap-2">
      <style>{`
        @keyframes podiumFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        .podium-float {
          animation: podiumFloat 2.6s ease-in-out infinite;
        }
      `}</style>
      <div
        className="text-[9px] font-black tracking-[2px] uppercase px-3 py-1 rounded-full text-white shadow-sm"
        style={{ background: cfg.grad }}
      >
        {cfg.medal} {cfg.label}
      </div>

      <div
        className={`
          relative w-full max-w-[85%] mx-auto overflow-hidden rounded-2xl md:rounded-3xl
          bg-white border shadow-sm hover:shadow-md
          transition-all duration-300
          ${isTop ? "py-6 px-2 md:py-7 md:px-3 podium-float hover:[animation-play-state:paused] hover:-translate-y-2" : "py-4 px-2 md:py-5 hover:-translate-y-1"}
        `}
        style={{ borderColor: cfg.accent + "40" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: cfg.grad }}
        />

        <div className="relative flex flex-col items-center gap-2 text-center pt-1">
          <Avatar foto={data.foto} nama={data.nama} size={isTop ? "xl" : "lg"} ring />

          <div>
            <p className={`font-extrabold text-slate-900 ${isTop ? "text-sm md:text-base" : "text-xs md:text-sm"} max-w-[100px] truncate`}>
              {data.nama}
            </p>
            <p className="text-[9px] text-slate-400 max-w-[100px] truncate">
              {data.email}
            </p>
          </div>

          <p
            className={`font-black ${isTop ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"}`}
            style={{ color: cfg.accent }}
          >
            {data.total_skor.toLocaleString()}
          </p>

          <p className="text-[8px] font-bold tracking-[2px] uppercase text-slate-400">
            total skor
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   RANK ROW
───────────────────────────────────── */
const MEDAL = ["🥇", "🥈", "🥉"]

function RankRow({
  item,
  index,
  isMe,
}: {
  item: Ranking
  index: number
  isMe: boolean
}) {
  const isTop = index < 3
  const pct = Math.min((item.jumlah_ujian / 4) * 100, 100)

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-2xl
        border transition-all duration-200 bg-white shadow-sm hover:shadow-md
        ${isMe ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200"}
      `}
    >
      <div
        className={`
          w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-xl flex items-center justify-center
          font-black text-[11px]
          ${isTop ? "bg-amber-50 text-base border border-amber-200" : "bg-slate-100 text-slate-400 border border-slate-200"}
        `}
      >
        {isTop ? MEDAL[index] : `#${index + 1}`}
      </div>

      <Avatar foto={item.foto} nama={item.nama} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-slate-900 text-sm truncate">{item.nama}</p>
          {isMe && (
            <span className="shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-600 border border-indigo-200">
              Kamu
            </span>
          )}
        </div>

        <p className="hidden md:block text-[11px] text-slate-400 truncate">{item.email}</p>

        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#6366F1,#A855F7)" }}
            />
          </div>
          <p className="text-[9px] font-semibold text-slate-400">{item.jumlah_ujian}/4 ujian</p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-black text-xl md:text-2xl leading-none ${isMe ? "text-indigo-600" : "text-slate-900"}`}>
          {item.total_skor.toLocaleString()}
        </p>
        <p className="text-[8px] tracking-[2px] uppercase text-slate-400 mt-0.5">skor</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   MAIN PAGE
───────────────────────────────────── */
export default function RankingPage() {
  const router   = useRouter()
  const pathname = usePathname()
  const [ranking, setRanking]         = useState<Ranking[]>([])
  const [loading, setLoading]         = useState(true)
  const [userId, setUserId]           = useState("")
  const [nama, setNama]               = useState("")
  const [foto, setFoto]               = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    setUserId(data.user.id)
    await Promise.all([getProfile(data.user.id), getRanking()])
    setLoading(false)
  }

  async function getProfile(uid: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single()
    if (data) {
      setNama(data.nama || "")
      setFoto(data.foto || "")
    }
  }

  async function getRanking() {
    const { data: rankingData, error: rankingError } = await supabase
      .from("ranking_tka")
      .select("*")
      .eq("selesai", true)
      .order("total_skor", { ascending: false })

    if (rankingError) { console.error(rankingError); return }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")

    if (profileError) { console.error(profileError); return }

    const profiles = (profileData as Profile[]) || []

    const finalRanking = (rankingData || []).map((item: any) => {
      const p = profiles.find((x) => x.id === item.user_id)
      return {
        id:           item.id,
        user_id:      item.user_id,
        total_skor:   item.total_skor   || 0,
        jumlah_ujian: item.jumlah_ujian || 0,
        selesai:      item.selesai,
        nama:         p?.nama  || "Tanpa Nama",
        email:        p?.email || "-",
        foto:         p?.foto  || "",
        paket:        p?.paket || "-",
      }
    })

    setRanking(finalRanking)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
        <p className="text-slate-500 text-xs">Memuat...</p>
      </div>
    </div>
  )

  /* podium: urutan tampil 2 | 1 | 3 */
  const top3 = ranking.slice(0, 3)
  const podiumSlots: Array<{ data: Ranking; rank: 1 | 2 | 3; isTop?: boolean }> = []
  if (top3[1]) podiumSlots.push({ data: top3[1], rank: 2 })
  if (top3[0]) podiumSlots.push({ data: top3[0], rank: 1, isTop: true })
  if (top3[2]) podiumSlots.push({ data: top3[2], rank: 3 })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        .dash-content { margin-left: 0; }
        @media (min-width: 1024px) {
          .dash-content { margin-left: 256px; }
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
            <Avatar foto={foto} nama={nama || "Pengguna"} size="sm" />
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
          <p className="text-sm font-bold text-slate-800 flex-1">Ranking TKA</p>
          <Avatar foto={foto} nama={nama || "Pengguna"} size="sm" />
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
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-2.5 py-0.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[9px] font-bold tracking-widest text-blue-200 uppercase">
                    Papan Peringkat
                  </span>
                </div>
                <h1 className="text-xl md:text-3xl font-extrabold text-white leading-tight">
                  Ranking{" "}
                  <span
                    style={{
                      backgroundImage: "linear-gradient(90deg, #FCD34D, #FB923C)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      color: "transparent",
                    }}
                  >
                    TKA
                  </span>{" "}
                  🏆
                </h1>
                <p className="mt-1 text-blue-300 text-xs">
                  {ranking.length} peserta terdaftar · siapa yang teratas?
                </p>
              </div>
            </div>

            {/* PODIUM */}
            {podiumSlots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
                {podiumSlots.map((p) => (
                  <PodiumCard key={p.rank} data={p.data} rank={p.rank} isTop={p.isTop} />
                ))}
              </div>
            )}

            {/* DIVIDER */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[9px] font-black tracking-[3px] uppercase text-slate-400">
                Semua Peserta
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* FULL LIST */}
            {ranking.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-5xl mb-4">🏆</div>
                <h2 className="text-base md:text-lg font-extrabold text-slate-900 mb-1">
                  Belum Ada Peserta
                </h2>
                <p className="text-sm text-slate-500">Ranking akan muncul setelah ada yang menyelesaikan ujian</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ranking.map((item, index) => (
                  <RankRow
                    key={item.id}
                    item={item}
                    index={index}
                    isMe={item.user_id === userId}
                  />
                ))}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
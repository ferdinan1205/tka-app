"use client"

import { useEffect, useState, useMemo } from "react"
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
  Filter,
  Layers,
  Sparkles,
  RotateCcw,
  BookMarked,
  ChevronDown,
} from "lucide-react"

/* ─────────────────────────────────────
   TYPES
───────────────────────────────────── */
type RawHasil = {
  id: number
  user_id: string
  kategori: string
  skor: number
  paket?: string
  package_id?: number | string | null
  tanggal: string
}

type RawRankingTka = {
  id: number
  user_id: string
  total_skor: number
  jumlah_ujian: number
  selesai: boolean
  package_id?: number | string | null
}

type Profile = {
  id: string
  nama: string
  email: string
  foto?: string
  paket?: string
}

type Package = {
  id: number | string
  nama_paket: string
}

type SubtestDetail = {
  kategori: string
  skor: number
  paket?: string
  package_id?: number | string | null
  tanggal: string
}

type RankingItem = {
  id: string | number
  user_id: string
  nama: string
  email: string
  foto?: string
  paket?: string
  total_skor: number
  rata_rata: number
  jumlah_ujian: number
  subtests: SubtestDetail[]
  isFromRankingTka?: boolean
  latest_tanggal?: string
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
  return (name || "U").slice(0, 2).toUpperCase()
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
  foto,
  nama,
  size = "md",
  ring = false,
}: {
  foto?: string
  nama: string
  size?: AvatarSize
  ring?: boolean
}) {
  const { box, font } = avatarSize[size]
  const ringCls = ring ? "ring-[3px] ring-white ring-offset-2 ring-offset-transparent shadow-md" : ""

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
  scoreLabel = "total skor",
}: {
  data: RankingItem
  rank: 1 | 2 | 3
  isTop?: boolean
  scoreLabel?: string
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
        className="text-[9px] font-black tracking-[2px] uppercase px-3 py-1 rounded-full text-white shadow-sm flex items-center gap-1"
        style={{ background: cfg.grad }}
      >
        <span>{cfg.medal}</span>
        <span>{cfg.label}</span>
      </div>

      <div
        className={`
          relative w-full max-w-[95%] sm:max-w-[85%] mx-auto overflow-hidden rounded-2xl md:rounded-3xl
          bg-white border shadow-sm hover:shadow-md
          transition-all duration-300
          ${
            isTop
              ? "py-5 px-2 md:py-7 md:px-3 podium-float hover:[animation-play-state:paused] hover:-translate-y-2 ring-2 ring-amber-300/40"
              : "py-4 px-2 md:py-5 hover:-translate-y-1"
          }
        `}
        style={{ borderColor: cfg.accent + "40" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: cfg.grad }}
        />

        <div className="relative flex flex-col items-center gap-2 text-center pt-1">
          <Avatar foto={data.foto} nama={data.nama} size={isTop ? "xl" : "lg"} ring />

          <div className="w-full px-1">
            <p
              className={`font-extrabold text-slate-900 ${
                isTop ? "text-sm md:text-base" : "text-xs md:text-sm"
              } truncate`}
              title={data.nama}
            >
              {data.nama}
            </p>
            <p className="text-[9px] text-slate-400 truncate">
              {data.email}
            </p>
          </div>

          <p
            className={`font-black ${
              isTop ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"
            }`}
            style={{ color: cfg.accent }}
          >
            {data.total_skor.toLocaleString()}
          </p>

          <p className="text-[8px] font-bold tracking-[2px] uppercase text-slate-400">
            {scoreLabel}
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
  scoreLabel = "skor",
}: {
  item: RankingItem
  index: number
  isMe: boolean
  scoreLabel?: string
}) {
  const isTop = index < 3
  const pct = Math.min((item.jumlah_ujian / 4) * 100, 100)

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-2xl
        border transition-all duration-200 bg-white shadow-sm hover:shadow-md
        ${isMe ? "border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-200" : "border-slate-200"}
      `}
    >
      <div
        className={`
          w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-xl flex items-center justify-center
          font-black text-[11px]
          ${
            isTop
              ? "bg-amber-50 text-base border border-amber-200 text-amber-700"
              : "bg-slate-100 text-slate-400 border border-slate-200"
          }
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

        <p className="hidden md:block text-[11px] text-slate-400 truncate">
          {item.email}
        </p>

        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg,#6366F1,#A855F7)",
              }}
            />
          </div>
          <p className="text-[9px] font-semibold text-slate-400">
            {item.jumlah_ujian}/4 ujian
          </p>
          {item.rata_rata > 0 && !item.isFromRankingTka && (
            <span className="text-[9px] text-slate-400 hidden sm:inline">
              · Rerata: {item.rata_rata}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p
          className={`font-black text-xl md:text-2xl leading-none ${
            isMe ? "text-indigo-600" : "text-slate-900"
          }`}
        >
          {item.total_skor.toLocaleString()}
        </p>
        <p className="text-[8px] tracking-[2px] uppercase text-slate-400 mt-0.5">
          {scoreLabel}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   MAIN PAGE
───────────────────────────────────── */
export default function RankingPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [rankingTka, setRankingTka] = useState<RawRankingTka[]>([])
  const [rawHasil, setRawHasil] = useState<RawHasil[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  const [userId, setUserId] = useState("")
  const [userNama, setUserNama] = useState("")
  const [userFoto, setUserFoto] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // FILTERS (Default: semua paket & semua mata pelajaran)
  const [selectedPackage, setSelectedPackage] = useState<string>("all")
  const [selectedKategori, setSelectedKategori] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  useEffect(() => {
    init()
  }, [])

  async function init() {
    setLoading(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push("/login")
      return
    }
    setUserId(data.user.id)

    await Promise.all([getProfile(data.user.id), loadData()])
    setLoading(false)
  }

  async function getProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single()
    if (data) {
      setUserNama(data.nama || "")
      setUserFoto(data.foto || "")
    }
  }

  async function loadData() {
    try {
      const res = await fetch("/api/ranking-hasil")
      if (!res.ok) {
        throw new Error("Gagal mengambil data ranking dari server")
      }

      const data = await res.json()

      setRankingTka(data.rankingTka || [])
      setRawHasil(data.hasil || [])
      setProfiles(data.profiles || [])
      setPackages(data.packages || [])
    } catch (err) {
      console.error("Gagal memuat data ranking:", err)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  /* ─────────────────────────────────────
     DAFTAR KATEGORI & PAKET UNTUK FILTER
  ───────────────────────────────────── */
  const availableKategori = useMemo(() => {
    const set = new Set<string>()
    rawHasil.forEach((h) => {
      if (h.kategori && h.kategori.trim()) {
        set.add(h.kategori.trim())
      }
    })
    return Array.from(set).sort()
  }, [rawHasil])

  const availablePackages = useMemo(() => {
    const map = new Map<string, string>()
    // 1. Dari tabel packages
    packages.forEach((p) => {
      map.set(String(p.id), p.nama_paket)
    })
    // 2. Dari hasil jika ada paket custom
    rawHasil.forEach((h) => {
      if (h.package_id) {
        if (!map.has(String(h.package_id))) {
          map.set(String(h.package_id), h.paket || `Paket #${h.package_id}`)
        }
      } else if (h.paket) {
        if (!map.has(h.paket)) {
          map.set(h.paket, h.paket)
        }
      }
    })
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }))
  }, [packages, rawHasil])

  /* ─────────────────────────────────────
     HITUNG RANKING:
     1. DEFAULT (Semua Paket & Semua Mapel) -> Dari tabel `ranking_tka` (seperti sebelumnya)
     2. FILTER SPESIFIK -> Dihitung dinamis dari data `hasil`
  ───────────────────────────────────── */
  const computedRanking = useMemo(() => {
    const isDefaultFilter =
      selectedPackage === "all" && selectedKategori === "all"

    if (isDefaultFilter) {
      // ─── AMBIL DARI DATA RANKING SEPERTI SEBELUMNYA ───
      // Mengelompokkan berdasarkan user_id agar satu peserta hanya muncul 1 kali (ambil skor tertinggi)
      const userRankMap = new Map<string, RawRankingTka>()
      rankingTka.forEach((item) => {
        const existing = userRankMap.get(item.user_id)
        if (!existing || (item.total_skor || 0) > (existing.total_skor || 0)) {
          userRankMap.set(item.user_id, item)
        }
      })

      const list: RankingItem[] = Array.from(userRankMap.values()).map((item) => {
        const p = profiles.find((x) => x.id === item.user_id)
        return {
          id: item.id,
          user_id: item.user_id,
          total_skor: item.total_skor || 0,
          jumlah_ujian: item.jumlah_ujian || 0,
          rata_rata:
            item.jumlah_ujian > 0
              ? Math.round(((item.total_skor || 0) / item.jumlah_ujian) * 10) / 10
              : 0,
          nama: p?.nama || "Tanpa Nama",
          email: p?.email || "-",
          foto: p?.foto || "",
          paket: p?.paket || "-",
          subtests: [],
          isFromRankingTka: true,
        }
      })

      // Search filter
      const searched = list.filter((item) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
          item.nama.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q)
        )
      })

      searched.sort((a, b) => b.total_skor - a.total_skor)
      return searched
    }

    // ─── FILTER AKTIF: HITUNG DINAMIS DARI DATA HASIL ───
    const filteredHasil = rawHasil.filter((item) => {
      // Filter Paket
      if (selectedPackage !== "all") {
        const matchId =
          item.package_id !== null &&
          item.package_id !== undefined &&
          String(item.package_id) === String(selectedPackage)
        const matchName =
          item.paket && item.paket.toLowerCase() === selectedPackage.toLowerCase()
        if (!matchId && !matchName) return false
      }

      // Filter Mapel / Kategori
      if (selectedKategori !== "all") {
        if (
          !item.kategori ||
          item.kategori.toLowerCase() !== selectedKategori.toLowerCase()
        ) {
          return false
        }
      }

      return true
    })

    // Grouping per User ID & ambil skor terbaik per subtes
    const userGroup = new Map<
      string,
      {
        user_id: string
        subtesMap: Map<string, SubtestDetail>
      }
    >()

    filteredHasil.forEach((h) => {
      if (!h.user_id) return
      if (!userGroup.has(h.user_id)) {
        userGroup.set(h.user_id, {
          user_id: h.user_id,
          subtesMap: new Map(),
        })
      }

      const u = userGroup.get(h.user_id)!
      const key = `${h.package_id || "umum"}_${h.kategori}`
      const existing = u.subtesMap.get(key)

      // Ambil skor tertinggi jika ada ujian ulang
      if (!existing || (h.skor || 0) > existing.skor) {
        u.subtesMap.set(key, {
          kategori: h.kategori,
          skor: Number(h.skor) || 0,
          paket: h.paket,
          package_id: h.package_id,
          tanggal: h.tanggal,
        })
      }
    })

    const items: RankingItem[] = Array.from(userGroup.values()).map((u) => {
      const p = profiles.find((prof) => prof.id === u.user_id)
      const subtests = Array.from(u.subtesMap.values())
      const total_skor = subtests.reduce((acc, curr) => acc + curr.skor, 0)
      const jumlah_ujian = subtests.length
      const rata_rata =
        jumlah_ujian > 0 ? Math.round((total_skor / jumlah_ujian) * 10) / 10 : 0

      const latest_tanggal = subtests.reduce(
        (max, s) => (s.tanggal > max ? s.tanggal : max),
        ""
      )

      return {
        id: u.user_id,
        user_id: u.user_id,
        nama: p?.nama || "Tanpa Nama",
        email: p?.email || "-",
        foto: p?.foto || "",
        paket: p?.paket || "-",
        total_skor,
        rata_rata,
        jumlah_ujian,
        subtests,
        latest_tanggal,
        isFromRankingTka: false,
      }
    })

    // Search filter
    const searched = items.filter((item) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        item.nama.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
      )
    })

    // Urutkan berdasarkan total skor tertinggi
    searched.sort((a, b) => {
      if (b.total_skor !== a.total_skor) {
        return b.total_skor - a.total_skor
      }
      return b.jumlah_ujian - a.jumlah_ujian
    })

    return searched
  }, [
    rankingTka,
    rawHasil,
    profiles,
    selectedPackage,
    selectedKategori,
    searchQuery,
  ])

  // Podium 3 teratas
  const top3 = computedRanking.slice(0, 3)
  const podiumSlots: Array<{
    data: RankingItem
    rank: 1 | 2 | 3
    isTop?: boolean
  }> = []
  if (top3[1]) podiumSlots.push({ data: top3[1], rank: 2 })
  if (top3[0]) podiumSlots.push({ data: top3[0], rank: 1, isTop: true })
  if (top3[2]) podiumSlots.push({ data: top3[2], rank: 3 })

  const isFilterActive =
    selectedPackage !== "all" ||
    selectedKategori !== "all" ||
    searchQuery.trim().length > 0

  function resetFilters() {
    setSelectedPackage("all")
    setSelectedKategori("all")
    setSearchQuery("")
  }

  const scoreLabel =
    selectedKategori !== "all"
      ? `Skor ${selectedKategori}`
      : selectedPackage !== "all"
      ? "Total Skor Paket"
      : "total skor"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
          <p className="text-slate-500 text-xs">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        .dash-content { margin-left: 0; }
        @media (min-width: 1024px) {
          .dash-content { margin-left: 256px; }
        }
      `}</style>

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          background: "linear-gradient(180deg, #1E3A8A 0%, #172554 55%, #0B1120 100%)",
        }}
        className={`
          fixed top-0 left-0 z-50 h-screen w-64
          shadow-2xl shadow-blue-950/30
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <div className="px-6 pt-7 pb-6 flex items-center justify-between">
          <div className="flex-1 flex items-center justify-center">
            <img
              src="/logo-lampung-cerdas.png"
              alt="Lampung Cerdas"
              className="h-14 w-auto object-contain shrink-0"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-lg bg-white/10 text-blue-200 flex items-center justify-center shrink-0 hover:bg-white/20 transition"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 mb-2">
          <button
            onClick={() => router.push("/profile")}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            <Avatar foto={userFoto} nama={userNama || "Pengguna"} size="sm" />
            <div className="text-left min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {userNama || "Pengguna"}
              </p>
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
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <button
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition"
                    style={{
                      background: isActive
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                      color: isActive ? "#FFFFFF" : "#C4CCDE",
                      borderLeft: isActive
                        ? "3px solid #F59E0B"
                        : "3px solid transparent",
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
          <Avatar foto={userFoto} nama={userNama || "Pengguna"} size="sm" />
        </header>

        <main className="flex-1 w-full px-4 py-4 md:px-10 md:py-8">
          <div className="space-y-6 md:space-y-8">
            {/* HERO */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, #1E3A8A 0%, #172554 55%, #0B1120 100%)",
              }}
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
                      backgroundImage:
                        "linear-gradient(90deg, #FCD34D, #FB923C)",
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
                  {isFilterActive
                    ? `${computedRanking.length} peserta sesuai filter · ${scoreLabel}`
                    : `${computedRanking.length} peserta terdaftar · siapa yang teratas?`}
                </p>
              </div>
            </div>

            {/* FILTER & SEARCH PANEL */}
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Filter size={14} />
                  </div>
                  <div>
                    <h2 className="text-xs md:text-sm font-bold text-slate-800">
                      Filter Ranking
                    </h2>
                    <p className="text-[10px] md:text-[11px] text-slate-400">
                      Pilih paket atau mata pelajaran untuk melihat ranking spesifik dari data hasil
                    </p>
                  </div>
                </div>

                {isFilterActive && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                  >
                    <RotateCcw size={11} />
                    Reset Filter
                  </button>
                )}
              </div>

              {/* CONTROLS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* FILTER PAKET */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={12} className="text-indigo-500" />
                    Paket Ujian
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs font-medium rounded-xl px-3 py-2 pr-8 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="all">Semua Paket (Data Ranking Resmi)</option>
                      {availablePackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.nama}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* FILTER MATA PELAJARAN / KATEGORI */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BookMarked size={12} className="text-amber-500" />
                    Mata Pelajaran
                  </label>
                  <div className="relative">
                    <select
                      value={selectedKategori}
                      onChange={(e) => setSelectedKategori(e.target.value)}
                      className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs font-medium rounded-xl px-3 py-2 pr-8 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="all">Semua Mata Pelajaran</option>
                      {availableKategori.map((kat) => (
                        <option key={kat} value={kat}>
                          {kat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* SEARCH */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={12} className="text-blue-500" />
                    Cari Siswa
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari nama atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs rounded-xl pl-8 pr-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTIVE FILTER BADGES */}
              {isFilterActive && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Filter aktif:
                  </span>
                  {selectedPackage !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-medium">
                      Paket:{" "}
                      {availablePackages.find((p) => p.id === selectedPackage)
                        ?.nama || selectedPackage}
                      <button
                        onClick={() => setSelectedPackage("all")}
                        className="hover:text-indigo-950 ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  {selectedKategori !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                      Mapel: {selectedKategori}
                      <button
                        onClick={() => setSelectedKategori("all")}
                        className="hover:text-amber-950 ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium">
                      Cari: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery("")}
                        className="hover:text-slate-900 ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* PODIUM */}
            {podiumSlots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
                {podiumSlots.map((p) => (
                  <PodiumCard
                    key={p.data.user_id}
                    data={p.data}
                    rank={p.rank}
                    isTop={p.isTop}
                    scoreLabel={scoreLabel}
                  />
                ))}
              </div>
            )}

            {/* DIVIDER */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[9px] font-black tracking-[3px] uppercase text-slate-400">
                {isFilterActive ? "Hasil Filter" : "Semua Peserta"}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* FULL LIST */}
            {computedRanking.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-5xl mb-4">🏆</div>
                <h2 className="text-base md:text-lg font-extrabold text-slate-900 mb-1">
                  Belum Ada Peserta
                </h2>
                <p className="text-sm text-slate-500">
                  {isFilterActive
                    ? "Tidak ada data peserta yang cocok dengan filter yang dipilih."
                    : "Ranking akan muncul setelah ada yang menyelesaikan ujian."}
                </p>
                {isFilterActive && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {computedRanking.map((item, index) => (
                  <RankRow
                    key={`${item.user_id}_${item.id}`}
                    item={item}
                    index={index}
                    isMe={item.user_id === userId}
                    scoreLabel={scoreLabel}
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
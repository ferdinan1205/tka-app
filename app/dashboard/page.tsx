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
  UserRound,
  X,
  Menu,
} from "lucide-react"

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
  image_url?: string
}

type Kelas = {
  id: number
  nama_kelas: string
  deskripsi?: string
  image_url?: string
  jumlah_paket: number
  unlocked: boolean
}

function formatNamaPaket(nama: string): string {
  const n = nama.toLowerCase().trim()

  const match = n.match(
    /^paket\s+(ipa|ips|smk|bahasa)(?:\s+(\d+))?$/
  )

  if (!match) return nama

  const jurusan =
    match[1].charAt(0).toUpperCase() +
    match[1].slice(1)

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
  groupKey: string
  groupLabel: string
}

function getPaketTheme(nama: string): PaketTheme {
  const n = nama.toLowerCase()

  if (n.includes("ipa")) return {
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    icon:  "🔬",
    tag:   "Sains",
    desc:  "Kimia · Fisika · Biologi",
    img:   "https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?q=80&w=600&auto=format&fit=crop",
    accent: "#10B981",
    soft:   "#ECFDF5",
    groupKey: "ipa",
    groupLabel: "IPA",
  }

  if (n.includes("ips")) return {
    badge: "bg-orange-50 text-orange-600 border-orange-200",
    icon:  "📰",
    tag:   "Sosial",
    desc:  "Ekonomi · Geografi · Sosiologi",
    img:   "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop",
    accent: "#F97316",
    soft:   "#FFF7ED",
    groupKey: "ips",
    groupLabel: "IPS",
  }

  if (n.includes("smk")) return {
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    icon:  "🏫",
    tag:   "Kejuruan",
    desc:  "PPKN · PKK",
    img:   "https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=600&auto=format&fit=crop",
    accent: "#3B82F6",
    soft:   "#EFF6FF",
    groupKey: "smk",
    groupLabel: "SMK",
  }

  if (n.includes("bahasa")) return {
    badge: "bg-purple-50 text-purple-600 border-purple-200",
    icon:  "✏️",
    tag:   "Bahasa",
    desc:  "Jerman · Jepang · Arab",
    img:   "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop",
    accent: "#A855F7",
    soft:   "#FAF5FF",
    groupKey: "bahasa",
    groupLabel: "Bahasa",
  }

  return {
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon:  "🎓",
    tag:   "Umum",
    desc:  "Mata Pelajaran Umum",
    img:   "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=600&auto=format&fit=crop",
    accent: "#64748B",
    soft:   "#F8FAFC",
    groupKey: "lainnya",
    groupLabel: "Lainnya",
  }
}

const GROUP_ORDER = ["ipa", "ips", "smk", "bahasa", "lainnya"]

type PaketGroup = {
  key: string
  label: string
  accent: string
  icon: string
  items: Paket[]
}

function buildPaketGroups(list: Paket[]): PaketGroup[] {
  const groups: Record<string, PaketGroup> = {}

  for (const item of list) {
    const theme = getPaketTheme(item.nama_paket)
    if (!groups[theme.groupKey]) {
      groups[theme.groupKey] = {
        key: theme.groupKey,
        label: theme.groupLabel,
        accent: theme.accent,
        icon: theme.icon,
        items: [],
      }
    }
    groups[theme.groupKey].items.push(item)
  }

  Object.values(groups).forEach((g) => {
    g.items.sort((a, b) => {
      const numA = parseInt(a.nama_paket.match(/\d+/)?.[0] || "1")
      const numB = parseInt(b.nama_paket.match(/\d+/)?.[0] || "1")
      return numA - numB
    })
  })

  return GROUP_ORDER.filter((k) => groups[k]).map((k) => groups[k])
}

const KELAS_ICONS = ["📦", "🎯", "🧭", "🗂️", "🚀", "🧩"]

type KelasTheme = {
  accent: string
  soft: string
  from: string
  to: string
}

const KELAS_THEMES: KelasTheme[] = [
  { accent: "#6366F1", soft: "#EEF2FF", from: "#6366F1", to: "#8B5CF6" },
  { accent: "#0EA5E9", soft: "#F0F9FF", from: "#38BDF8", to: "#6366F1" },
  { accent: "#EC4899", soft: "#FDF2F8", from: "#F472B6", to: "#A855F7" },
  { accent: "#10B981", soft: "#ECFDF5", from: "#34D399", to: "#0EA5E9" },
  { accent: "#F59E0B", soft: "#FFFBEB", from: "#FBBF24", to: "#F472B6" },
  { accent: "#8B5CF6", soft: "#F5F3FF", from: "#A78BFA", to: "#6366F1" },
]

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materi", label: "Materi", icon: BookOpen },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/rekap", label: "Rekap Nilai", icon: ClipboardList },
]

export default function Dashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const [hasil, setHasil]             = useState<Hasil[]>([])
  const [nama, setNama]               = useState("")
  const [foto, setFoto]               = useState("")
  const [paketList, setPaketList]     = useState<Paket[]>([])
  const [kelasList, setKelasList]     = useState<Kelas[]>([])
  const [loading, setLoading]         = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    await Promise.all([
      getProfile(data.user.id),
      getHasil(data.user.id),
      getPaket(),
      getKelas(data.user.id),
    ])
    setLoading(false)
  }

  async function getProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (data) {
      setNama(data.nama || "")
      setFoto(data.foto || "")
    }
  }

  async function getHasil(userId: string) {
    const { data } = await supabase.from("hasil").select("*").eq("user_id", userId)
    setHasil((data as Hasil[]) || [])
  }

  async function getPaket() {
    const { data } = await supabase.from("packages").select("*").order("id", { ascending: true })
    setPaketList((data as Paket[]) || [])
  }

  async function getKelas(userId: string) {
    const [{ data: kelasData }, { data: relasiData }, { data: aksesData }] = await Promise.all([
      supabase.from("kelas").select("id, nama_kelas, deskripsi, image_url").order("created_at", { ascending: false }),
      supabase.from("kelas_paket").select("kelas_id, package_id"),
      supabase.from("akses_kelas").select("kelas_id").eq("user_id", userId),
    ])

    const unlockedIds = new Set((aksesData || []).map((a: any) => a.kelas_id))

    const merged: Kelas[] = (kelasData || []).map((k: any) => {
      const jumlah_paket = (relasiData || []).filter((r: any) => r.kelas_id === k.id).length
      return {
        id: k.id,
        nama_kelas: k.nama_kelas,
        deskripsi: k.deskripsi,
        image_url: k.image_url,
        jumlah_paket,
        unlocked: unlockedIds.has(k.id),
      }
    })

    setKelasList(merged)
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

  const inisial = nama
    ? nama.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U"
  const paketGroups = buildPaketGroups(paketList)
  const totalUnlockedKelas = kelasList.filter((k) => k.unlocked).length

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        .dash-content { margin-left: 0; }
        @media (min-width: 1024px) {
          .dash-content { margin-left: 256px; }
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        /* ===== Kelas Saya: grid rapi di SEMUA ukuran layar (mobile juga) ===== */
        .kelas-scroll {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .kelas-card {
          width: auto;
          max-width: none;
        }
        @media (min-width: 640px) {
          .kelas-scroll {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
          }
        }
        @media (min-width: 1024px) {
          .kelas-scroll { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 1280px) {
          .kelas-scroll { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }

        /* ===== Paket Belajar (per grup): grid rapi di SEMUA ukuran layar (mobile juga) ===== */
        .paket-scroll {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
        }
        .paket-card {
          width: auto;
          max-width: none;
        }
        @media (min-width: 480px) {
          .paket-scroll { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 640px) {
          .paket-scroll {
            grid-template-columns: repeat(auto-fill, minmax(220px, 280px));
            gap: 0.5rem;
          }
        }
      `}</style>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR — gaya sama seperti portal guru, warna biru gelap */}
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

      {/* CONTENT — tema terang */}
      <div className="dash-content flex flex-col min-h-screen bg-slate-50">

        {/* TOPBAR MOBILE */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <Menu size={16} />
          </button>
          <p className="text-sm font-bold text-slate-800 flex-1">Lampung Cerdas</p>
          {foto ? (
            <img src={foto} alt={nama} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
              {inisial}
            </div>
          )}
        </header>

        <main className="flex-1 w-full px-4 py-4 md:px-10 md:py-8">
          <div
            style={{ width: "100%" }}
            className="space-y-6 md:space-y-9"
          >

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
                  Selamat Datang
                </span>
              </div>
              <h1 className="text-xl md:text-3xl font-extrabold text-white leading-tight">
                Halo,{" "}
                <span
                  style={{
                    backgroundImage: "linear-gradient(90deg, #FCD34D, #FB923C)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }}
                >
                  {nama.split(" ")[0] || "Sahabat Belajar"}
                </span>
                ! 👋
              </h1>
              <p className="mt-1 text-blue-300 text-xs">Siap belajar hari ini? 🚀</p>
            </div>
          </div>

          {/* KELAS SECTION — VALUE: PAKET LENGKAP DALAM SATU AKSES */}
          {kelasList.length > 0 && (
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 mb-1.5">
                    <span className="text-[9px]">🎁</span>
                    <span className="text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
                      Paket Bundling
                    </span>
                  </div>
                  <h2 className="text-sm md:text-base font-extrabold text-slate-900">Kelas Saya</h2>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    Satu akses, semua paket di dalamnya langsung terbuka
                  </p>
                </div>
                {totalUnlockedKelas > 0 && (
                  <div className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                    {totalUnlockedKelas} terbuka
                  </div>
                )}
              </div>

              {/*
                Grid rapi di semua ukuran layar: 2 kolom di HP, makin lebar makin banyak kolom.
              */}
              <div className="kelas-scroll">
                {kelasList.map((k) => {
                  const kt = KELAS_THEMES[k.id % KELAS_THEMES.length]
                  const iconChar = KELAS_ICONS[k.id % KELAS_ICONS.length]
                  return (
                    <button
                      key={k.id}
                      onClick={() => router.push(`/kelas/${k.id}`)}
                      className="kelas-card group relative overflow-hidden rounded-xl md:rounded-2xl border border-slate-200 bg-white transition-all duration-300 active:scale-[0.97] hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 10px 24px -10px ${kt.accent}40`
                        e.currentTarget.style.borderColor = kt.accent + "60"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = ""
                        e.currentTarget.style.borderColor = ""
                      }}
                    >
                      {/* Banner */}
                      <div
                        className="relative w-full flex items-center justify-center overflow-hidden"
                        style={{
                          aspectRatio: "4/3",
                          background: k.image_url ? "#0B1120" : `linear-gradient(135deg, ${kt.from}, ${kt.to})`,
                        }}
                      >
                        {k.image_url ? (
                          <img
                            src={k.image_url}
                            alt={k.nama_kelas}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <>
                            <div
                              className="absolute inset-0 opacity-[0.15]"
                              style={{
                                backgroundImage:
                                  "radial-gradient(circle, #fff 1.5px, transparent 1.5px)",
                                backgroundSize: "14px 14px",
                              }}
                            />
                            <span className="relative text-5xl md:text-6xl drop-shadow-sm">{iconChar}</span>
                          </>
                        )}

                        {k.image_url && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                        )}

                        {/* status badge */}
                        <div
                          className={`absolute top-2 right-2 md:top-2.5 md:right-2.5 w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center text-xs backdrop-blur-sm ${
                            k.unlocked ? "bg-white/95 text-emerald-600" : "bg-white/30 text-white"
                          }`}
                        >
                          {k.unlocked ? "✓" : "🔒"}
                        </div>

                        {/* count badge */}
                        <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md bg-black/30 text-white backdrop-blur-sm">
                          {k.jumlah_paket} paket
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3 md:p-3.5 text-center">
                        <p className="text-slate-900 font-extrabold text-sm md:text-base leading-tight truncate">
                          {k.nama_kelas}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs mt-0.5">
                          Akses penuh sekali masuk
                        </p>
                        <div
                          className="mt-2 w-full py-1.5 md:py-2 rounded-lg text-center text-[10px] md:text-xs font-bold text-white transition-all duration-200 group-hover:brightness-110"
                          style={{ background: k.unlocked ? "#059669" : kt.accent }}
                        >
                          {k.unlocked ? "Buka →" : "Masuk →"}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* PAKET SECTION — VALUE: FLEKSIBEL, PILIH SESUAI KEBUTUHAN */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 mb-1.5">
                  <span className="text-[9px]">🎯</span>
                  <span className="text-[9px] font-bold tracking-wider text-indigo-600 uppercase">
                    Fleksibel Per Paket
                  </span>
                </div>
                <h2 className="text-sm md:text-base font-extrabold text-slate-900">Paket Belajar</h2>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  {paketList.length} paket tersedia · pilih langsung sesuai kebutuhanmu ✨
                </p>
              </div>
            </div>

            {paketList.length === 0 ? (
              <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-slate-500 text-sm">Belum ada paket tersedia</p>
              </div>
            ) : (
              <div className="space-y-5">
                {paketGroups.map((group) => (
                  <div key={group.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0"
                        style={{ background: group.accent + "1A", border: `1px solid ${group.accent}40` }}
                      >
                        {group.icon}
                      </div>
                      <p className="text-[10.5px] font-bold tracking-wide" style={{ color: group.accent }}>
                        {group.label}
                      </p>
                      <div className="flex-1 h-px bg-slate-200" />
                      <p className="text-[9px] text-slate-400 font-medium">{group.items.length} paket</p>
                    </div>

                    {/*
                      Grid rapi di semua ukuran layar: 2 kolom di HP kecil, 3 kolom di HP lebar,
                      lalu grid auto-fill di tablet/desktop.
                    */}
                    <div className="paket-scroll">
                      {group.items.map((item) => {
                        const theme     = getPaketTheme(item.nama_paket)
                        const labelNama = formatNamaPaket(item.nama_paket)
                        return (
                          <button
                            key={item.id}
                            onClick={() => router.push(`/ujian/package/${item.id}`)}
                            className="paket-card group relative overflow-hidden rounded-xl md:rounded-2xl text-left border border-slate-200 bg-white transition-all duration-300 active:scale-[0.97] hover:-translate-y-0.5 shadow-sm hover:shadow-md flex flex-col"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = `0 10px 24px -10px ${theme.accent}40`
                              e.currentTarget.style.borderColor = theme.accent + "60"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = ""
                              e.currentTarget.style.borderColor = ""
                            }}
                          >
                            {/* Gambar */}
                            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3", background: theme.soft }}>
                              <img
                                src={item.image_url || theme.img}
                                alt={labelNama}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                              {/* Icon */}
                              <div
                                className="absolute top-1 left-1 md:top-1.5 md:left-1.5 w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center text-xs backdrop-blur-sm bg-white/90 border border-slate-200 shadow-sm"
                              >
                                {theme.icon}
                              </div>

                              {/* Tag */}
                              <div
                                className={`absolute top-1 right-1 md:top-1.5 md:right-1.5 text-[7px] md:text-[8px] font-bold px-1 py-0.5 rounded-md border backdrop-blur-sm bg-white/90 ${theme.badge}`}
                              >
                                {theme.tag}
                              </div>
                            </div>

                            {/* Info */}
                            <div className="px-1.5 pt-1 pb-1.5 md:px-2 md:pt-1.5 md:pb-2 flex flex-col flex-1 text-center">
                              <p className="text-slate-900 font-extrabold text-[9px] md:text-[10px] leading-tight truncate">
                                {labelNama}
                              </p>
                              <p className="text-slate-500 text-[7px] md:text-[8px] mt-0.5 truncate leading-tight">
                                {theme.desc}
                              </p>

                              <div className="flex-1 min-h-[2px]" />

                              {/* CTA */}
                              <div
                                className="mt-1 w-full py-0.5 md:py-1 rounded-md text-center text-[7px] md:text-[8px] font-bold text-white transition-all duration-200 group-hover:brightness-110"
                                style={{ background: theme.accent }}
                              >
                                Masuk →
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIWAYAT */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm md:text-base font-extrabold text-slate-900">Riwayat Ujian</h2>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  {Math.min(hasil.length, 3)} ujian terakhir
                </p>
              </div>
              {hasil.length > 0 && (
                <button
                  onClick={() => router.push("/rekap")}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold transition"
                >
                  Lihat semua →
                </button>
              )}
            </div>

            {hasil.length > 0 ? (
              <div className="space-y-2">
                {hasil.slice(-3).reverse().map((h) => {
                  const sc  = h.skor >= 70 ? "#059669" : h.skor >= 50 ? "#EA580C" : "#DC2626"
                  const sbg = h.skor >= 70
                    ? "bg-emerald-50 border-emerald-200"
                    : h.skor >= 50
                    ? "bg-orange-50 border-orange-200"
                    : "bg-red-50 border-red-200"
                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-200 hover:shadow-sm transition shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-sm shrink-0">
                        📝
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {h.kategori || "Ujian Umum"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(h.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className={`shrink-0 px-2.5 py-1.5 rounded-lg border ${sbg} text-center`}>
                        <p className="text-sm font-extrabold leading-none" style={{ color: sc }}>
                          {h.skor}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">poin</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-slate-900 font-bold text-sm">Belum ada riwayat ujian</p>
                <p className="text-slate-500 text-xs mt-1">Pilih paket di atas dan mulai!</p>
              </div>
            )}
          </div>

          </div>
        </main>
      </div>
    </div>
  )
}
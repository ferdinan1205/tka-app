"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import {
  LayoutDashboard,
  FileQuestion,
  BookOpen,
  Package,
  Layers,
  UserRound,
  Bell,
  ArrowUpRight,
  Calculator,
  BookText,
  Languages,
  Atom,
  FlaskConical,
  Leaf,
  LineChart,
  Globe2,
  Users,
  Landmark,
  ScrollText,
  Layers3,
  Sparkles,
  Clock,
  Plus,
  CircleCheckBig,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  PackageCheck,
  LogOut,
} from "lucide-react"

const palette = {
  navy: "#1B2A4A",
  navySoft: "#2C3F63",
  paper: "#F5F3EC",
  card: "#FFFFFF",
  border: "#E7E2D4",
  ink: "#242A38",
  inkSoft: "#6B7080",
  inkFaint: "#98A0B2",
  amber: "#D98C2B",
  amberSoft: "#FBEBD6",
  amberText: "#8A5412",
  teal: "#2F7A6D",
  tealSoft: "#E1F0EC",
  tealText: "#1F5548",
  danger: "#B3432E",
  dangerSoft: "#FBE7E2",
}

const navItems = [
  { href: "/guru", label: "Dashboard", icon: LayoutDashboard },
  { href: "/guru/soal", label: "Kelola Soal", icon: FileQuestion },
  { href: "/guru/materi", label: "Materi Pelajaran", icon: BookOpen },
  { href: "/guru/paket", label: "Paket Soal", icon: Package },
  { href: "/guru/kelas", label: "Kelas", icon: Layers },
  
]

// Warna + ikon per mata pelajaran biar dashboard-nya kebaca sekilas
const SUBJECT_STYLES: Record<string, { color: string; bg: string; icon: any }> = {
  "Matematika":        { color: "#B4600F", bg: "#FAEEDA", icon: Calculator },
  "Bahasa Indonesia":  { color: "#A32D2D", bg: "#FCEBEB", icon: BookText },
  "Bahasa Inggris":    { color: "#185FA5", bg: "#E6F1FB", icon: Languages },
  "Fisika":            { color: "#534AB7", bg: "#EEEDFE", icon: Atom },
  "Kimia":             { color: "#993C1D", bg: "#FAECE7", icon: FlaskConical },
  "Biologi":           { color: "#3B6D11", bg: "#EAF3DE", icon: Leaf },
  "Ekonomi":           { color: "#0F6E56", bg: "#E1F5EE", icon: LineChart },
  "Geografi":          { color: "#1F5548", bg: "#E1F0EC", icon: Globe2 },
  "Sosiologi":         { color: "#72243E", bg: "#FBEAF0", icon: Users },
  "Sejarah":           { color: "#633806", bg: "#FAEEDA", icon: Landmark },
  "PPKN":              { color: "#3C3489", bg: "#EEEDFE", icon: ScrollText },
}
const DEFAULT_STYLE = { color: "#5F5E5A", bg: "#F1EFE8", icon: FileQuestion }

function subjectStyle(name: string) {
  return SUBJECT_STYLES[name] || DEFAULT_STYLE
}

// Warna badge kecil untuk paket (dipakai juga di halaman Kelola Soal)
function paketBadgeStyle(nama: string) {
  const n = nama.toLowerCase()
  if (n.includes("ipa")) return { bg: "#EAF3DE", color: "#27500A" }
  if (n.includes("ips")) return { bg: palette.amberSoft, color: palette.amberText }
  if (n.includes("smk")) return { bg: "#FAECE7", color: "#712B13" }
  if (n.includes("bahasa")) return { bg: "#FBEAF0", color: "#72243E" }
  return { bg: palette.tealSoft, color: palette.tealText }
}

type SoalRow = {
  id: number
  kategori: string
  subject?: string | null
  pertanyaan: string
  created_at?: string
  is_active?: boolean | null
  gambar?: string | null
  video_url?: string | null
  pembahasan?: string | null
  paket?: string | null
}

function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim()
}

// Cek apakah sebuah field teks/HTML punya isi nyata (bukan cuma tag kosong)
function hasContent(value?: string | null) {
  if (!value) return false
  return stripHtml(value).trim().length > 0
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return ""
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "Baru saja"
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Kemarin"
  if (days < 7) return `${days} hari lalu`
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "GR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function StatCard({
  label, value, sublabel, icon: Icon, dark = false,
}: { label: string; value: number | string; sublabel: string; icon: any; dark?: boolean }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: dark ? palette.navy : palette.card,
        border: dark ? "none" : `1px solid ${palette.border}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: dark ? "rgba(255,255,255,0.1)" : palette.amberSoft }}
      >
        <Icon size={17} style={{ color: dark ? "#F0C98A" : palette.amberText }} />
      </div>
      <p className="text-sm" style={{ color: dark ? "#AEB8CC" : palette.inkSoft }}>{label}</p>
      <h2 className="text-3xl font-bold mt-1" style={{ color: dark ? "#FFFFFF" : palette.ink }}>{value}</h2>
      <p className="text-xs mt-1.5" style={{ color: dark ? "#8C9AB8" : palette.inkFaint }}>{sublabel}</p>
    </div>
  )
}

// Baris progress untuk kartu "Kelengkapan Konten" — sekarang bisa diklik,
// dan punya dua sub-link kecil ("Lihat yang sudah" / "Lihat yang belum")
// yang mengarah ke Kelola Soal dengan filter otomatis lewat query param.
function CompletionRow({
  icon: Icon, label, count, total, color, bg, filterKey,
}: {
  icon: any
  label: string
  count: number
  total: number
  color: string
  bg: string
  filterKey: "pembahasan" | "gambar" | "video"
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const belum = total - count

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold" style={{ color: palette.ink }}>{label}</p>
            <span className="text-xs font-bold shrink-0 ml-2" style={{ color: palette.inkSoft }}>
              {count}/{total} &middot; {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full w-full overflow-hidden" style={{ background: palette.paper }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1.5 pl-12">
        <Link
          href={`/guru/soal/kelengkapan?kelengkapan=${filterKey}&status=ada`}
          className="text-[11px] font-semibold hover:underline"
          style={{ color: palette.tealText }}
        >
          Lihat yang sudah ({count})
        </Link>
        {belum > 0 && (
          <>
            <span className="text-[11px]" style={{ color: palette.inkFaint }}>&middot;</span>
            <Link
              href={`/guru/soal/kelengkapan?kelengkapan=${filterKey}&status=belum`}
              className="text-[11px] font-semibold hover:underline"
              style={{ color: palette.danger }}
            >
              Lihat yang belum ({belum})
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function GuruDashboardPage() {
  const pathname = usePathname()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [namaGuru, setNamaGuru] = useState("Guru")
  const [foto, setFoto] = useState("")

  const [soal, setSoal] = useState<SoalRow[]>([])
  const [packagesCount, setPackagesCount] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [soalIdsDenganPaket, setSoalIdsDenganPaket] = useState<Set<number>>(new Set())

  const [showNotif, setShowNotif] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  async function checkAccessAndLoad() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push("/login")
      return
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (!profile || (profile.role !== "guru" && profile.role !== "admin")) {
      alert("Akses ditolak!")
      router.push("/dashboard")
      return
    }

    setNamaGuru(profile.nama_lengkap || profile.full_name || profile.nama || "Guru")
setFoto(profile.foto || profile.avatar_url || "")
setChecking(false)
loadData()
  }

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar?")) return
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function loadData() {
    setLoadingData(true)
    const [{ data: soalData }, { count: pkgCount }, { data: relasiData }] = await Promise.all([
      supabase
        .from("soal")
        .select("id, kategori, subject, pertanyaan, created_at, is_active, gambar, video_url, pembahasan, paket")
        .order("id", { ascending: false }),
      supabase.from("packages").select("id", { count: "exact", head: true }),
      supabase.from("package_soal").select("soal_id"),
    ])
    setSoal((soalData || []) as SoalRow[])
    setPackagesCount(pkgCount || 0)
    setSoalIdsDenganPaket(new Set((relasiData || []).map((r: any) => r.soal_id as number)))
    setLoadingData(false)
  }

  const totalSoal = soal.length
  const kategoriUnik = useMemo(() => Array.from(new Set(soal.map((s) => s.kategori))), [soal])

  const soalHariIni = useMemo(() => {
    const today = new Date().toDateString()
    return soal.filter((s) => s.created_at && new Date(s.created_at).toDateString() === today).length
  }, [soal])

  // --- Metrik baru dari kolom is_active, pembahasan, gambar, video_url ---
  const soalAktif = useMemo(() => soal.filter((s) => s.is_active).length, [soal])
  const soalNonaktif = totalSoal - soalAktif

  const adaPembahasan = useMemo(() => soal.filter((s) => hasContent(s.pembahasan)).length, [soal])
  const adaGambar = useMemo(() => soal.filter((s) => hasContent(s.gambar)).length, [soal])
  const adaVideo = useMemo(() => soal.filter((s) => hasContent(s.video_url)).length, [soal])
  const belumPembahasan = totalSoal - adaPembahasan

  // --- Distribusi paket dari kolom legacy `paket` di tabel soal ---
  const distribusiPaket = useMemo(() => {
    const map: Record<string, number> = {}
    soal.forEach((s) => {
      const key = (s.paket || "").trim()
      if (!key) return
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [soal])
  const tanpaPaket = useMemo(
    () => soal.filter((s) => !soalIdsDenganPaket.has(s.id) && !(s.paket || "").trim()).length,
    [soal, soalIdsDenganPaket]
  )

  // --- Ringkasan untuk dropdown notifikasi ---
  const notifDraft = soalNonaktif
  const notifTanpaPaket = tanpaPaket

  const perMapel = useMemo(() => {
    const map: Record<string, number> = {}
    soal.forEach((s) => {
      map[s.kategori] = (map[s.kategori] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [soal])

  const maxCount = Math.max(1, ...perMapel.map(([, c]) => c))
  const recent = soal.slice(0, 6)

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: palette.paper }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-9 h-9 border-2 rounded-full animate-spin"
            style={{ borderColor: palette.border, borderTopColor: palette.amber }}
          />
          <p className="text-sm" style={{ color: palette.inkSoft }}>Memeriksa akses...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-screen w-full flex overflow-hidden"
      style={{ background: palette.paper, fontFamily: "Inter, ui-sans-serif, system-ui" }}
    >
      {/* SIDEBAR — fixed, tidak ikut scroll konten tengah */}
      <aside className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto" style={{ width: "260px", background: palette.navy }}>
     <div className="px-6 pt-7 pb-6 flex items-center justify-center">
  <img src="/logo-lampung-cerdas.png" alt="Logo" className="h-14 w-auto" />
</div>

        <nav className="px-3 mt-2 flex-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#7C88A6" }}>
            Menu Utama
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.href === "/guru" ? pathname === "/guru" : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition"
                    style={{
                      background: isActive ? palette.navySoft : "transparent",
                      color: isActive ? "#FFFFFF" : "#C4CCDE",
                      borderLeft: isActive ? `3px solid ${palette.amber}` : "3px solid transparent",
                    }}
                  >
                    <Icon size={17} strokeWidth={2} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="px-3 pb-5 mt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition"
            style={{ color: "#C4CCDE", borderLeft: "3px solid transparent" }}
          >
            <LogOut size={17} strokeWidth={2} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* MAIN — kolom kanan scroll sendiri, topbar tetap diam di atas */}
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <div
          className="shrink-0 flex items-center justify-between px-6 md:px-10 py-4"
          style={{ background: palette.card, borderBottom: `1px solid ${palette.border}` }}
        >
          <div>
            <h1 className="text-xl font-bold" style={{ color: palette.ink }}>Dashboard</h1>
            <p className="text-sm" style={{ color: palette.inkSoft }}>Selamat datang kembali, {namaGuru}.</p>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            {/* NOTIFIKASI */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowNotif((v) => !v); setShowProfileMenu(false) }}
                className="relative p-2 rounded-lg"
                style={{ border: `1px solid ${palette.border}` }}
              >
                <Bell size={17} style={{ color: palette.inkSoft }} />
                {(notifDraft > 0 || notifTanpaPaket > 0) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: palette.amber }} />
                )}
              </button>
              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                  <div
                    className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50"
                    style={{ background: palette.card, border: `1px solid ${palette.border}`, boxShadow: "0 12px 32px rgba(27,42,74,0.16)" }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${palette.border}` }}>
                      <p className="text-sm font-bold" style={{ color: palette.ink }}>Notifikasi</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifDraft === 0 && notifTanpaPaket === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs" style={{ color: palette.inkSoft }}>Semua rapi, tidak ada yang perlu ditindaklanjuti 🎉</p>
                        </div>
                      ) : (
                        <div className="py-1">
                          {notifDraft > 0 && (
                            <Link
                              href="/guru/soal?status=nonaktif"
                              onClick={() => setShowNotif(false)}
                              className="flex items-start gap-3 px-4 py-3 transition"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F1EFE8" }}>
                                <AlertTriangle size={14} style={{ color: "#8A7A4E" }} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold" style={{ color: palette.ink }}>{notifDraft} soal berstatus draft</p>
                                <p className="text-[11px] mt-0.5" style={{ color: palette.inkFaint }}>Belum aktif, cek dan simpan ulang</p>
                              </div>
                            </Link>
                          )}
                          {notifTanpaPaket > 0 && (
                            <Link
                              href="/guru/soal?paket=belum"
                              onClick={() => setShowNotif(false)}
                              className="flex items-start gap-3 px-4 py-3 transition"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: palette.dangerSoft }}>
                                <PackageCheck size={14} style={{ color: palette.danger }} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold" style={{ color: palette.ink }}>{notifTanpaPaket} soal belum ada paket</p>
                                <p className="text-[11px] mt-0.5" style={{ color: palette.inkFaint }}>Assign ke paket biar bisa dipakai tryout</p>
                              </div>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* PROFIL */}
            <div className="relative">
              <button
  type="button"
  onClick={() => { setShowProfileMenu((v) => !v); setShowNotif(false) }}
  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
  style={{ background: palette.tealSoft, color: palette.tealText }}
>
  {foto ? <img src={foto} alt="avatar" className="w-full h-full object-cover" /> : initials(namaGuru)}
</button>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
             <div
  className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden z-50"
  style={{ background: palette.card, border: `1px solid ${palette.border}`, boxShadow: "0 12px 32px rgba(27,42,74,0.16)" }}
>
  <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${palette.border}` }}>
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden" style={{ background: palette.tealSoft, color: palette.tealText }}>
      {foto ? <img src={foto} alt="avatar" className="w-full h-full object-cover" /> : initials(namaGuru)}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-bold truncate" style={{ color: palette.ink }}>{namaGuru}</p>
      <p className="text-[11px]" style={{ color: palette.inkFaint }}>Guru</p>
    </div>
  </div>
  <Link
                      href="/guru/profil"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition"
                      style={{ color: palette.ink }}
                    >
                      <UserRound size={14} />
                      Lihat Profil
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 py-7">
          {loadingData ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-9 h-9 border-2 rounded-full animate-spin"
                  style={{ borderColor: palette.border, borderTopColor: palette.amber }}
                />
                <p className="text-sm" style={{ color: palette.inkSoft }}>Memuat data dashboard...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* HERO STRIP */}
              <div
                className="rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4"
                style={{ background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.navySoft} 100%)` }}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#8FA0C4" }}>{today}</p>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} style={{ color: palette.amber }} />
                    Bank soal kamu sudah punya {totalSoal} soal
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#AEB8CC" }}>
                    {soalAktif} aktif &middot; {soalNonaktif} draft &middot; tersebar di {kategoriUnik.length} mata pelajaran dan {packagesCount} paket soal.
                  </p>
                </div>
                <Link
                  href="/guru/soal"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
                  style={{ background: palette.amber, color: "#40260A" }}
                >
                  <Plus size={16} />
                  Tambah Soal Baru
                </Link>
              </div>

              {/* STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Soal" value={totalSoal} sublabel="Soal yang telah dibuat" icon={FileQuestion} />
                <StatCard label="Mata Pelajaran" value={kategoriUnik.length} sublabel="Mata pelajaran dikelola" icon={Layers3} />
                <StatCard label="Paket Soal" value={packagesCount} sublabel="Paket siap digunakan" icon={Sparkles} />
                <StatCard label="Soal Hari Ini" value={soalHariIni} sublabel="Soal baru ditambahkan" icon={Clock} dark />
              </div>

              {/* STATUS AKTIF / DRAFT + PERINGATAN PAKET */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/guru/soal?status=aktif"
                  className="rounded-2xl p-5 block transition hover:shadow-sm"
                  style={{ background: palette.card, border: `1px solid ${palette.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: palette.tealSoft }}>
                      <CircleCheckBig size={17} style={{ color: palette.tealText }} />
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: palette.inkSoft }}>Soal Aktif</p>
                      <p className="text-2xl font-bold" style={{ color: palette.ink }}>{soalAktif}</p>
                    </div>
                  </div>
                </Link>
                <Link
                  href="/guru/soal?status=nonaktif"
                  className="rounded-2xl p-5 block transition hover:shadow-sm"
                  style={{ background: palette.card, border: `1px solid ${palette.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F1EFE8" }}>
                      <AlertTriangle size={17} style={{ color: "#8A7A4E" }} />
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: palette.inkSoft }}>Draft / Nonaktif</p>
                      <p className="text-2xl font-bold" style={{ color: palette.ink }}>{soalNonaktif}</p>
                    </div>
                  </div>
                </Link>
                <Link
                  href="/guru/soal?paket=belum"
                  className="rounded-2xl p-5 block transition hover:shadow-sm"
                  style={{ background: tanpaPaket > 0 ? palette.dangerSoft : palette.card, border: `1px solid ${tanpaPaket > 0 ? "#E9B8AC" : palette.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tanpaPaket > 0 ? "#F6D2C6" : palette.amberSoft }}>
                      <PackageCheck size={17} style={{ color: tanpaPaket > 0 ? palette.danger : palette.amberText }} />
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: tanpaPaket > 0 ? "#8A3A28" : palette.inkSoft }}>Belum Ada Paket</p>
                      <p className="text-2xl font-bold" style={{ color: tanpaPaket > 0 ? palette.danger : palette.ink }}>{tanpaPaket}</p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* RINGKASAN PER MAPEL */}
                <div className="lg:col-span-3 rounded-2xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-bold" style={{ color: palette.ink }}>Ringkasan per Mata Pelajaran</h3>
                      <p className="text-xs mt-0.5" style={{ color: palette.inkFaint }}>Distribusi soal yang sudah dibuat</p>
                    </div>
                    <Link
                      href="/guru/soal"
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                      style={{ background: palette.amberSoft, color: palette.amberText }}
                    >
                      Kelola
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  {perMapel.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm" style={{ color: palette.inkSoft }}>Belum ada soal yang dibuat.</p>
                      <Link href="/guru/soal" className="text-sm font-semibold mt-2 inline-block" style={{ color: palette.amberText }}>
                        Buat soal pertama →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {perMapel.map(([name, count]) => {
                        const style = subjectStyle(name)
                        const Icon = style.icon
                        return (
                          <Link
                            href={`/guru/soal?kategori=${encodeURIComponent(name)}`}
                            key={name}
                            className="flex items-center gap-3"
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: style.bg }}
                            >
                              <Icon size={16} style={{ color: style.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold truncate" style={{ color: palette.ink }}>{name}</p>
                                <span className="text-sm font-bold shrink-0 ml-2" style={{ color: palette.ink }}>{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full w-full overflow-hidden" style={{ background: palette.paper }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(count / maxCount) * 100}%`, background: style.color }}
                                />
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* SOAL TERBARU */}
                <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                  <h3 className="text-base font-bold mb-1" style={{ color: palette.ink }}>Soal Terbaru</h3>
                  <p className="text-xs mb-4" style={{ color: palette.inkFaint }}>6 soal terakhir yang ditambahkan</p>

                  {recent.length === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: palette.inkSoft }}>Belum ada soal.</p>
                  ) : (
                    <div className="space-y-1">
                      {recent.map((q, idx) => {
                        const style = subjectStyle(q.kategori)
                        const Icon = style.icon
                        return (
                          <Link
                            key={q.id}
                            href="/guru/soal"
                            className="flex items-start gap-3 py-3"
                            style={{ borderTop: idx === 0 ? "none" : `1px solid ${palette.border}` }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: style.bg }}
                            >
                              <Icon size={14} style={{ color: style.color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate" style={{ color: palette.ink }}>
                                {stripHtml(q.pertanyaan) || "(tanpa judul)"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: style.bg, color: style.color }}
                                >
                                  {q.kategori}
                                </span>
                                {!q.is_active && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#F1EFE8", color: "#8A7A4E" }}>
                                    Draft
                                  </span>
                                )}
                                <span className="text-xs" style={{ color: palette.inkFaint }}>
                                  &middot; {timeAgo(q.created_at)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  <Link
                    href="/guru/soal"
                    className="w-full mt-4 flex items-center justify-center gap-1 text-sm font-semibold py-2.5 rounded-lg transition"
                    style={{ border: `1px solid ${palette.border}`, color: palette.ink }}
                  >
                    Lihat semua soal
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>

              {/* KELENGKAPAN KONTEN + DISTRIBUSI PAKET */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* KELENGKAPAN KONTEN */}
                <div className="rounded-2xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold" style={{ color: palette.ink }}>Kelengkapan Konten</h3>
                    <Link
                      href="/guru/soal"
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                      style={{ background: palette.amberSoft, color: palette.amberText }}
                    >
                      Kelola
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                  <p className="text-xs mb-5" style={{ color: palette.inkFaint }}>Seberapa lengkap soal yang sudah dibuat &middot; klik untuk lihat detail</p>

                  {totalSoal === 0 ? (
                    <p className="text-sm py-6 text-center" style={{ color: palette.inkSoft }}>Belum ada soal untuk dianalisis.</p>
                  ) : (
                    <div className="space-y-4">
                      <CompletionRow icon={CircleCheckBig} label="Ada Pembahasan" count={adaPembahasan} total={totalSoal} color={palette.tealText} bg={palette.tealSoft} filterKey="pembahasan" />
                      <CompletionRow icon={ImageIcon} label="Ada Gambar" count={adaGambar} total={totalSoal} color="#185FA5" bg="#E6F1FB" filterKey="gambar" />
                      <CompletionRow icon={Video} label="Ada Video Pembahasan" count={adaVideo} total={totalSoal} color={palette.amberText} bg={palette.amberSoft} filterKey="video" />
                    </div>
                  )}

                  {belumPembahasan > 0 && (
                    <Link
                      href="/guru/soal/kelengkapan?kelengkapan=pembahasan&status=belum"
                      className="mt-5 flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl"
                      style={{ background: palette.dangerSoft, color: palette.danger }}
                    >
                      <AlertTriangle size={14} />
                      {belumPembahasan} soal belum ada pembahasan — lengkapi sekarang
                    </Link>
                  )}
                </div>

                {/* DISTRIBUSI PAKET */}
                <div className="rounded-2xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-bold" style={{ color: palette.ink }}>Distribusi Paket</h3>
                      <p className="text-xs mt-0.5" style={{ color: palette.inkFaint }}>Sebaran soal berdasarkan label paket</p>
                    </div>
                    <Link
                      href="/guru/paket"
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                      style={{ background: palette.tealSoft, color: palette.tealText }}
                    >
                      Kelola
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  {distribusiPaket.length === 0 ? (
                    <div className="py-8 text-center">
                      <PackageCheck size={22} className="mx-auto mb-2" style={{ color: palette.inkFaint }} />
                      <p className="text-sm" style={{ color: palette.inkSoft }}>Belum ada soal yang diberi label paket.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {distribusiPaket.slice(0, 6).map(([nama, count]) => {
                        const st = paketBadgeStyle(nama)
                        const pct = Math.round((count / totalSoal) * 100)
                        return (
                          <Link
                            href={`/guru/soal?paket=${encodeURIComponent(nama)}`}
                            key={nama}
                            className="flex items-center gap-3"
                          >
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 w-24 text-center truncate" style={{ background: st.bg, color: st.color }}>
                              {nama.toUpperCase()}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: palette.paper }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: st.color }} />
                            </div>
                            <span className="text-xs font-bold shrink-0" style={{ color: palette.inkSoft }}>{count}</span>
                          </Link>
                        )
                      })}
                      {tanpaPaket > 0 && (
                        <p className="text-xs pt-1" style={{ color: palette.inkFaint }}>
                          + {tanpaPaket} soal belum diberi label paket
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
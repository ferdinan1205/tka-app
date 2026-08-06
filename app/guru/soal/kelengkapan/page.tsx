"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "../../../../lib/supabase"
import { MathJaxContext } from "better-react-mathjax"
import {
  LayoutDashboard,
  FileQuestion,
  BookOpen,
  Package,
  UserRound,
  Bell,
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
  CircleCheckBig,
  Image as ImageIcon,
  Video,
  ArrowLeft,
  Pencil,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/* DESAIN — sama persis dengan halaman guru lainnya                   */
/* ------------------------------------------------------------------ */

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
]

const SUBJECT_STYLES: Record<string, { color: string; bg: string; icon: any }> = {
  "Matematika": { color: "#B4600F", bg: "#FBEBD6", icon: Calculator },
  "Bahasa Indonesia": { color: "#A32D2D", bg: "#FBE7E2", icon: BookText },
  "Bahasa Inggris": { color: "#185FA5", bg: "#E6F1FB", icon: Languages },
  "Fisika": { color: "#2C3F63", bg: "#E8ECF3", icon: Atom },
  "Kimia": { color: "#993C1D", bg: "#FAECE7", icon: FlaskConical },
  "Biologi": { color: "#3B6D11", bg: "#EAF3DE", icon: Leaf },
  "Ekonomi": { color: "#1F5548", bg: "#E1F0EC", icon: LineChart },
  "Geografi": { color: "#1F5548", bg: "#E1F0EC", icon: Globe2 },
  "Sosiologi": { color: "#72243E", bg: "#FBEAF0", icon: Users },
  "Sejarah": { color: "#633806", bg: "#FBEBD6", icon: Landmark },
  "PPKN": { color: "#2C3F63", bg: "#E8ECF3", icon: ScrollText },
}
const DEFAULT_STYLE = { color: "#6B7080", bg: "#EEECE3", icon: FileQuestion }
function subjectStyle(name: string) {
  return SUBJECT_STYLES[name] || DEFAULT_STYLE
}

function paketBadgeStyle(nama: string) {
  const n = nama.toLowerCase()
  if (n.includes("ipa")) return { bg: "#EAF3DE", color: "#27500A" }
  if (n.includes("ips")) return { bg: palette.amberSoft, color: palette.amberText }
  if (n.includes("smk")) return { bg: "#FAECE7", color: "#712B13" }
  if (n.includes("bahasa")) return { bg: "#FBEAF0", color: "#72243E" }
  return { bg: palette.tealSoft, color: palette.tealText }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "GR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .trim()
}

function hasContent(value?: string | null) {
  if (!value) return false
  return stripHtml(value).trim().length > 0
}

/* ------------------------------------------------------------------ */
/* MATHJAX — sama persis seperti di halaman Kelola Soal               */
/* ------------------------------------------------------------------ */

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
  },
  chtml: { scale: 1, minScale: 0.5, matchFontHeight: false, adaptiveCSS: false },
  options: {
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    renderActions: { addMenu: [] },
  },
  startup: { typeset: false },
}

function hasMath(text = "") {
  return (
    text.includes("$") || text.includes("\\(") || text.includes("\\[") ||
    text.includes("\\frac") || text.includes("\\sqrt") || text.includes("\\times") ||
    text.includes("\\ce{") || text.includes("\\text{") ||
    text.includes("^{") || text.includes("_{") ||
    /\^\d/.test(text) || /\_\d/.test(text)
  )
}

function cleanHtml(html = "") {
  return html
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/<p><br\s*\/?><\/p>/gi, "<br/>")
    .replace(/<p>/gi, "").replace(/<\/p>/gi, "<br/>")
    .replace(/<span[^>]*><\/span>/gi, "")
    .trim().replace(/(<br\s*\/?>\s*)+$/gi, "")
}

function normalizeContent(content = "") {
  if (!content) return ""
  if (/<[a-z][\s\S]*>/i.test(content)) return cleanHtml(content)
  return content.split("\n").map((l) => l.trim()).join("<br/>")
}

function MathContent({ html, className = "" }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const normalized = useMemo(() => normalizeContent(html), [html])
  const isMath = useMemo(() => hasMath(normalized), [normalized])

  useEffect(() => {
    if (!isMath || !ref.current) return
    ref.current.innerHTML = normalized

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function tryTypeset() {
      if (cancelled) return
      const win = window as any

      // Script MathJax belum selesai dimuat -> coba lagi sebentar lagi
      if (!win.MathJax?.typesetPromise) {
        retryTimer = setTimeout(tryTypeset, 150)
        return
      }

      const run = () => {
        if (cancelled || !ref.current) return
        win.MathJax.typesetPromise([ref.current]).catch(() => {})
      }

      // Kalau MathJax masih dalam proses startup, tunggu promise-nya baru typeset
      if (win.MathJax.startup?.promise) {
        win.MathJax.startup.promise.then(run)
      } else {
        run()
      }
    }

    tryTypeset()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [normalized, isMath])

  if (!isMath) {
    return <div className={`text-sm font-semibold leading-6 ${className}`} style={{ color: palette.ink }} dangerouslySetInnerHTML={{ __html: normalized }} />
  }
  return <div ref={ref} className={`text-sm font-semibold leading-6 ${className}`} style={{ color: palette.ink }} dangerouslySetInnerHTML={{ __html: normalized }} />
}

type SoalRow = {
  id: number
  kategori: string
  pertanyaan: string
  created_at?: string
  is_active?: boolean | null
  gambar?: string | null
  video_url?: string | null
  pembahasan?: string | null
  paket?: string | null
}

type KelengkapanKey = "pembahasan" | "gambar" | "video"
type StatusKey = "ada" | "belum"

const TAB_CONFIG: Record<KelengkapanKey, { label: string; icon: any; color: string; bg: string; field: keyof SoalRow }> = {
  pembahasan: { label: "Pembahasan", icon: CircleCheckBig, color: palette.tealText, bg: palette.tealSoft, field: "pembahasan" },
  gambar: { label: "Gambar", icon: ImageIcon, color: "#185FA5", bg: "#E6F1FB", field: "gambar" },
  video: { label: "Video Pembahasan", icon: Video, color: palette.amberText, bg: palette.amberSoft, field: "video_url" },
}

function isValidKelengkapan(v: string | null): v is KelengkapanKey {
  return v === "pembahasan" || v === "gambar" || v === "video"
}
function isValidStatus(v: string | null): v is StatusKey {
  return v === "ada" || v === "belum"
}

export default function KelengkapanKontenPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [checking, setChecking] = useState(true)
  const [namaGuru, setNamaGuru] = useState("Guru")
  const [soal, setSoal] = useState<SoalRow[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [localSearch, setLocalSearch] = useState("")

  const kelengkapan: KelengkapanKey = isValidKelengkapan(searchParams.get("kelengkapan")) ? (searchParams.get("kelengkapan") as KelengkapanKey) : "pembahasan"
  const status: StatusKey = isValidStatus(searchParams.get("status")) ? (searchParams.get("status") as StatusKey) : "belum"

  useEffect(() => { checkAccessAndLoad() }, [])

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
    setChecking(false)
    loadData()
  }

  async function loadData() {
    setLoadingData(true)
    const { data } = await supabase
      .from("soal")
      .select("id, kategori, pertanyaan, created_at, is_active, gambar, video_url, pembahasan, paket")
      .order("id", { ascending: false })
    setSoal((data || []) as SoalRow[])
    setLoadingData(false)
  }

  function setTab(newKelengkapan: KelengkapanKey, newStatus: StatusKey) {
    router.push(`/guru/soal/kelengkapan?kelengkapan=${newKelengkapan}&status=${newStatus}`)
  }

  const totalSoal = soal.length

  // Hitung jumlah per kombinasi tab, dipakai untuk badge angka di tombol
  const counts = useMemo(() => {
    const result: Record<KelengkapanKey, { ada: number; belum: number }> = {
      pembahasan: { ada: 0, belum: 0 },
      gambar: { ada: 0, belum: 0 },
      video: { ada: 0, belum: 0 },
    }
    soal.forEach((s) => {
      ;(Object.keys(TAB_CONFIG) as KelengkapanKey[]).forEach((key) => {
        const field = TAB_CONFIG[key].field
        if (hasContent(s[field] as string | null)) result[key].ada += 1
        else result[key].belum += 1
      })
    })
    return result
  }, [soal])

  const filtered = useMemo(() => {
    const field = TAB_CONFIG[kelengkapan].field
    return soal
      .filter((s) => (status === "ada" ? hasContent(s[field] as string | null) : !hasContent(s[field] as string | null)))
      .filter((s) => !localSearch || stripHtml(s.pertanyaan).toLowerCase().includes(localSearch.toLowerCase()))
  }, [soal, kelengkapan, status, localSearch])

  const activeConfig = TAB_CONFIG[kelengkapan]
  const ActiveIcon = activeConfig.icon

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: palette.paper }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 rounded-full animate-spin" style={{ borderColor: palette.border, borderTopColor: palette.amber }} />
          <p className="text-sm" style={{ color: palette.inkSoft }}>Memeriksa akses...</p>
        </div>
      </div>
    )
  }

  return (
    <MathJaxContext config={mathJaxConfig}>
    <div className="h-screen w-full flex overflow-hidden" style={{ background: palette.paper, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto" style={{ width: "260px", background: palette.navy }}>
        <div className="px-6 pt-7 pb-6">
          <p className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
            Lampung Cerdas
          </p>
          <p className="text-xs mt-1" style={{ color: "#AEB8CC" }}>Portal Bank Soal TKA</p>
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
          <Link
            href="/guru/profil"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition"
            style={{
              background: pathname.startsWith("/guru/profil") ? palette.navySoft : "transparent",
              color: pathname.startsWith("/guru/profil") ? "#FFFFFF" : "#C4CCDE",
              borderLeft: pathname.startsWith("/guru/profil") ? `3px solid ${palette.amber}` : "3px solid transparent",
            }}
          >
            <UserRound size={17} strokeWidth={2} />
            <span className="font-medium">Profil Guru</span>
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <div className="shrink-0 flex items-center justify-between px-6 md:px-10 py-4" style={{ background: palette.card, borderBottom: `1px solid ${palette.border}` }}>
          <div>
            <Link href="/guru" className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: palette.inkSoft }}>
              <ArrowLeft size={13} />
              Kembali ke Dashboard
            </Link>
            <h1 className="text-xl font-bold" style={{ color: palette.ink }}>Kelengkapan Konten</h1>
            <p className="text-sm" style={{ color: palette.inkSoft }}>Selamat datang kembali, {namaGuru}.</p>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <button className="relative p-2 rounded-lg" style={{ border: `1px solid ${palette.border}` }}>
              <Bell size={17} style={{ color: palette.inkSoft }} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: palette.amber }} />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: palette.tealSoft, color: palette.tealText }}>
              {initials(namaGuru)}
            </div>
          </div>
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 py-7">
          {loadingData ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="w-9 h-9 border-2 rounded-full animate-spin" style={{ borderColor: palette.border, borderTopColor: palette.amber }} />
                <p className="text-sm" style={{ color: palette.inkSoft }}>Memuat data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">

              {/* TAB: pilih jenis konten */}
              <div className="rounded-2xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <p className="text-[11px] font-semibold tracking-wider uppercase mb-2.5" style={{ color: palette.inkFaint }}>Jenis Konten</p>
                <div className="flex gap-2 flex-wrap mb-5">
                  {(Object.keys(TAB_CONFIG) as KelengkapanKey[]).map((key) => {
                    const cfg = TAB_CONFIG[key]
                    const Icon = cfg.icon
                    const active = kelengkapan === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key, status)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{
                          background: active ? palette.navy : palette.paper,
                          color: active ? "#FFFFFF" : palette.inkSoft,
                          borderColor: active ? palette.navy : palette.border,
                        }}
                      >
                        <Icon size={15} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>

                <p className="text-[11px] font-semibold tracking-wider uppercase mb-2.5" style={{ color: palette.inkFaint }}>Status</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTab(kelengkapan, "ada")}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      background: status === "ada" ? palette.tealText : palette.paper,
                      color: status === "ada" ? "#FFFFFF" : palette.inkSoft,
                      borderColor: status === "ada" ? palette.tealText : palette.border,
                    }}
                  >
                    Sudah Ada ({counts[kelengkapan].ada})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab(kelengkapan, "belum")}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      background: status === "belum" ? palette.danger : palette.paper,
                      color: status === "belum" ? "#FFFFFF" : palette.inkSoft,
                      borderColor: status === "belum" ? palette.danger : palette.border,
                    }}
                  >
                    Belum Ada ({counts[kelengkapan].belum})
                  </button>
                </div>
              </div>

              {/* RINGKASAN */}
              <div
                className="rounded-2xl p-6 flex items-center gap-4"
                style={{ background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.navySoft} 100%)` }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <ActiveIcon size={20} style={{ color: palette.amber }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {filtered.length} soal {status === "belum" ? "belum" : "sudah"} ada {activeConfig.label.toLowerCase()}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: "#AEB8CC" }}>
                    dari total {totalSoal} soal di bank soal
                  </p>
                </div>
              </div>

              {/* SEARCH LOKAL */}
              <div className="max-w-sm">
                <input
                  placeholder="Cari dalam hasil ini..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full h-10 rounded-xl px-4 text-sm outline-none transition"
                  style={{ background: palette.card, border: `1px solid ${palette.border}`, color: palette.ink }}
                />
              </div>

              {/* LIST SOAL */}
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl p-10 text-center" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                    <p className="text-sm" style={{ color: palette.inkSoft }}>Tidak ada soal yang cocok dengan filter ini.</p>
                  </div>
                ) : (
                  filtered.map((item) => {
                    const catStyle = subjectStyle(item.kategori)
                    const CatIcon = catStyle.icon
                    const pertanyaanText = stripHtml(item.pertanyaan) || "(tanpa judul)"
                    // Ambil beberapa kata pertama sebagai kunci pencarian di Kelola Soal
                    const cariKey = pertanyaanText.split(" ").slice(0, 6).join(" ")
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl p-4 flex items-start gap-3"
                        style={{ background: palette.card, border: `1px solid ${palette.border}` }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: catStyle.bg }}>
                          <CatIcon size={16} style={{ color: catStyle.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <MathContent html={item.pertanyaan || "(tanpa judul)"} />
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: catStyle.bg, color: catStyle.color }}>
                              {item.kategori}
                            </span>
                            {item.paket && (() => {
                              const st = paketBadgeStyle(item.paket)
                              return (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                                  {item.paket.toUpperCase()}
                                </span>
                              )
                            })()}
                            {!item.is_active && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#F1EFE8", color: "#8A7A4E" }}>
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/guru/soal?cari=${encodeURIComponent(cariKey)}`}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shrink-0 transition"
                          style={{ background: palette.amberSoft, color: palette.amberText }}
                        >
                          <Pencil size={12} />
                          Edit
                        </Link>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    </MathJaxContext>
  )
}
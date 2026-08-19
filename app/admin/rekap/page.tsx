"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { supabase } from "../../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import jsPDF from "jspdf"


// ── types ─────────────────────────────────────────────────────

type Rekap = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  user_id: string
  paket?: string
  package_id?: number
  profiles: {
    nama: string
    email: string
    foto?: string
  }
}

type PaketSummary = {
  paket: string
  mapel: { kategori: string; skor: number }[]
  total: number
  rata: number
  tanggal: string
  user_id: string
  nama: string
  email: string
  foto?: string
}

type ViewMode = "table" | "paket"

// ── nav & theme (sama seperti dashboard admin) ──────────────────

const MENU = [
  { label: "Dashboard",      icon: "⌂",  path: "/admin"         },
  { label: "Kelola Soal",    icon: "✎",  path: "/admin/soal"    },
  { label: "Materi",         icon: "◈",  path: "/admin/materi"  },
  { label: "Kelas",          icon: "▤",  path: "/admin/kelas"   },   // ← tambahin ini
  { label: "Ranking",        icon: "◎",  path: "/admin/ranking" },
  { label: "Rekap Nilai",    icon: "≋",  path: "/admin/rekap"   },
  { label: "Manajemen User", icon: "◉",  path: "/admin/users"   },
{ label: "Manajemen Token", icon: "⟐",  path: "/admin/token"   },
]
const G = {
  teal:   "linear-gradient(135deg,#0ea5e9,#0d9488)",
  violet: "linear-gradient(135deg,#7c3aed,#4f46e5)",
  amber:  "linear-gradient(135deg,#f59e0b,#ef4444)",
  emerald:"linear-gradient(135deg,#10b981,#059669)",
}

const AVATAR_COLORS = [
  ["#0ea5e9","#0284c7"],["#7c3aed","#4f46e5"],["#f59e0b","#ef4444"],
  ["#10b981","#059669"],["#f43f5e","#e11d48"],["#06b6d4","#0891b2"],
  ["#8b5cf6","#6d28d9"],["#ec4899","#db2777"],
]
const avatarGrad = (name: string) => {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  const [a, b] = AVATAR_COLORS[idx]
  return `linear-gradient(135deg,${a},${b})`
}

// hex "#RRGGBB" -> {r,g,b}, dipakai buat pdf.setTextColor/setFillColor
function hexToRgb(hex: string) {
  const v = hex.replace("#", "")
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16),
  }
}

// ── page ──────────────────────────────────────────────────────

export default function AdminRekapPage() {
  const router   = useRouter()
  const pathname = usePathname()
  const printRef = useRef<HTMLDivElement>(null)

  const [data,          setData         ] = useState<Rekap[]>([])
  const [loading,       setLoading      ] = useState(true)
  const [search,        setSearch       ] = useState("")
  const [filterMapel,   setFilterMapel  ] = useState("Semua")
  const [filterPaket,   setFilterPaket  ] = useState("Semua")
  const [viewMode,      setViewMode     ] = useState<ViewMode>("table")
  const [expandedPaket, setExpandedPaket] = useState<string | null>(null)
  const [adminName,     setAdminName    ] = useState("Admin")
  const [sidebarOpen,   setSidebarOpen  ] = useState(false)
  const [pdfLoading,    setPdfLoading   ] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", authData.user.id).single()

    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak")
      router.push("/dashboard")
      return
    }

    setAdminName(profile.nama || "Admin")
    await getData()
  }

  async function getData() {
    setLoading(true)

    const { data: hasilData, error } = await supabase
      .from("hasil").select("*").order("id", { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    const { data: profiles } = await supabase.from("profiles").select("*")

    const finalData = (hasilData || []).map((item: any) => {
      const user = profiles?.find((p: any) => p.id === item.user_id)
      return {
        ...item,
        profiles: {
          nama:  user?.nama  || "Tanpa Nama",
          email: user?.email || "-",
          foto:  user?.foto  || "",
        },
      }
    })

    setData(finalData)
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const mapelList = useMemo(() => {
    return ["Semua", ...Array.from(new Set(data.map((x) => x.kategori)))]
  }, [data])

  const paketList = useMemo(() => {
    return ["Semua", ...Array.from(new Set(data.map((x) => x.paket).filter(Boolean)))]
  }, [data])

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const key = search.toLowerCase()
      return (
        (item.profiles.nama.toLowerCase().includes(key) ||
          item.profiles.email.toLowerCase().includes(key)) &&
        (filterMapel === "Semua" || item.kategori === filterMapel) &&
        (filterPaket === "Semua" || item.paket    === filterPaket)
      )
    })
  }, [data, search, filterMapel, filterPaket])

  const paketSummaries = useMemo((): PaketSummary[] => {
    const map = new Map<string, PaketSummary>()

    const source = data.filter((item) => {
      const key = search.toLowerCase()
      return (
        (item.profiles.nama.toLowerCase().includes(key) ||
          item.profiles.email.toLowerCase().includes(key)) &&
        (filterPaket === "Semua" || item.paket === filterPaket)
      )
    })

    source.forEach((item) => {
      const key = `${item.user_id}__${item.paket}__${item.package_id ?? ""}`
      if (!map.has(key)) {
        map.set(key, {
          paket: item.paket || "-",
          mapel: [], total: 0, rata: 0,
          tanggal: item.tanggal,
          user_id: item.user_id,
          nama:  item.profiles.nama,
          email: item.profiles.email,
          foto:  item.profiles.foto,
        })
      }
      const entry = map.get(key)!
      entry.mapel.push({ kategori: item.kategori, skor: item.skor })
      entry.total += item.skor
    })

    map.forEach((entry) => {
      entry.rata = entry.mapel.length > 0
        ? Math.round(entry.total / entry.mapel.length) : 0
    })

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    )
  }, [data, search, filterPaket])

  const totalUjian      = filtered.length
  const totalSiswa      = new Set(filtered.map((x) => x.user_id)).size
  const rataNilai       = filtered.length === 0 ? 0 : Math.round(filtered.reduce((a, b) => a + b.skor, 0) / filtered.length)
  const nilaiTertinggi  = filtered.length === 0 ? 0 : Math.max(...filtered.map((x) => x.skor))

  // ─── PDF asli (vector, digambar langsung pakai jsPDF) ───────────────
  // Menyamai pendekatan halaman siswa: bukan lagi HTML yang didownload,
  // tapi PDF beneran dengan tabel, warna, dan pagination otomatis.
  function exportPDF() {
    try {
      setPdfLoading(true)

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const marginX = 14
      const bottomLimit = pageH - 14
      const totalW = pageW - marginX * 2
      let y = 0

      const infoCount = viewMode === "table" ? `${filtered.length} data` : `${paketSummaries.length} paket`

      // Banner biru + judul — digambar di ATAS setiap halaman (halaman
      // pertama maupun halaman lanjutan), bukan cuma sekali di awal.
      const drawPageHeader = () => {
        pdf.setFillColor(30, 58, 138) // #1E3A8A
        pdf.rect(0, 0, pageW, 20, "F")
        pdf.setTextColor(255, 255, 255)
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(13)
        pdf.text("Rekap Nilai", marginX, 9)
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(8)
        pdf.text("Admin Panel — Lampung Cerdas", marginX, 15)
        pdf.setFontSize(7.5)
        pdf.text(
          `${infoCount} · Dicetak ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
          pageW - marginX, 9, { align: "right" }
        )
        y = 28
      }

      const checkPageBreak = (need: number) => {
        if (y + need > bottomLimit) {
          pdf.addPage()
          drawPageHeader()
          return true
        }
        return false
      }

      // ── Header halaman pertama ──
      drawPageHeader()

      if (viewMode === "table") {
        // ── kolom: No | Siswa | Paket | Mapel | Nilai | Tanggal ──
        const colNo = 10, colSiswa = 80, colPaket = 30, colMapel = 55, colNilai = 22
        const colTgl = totalW - (colNo + colSiswa + colPaket + colMapel + colNilai)
        const colX = {
          no:    marginX,
          siswa: marginX + colNo,
          paket: marginX + colNo + colSiswa,
          mapel: marginX + colNo + colSiswa + colPaket,
          nilai: marginX + colNo + colSiswa + colPaket + colMapel,
          tgl:   marginX + colNo + colSiswa + colPaket + colMapel + colNilai,
        }

        const drawHeader = () => {
          checkPageBreak(14)
          pdf.setFillColor(238, 242, 255)
          pdf.rect(marginX, y, totalW, 7, "F")
          pdf.setDrawColor(199, 210, 254)
          pdf.setLineWidth(0.2)
          pdf.rect(marginX, y, totalW, 7)
          pdf.setTextColor(67, 56, 202)
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(7.5)
          pdf.text("No",      colX.no + 2, y + 4.8)
          pdf.text("Siswa",   colX.siswa + 2, y + 4.8)
          pdf.text("Paket",   colX.paket + 2, y + 4.8)
          pdf.text("Mapel",   colX.mapel + 2, y + 4.8)
          pdf.text("Nilai",   colX.nilai + 2, y + 4.8)
          pdf.text("Tanggal", colX.tgl + 2, y + 4.8)
          y += 7
        }
        drawHeader()

        if (filtered.length === 0) {
          pdf.setTextColor(148, 163, 184)
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(10)
          pdf.text("Tidak ada data.", pageW / 2, y + 12, { align: "center" })
          y += 20
        }

        filtered.forEach((item, i) => {
          const rowH = 10
          const broke = checkPageBreak(rowH)
          if (broke) drawHeader()

          pdf.setDrawColor(226, 232, 240)
          pdf.setLineWidth(0.15)
          pdf.line(marginX, y + rowH, marginX + totalW, y + rowH)

          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(8)
          pdf.setTextColor(148, 163, 184)
          pdf.text(String(i + 1), colX.no + 2, y + 6)

          pdf.setTextColor(30, 41, 59)
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(8)
          pdf.text(item.profiles.nama, colX.siswa + 2, y + 4.5)
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(7)
          pdf.setTextColor(148, 163, 184)
          pdf.text(item.profiles.email, colX.siswa + 2, y + 8.5)

          pdf.setFontSize(7.5)
          pdf.setTextColor(100, 116, 139)
          pdf.text(item.paket || "-", colX.paket + 2, y + 6)
          pdf.text(item.kategori, colX.mapel + 2, y + 6)

          const nilaiCol = hexToRgb(
            item.skor >= 30 ? "#059669" : item.skor >= 20 ? "#0284C7" : item.skor >= 10 ? "#D97706" : "#DC2626"
          )
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(8)
          pdf.setTextColor(nilaiCol.r, nilaiCol.g, nilaiCol.b)
          pdf.text(String(item.skor), colX.nilai + 2, y + 6)

          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(7)
          pdf.setTextColor(148, 163, 184)
          pdf.text(
            new Date(item.tanggal).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
            colX.tgl + 2, y + 6
          )

          y += rowH
        })

      } else {
        // ── kolom: No | Siswa | Paket | Mapel & Skor | Rata-rata | Tanggal ──
        const colNo = 10, colSiswa = 65, colPaket = 28, colRata = 22, colTgl = 35
        const colMapel = totalW - (colNo + colSiswa + colPaket + colRata + colTgl)
        const colX = {
          no:    marginX,
          siswa: marginX + colNo,
          paket: marginX + colNo + colSiswa,
          mapel: marginX + colNo + colSiswa + colPaket,
          rata:  marginX + colNo + colSiswa + colPaket + colMapel,
          tgl:   marginX + colNo + colSiswa + colPaket + colMapel + colRata,
        }

        const drawHeader = () => {
          checkPageBreak(14)
          pdf.setFillColor(238, 242, 255)
          pdf.rect(marginX, y, totalW, 7, "F")
          pdf.setDrawColor(199, 210, 254)
          pdf.setLineWidth(0.2)
          pdf.rect(marginX, y, totalW, 7)
          pdf.setTextColor(67, 56, 202)
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(7.5)
          pdf.text("No",         colX.no + 2, y + 4.8)
          pdf.text("Siswa",      colX.siswa + 2, y + 4.8)
          pdf.text("Paket",      colX.paket + 2, y + 4.8)
          pdf.text("Mapel & Skor", colX.mapel + 2, y + 4.8)
          pdf.text("Rata-rata",  colX.rata + 2, y + 4.8)
          pdf.text("Tanggal",    colX.tgl + 2, y + 4.8)
          y += 7
        }
        drawHeader()

        if (paketSummaries.length === 0) {
          pdf.setTextColor(148, 163, 184)
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(10)
          pdf.text("Tidak ada data.", pageW / 2, y + 12, { align: "center" })
          y += 20
        }

        paketSummaries.forEach((p, i) => {
          const mapelStr = p.mapel.map((m) => `${m.kategori}: ${m.skor}`).join("   •   ")
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(7.5)
          const mapelLines = pdf.splitTextToSize(mapelStr || "-", colMapel - 4)
          const rowH = Math.max(10, mapelLines.length * 4 + 3)

          const broke = checkPageBreak(rowH)
          if (broke) drawHeader()

          pdf.setDrawColor(226, 232, 240)
          pdf.setLineWidth(0.15)
          pdf.line(marginX, y + rowH, marginX + totalW, y + rowH)

          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(8)
          pdf.setTextColor(148, 163, 184)
          pdf.text(String(i + 1), colX.no + 2, y + 6)

          pdf.setTextColor(30, 41, 59)
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(8)
          pdf.text(p.nama, colX.siswa + 2, y + 4.5)
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(7)
          pdf.setTextColor(148, 163, 184)
          pdf.text(p.email, colX.siswa + 2, y + 8.5)

          pdf.setFontSize(7.5)
          pdf.setTextColor(100, 116, 139)
          pdf.text(p.paket, colX.paket + 2, y + 6)

          pdf.setTextColor(71, 85, 105)
          pdf.text(mapelLines, colX.mapel + 2, y + 5)

          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(8)
          pdf.setTextColor(67, 56, 202)
          pdf.text(String(p.rata), colX.rata + 2, y + 6)

          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(7)
          pdf.setTextColor(148, 163, 184)
          pdf.text(
            new Date(p.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
            colX.tgl + 2, y + 6
          )

          y += rowH
        })
      }

      // ── Footer + nomor halaman di tiap page ──
      const pageCount = pdf.getNumberOfPages()
      for (let pNum = 1; pNum <= pageCount; pNum++) {
        pdf.setPage(pNum)
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(7)
        pdf.setTextColor(148, 163, 184)
        pdf.text("Dokumen ini dihasilkan otomatis oleh sistem Lampung Cerdas", pageW / 2, pageH - 8, { align: "center" })
        pdf.text(`Hal. ${pNum}/${pageCount}`, pageW - marginX, pageH - 8, { align: "right" })
      }

      pdf.save(viewMode === "table" ? "rekap_nilai.pdf" : "rekap_per_paket.pdf")
    } catch (err: any) {
      console.error("Gagal membuat PDF:", err)
      alert("Gagal membuat PDF" + (err?.message ? `: ${err.message}` : ""))
    } finally {
      setPdfLoading(false)
    }
  }

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

        .rk-chip { transition: all .18s ease; }
        .rk-btn  { transition: all .18s ease; }
        .rk-btn:hover { transform: translateY(-1px); }
        .rk-card-row { transition: background .15s ease; }
        .rk-card-row:hover { background: rgba(14,165,233,.04); }

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
<div className="px-5 pt-6 pb-4 flex items-center justify-center" style={{ borderBottom: "1px solid rgba(56,189,248,.1)" }}>
  <img
    src="/logo-lampung-cerdas.png"
    alt="Lampung Cerdas"
    className="h-12 w-auto object-contain"
  />
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

  // ── loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060f22" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-11 h-11">
            <div className="absolute inset-0 rounded-full border-2 border-sky-900" />
            <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          </div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "1px", color: "#7dabc9" }}
            className="text-xs font-medium">Memuat data rekap</p>
        </div>
      </div>
    )
  }

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
          className="font-semibold text-slate-800">Rekap Nilai</p>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <div ref={printRef} className="p-4 md:p-6 lg:p-7 max-w-6xl mx-auto space-y-5">

          {/* ── PAGE HEADER ── */}
          <div className="fade-up d1 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p style={{ color: "#0284c7", letterSpacing: "1px", fontSize: "10px" }}
                className="font-medium uppercase">Admin</p>
              <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "19px" }}
                className="font-semibold text-slate-900 mt-0.5">Rekap Nilai</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportPDF}
                disabled={pdfLoading}
                className="rk-btn h-9 px-4 rounded-xl text-[13px] font-medium text-white disabled:opacity-60 flex items-center gap-1.5"
                style={{ background: G.amber, boxShadow: "0 4px 12px rgba(245,158,11,.28)" }}
              >
                {pdfLoading
                  ? <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />...</>
                  : <>↓ PDF</>}
              </button>
            </div>
          </div>

          {/* ── STAT CARDS ── */}
          <div className="fade-up d2 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total ujian"     value={totalUjian}     grad={G.teal}    glow="#0ea5e9" />
            <StatCard label="Total siswa"     value={totalSiswa}     grad={G.violet}  glow="#7c3aed" />
            <StatCard label="Rata-rata nilai" value={rataNilai}      grad={G.amber}   glow="#f59e0b" />
            <StatCard label="Nilai tertinggi" value={nilaiTertinggi} grad={G.emerald} glow="#10b981" />
          </div>

          {/* ── FILTER ROW ── */}
          <div className="fade-up d2 bg-white rounded-2xl px-4 py-3 flex flex-col lg:flex-row gap-3"
            style={{ border: "1px solid rgba(15,23,42,.08)" }}>
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau email siswa..."
                className="w-full h-10 rounded-xl px-4 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition"
                style={{ border: "1px solid rgba(15,23,42,.08)" }}
                onFocus={e => { e.currentTarget.style.border = "1px solid rgba(14,165,233,.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,165,233,.1)" }}
                onBlur={e => { e.currentTarget.style.border = "1px solid rgba(15,23,42,.08)"; e.currentTarget.style.boxShadow = "none" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            </div>

            <select
              value={filterPaket}
              onChange={(e) => setFilterPaket(e.target.value)}
              className="h-10 px-3 rounded-xl text-sm text-slate-700 outline-none transition bg-white"
              style={{ border: "1px solid rgba(15,23,42,.08)" }}
            >
              {paketList.map((item) => <option key={item}>{item}</option>)}
            </select>

            {viewMode === "table" && (
              <select
                value={filterMapel}
                onChange={(e) => setFilterMapel(e.target.value)}
                className="h-10 px-3 rounded-xl text-sm text-slate-700 outline-none transition bg-white"
                style={{ border: "1px solid rgba(15,23,42,.08)" }}
              >
                {mapelList.map((item) => <option key={item}>{item}</option>)}
              </select>
            )}

            <button
              onClick={getData}
              className="rk-btn h-10 px-4 rounded-xl text-white text-sm font-medium"
              style={{ background: G.teal, boxShadow: "0 4px 12px rgba(14,165,233,.28)" }}
            >
              ↻ Refresh
            </button>
          </div>

          {/* ── VIEW TOGGLE ── */}
          <div className="fade-up d3 flex gap-1.5">
            {(["table", "paket"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="rk-chip h-8 px-4 rounded-full text-xs font-medium"
                style={viewMode === mode
                  ? { background: G.teal, color: "#fff", boxShadow: "0 4px 12px rgba(14,165,233,.28)" }
                  : { background: "#fff", color: "#475569", border: "1px solid rgba(15,23,42,.08)" }
                }
              >
                {mode === "table" ? "Tabel nilai" : "Per paket"}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-medium px-2.5 py-1 self-center rounded-full"
              style={{ background: "rgba(14,165,233,.1)", color: "#0369a1" }}>
              {viewMode === "table" ? `${filtered.length} baris` : `${paketSummaries.length} paket`}
            </span>
          </div>

          {/* ── TABLE VIEW ── */}
          {viewMode === "table" && (
            <div className="fade-up d4 bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px]">
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid rgba(15,23,42,.08)" }}>
                      {["No", "Siswa", "Paket", "Mapel", "Nilai", "Tanggal"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-14 text-center">
                          <p className="text-3xl mb-2">📭</p>
                          <p className="text-sm text-slate-500">Tidak ada data</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {data.length === 0 ? "Belum ada hasil ujian" : `${data.length} data tersedia, coba ubah filter`}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((item, i) => (
                        <tr key={item.id} className="rk-card-row transition">

                          {/* No */}
                          <td className="px-4 py-3 text-xs text-slate-400 font-medium">
                            #{i + 1}
                          </td>

                          {/* Siswa */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {item.profiles.foto ? (
                                <img src={item.profiles.foto} className="w-8 h-8 rounded-lg object-cover shrink-0" style={{ border: "1px solid rgba(15,23,42,.08)" }} />
                              ) : (
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                                  style={{ background: avatarGrad(item.profiles.nama) }}>
                                  {item.profiles.nama.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.profiles.nama}</p>
                                <p className="text-[11px] text-slate-400">{item.profiles.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Paket */}
                          <td className="px-4 py-3">
                            <PaketBadge paket={item.paket} />
                          </td>

                          {/* Mapel */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{item.kategori}</span>
                          </td>

                          {/* Nilai */}
                          <td className="px-4 py-3">
                            <NilaiBadge skor={item.skor} />
                          </td>

                          {/* Tanggal */}
                          <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(item.tanggal).toLocaleString("id-ID", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PER PAKET VIEW ── */}
          {viewMode === "paket" && (
            <div className="fade-up d4 space-y-3">
              {paketSummaries.length === 0 && (
                <div className="bg-white rounded-2xl p-14 text-center" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm text-slate-500">Tidak ada data</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah filter pencarian</p>
                </div>
              )}

              {paketSummaries.map((summary, i) => {
                const key        = `${summary.user_id}-${summary.paket}-${i}`
                const isExpanded = expandedPaket === key

                return (
                  <div key={key} className="bg-white rounded-2xl overflow-hidden transition"
                    style={{ border: "1px solid rgba(15,23,42,.08)" }}>

                    {/* Card header */}
                    <div
                      className="rk-card-row flex items-center gap-3 px-4 py-3 cursor-pointer transition"
                      onClick={() => setExpandedPaket(isExpanded ? null : key)}
                    >
                      {/* Avatar */}
                      {summary.foto ? (
                        <img src={summary.foto} className="w-9 h-9 rounded-xl object-cover shrink-0" style={{ border: "1px solid rgba(15,23,42,.08)" }} />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: avatarGrad(summary.nama) }}>
                          {summary.nama.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-800">{summary.nama}</p>
                          <PaketBadge paket={summary.paket} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{summary.email}</p>
                      </div>

                      {/* Mapel pills (desktop) */}
                      <div className="hidden md:flex gap-1.5 flex-wrap justify-end">
                        {summary.mapel.map((m) => (
                          <div key={m.kategori} className="flex items-center gap-1 rounded-lg px-2.5 py-1" style={{ background: "#f1f5f9" }}>
                            <span className="text-[10px] text-slate-500">{m.kategori}</span>
                            <span className="text-[10px] font-semibold" style={{ color: "#0369a1" }}>{m.skor}</span>
                          </div>
                        ))}
                      </div>

                      {/* Rata-rata */}
                      <div className="shrink-0 text-right ml-2">
                        <p className="text-lg font-bold" style={{ color: "#0369a1" }}>{summary.rata}</p>
                        <p className="text-[10px] text-slate-400">rata-rata</p>
                      </div>

                      {/* Chevron */}
                      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        style={{ background: "#f1f5f9" }}>
                        ▾
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid rgba(15,23,42,.06)" }}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                          Detail per mapel
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {summary.mapel.map((m) => {
                            const pct = Math.min(100, Math.round((m.skor / 40) * 100))
                            const barColor =
                              m.skor >= 30 ? "#10b981"
                              : m.skor >= 20 ? "#0ea5e9"
                              : m.skor >= 10 ? "#f59e0b"
                              : "#f43f5e"

                            return (
                              <div key={m.kategori} className="rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid rgba(15,23,42,.06)" }}>
                                <p className="text-[11px] font-medium text-slate-500 mb-1 truncate">{m.kategori}</p>
                                <p className="text-2xl font-bold mb-2" style={{ color: barColor }}>{m.skor}</p>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Summary row */}
                        <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3"
                          style={{ background: "rgba(14,165,233,.06)", border: "1px solid rgba(14,165,233,.15)" }}>
                          <div className="flex gap-5">
                            {[
                              { label: "Total skor",   val: summary.total        },
                              { label: "Rata-rata",     val: summary.rata         },
                              { label: "Jumlah mapel",  val: summary.mapel.length },
                            ].map((s) => (
                              <div key={s.label}>
                                <p className="text-[10px]" style={{ color: "#0284c7" }}>{s.label}</p>
                                <p className="text-lg font-bold" style={{ color: "#0369a1" }}>{s.val}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px]" style={{ color: "#0284c7" }}>
                            {new Date(summary.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────

function StatCard({ label, value, grad, glow }: { label: string; value: number; grad: string; glow: string }) {
  return (
    <div className="rounded-2xl px-4 py-3.5 text-white relative overflow-hidden"
      style={{ background: grad, boxShadow: `0 6px 20px ${glow}33` }}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,.1)" }} />
      <div className="relative">
        <p className="text-[11px] font-medium mb-1 text-white/80">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

// ── PAKET BADGE ───────────────────────────────────────────────

const PAKET_COLORS: Record<string, { bg: string; text: string }> = {
  "Paket ipa":    { bg: "rgba(14,165,233,.12)",  text: "#0369a1" },
  "Paket ips":    { bg: "rgba(16,185,129,.12)",  text: "#047857" },
  "Paket bahasa": { bg: "rgba(124,58,237,.12)",  text: "#6d28d9" },
  "Paket smk":    { bg: "rgba(245,158,11,.12)",  text: "#b45309" },
}

function PaketBadge({ paket }: { paket?: string }) {
  const c = PAKET_COLORS[paket || ""] || { bg: "#f1f5f9", text: "#64748b" }
  return (
    <span className="inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}>
      {paket || "-"}
    </span>
  )
}

// ── NILAI BADGE ───────────────────────────────────────────────

function NilaiBadge({ skor }: { skor: number }) {
  const c =
    skor >= 30 ? { bg: "rgba(16,185,129,.12)", text: "#047857" }
    : skor >= 20 ? { bg: "rgba(14,165,233,.12)", text: "#0369a1" }
    : skor >= 10 ? { bg: "rgba(245,158,11,.12)", text: "#b45309" }
    : { bg: "rgba(244,63,94,.12)", text: "#e11d48" }

  return (
    <span className="inline-flex items-center justify-center h-8 min-w-[48px] px-3 rounded-lg text-sm font-bold"
      style={{ background: c.bg, color: c.text }}>
      {skor}
    </span>
  )
}
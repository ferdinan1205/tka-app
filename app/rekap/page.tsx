"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import jsPDF from "jspdf"
import { toPng } from "html-to-image"
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

type Hasil = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  paket?: string | null
  package_id?: string | null
}

type PaketSummary = {
  package_id: string | null
  paket: string
  total_ujian: number
  total_nilai: number
  rata_rata: number
  tertinggi: number
  terendah: number
  data: Hasil[]
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materi", label: "Materi", icon: BookOpen },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/rekap", label: "Rekap Nilai", icon: ClipboardList },
]

const PAKET_STYLE: Record<string, { grad: string; accent: string; soft: string }> = {
  default: { grad: "from-[#6366F1] to-[#8B5CF6]", accent: "#6366F1", soft: "#EEF2FF" },
  ipa:     { grad: "from-[#059669] to-[#0D9488]", accent: "#059669", soft: "#ECFDF5" },
  ips:     { grad: "from-[#EA580C] to-[#D97706]", accent: "#EA580C", soft: "#FFF7ED" },
  smk:     { grad: "from-[#2563EB] to-[#0891B2]", accent: "#2563EB", soft: "#EFF6FF" },
  bahasa:  { grad: "from-[#9333EA] to-[#DB2777]", accent: "#9333EA", soft: "#FAF5FF" },
}

function getPaketStyle(paket: string) {
  const key = paket.toLowerCase().replace(/paket\s*/i, "").trim()
  return PAKET_STYLE[key] || PAKET_STYLE.default
}

function grade(nilai: number) {
  if (nilai >= 90) return { label: "A", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" }
  if (nilai >= 80) return { label: "B", color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" }
  if (nilai >= 70) return { label: "C", color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" }
  if (nilai >= 60) return { label: "D", color: "text-orange-600",  bg: "bg-orange-50 border-orange-200" }
  return              { label: "E", color: "text-red-600",      bg: "bg-red-50 border-red-200" }
}

function gradeColor(nilai: number) {
  if (nilai >= 90) return "#059669"
  if (nilai >= 80) return "#2563EB"
  if (nilai >= 70) return "#D97706"
  if (nilai >= 60) return "#EA580C"
  return "#DC2626"
}

function ScoreRing({ value }: { value: number }) {
  const r = 28; const c = 2 * Math.PI * r
  const col = gradeColor(value)
  return (
    <svg width="72" height="72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#E2E8F0" strokeWidth="5" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)}
        transform="rotate(-90 36 36)" />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill={col}>{value}</text>
    </svg>
  )
}

export default function RekapPage() {
  const router   = useRouter()
  const pathname = usePathname()
  const pdfRef   = useRef<HTMLDivElement>(null) // hanya untuk capture PDF (hidden), tampilan halaman TIDAK dipakai lagi
  const [loading, setLoading]         = useState(true)
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [nama, setNama]               = useState("Siswa")
  const [email, setEmail]             = useState("")
  const [foto, setFoto]               = useState("")
  const [hasil, setHasil]             = useState<Hasil[]>([])
  const [paketSummary, setPaketSummary] = useState<PaketSummary[]>([])
  const [activeTab, setActiveTab]     = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoOk, setLogoOk] = useState<boolean | null>(null)   // null = belum tau, true = berhasil, false = gagal dimuat
  const [fotoPdfOk, setFotoPdfOk] = useState<boolean | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    const userId = data.user.id
    setEmail(data.user.email || "")

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single()
    setNama(profile?.nama || "Siswa")
    setFoto(profile?.foto || "")

    // Hanya ambil data milik user yang login
    const { data: hasilData } = await supabase
      .from("hasil").select("*").eq("user_id", userId).order("tanggal", { ascending: false })

    const finalHasil = (hasilData as Hasil[]) || []
    setHasil(finalHasil)

    const grouped: Record<string, PaketSummary> = {}
    finalHasil.forEach((item) => {
      const key = item.package_id ? String(item.package_id) : "umum"
      if (!grouped[key]) {
        grouped[key] = {
          package_id: item.package_id ? String(item.package_id) : null,
          paket: item.paket || "Ujian Umum",
          total_ujian: 0, total_nilai: 0, rata_rata: 0,
          tertinggi: 0, terendah: 100, data: [],
        }
      }
      grouped[key].data.push(item)
      grouped[key].total_ujian += 1
      grouped[key].total_nilai += item.skor
    })

    Object.values(grouped).forEach((g) => {
      const nilai = g.data.map((x) => x.skor)
      g.rata_rata = Math.round(g.total_nilai / g.total_ujian)
      g.tertinggi = Math.max(...nilai)
      g.terendah  = Math.min(...nilai)
    })

    setPaketSummary(Object.values(grouped))
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const rataRata    = hasil.length ? Math.round(hasil.reduce((a, b) => a + b.skor, 0) / hasil.length) : 0
  const tertinggi   = hasil.length ? Math.max(...hasil.map((x) => x.skor)) : 0
  const terendah    = hasil.length ? Math.min(...hasil.map((x) => x.skor)) : 0
  const gradeGlobal = grade(rataRata)
  const inisial     = nama.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
  const tanggalCetak = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

  async function downloadPDF() {
    if (!pdfRef.current) return
    try {
      setPdfLoading(true)

      // Pastikan status load gambar (logo & foto) di template PDF sudah settle
      // (true/false), biar gak capture pas gambar masih di tengah proses loading.
      const waitImagesSettled = async () => {
        const maxWait = 2000
        const start = Date.now()
        while (Date.now() - start < maxWait) {
          const logoSettled = logoOk !== null
          const fotoSettled = !foto || fotoPdfOk !== null
          if (logoSettled && fotoSettled) return
          await new Promise((r) => setTimeout(r, 100))
        }
      }
      await waitImagesSettled()

      const node = pdfRef.current
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        skipFonts: true,
        // Kalau ada gambar (foto profil / logo) yang gagal dimuat karena CORS,
        // ganti jadi kotak transparan 1x1 daripada bikin seluruh proses gagal.
        imagePlaceholder:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      } as any)

      if (!dataUrl || dataUrl.length < 100) {
        throw new Error("Hasil capture gambar kosong/gagal")
      }

      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("Gagal memuat gambar hasil capture"))
        img.src = dataUrl
      })

      if (!img.naturalWidth || !img.naturalHeight) {
        throw new Error("Ukuran gambar hasil capture 0 — capture gagal")
      }

      // Pakai ukuran halaman A4 standar (bukan dimensi custom hasil hitungan),
      // supaya PDF yang dihasilkan selalu valid dan bisa dibuka di semua viewer.
      // Kalau kontennya lebih panjang dari 1 halaman, otomatis dipecah jadi multi-halaman.
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth  = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth   = pageWidth
      const imgHeight  = (img.naturalHeight / img.naturalWidth) * imgWidth

      if (imgHeight <= pageHeight) {
        pdf.addImage(dataUrl, "PNG", 0, 0, imgWidth, imgHeight)
      } else {
        let heightLeft = imgHeight
        let position = 0
        pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
      }

      pdf.save(`rapor_${nama}.pdf`)
    } catch (err: any) {
      console.error("Gagal download PDF:", err)
      alert("Gagal download PDF" + (err?.message ? `: ${err.message}` : ""))
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
        <p className="text-slate-500 text-xs">Memuat rekap...</p>
      </div>
    </div>
  )

  const activePaket = paketSummary[activeTab]

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

      {/* SIDEBAR — sama seperti halaman lain */}
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

      {/* CONTENT — TIDAK DIUBAH, tetap seperti versi yang sudah kamu setujui */}
      <div className="dash-content flex flex-col min-h-screen bg-slate-50">

        {/* TOPBAR MOBILE */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <Menu size={16} />
          </button>
          <p className="text-sm font-bold text-slate-800 flex-1">Rekap Nilai</p>
          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="shrink-0 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold transition flex items-center gap-1.5"
          >
            {pdfLoading
              ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />...</>
              : <>⬇ PDF</>}
          </button>
        </header>

        <main className="flex-1 w-full px-4 py-4 md:px-10 md:py-6">
          <div className="space-y-5 md:space-y-6 bg-slate-50">

            {/* HERO / PROFILE CARD */}
            <div
              style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #172554 55%, #0B1120 100%)" }}
              className="relative overflow-hidden rounded-2xl p-4 md:p-8 shadow-sm"
            >
              <div className="absolute top-0 right-0 w-72 h-40 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-32 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3 md:gap-6">
                {foto ? (
                  <img src={foto} alt="foto" className="w-14 h-14 md:w-20 md:h-20 rounded-2xl object-cover border border-white/20 shrink-0" />
                ) : (
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-lg md:text-2xl font-extrabold shrink-0 text-white">
                    {inisial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-2.5 py-0.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[9px] font-bold tracking-widest text-blue-200 uppercase">
                      Laporan Siswa
                    </span>
                  </div>
                  <h1 className="text-base md:text-2xl font-extrabold text-white truncate">{nama}</h1>
                  <p className="text-[10px] md:text-xs text-blue-300 truncate mt-0.5">{email}</p>
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] md:text-xs font-bold ${gradeGlobal.bg} ${gradeGlobal.color}`}>
                    Grade {gradeGlobal.label} · Rata-rata {rataRata}
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-center gap-3 shrink-0">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-1.5">
                    <ScoreRing value={rataRata} />
                  </div>
                  <button
                    onClick={downloadPDF}
                    disabled={pdfLoading}
                    className="w-full h-9 px-4 rounded-xl bg-white hover:bg-blue-50 disabled:opacity-50 text-indigo-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    {pdfLoading
                      ? <><span className="w-3 h-3 border border-indigo-300 border-t-indigo-700 rounded-full animate-spin" />Membuat...</>
                      : <>⬇ Download PDF</>}
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-4 gap-2 md:gap-4">
              {[
                { label: "Total Ujian", value: hasil.length, icon: "📝" },
                { label: "Rata-rata",   value: rataRata,     icon: "⭐" },
                { label: "Tertinggi",   value: tertinggi,    icon: "🏆" },
                { label: "Terendah",    value: terendah,     icon: "📉" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col items-center text-center shadow-sm">
                  <span className="text-xl md:text-3xl mb-1">{s.icon}</span>
                  <p className="text-lg md:text-3xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* PAKET TABS */}
            {paketSummary.length > 0 && (
              <div>
                <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                  {paketSummary.map((p, i) => {
                    const st = getPaketStyle(p.paket)
                    return (
                      <button key={i} onClick={() => setActiveTab(i)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] md:text-xs font-bold border transition-all
                          ${i === activeTab
                            ? `bg-gradient-to-r ${st.grad} text-white border-transparent shadow-sm`
                            : "bg-white text-slate-500 border-slate-200 hover:text-slate-700"
                          }`}>
                        {p.paket}
                      </button>
                    )
                  })}
                </div>

                {activePaket && (() => {
                  const st = getPaketStyle(activePaket.paket)
                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className={`bg-gradient-to-r ${st.grad} p-4 md:p-6`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[9px] tracking-[3px] text-white/70 uppercase font-bold">Paket</p>
                            <h2 className="text-lg md:text-2xl font-extrabold text-white">{activePaket.paket}</h2>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {[
                              { label: "Ujian",     value: activePaket.total_ujian },
                              { label: "Rata-rata", value: activePaket.rata_rata   },
                              { label: "Tertinggi", value: activePaket.tertinggi   },
                              { label: "Terendah",  value: activePaket.terendah    },
                            ].map((ms) => (
                              <div key={ms.label} className="bg-black/15 rounded-xl px-2.5 py-2 text-center border border-white/20">
                                <p className="text-sm md:text-xl font-extrabold text-white">{ms.value}</p>
                                <p className="text-[8px] md:text-[10px] text-white/70 mt-0.5">{ms.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* MOBILE LIST */}
                      <div className="md:hidden divide-y divide-slate-100">
                        {activePaket.data.map((item, i) => {
                          const g = grade(item.skor)
                          const col = gradeColor(item.skor)
                          return (
                            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                              <span className="text-[10px] text-slate-300 font-bold w-4 shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">{item.kategori}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className="text-base font-extrabold" style={{ color: col }}>{item.skor}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${g.bg} ${g.color}`}>{g.label}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* DESKTOP TABLE */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                              {["No", "Mata Pelajaran", "Nilai", "Grade", "Tanggal"].map((h) => (
                                <th key={h} className="px-6 py-3 text-left text-[10px] font-bold tracking-widest text-slate-400 uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activePaket.data.map((item, i) => {
                              const g = grade(item.skor)
                              return (
                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                  <td className="px-6 py-4 text-sm text-slate-300 font-bold">{i + 1}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.kategori}</td>
                                  <td className="px-6 py-4"><ScoreRing value={item.skor} /></td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex px-3 py-1 rounded-lg border text-xs font-bold ${g.bg} ${g.color}`}>{g.label}</span>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-slate-400">
                                    {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {hasil.length === 0 && (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-slate-900 font-bold text-sm">Belum Ada Nilai</p>
                <p className="text-slate-400 text-xs mt-1">Ikuti ujian untuk melihat rekap nilaimu</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ================= TEMPLATE KHUSUS PDF (RAPOR) =================
          Tersembunyi dari layar (position fixed, di luar viewport).
          Cuma dipakai saat html-to-image meng-capture node ini untuk dijadikan PDF.
          Lebar tetap 640px, semua elemen box-sizing:border-box & lebar kolom tabel
          dalam persen — jadi dijamin gak ada yang overflow/kepotong lagi.
      ================================================================= */}
      <div
        className="fixed pointer-events-none"
        style={{ top: 0, left: 0, opacity: 0, zIndex: -1 }}
      >
        <div
          ref={pdfRef}
          style={{
            width: 640,
            background: "#FFFFFF",
            color: "#0F172A",
            fontFamily: "Arial, sans-serif",
            boxSizing: "border-box",
          }}
        >
          <style>{`
            .pdf-box, .pdf-box * { box-sizing: border-box; }
          `}</style>
          <div className="pdf-box">

            {/* HEADER RAPOR */}
            <div style={{ padding: "18px 24px 14px", borderBottom: "2px solid #F59E0B", display: "flex", alignItems: "center", gap: 10 }}>
              {logoOk !== false ? (
                <img
                  src="/logo-lampung-cerdas.png"
                  alt="Lampung Cerdas"
                  onLoad={() => setLogoOk(true)}
                  onError={() => setLogoOk(false)}
                  style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1E3A8A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  LC
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#1E3A8A", letterSpacing: 0.3 }}>LAMPUNG CERDAS</p>
                <p style={{ margin: 0, fontSize: 9, color: "#64748B" }}>Laporan Hasil Belajar Siswa</p>
              </div>
              <p style={{ margin: 0, fontSize: 8, color: "#94A3B8", flexShrink: 0 }}>{tanggalCetak}</p>
            </div>

            {/* IDENTITAS SISWA */}
            <div style={{ padding: "12px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10 }}>
                {foto && fotoPdfOk !== false ? (
                  <img
                    src={foto}
                    alt="foto"
                    onLoad={() => setFotoPdfOk(true)}
                    onError={() => setFotoPdfOk(false)}
                    style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", border: "1px solid #E2E8F0", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: "#1E3A8A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {inisial}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nama}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 9, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>
                </div>
                <div style={{ textAlign: "center", padding: "4px 10px", borderRadius: 8, border: `1px solid ${gradeColor(rataRata)}33`, background: `${gradeColor(rataRata)}11`, flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: gradeColor(rataRata) }}>{gradeGlobal.label}</p>
                  <p style={{ margin: 0, fontSize: 7, color: "#64748B" }}>Grade</p>
                </div>
              </div>
            </div>

            {/* STATISTIK RINGKAS */}
            <div style={{ padding: "10px 24px 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "Total Ujian", value: hasil.length },
                { label: "Rata-rata",   value: rataRata     },
                { label: "Tertinggi",   value: tertinggi    },
                { label: "Terendah",    value: terendah     },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 2px" }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1E3A8A" }}>{s.value}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 7, color: "#94A3B8" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* DETAIL PER PAKET */}
            <div style={{ padding: "14px 24px 20px" }}>
              {paketSummary.map((p, idx) => (
                <div key={idx} style={{ marginBottom: 12, border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ background: "#1E3A8A", padding: "7px 10px" }}>
                    <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#fff" }}>{p.paket}</p>
                    <p style={{ margin: "1px 0 0", fontSize: 8, color: "#BFDBFE" }}>
                      Rata-rata {p.rata_rata} · Tertinggi {p.tertinggi} · Terendah {p.terendah}
                    </p>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "40%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "24%" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        <th style={{ textAlign: "left", padding: "5px 8px", fontSize: 7.5, color: "#94A3B8", fontWeight: 700, borderBottom: "1px solid #E2E8F0" }}>No</th>
                        <th style={{ textAlign: "left", padding: "5px 8px", fontSize: 7.5, color: "#94A3B8", fontWeight: 700, borderBottom: "1px solid #E2E8F0" }}>Mapel</th>
                        <th style={{ textAlign: "left", padding: "5px 8px", fontSize: 7.5, color: "#94A3B8", fontWeight: 700, borderBottom: "1px solid #E2E8F0" }}>Nilai</th>
                        <th style={{ textAlign: "left", padding: "5px 8px", fontSize: 7.5, color: "#94A3B8", fontWeight: 700, borderBottom: "1px solid #E2E8F0" }}>Grade</th>
                        <th style={{ textAlign: "left", padding: "5px 8px", fontSize: 7.5, color: "#94A3B8", fontWeight: 700, borderBottom: "1px solid #E2E8F0" }}>Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.data.map((item, i) => {
                        const g = grade(item.skor)
                        return (
                          <tr key={item.id} style={{ borderBottom: i === p.data.length - 1 ? "none" : "1px solid #F1F5F9" }}>
                            <td style={{ padding: "6px 8px", fontSize: 9, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}</td>
                            <td style={{ padding: "6px 8px", fontSize: 9, color: "#0F172A", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.kategori}</td>
                            <td style={{ padding: "6px 8px", fontSize: 10, fontWeight: 800, color: gradeColor(item.skor) }}>{item.skor}</td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 5, color: gradeColor(item.skor), background: `${gradeColor(item.skor)}14` }}>
                                {g.label}
                              </span>
                            </td>
                            <td style={{ padding: "6px 8px", fontSize: 8, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              {hasil.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#94A3B8", fontSize: 10 }}>
                  Belum ada data nilai.
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div style={{ borderTop: "1px solid #E2E8F0", padding: "8px 24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 7.5, color: "#94A3B8" }}>Dokumen ini dihasilkan otomatis oleh sistem Lampung Cerdas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import { toPng } from "html-to-image"

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

const PAKET_STYLE: Record<string, { grad: string; accent: string }> = {
  default: { grad: "from-[#6366F1] to-[#8B5CF6]", accent: "#818CF8" },
  ipa:     { grad: "from-[#059669] to-[#0D9488]", accent: "#34D399" },
  ips:     { grad: "from-[#EA580C] to-[#D97706]", accent: "#FB923C" },
  smk:     { grad: "from-[#2563EB] to-[#0891B2]", accent: "#60A5FA" },
  bahasa:  { grad: "from-[#9333EA] to-[#DB2777]", accent: "#C084FC" },
}

function getPaketStyle(paket: string) {
  const key = paket.toLowerCase().replace(/paket\s*/i, "").trim()
  return PAKET_STYLE[key] || PAKET_STYLE.default
}

function grade(nilai: number) {
  if (nilai >= 90) return { label: "A", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" }
  if (nilai >= 80) return { label: "B", color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" }
  if (nilai >= 70) return { label: "C", color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" }
  if (nilai >= 60) return { label: "D", color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20" }
  return              { label: "E", color: "text-red-400",      bg: "bg-red-500/10 border-red-500/20" }
}

function gradeColor(nilai: number) {
  if (nilai >= 90) return "#34D399"
  if (nilai >= 80) return "#60A5FA"
  if (nilai >= 70) return "#FACC15"
  if (nilai >= 60) return "#FB923C"
  return "#F87171"
}

function ScoreRing({ value }: { value: number }) {
  const r = 28; const c = 2 * Math.PI * r
  const col = gradeColor(value)
  return (
    <svg width="72" height="72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#ffffff08" strokeWidth="5" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)}
        transform="rotate(-90 36 36)" />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill={col}>{value}</text>
    </svg>
  )
}

export default function RekapPage() {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [nama, setNama] = useState("Siswa")
  const [email, setEmail] = useState("")
  const [foto, setFoto] = useState("")
  const [hasil, setHasil] = useState<Hasil[]>([])
  const [paketSummary, setPaketSummary] = useState<PaketSummary[]>([])
  const [activeTab, setActiveTab] = useState(0)

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

  const rataRata    = hasil.length ? Math.round(hasil.reduce((a, b) => a + b.skor, 0) / hasil.length) : 0
  const tertinggi   = hasil.length ? Math.max(...hasil.map((x) => x.skor)) : 0
  const terendah    = hasil.length ? Math.min(...hasil.map((x) => x.skor)) : 0
  const gradeGlobal = grade(rataRata)
  const inisial     = nama.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()

  async function downloadPDF() {
    if (!printRef.current) return
    try {
      setPdfLoading(true)
      const node = printRef.current
      const dataUrl = await toPng(node, {
        cacheBust: true, pixelRatio: 2, backgroundColor: "#06080F",
        width: node.scrollWidth, height: node.scrollHeight,
        style: { transform: "scale(1)", transformOrigin: "top left", width: `${node.scrollWidth}px`, height: `${node.scrollHeight}px` },
      })
      const img = new Image()
      img.src = dataUrl
      await new Promise((res) => { img.onload = res })
      const pdfW = 210
      const pdfH = Math.ceil((img.naturalHeight / img.naturalWidth) * pdfW)
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfW, pdfH] })
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH)
      pdf.save(`rapor_${nama}.pdf`)
    } catch (err) {
      console.error(err); alert("Gagal download PDF")
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#06080F]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 rounded-full border-2 border-[#60A5FA]/20 border-t-[#60A5FA] animate-spin" />
        <p className="text-[#60A5FA]/50 text-xs">Memuat rekap...</p>
      </div>
    </div>
  )

  const activePaket = paketSummary[activeTab]

  return (
    <div className="min-h-screen bg-[#06080F] text-white">

      {/* TOPBAR */}
      <header className="sticky top-0 z-40 bg-[#06080F]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 flex items-center justify-center text-sm hover:bg-white/10 transition shrink-0">
            ←
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] tracking-[3px] text-white/20 uppercase font-bold leading-none">Lampung Cerdas</p>
            <p className="text-sm font-extrabold text-white leading-tight">Rekap Akademik</p>
          </div>
          <button onClick={downloadPDF} disabled={pdfLoading}
            className="shrink-0 h-8 px-3 md:px-4 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-[11px] md:text-xs font-bold transition flex items-center gap-1.5">
            {pdfLoading
              ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Membuat...</>
              : <>⬇ PDF</>}
          </button>
        </div>
      </header>

      <div ref={printRef} className="max-w-3xl mx-auto px-3 py-5 md:px-8 md:py-8 space-y-5">

        {/* PROFILE CARD */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0D1220] border border-white/[0.06] p-4 md:p-8">
          <div className="absolute -top-10 -right-10 w-52 h-52 bg-[#6366F1]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3 md:gap-6">
            {foto ? (
              <img src={foto} alt="foto" className="w-14 h-14 md:w-20 md:h-20 rounded-2xl object-cover border border-white/10 shrink-0" />
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-lg md:text-2xl font-extrabold shrink-0">
                {inisial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] tracking-[3px] text-white/25 uppercase font-bold mb-0.5">Laporan Siswa</p>
              <h1 className="text-base md:text-2xl font-extrabold text-white truncate">{nama}</h1>
              <p className="text-[10px] md:text-xs text-white/30 truncate mt-0.5">{email}</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] md:text-xs font-bold ${gradeGlobal.bg} ${gradeGlobal.color}`}>
                Grade {gradeGlobal.label} · Rata-rata {rataRata}
              </div>
            </div>
            <div className="hidden md:block shrink-0">
              <ScoreRing value={rataRata} />
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
            <div key={s.label} className="bg-[#0D1220] border border-white/[0.06] rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col items-center text-center">
              <span className="text-xl md:text-3xl mb-1">{s.icon}</span>
              <p className="text-lg md:text-3xl font-extrabold text-white">{s.value}</p>
              <p className="text-[9px] md:text-[10px] text-white/25 mt-0.5">{s.label}</p>
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
                        ? `bg-gradient-to-r ${st.grad} text-white border-transparent shadow-lg`
                        : "bg-white/[0.04] text-white/40 border-white/[0.07] hover:text-white/60"
                      }`}>
                    {p.paket}
                  </button>
                )
              })}
            </div>

            {activePaket && (() => {
              const st = getPaketStyle(activePaket.paket)
              return (
                <div className="bg-[#0D1220] border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className={`bg-gradient-to-r ${st.grad} p-4 md:p-6`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] tracking-[3px] text-white/50 uppercase font-bold">Paket</p>
                        <h2 className="text-lg md:text-2xl font-extrabold text-white">{activePaket.paket}</h2>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {[
                          { label: "Ujian",     value: activePaket.total_ujian },
                          { label: "Rata-rata", value: activePaket.rata_rata   },
                          { label: "Tertinggi", value: activePaket.tertinggi   },
                          { label: "Terendah",  value: activePaket.terendah    },
                        ].map((ms) => (
                          <div key={ms.label} className="bg-black/20 rounded-xl px-2.5 py-2 text-center border border-white/10">
                            <p className="text-sm md:text-xl font-extrabold text-white">{ms.value}</p>
                            <p className="text-[8px] md:text-[10px] text-white/50 mt-0.5">{ms.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* MOBILE LIST */}
                  <div className="md:hidden divide-y divide-white/[0.05]">
                    {activePaket.data.map((item, i) => {
                      const g = grade(item.skor)
                      const col = gradeColor(item.skor)
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-[10px] text-white/20 font-bold w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{item.kategori}</p>
                            <p className="text-[10px] text-white/30 mt-0.5">
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
                        <tr className="border-b border-white/[0.06]">
                          {["No", "Mata Pelajaran", "Nilai", "Grade", "Tanggal"].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-[10px] font-bold tracking-widest text-white/25 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {activePaket.data.map((item, i) => {
                          const g = grade(item.skor)
                          return (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition">
                              <td className="px-6 py-4 text-sm text-white/25 font-bold">{i + 1}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-white">{item.kategori}</td>
                              <td className="px-6 py-4"><ScoreRing value={item.skor} /></td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 rounded-lg border text-xs font-bold ${g.bg} ${g.color}`}>{g.label}</span>
                              </td>
                              <td className="px-6 py-4 text-xs text-white/35">
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
          <div className="text-center py-16 bg-[#0D1220] border border-white/[0.06] rounded-2xl">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-white font-bold text-sm">Belum Ada Nilai</p>
            <p className="text-white/30 text-xs mt-1">Ikuti ujian untuk melihat rekap nilaimu</p>
          </div>
        )}
      </div>
    </div>
  )
}
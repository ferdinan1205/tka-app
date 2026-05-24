"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

// ── types ─────────────────────────────────────────────────────

type Rekap = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  user_id: string
  paket?: string
  package_id?: string  // ← FIX: was number, now string
  profiles: {
    nama: string
    email: string
    foto?: string
  }
}

type PaketSummary = {
  paket: string
  package_id?: string  // ← FIX: was number, now string
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

// ── avatar color ──────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-sky-100",    text: "text-sky-700"    },
  { bg: "bg-emerald-100",text: "text-emerald-700"},
  { bg: "bg-rose-100",   text: "text-rose-700"   },
  { bg: "bg-amber-100",  text: "text-amber-700"  },
  { bg: "bg-teal-100",   text: "text-teal-700"   },
  { bg: "bg-fuchsia-100",text: "text-fuchsia-700"},
  { bg: "bg-orange-100", text: "text-orange-700" },
]

function getAvatarColor(name: string) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

// ── page ──────────────────────────────────────────────────────

export default function AdminRekapPage() {
  const router   = useRouter()
  const printRef = useRef<HTMLDivElement>(null)

  const [data,          setData         ] = useState<Rekap[]>([])
  const [loading,       setLoading      ] = useState(true)
  const [search,        setSearch       ] = useState("")
  const [filterMapel,   setFilterMapel  ] = useState("Semua")
  const [filterPaket,   setFilterPaket  ] = useState("Semua")
  const [viewMode,      setViewMode     ] = useState<ViewMode>("table")
  const [expandedPaket, setExpandedPaket] = useState<string | null>(null)

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
        // FIX: pastikan package_id selalu string atau undefined
        package_id: item.package_id ? String(item.package_id) : undefined,
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
      // FIX: package_id sudah string, tidak perlu konversi
      const key = `${item.user_id}__${item.paket}__${item.package_id ?? ""}`
      if (!map.has(key)) {
        map.set(key, {
          paket: item.paket || "-",
          package_id: item.package_id,
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

  function exportExcel() {
    if (viewMode === "table") {
      const rows = filtered.map((item, i) => ({
        No: i + 1,
        Nama: item.profiles.nama,
        Email: item.profiles.email,
        Paket: item.paket || "-",
        Mapel: item.kategori,
        Nilai: item.skor,
        Tanggal: new Date(item.tanggal).toLocaleString("id-ID"),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Rekap")
      XLSX.writeFile(wb, "rekap_nilai.xlsx")
    } else {
      const rows: any[] = []
      paketSummaries.forEach((p, i) => {
        const mapelObj: any = {}
        p.mapel.forEach((m) => { mapelObj[m.kategori] = m.skor })
        rows.push({ No: i + 1, Nama: p.nama, Email: p.email, Paket: p.paket, ...mapelObj, "Total Skor": p.total, "Rata-rata": p.rata, Tanggal: new Date(p.tanggal).toLocaleString("id-ID") })
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Per Paket")
      XLSX.writeFile(wb, "rekap_per_paket.xlsx")
    }
  }

async function exportPDF() {
  if (!printRef.current) return
  const canvas  = await html2canvas(printRef.current, { scale: 2 })
  const imgData = canvas.toDataURL("image/png")

  // Hitung tinggi PDF sesuai konten — 1 halaman tidak terpotong
  const pdfW = 210
  const pdfH = Math.ceil((canvas.height / canvas.width) * pdfW)

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfW, pdfH] })
  pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH)
  pdf.save("rekap_admin.pdf")
}

  // ── loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memuat data rekap...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[3px] text-indigo-500 uppercase leading-none mb-0.5">
              Admin
            </p>
            <h1 className="text-[15px] font-semibold text-slate-800 leading-none">
              Rekap Nilai
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin")}
              className="h-8 px-4 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition"
            >
              Dashboard
            </button>
            <button
              onClick={exportExcel}
              className="h-8 px-4 rounded-lg bg-emerald-50 text-emerald-700 text-[13px] font-medium hover:bg-emerald-100 transition border border-emerald-200"
            >
              ↓ Excel
            </button>
            <button
              onClick={exportPDF}
              className="h-8 px-4 rounded-lg bg-rose-50 text-rose-600 text-[13px] font-medium hover:bg-rose-100 transition border border-rose-200"
            >
              ↓ PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total ujian"     value={totalUjian}     color="indigo"  />
          <StatCard label="Total siswa"     value={totalSiswa}     color="violet"  />
          <StatCard label="Rata-rata nilai" value={rataNilai}      color="amber"   />
          <StatCard label="Nilai tertinggi" value={nilaiTertinggi} color="emerald" />
        </div>

        {/* FILTER ROW */}
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email siswa..."
              className="w-full h-10 rounded-xl border border-slate-200 px-4 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          </div>

          <select
            value={filterPaket}
            onChange={(e) => setFilterPaket(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition bg-white"
          >
            {paketList.map((item) => <option key={item}>{item}</option>)}
          </select>

          {viewMode === "table" && (
            <select
              value={filterMapel}
              onChange={(e) => setFilterMapel(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition bg-white"
            >
              {mapelList.map((item) => <option key={item}>{item}</option>)}
            </select>
          )}

          <button
            onClick={getData}
            className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            ↻ Refresh
          </button>
        </div>

        {/* VIEW TOGGLE */}
        <div className="flex gap-1.5">
          {(["table", "paket"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`h-8 px-4 rounded-lg text-xs font-medium transition ${
                viewMode === mode
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
              }`}
            >
              {mode === "table" ? "Tabel nilai" : "Per paket"}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-1 self-center">
            {viewMode === "table" ? `${filtered.length} baris` : `${paketSummaries.length} paket`}
          </span>
        </div>

        {/* ── TABLE VIEW ── */}
        {viewMode === "table" && (
          <div ref={printRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
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
                    filtered.map((item, i) => {
                      const color = getAvatarColor(item.profiles.nama)
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 text-xs text-slate-400 font-medium">#{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {item.profiles.foto ? (
                                <img src={item.profiles.foto} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${color.bg} ${color.text}`}>
                                  {item.profiles.nama.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.profiles.nama}</p>
                                <p className="text-[11px] text-slate-400">{item.profiles.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><PaketBadge paket={item.paket} /></td>
                          <td className="px-4 py-3"><span className="text-sm text-slate-600">{item.kategori}</span></td>
                          <td className="px-4 py-3"><NilaiBadge skor={item.skor} /></td>
                          <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(item.tanggal).toLocaleString("id-ID", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PER PAKET VIEW ── */}
        {viewMode === "paket" && (
          <div ref={printRef} className="space-y-3">
            {paketSummaries.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-slate-500">Tidak ada data</p>
                <p className="text-xs text-slate-400 mt-1">Coba ubah filter pencarian</p>
              </div>
            )}

            {paketSummaries.map((summary, i) => {
              const key        = `${summary.user_id}-${summary.paket}-${i}`
              const isExpanded = expandedPaket === key
              const color      = getAvatarColor(summary.nama)

              return (
                <div key={key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => setExpandedPaket(isExpanded ? null : key)}
                  >
                    {summary.foto ? (
                      <img src={summary.foto} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color.bg} ${color.text}`}>
                        {summary.nama.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800">{summary.nama}</p>
                        <PaketBadge paket={summary.paket} />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{summary.email}</p>
                    </div>

                    <div className="hidden md:flex gap-1.5 flex-wrap justify-end">
                      {summary.mapel.map((m) => (
                        <div key={m.kategori} className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                          <span className="text-[10px] text-slate-500">{m.kategori}</span>
                          <span className="text-[10px] font-semibold text-indigo-600">{m.skor}</span>
                        </div>
                      ))}
                    </div>

                    <div className="shrink-0 text-right ml-2">
                      <p className="text-lg font-bold text-indigo-600">{summary.rata}</p>
                      <p className="text-[10px] text-slate-400">rata-rata</p>
                    </div>

                    <div className={`shrink-0 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                      ▾
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                        Detail per mapel
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {summary.mapel.map((m) => {
                          const pct   = Math.min(100, Math.round((m.skor / 40) * 100))
                          const bar   =
                            m.skor >= 30 ? "bg-emerald-500"
                            : m.skor >= 20 ? "bg-indigo-500"
                            : m.skor >= 10 ? "bg-amber-500"
                            : "bg-rose-500"
                          const score =
                            m.skor >= 30 ? "text-emerald-600"
                            : m.skor >= 20 ? "text-indigo-600"
                            : m.skor >= 10 ? "text-amber-600"
                            : "text-rose-500"

                          return (
                            <div key={m.kategori} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <p className="text-[11px] font-medium text-slate-500 mb-1 truncate">{m.kategori}</p>
                              <p className={`text-2xl font-bold mb-2 ${score}`}>{m.skor}</p>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                        <div className="flex gap-5">
                          {[
                            { label: "Total skor",   val: summary.total        },
                            { label: "Rata-rata",     val: summary.rata         },
                            { label: "Jumlah mapel",  val: summary.mapel.length },
                          ].map((s) => (
                            <div key={s.label}>
                              <p className="text-[10px] text-indigo-400 font-medium">{s.label}</p>
                              <p className="text-lg font-bold text-indigo-700">{s.val}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-indigo-400">
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
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────

const STAT_STYLES: Record<string, { bg: string; num: string; label: string }> = {
  indigo:  { bg: "bg-indigo-50  border-indigo-100",  num: "text-indigo-700",  label: "text-indigo-400"  },
  violet:  { bg: "bg-violet-50  border-violet-100",  num: "text-violet-700",  label: "text-violet-400"  },
  amber:   { bg: "bg-amber-50   border-amber-100",   num: "text-amber-700",   label: "text-amber-400"   },
  emerald: { bg: "bg-emerald-50 border-emerald-100", num: "text-emerald-700", label: "text-emerald-400" },
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const s = STAT_STYLES[color] ?? STAT_STYLES.indigo
  return (
    <div className={`border rounded-xl px-4 py-3 ${s.bg}`}>
      <p className={`text-[11px] font-medium mb-1 ${s.label}`}>{label}</p>
      <p className={`text-2xl font-bold ${s.num}`}>{value}</p>
    </div>
  )
}

// ── PAKET BADGE ───────────────────────────────────────────────

const PAKET_COLORS: Record<string, string> = {
  "Paket ipa":    "bg-sky-100    text-sky-700",
  "Paket ips":    "bg-emerald-100 text-emerald-700",
  "Paket bahasa": "bg-violet-100 text-violet-700",
  "Paket smk":    "bg-orange-100 text-orange-700",
}

function PaketBadge({ paket }: { paket?: string }) {
  const cls = PAKET_COLORS[paket || ""] || "bg-slate-100 text-slate-500"
  return (
    <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
      {paket || "-"}
    </span>
  )
}

// ── NILAI BADGE ───────────────────────────────────────────────

function NilaiBadge({ skor }: { skor: number }) {
  const color =
    skor >= 30 ? "bg-emerald-100 text-emerald-700"
    : skor >= 20 ? "bg-indigo-100 text-indigo-700"
    : skor >= 10 ? "bg-amber-100  text-amber-700"
    : "bg-rose-100 text-rose-600"

  return (
    <span className={`inline-flex items-center justify-center h-8 min-w-[48px] px-3 rounded-lg text-sm font-bold ${color}`}>
      {skor}
    </span>
  )
}
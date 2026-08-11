"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

type TopUser = {
  skor: number
  user_id: string
  email: string
  nama: string
  foto?: string
}

type PaketStat = {
  key: string
  nama: string
  selesai: number      // jumlah siswa yang sudah selesai SEMUA mapel di paket ini
  belum: number        // jumlah siswa yang sudah mulai tapi belum selesai semua mapel
  totalSiswa: number   // selesai + belum
  isUndetermined: boolean // paket ini belum dikenali (tidak ada di tabel packages), jadi "selesai" gak bisa dipastikan
}

type KelasStat = {
  key: string
  nama: string
  selesai: number      // jumlah siswa yang sudah selesai SEMUA paket di kelas ini
  belum: number        // jumlah siswa yang sudah mulai tapi belum selesai semua paket
  totalSiswa: number   // selesai + belum
  hasUndeterminedPkg: boolean // kelas ini punya paket yang belum bisa dipastikan status wajibnya
}

type AnalyticsView = "harian" | "paket" | "kelas"

type PaketProgressItem = {
  pkgId: string
  namaPaket: string
  mapelDone: number
  mapelTotal: number   // 0 berarti paket ini belum dikenali (status gak bisa dipastikan)
}

type StudentMonitor = {
  user_id: string
  nama: string
  email: string
  foto?: string
  kelasNama: string       // gabungan nama kelas kalau siswa ada di lebih dari satu kelas
  paketList: PaketProgressItem[]
  paketSelesai: number
  paketTotal: number      // hanya paket yang bisa dipastikan (wajibnya dikenali)
  status: "belum" | "proses" | "selesai"
}

type UjianSelesaiItem = {
  id: number
  namaSiswa: string
  emailSiswa: string
  foto?: string
  namaPaket: string
  namaKelas: string
  skor: number
  tanggal: string
  kategori: string
}

const MENU = [
  { label: "Dashboard",      icon: "⌂",  path: "/admin"         },
  { label: "Kelola Soal",    icon: "✎",  path: "/admin/soal"    },
  { label: "Materi",         icon: "◈",  path: "/admin/materi"  },
  { label: "Kelas",          icon: "▤",  path: "/admin/kelas"   },   // ← tambahin ini
  { label: "Ranking",        icon: "◎",  path: "/admin/ranking" },
  { label: "Rekap Nilai",    icon: "≋",  path: "/admin/rekap"   },
  { label: "Manajemen User", icon: "◉",  path: "/admin/users"   },
  { label: "Token Ujian",    icon: "⟐",  path: "/admin/token"   },
]

const G = {
  teal:   "linear-gradient(135deg,#0ea5e9,#0d9488)",
  violet: "linear-gradient(135deg,#7c3aed,#4f46e5)",
  amber:  "linear-gradient(135deg,#f59e0b,#ef4444)",
  hero:   "linear-gradient(135deg,#0a0f1e 0%,#0d1b3e 60%,#0a2040 100%)",
}

/* avatar gradient palette per initial */
const AVATAR_COLORS = [
  ["#0ea5e9","#0284c7"],["#7c3aed","#4f46e5"],["#f59e0b","#ef4444"],
  ["#10b981","#059669"],["#f43f5e","#e11d48"],["#06b6d4","#0891b2"],
  ["#8b5cf6","#6d28d9"],["#ec4899","#db2777"],
]
const avatarGrad = (name: string) => {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  const [a, b] = AVATAR_COLORS[idx]
  return `linear-gradient(135deg,${a},${b})`
}

/* ══════════════════════════════════════════════════════════
   FIX: Perhitungan "X/5 mapel" → seharusnya "X/4 mapel"
   Setiap paket punya 3 mapel WAJIB TETAP (Matematika, Bahasa
   Indonesia, Bahasa Inggris) + 1 mapel PENDAMPING yang siswa
   pilih sendiri dari beberapa opsi (Fisika/Kimia/Biologi, dst).
   Total mapel wajib per paket = 4 (bukan jumlah semua kategori
   soal yang numpuk di package_soal, yang bisa 5-6 karena berisi
   semua opsi pendamping sekaligus).
══════════════════════════════════════════════════════════ */

// 3 mapel yang WAJIB dikerjakan semua siswa di setiap paket
const WAJIB_TETAP = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris"]

// Fallback daftar opsi pendamping per kategori dasar paket,
// dipakai kalau tabel package_subjects kosong untuk paket itu.
// Ini SAMA PERSIS dengan PENDAMPING_MAP di halaman
// /ujian/package/[id]/page.tsx supaya konsisten.
const PENDAMPING_MAP: Record<string, string[]> = {
  "Paket IPA":    ["Fisika", "Kimia", "Biologi"],
  "Paket IPS":    ["Ekonomi", "Geografi", "Sosiologi"],
  "Paket SMK":    ["PPKN", "PKK"],
  "Paket Bahasa": ["Bahasa Jerman", "Bahasa Jepang", "Bahasa Arab"],
}

// "Paket ipa 2" → "Paket IPA"  (sama seperti getBaseKategori di halaman ujian)
function getBaseKategoriAdmin(nama: string): string {
  const n = (nama || "").toLowerCase()
  if (n.includes("ipa"))    return "Paket IPA"
  if (n.includes("ips"))    return "Paket IPS"
  if (n.includes("smk"))    return "Paket SMK"
  if (n.includes("bahasa")) return "Paket Bahasa"
  return nama
}

type WajibDef = { wajibTetap: string[]; opsiPendamping: string[] }

// Bangun definisi "wajib" yang BENAR untuk setiap package_id:
// selalu 3 mapel tetap + daftar opsi pendamping (siswa cuma pilih 1 dari opsi ini).
function buildWajibMap(
  packagesData: { id: number; nama_paket: string }[],
  packageSubjectsData: { package_id: number; subject: string }[],
): Record<string, WajibDef> {
  const pendampingByPkg: Record<string, string[]> = {}
  ;(packageSubjectsData || []).forEach((s: any) => {
    const key = String(s.package_id)
    if (!pendampingByPkg[key]) pendampingByPkg[key] = []
    pendampingByPkg[key].push(s.subject)
  })

  const result: Record<string, WajibDef> = {}
  ;(packagesData || []).forEach((p: any) => {
    const key = String(p.id)
    let opsi = pendampingByPkg[key] || []

    // Fallback ke PENDAMPING_MAP kalau package_subjects kosong untuk paket ini
    if (opsi.length === 0) {
      const baseKategori = getBaseKategoriAdmin(p.nama_paket)
      const matchedKey = Object.keys(PENDAMPING_MAP).find(
        (k) => k.toLowerCase() === baseKategori.toLowerCase()
      )
      if (matchedKey) opsi = PENDAMPING_MAP[matchedKey]
    }

    result[key] = { wajibTetap: WAJIB_TETAP, opsiPendamping: opsi }
  })
  return result
}

// Total mapel wajib untuk 1 paket = 3 tetap + (1 kalau paket itu punya opsi pendamping, 0 kalau tidak)
function getTotalWajib(def?: WajibDef): number {
  if (!def) return 0
  return def.wajibTetap.length + (def.opsiPendamping.length > 0 ? 1 : 0)
}

// Berapa dari yang wajib itu yang SUDAH dikerjakan siswa,
// berdasarkan Set kategori yang muncul di tabel hasil untuk siswa+paket itu.
// Pendamping dihitung selesai kalau siswa sudah mengerjakan SALAH SATU
// dari opsi pendamping paket itu (bukan harus semua opsi).
function getDoneWajib(def: WajibDef | undefined, doneSet: Set<string> | undefined): number {
  if (!def) return 0
  const done = doneSet || new Set<string>()
  let count = def.wajibTetap.filter((k) => done.has(k)).length
  if (def.opsiPendamping.length > 0 && def.opsiPendamping.some((k) => done.has(k))) {
    count += 1
  }
  return count
}

/* custom bar tooltip */
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#0a0f1e",
      border: "1px solid rgba(56,189,248,.35)",
      borderRadius: 10,
      padding: "8px 14px",
      fontFamily: "'DM Sans',sans-serif",
      fontSize: 12,
      color: "#f1f5f9",
      boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    }}>
      <p style={{ color: "#bcd4ea", marginBottom: 3, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</p>
      <p style={{ color: "#38bdf8", fontWeight: 800, fontSize: 16 }}>{payload[0].value} <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 400 }}>ujian</span></p>
    </div>
  )
}

export default function AdminDashboard() {
  const router   = useRouter()
  const pathname = usePathname()

  const [totalSoal,   setTotalSoal  ] = useState(0)
  const [totalUser,   setTotalUser  ] = useState(0)
  const [totalHasil,  setTotalHasil ] = useState(0)
  const [chartData,   setChartData  ] = useState<any[]>([])
  const [topUser,     setTopUser    ] = useState<TopUser[]>([])
  const [lbRawHasil,  setLbRawHasil ] = useState<{ user_id: string; package_id: string | null; skor: number }[]>([])
  const [lbProfiles,  setLbProfiles ] = useState<any[]>([])
  const [lbPackages,  setLbPackages ] = useState<{ id: number; nama_paket: string }[]>([])
  const [lbKelas,     setLbKelas    ] = useState<{ id: number; nama_kelas: string }[]>([])
  const [lbKelasToPkg,setLbKelasToPkg] = useState<Record<number, string[]>>({})
  const [lbFilter,    setLbFilter   ] = useState<string>("all") // "all" | "paket:<id>" | "kelas:<id>"
  const [paketStats,  setPaketStats ] = useState<PaketStat[]>([])
  const [paketTanpaSoal, setPaketTanpaSoal] = useState(0) // paket yg direferensikan di hasil tapi gak dikenali di tabel packages
  const [kelasStats,  setKelasStats ] = useState<KelasStat[]>([])
  const [kelasTanpaPaket, setKelasTanpaPaket] = useState(0) // kelas yg belum py paket sama sekali (kelas_paket kosong)
  const [monitorData,     setMonitorData    ] = useState<StudentMonitor[]>([])
  const [monitorKelasList,setMonitorKelasList] = useState<{ id: number; nama_kelas: string }[]>([])
  const [monitorFilterKelas, setMonitorFilterKelas] = useState<string>("all")
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>("harian")
  const [adminName,   setAdminName  ] = useState("Admin")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading,     setLoading    ] = useState(true)

  // ── Detail "Ujian Selesai" (modal) ──
  const [showUjianModal,     setShowUjianModal    ] = useState(false)
  const [ujianDetail,        setUjianDetail       ] = useState<UjianSelesaiItem[]>([])
  const [loadingUjianDetail, setLoadingUjianDetail] = useState(false)
  const [ujianSearch,        setUjianSearch       ] = useState("")

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", data.user.id).single()
    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak!"); router.push("/dashboard"); return
    }
    setAdminName(profile.nama || "Admin")
    await Promise.all([getStats(), getChart(), getTopUser(), getCompletionStats(), getMonitoringData()])
    setLoading(false)
  }

  async function getStats() {
    const [{ count: soal }, { count: user }, { count: hasil }] =
      await Promise.all([
        supabase.from("soal"    ).select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("hasil"   ).select("*", { count: "exact", head: true }),
      ])
    setTotalSoal(soal   || 0)
    setTotalUser(user   || 0)
    setTotalHasil(hasil || 0)
  }

  async function getChart() {
    const { data } = await supabase
      .from("hasil").select("tanggal,skor").order("tanggal", { ascending: true })
    /* group by date: store { jumlah, maxSkor } */
    const map: Record<string, { jumlah: number; maxSkor: number }> = {}
    data?.forEach((item: any) => {
      const tgl = new Date(item.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      if (!map[tgl]) map[tgl] = { jumlah: 0, maxSkor: 0 }
      map[tgl].jumlah++
      if ((item.skor || 0) > map[tgl].maxSkor) map[tgl].maxSkor = item.skor || 0
    })
    setChartData(Object.keys(map).map((k) => ({
      tanggal: k,
      jumlah:  map[k].jumlah,
      maxSkor: map[k].maxSkor,
    })))
  }

  async function getTopUser() {
    const [
      { data: hasilData },
      { data: profiles },
      { data: packagesData },
      { data: kelasData },
      { data: relasiData },
    ] = await Promise.all([
      supabase.from("hasil").select("user_id,package_id,skor"),
      supabase.from("profiles").select("*"),
      supabase.from("packages").select("id,nama_paket").order("id", { ascending: true }),
      supabase.from("kelas").select("id,nama_kelas").order("id", { ascending: true }),
      supabase.from("kelas_paket").select("kelas_id,package_id"),
    ])
    if (!hasilData || !profiles) return

    const kelasToPkg: Record<number, string[]> = {}
    ;(relasiData || []).forEach((r: any) => {
      if (!kelasToPkg[r.kelas_id]) kelasToPkg[r.kelas_id] = []
      kelasToPkg[r.kelas_id].push(String(r.package_id))
    })

    setLbRawHasil(hasilData as any)
    setLbProfiles(profiles)
    setLbPackages((packagesData || []) as any)
    setLbKelas((kelasData || []) as any)
    setLbKelasToPkg(kelasToPkg)
    setTopUser(computeTopUser(hasilData as any, profiles, "all", kelasToPkg))
  }

  // dipisah jadi fungsi murni supaya bisa dipanggil ulang saat filter berganti,
  // tanpa perlu fetch ulang ke database.
  function computeTopUser(
    hasilRows: { user_id: string; package_id: string | null; skor: number }[],
    profiles: any[],
    filter: string,
    kelasToPkg: Record<number, string[]>,
  ): TopUser[] {
    let rows = hasilRows

    if (filter.startsWith("paket:")) {
      const pkgId = filter.slice("paket:".length)
      rows = rows.filter((h) => String(h.package_id) === pkgId)
    } else if (filter.startsWith("kelas:")) {
      const kelasId = Number(filter.slice("kelas:".length))
      const pkgIds = new Set(kelasToPkg[kelasId] || [])
      rows = rows.filter((h) => h.package_id && pkgIds.has(String(h.package_id)))
    }

    const bestMap: Record<string, any> = {}
    rows.forEach((item: any) => {
      if (!bestMap[item.user_id] || item.skor > bestMap[item.user_id].skor)
        bestMap[item.user_id] = item
    })
    return Object.values(bestMap)
      .map((item: any) => {
        const user = profiles.find((p: any) => p.id === item.user_id)
        return { user_id: item.user_id, skor: item.skor, email: user?.email || "-", nama: user?.nama || "Siswa", foto: user?.foto || "" }
      })
      .sort((a: any, b: any) => b.skor - a.skor)
      .slice(0, 5)
  }

  function handleLbFilterChange(value: string) {
    setLbFilter(value)
    setTopUser(computeTopUser(lbRawHasil, lbProfiles, value, lbKelasToPkg))
  }

  // Satu fungsi untuk menghitung "selesai" sebenarnya, berjenjang:
  //   selesai 1 paket  = siswa punya nilai untuk 3 mapel wajib tetap + 1 mapel pendamping pilihannya
  //   selesai 1 kelas  = siswa sudah "selesai paket" untuk SEMUA paket yang terhubung ke kelas itu (lewat kelas_paket)
  async function getCompletionStats() {
    const [
      { data: hasilData },
      { data: packagesData },
      { data: packageSubjectsData },   // ← dipakai untuk hitung mapel wajib yang benar (3 tetap + 1 pendamping)
      { data: kelasData },
      { data: relasiData },
    ] = await Promise.all([
      supabase.from("hasil").select("user_id,package_id,kategori,skor"),
      supabase.from("packages").select("id,nama_paket"),
      supabase.from("package_subjects").select("package_id,subject"),
      supabase.from("kelas").select("id,nama_kelas"),
      supabase.from("kelas_paket").select("kelas_id,package_id"),
    ])
    if (!hasilData) return

    const nameMapPkg: Record<string, string> = {}
    ;(packagesData || []).forEach((p: any) => { nameMapPkg[String(p.id)] = p.nama_paket })

    // pkgId -> { wajibTetap, opsiPendamping }  (total wajib = 3 atau 4, BUKAN dari package_soal)
    const wajibMapPkg = buildWajibMap(packagesData || [], packageSubjectsData || [])

    // user_id -> package_id -> Set kategori yang sudah dikerjakan (ada di 'hasil')
    const userPkgKategori: Record<string, Record<string, Set<string>>> = {}
    ;(hasilData || []).forEach((h: any) => {
      if (!h.user_id || !h.package_id || !h.kategori) return
      const pkgKey = String(h.package_id)
      if (!userPkgKategori[h.user_id]) userPkgKategori[h.user_id] = {}
      if (!userPkgKategori[h.user_id][pkgKey]) userPkgKategori[h.user_id][pkgKey] = new Set()
      userPkgKategori[h.user_id][pkgKey].add(h.kategori)
    })

    /* ── PER PAKET ── */
    // hitung, untuk tiap paket yang DIKENALI (ada di tabel packages), berapa siswa yang selesai vs belum
    const paketAgg: Record<string, { selesai: number; belum: number }> = {}
    Object.entries(userPkgKategori).forEach(([, pkgMap]) => {
      Object.entries(pkgMap).forEach(([pkgKey, doneSet]) => {
        const def = wajibMapPkg[pkgKey]
        const total = getTotalWajib(def)
        if (!def || total === 0) return // paket gak dikenal -> dihitung terpisah di bawah

        if (!paketAgg[pkgKey]) paketAgg[pkgKey] = { selesai: 0, belum: 0 }
        const done = getDoneWajib(def, doneSet)
        const lengkap = done === total
        if (lengkap) paketAgg[pkgKey].selesai++
        else paketAgg[pkgKey].belum++
      })
    })

    const paketResult: PaketStat[] = Object.entries(paketAgg)
      .map(([key, v]) => ({
        key,
        nama: nameMapPkg[key] || `Paket #${key}`,
        selesai: v.selesai,
        belum: v.belum,
        totalSiswa: v.selesai + v.belum,
        isUndetermined: false,
      }))
      .sort((a, b) => b.totalSiswa - a.totalSiswa)

    // paket yang direferensikan di hasil tapi tidak dikenali di tabel packages -> statusnya gak bisa dipastikan
    const pkgIdsDiHasil = new Set<string>()
    ;(hasilData || []).forEach((h: any) => { if (h.package_id) pkgIdsDiHasil.add(String(h.package_id)) })
    let paketTanpaSoalCount = 0
    pkgIdsDiHasil.forEach((pkgKey) => {
      if (getTotalWajib(wajibMapPkg[pkgKey]) === 0) paketTanpaSoalCount++
    })

    /* ── PER KELAS ── */
    // kelas_id -> array package_id yang terhubung
    const kelasToPkg: Record<number, string[]> = {}
    ;(relasiData || []).forEach((r: any) => {
      if (!kelasToPkg[r.kelas_id]) kelasToPkg[r.kelas_id] = []
      kelasToPkg[r.kelas_id].push(String(r.package_id))
    })
    // package_id -> array kelas_id (satu paket bisa dipakai di banyak kelas)
    const pkgToKelas: Record<string, number[]> = {}
    ;(relasiData || []).forEach((r: any) => {
      const pkgKey = String(r.package_id)
      if (!pkgToKelas[pkgKey]) pkgToKelas[pkgKey] = []
      pkgToKelas[pkgKey].push(r.kelas_id)
    })

    const nameMapKelas: Record<number, string> = {}
    ;(kelasData || []).forEach((k: any) => { nameMapKelas[k.id] = k.nama_kelas })

    // helper: apakah siswa `userId` sudah selesai paket `pkgKey`?
    const isPaketSelesai = (userId: string, pkgKey: string): boolean | null => {
      const def = wajibMapPkg[pkgKey]
      const total = getTotalWajib(def)
      if (!def || total === 0) return null // gak bisa dipastikan (paket tidak dikenali)
      const doneSet = userPkgKategori[userId]?.[pkgKey]
      return getDoneWajib(def, doneSet) === total
    }

    // kumpulkan siswa yang pernah menyentuh tiap kelas (lewat paket yang ia kerjakan)
    const siswaPerKelas: Record<number, Set<string>> = {}
    Object.entries(userPkgKategori).forEach(([userId, pkgMap]) => {
      Object.keys(pkgMap).forEach((pkgKey) => {
        ;(pkgToKelas[pkgKey] || []).forEach((kid) => {
          if (!siswaPerKelas[kid]) siswaPerKelas[kid] = new Set()
          siswaPerKelas[kid].add(userId)
        })
      })
    })

    const kelasAgg: Record<number, { selesai: number; belum: number; hasUndeterminedPkg: boolean }> = {}
    Object.keys(nameMapKelas).forEach((kidStr) => {
      const kid = Number(kidStr)
      const paketKelas = kelasToPkg[kid] || []
      const hasUndetermined = paketKelas.some((pk) => getTotalWajib(wajibMapPkg[pk]) === 0)
      kelasAgg[kid] = { selesai: 0, belum: 0, hasUndeterminedPkg: hasUndetermined }
    })

    Object.entries(siswaPerKelas).forEach(([kidStr, siswaSet]) => {
      const kid = Number(kidStr)
      const paketKelas = (kelasToPkg[kid] || []).filter((pk) => getTotalWajib(wajibMapPkg[pk]) > 0)
      if (!kelasAgg[kid]) kelasAgg[kid] = { selesai: 0, belum: 0, hasUndeterminedPkg: false }
      if (paketKelas.length === 0) return // semua paket di kelas ini gak dikenali, gak bisa dihitung siapa yang selesai
      siswaSet.forEach((userId) => {
        const lengkap = paketKelas.every((pk) => isPaketSelesai(userId, pk) === true)
        if (lengkap) kelasAgg[kid].selesai++
        else kelasAgg[kid].belum++
      })
    })

    const kelasResult: KelasStat[] = Object.entries(kelasAgg)
      .filter(([, v]) => v.selesai + v.belum > 0 || v.hasUndeterminedPkg)
      .map(([kid, v]) => ({
        key: kid,
        nama: nameMapKelas[Number(kid)] || `Kelas #${kid}`,
        selesai: v.selesai,
        belum: v.belum,
        totalSiswa: v.selesai + v.belum,
        hasUndeterminedPkg: v.hasUndeterminedPkg,
      }))
      .sort((a, b) => b.totalSiswa - a.totalSiswa)

    // kelas yang sama sekali belum punya paket terhubung (kelas_paket kosong)
    const kelasTanpaPaketCount = Object.keys(nameMapKelas)
      .map(Number)
      .filter((kid) => (kelasToPkg[kid] || []).length === 0).length

    setPaketStats(paketResult)
    setPaketTanpaSoal(paketTanpaSoalCount)
    setKelasStats(kelasResult)
    setKelasTanpaPaket(kelasTanpaPaketCount)
  }

  // Monitoring per siswa: untuk tiap siswa yang terdaftar di sebuah kelas (lewat akses_kelas),
  // tunjukkan progresnya berjenjang: paket apa aja yang wajib (dari kelas_paket), dan per paket
  // sudah berapa mapel yang dikerjakan dari 4 mapel wajib (3 tetap + 1 pendamping pilihan siswa).
  async function getMonitoringData() {
    const [
      { data: aksesData },
      { data: kelasData },
      { data: relasiData },
      { data: packagesData },
      { data: packageSubjectsData },   // ← dipakai untuk hitung mapel wajib yang benar (3 tetap + 1 pendamping)
      { data: hasilData },
      { data: profilesData },
    ] = await Promise.all([
      supabase.from("akses_kelas").select("user_id,kelas_id"),
      supabase.from("kelas").select("id,nama_kelas"),
      supabase.from("kelas_paket").select("kelas_id,package_id"),
      supabase.from("packages").select("id,nama_paket"),
      supabase.from("package_subjects").select("package_id,subject"),
      supabase.from("hasil").select("user_id,package_id,kategori"),
      supabase.from("profiles").select("id,nama,email,foto"),
    ])
    if (!aksesData) return

    const nameMapPkg: Record<string, string> = {}
    ;(packagesData || []).forEach((p: any) => { nameMapPkg[String(p.id)] = p.nama_paket })

    // pkgId -> { wajibTetap, opsiPendamping } (total wajib = 3 atau 4, BUKAN dari package_soal)
    const wajibMapPkg = buildWajibMap(packagesData || [], packageSubjectsData || [])

    const nameMapKelas: Record<number, string> = {}
    ;(kelasData || []).forEach((k: any) => { nameMapKelas[k.id] = k.nama_kelas })

    const kelasToPkg: Record<number, string[]> = {}
    ;(relasiData || []).forEach((r: any) => {
      if (!kelasToPkg[r.kelas_id]) kelasToPkg[r.kelas_id] = []
      kelasToPkg[r.kelas_id].push(String(r.package_id))
    })

    // user_id -> package_id -> Set kategori yang sudah dikerjakan
    const userPkgKategori: Record<string, Record<string, Set<string>>> = {}
    ;(hasilData || []).forEach((h: any) => {
      if (!h.user_id || !h.package_id || !h.kategori) return
      const pkgKey = String(h.package_id)
      if (!userPkgKategori[h.user_id]) userPkgKategori[h.user_id] = {}
      if (!userPkgKategori[h.user_id][pkgKey]) userPkgKategori[h.user_id][pkgKey] = new Set()
      userPkgKategori[h.user_id][pkgKey].add(h.kategori)
    })

    const profileMap: Record<string, any> = {}
    ;(profilesData || []).forEach((p: any) => { profileMap[p.id] = p })

    // kumpulkan kelas & paket wajib per siswa (dedupe kalau siswa ada di >1 kelas dengan paket sama)
    const userKelasNames: Record<string, Set<string>> = {}
    const userPkgSet: Record<string, Set<string>> = {}
    ;(aksesData || []).forEach((a: any) => {
      if (!userKelasNames[a.user_id]) userKelasNames[a.user_id] = new Set()
      userKelasNames[a.user_id].add(nameMapKelas[a.kelas_id] || `Kelas #${a.kelas_id}`)
      if (!userPkgSet[a.user_id]) userPkgSet[a.user_id] = new Set()
      ;(kelasToPkg[a.kelas_id] || []).forEach((pkgId) => userPkgSet[a.user_id].add(pkgId))
    })

    const result: StudentMonitor[] = Object.keys(userKelasNames).map((userId) => {
      const pkgIds = Array.from(userPkgSet[userId] || [])
      const paketList: PaketProgressItem[] = pkgIds.map((pkgId) => {
        const def = wajibMapPkg[pkgId]
        const mapelTotal = getTotalWajib(def)
        const doneSet = userPkgKategori[userId]?.[pkgId]
        const mapelDone = getDoneWajib(def, doneSet)
        return { pkgId, namaPaket: nameMapPkg[pkgId] || `Paket #${pkgId}`, mapelDone, mapelTotal }
      })

      const paketTerdefinisi = paketList.filter((p) => p.mapelTotal > 0)
      const paketSelesai = paketTerdefinisi.filter((p) => p.mapelDone === p.mapelTotal).length
      const totalMapelDikerjakan = paketList.reduce((sum, p) => sum + p.mapelDone, 0)

      let status: StudentMonitor["status"] = "proses"
      if (totalMapelDikerjakan === 0) status = "belum"
      else if (paketTerdefinisi.length > 0 && paketSelesai === paketTerdefinisi.length) status = "selesai"

      const profile = profileMap[userId]
      return {
        user_id: userId,
        nama: profile?.nama || "Siswa",
        email: profile?.email || "-",
        foto: profile?.foto || "",
        kelasNama: Array.from(userKelasNames[userId]).join(", "),
        paketList,
        paketSelesai,
        paketTotal: paketTerdefinisi.length,
        status,
      }
    })

    result.sort((a, b) => {
      const order = { proses: 0, belum: 1, selesai: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.nama.localeCompare(b.nama)
    })

    setMonitorData(result)
    setMonitorKelasList((kelasData || []) as any)
  }

  // ── Detail lengkap "Ujian Selesai": siapa, paket apa, kelas mana, skor berapa, kapan ──
  async function openUjianSelesai() {
    setShowUjianModal(true)
    setUjianSearch("")

    if (ujianDetail.length > 0) return // sudah pernah di-fetch, gak perlu ulang

    setLoadingUjianDetail(true)

    const { data: hasilData, error: hasilError } = await supabase
      .from("hasil")
      .select("id,user_id,skor,tanggal,kategori,paket,package_id")
      .order("tanggal", { ascending: false })

    if (hasilError || !hasilData) {
      console.log(hasilError)
      setLoadingUjianDetail(false)
      return
    }

    const [
      { data: profilesData },
      { data: packagesData },
      { data: kelasPaketData },
      { data: kelasData },
    ] = await Promise.all([
      supabase.from("profiles").select("id,nama,email,foto"),
      supabase.from("packages").select("id,nama_paket"),
      supabase.from("kelas_paket").select("kelas_id,package_id"),
      supabase.from("kelas").select("id,nama_kelas"),
    ])

    const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]))
    const packageMap = new Map((packagesData || []).map((p: any) => [p.id, p]))
    const kelasMap   = new Map((kelasData || []).map((k: any) => [k.id, k]))

    // package_id (bigint) -> daftar kelas_id yang memakai paket itu
    const paketKeKelas = new Map<number, number[]>()
    ;(kelasPaketData || []).forEach((kp: any) => {
      const arr = paketKeKelas.get(kp.package_id) || []
      arr.push(kp.kelas_id)
      paketKeKelas.set(kp.package_id, arr)
    })

    const merged: UjianSelesaiItem[] = hasilData.map((h: any) => {
      const pkgId = Number(h.package_id)
      const profile: any = profileMap.get(h.user_id)
      const pkg: any = packageMap.get(pkgId)
      const kelasIds = paketKeKelas.get(pkgId) || []
      const namaKelas = kelasIds
        .map((kid) => (kelasMap.get(kid) as any)?.nama_kelas)
        .filter(Boolean)
        .join(", ")

      return {
        id: h.id,
        namaSiswa: profile?.nama || "Siswa",
        emailSiswa: profile?.email || "-",
        foto: profile?.foto || "",
        namaPaket: pkg?.nama_paket || h.paket || "-",
        namaKelas: namaKelas || "-",
        skor: h.skor,
        tanggal: h.tanggal,
        kategori: h.kategori || "-",
      }
    })

    setUjianDetail(merged)
    setLoadingUjianDetail(false)
  }

  const filteredUjianDetail = useMemo(() => {
    const key = ujianSearch.toLowerCase().trim()
    if (!key) return ujianDetail
    return ujianDetail.filter((u) =>
      u.namaSiswa.toLowerCase().includes(key) ||
      u.emailSiswa.toLowerCase().includes(key) ||
      u.namaPaket.toLowerCase().includes(key) ||
      u.namaKelas.toLowerCase().includes(key)
    )
  }, [ujianDetail, ujianSearch])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  /* ─── rank badge ─── */
  const rankStyle = (i: number) =>
    i === 0 ? { bg: "rgba(251,191,36,.16)", text: "#b45309", border: "rgba(251,191,36,.4)",  medal: "🥇" }
    : i === 1 ? { bg: "rgba(100,116,139,.12)", text: "#475569", border: "rgba(100,116,139,.3)", medal: "🥈" }
    : i === 2 ? { bg: "rgba(251,146,60,.14)", text: "#c2410c", border: "rgba(251,146,60,.35)", medal: "🥉" }
    : { bg: "rgba(100,116,139,.08)", text: "#64748b", border: "rgba(100,116,139,.18)", medal: "" }

  /* ─── Sidebar ─── */
  const Sidebar = () => (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* ── sidebar nav ── */
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

        /* ── page entrance ── */
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { opacity:0; animation: fadeUp .5s cubic-bezier(.4,0,.2,1) forwards; }
        .d1{animation-delay:.04s}.d2{animation-delay:.10s}.d3{animation-delay:.16s}
        .d4{animation-delay:.22s}.d5{animation-delay:.28s}.d6{animation-delay:.34s}

        /* ── stat card ── */
        .stat-card { transition: transform .22s ease, box-shadow .22s ease; }
        .stat-card:hover { transform: translateY(-3px); }
        .stat-card-clickable { cursor: pointer; }

        /* ── quick menu ── */
        .qm-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .qm-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(15,23,42,.12); }

        /* ── leaderboard row ── */
        .tu-row { transition: background .15s ease; border-radius: 12px; }
        .tu-row:hover { background: rgba(14,165,233,.06); }

        /* ── score badge ── */
        .score-badge {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 13px;
          min-width: 40px;
          text-align: right;
          line-height: 1;
          letter-spacing: 0;
        }

        /* ── hero mini-stat clickable ── */
        .hero-mini-stat { transition: background .18s ease, transform .18s ease; }
        .hero-mini-stat-clickable { cursor: pointer; }
        .hero-mini-stat-clickable:hover { background: rgba(255,255,255,.1) !important; transform: translateX(2px); }

        /* ── ujian modal row ── */
        .ujian-row:hover { background: rgba(14,165,233,.05); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 4px; }

        /* recharts bar radius fix */
        .recharts-bar-rectangle path { transition: opacity .15s; }
        .recharts-bar-rectangle:hover path { opacity: .85; }
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
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(56,189,248,.1)" }}>
          <div className="flex items-center gap-3">
            <div style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", boxShadow: "0 4px 14px rgba(56,189,248,.4)" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-lg">
              🎓
            </div>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", letterSpacing: "0.04em", color: "#f8fafc" }}
                className="font-semibold text-[13px] leading-none">LAMPUNG</p>
              <p style={{ color: "#7dd3fc", letterSpacing: "1.5px" }}
                className="text-[10px] mt-1 font-normal">Smart Education</p>
            </div>
          </div>
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

  /* ─── Loading ─── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060f22" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-11 h-11">
          <div className="absolute inset-0 rounded-full border-2 border-sky-900" />
          <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "1px", color: "#7dabc9" }}
          className="text-xs font-medium">Memuat dashboard</p>
      </div>
    </div>
  )

  const STATS = [
    { title: "Total Soal",    value: totalSoal,  sub: "soal tersedia",   grad: G.teal,   glow: "#0ea5e9", clickable: false },
    { title: "Total Siswa",   value: totalUser,  sub: "siswa terdaftar", grad: G.violet, glow: "#7c3aed", clickable: false },
    { title: "Ujian Selesai", value: totalHasil, sub: "ujian selesai — klik untuk detail", grad: G.amber,  glow: "#f59e0b", clickable: true },
  ]

  const QUICK = [
    { title: "Kelola Soal", icon: "📝", path: "/admin/soal",    color: "#0ea5e9" },
    { title: "Materi",      icon: "📚", path: "/admin/materi",  color: "#7c3aed" },
    { title: "Ranking",     icon: "🏆", path: "/admin/ranking", color: "#f59e0b" },
    { title: "Rekap Nilai", icon: "📊", path: "/admin/rekap",   color: "#10b981" },
    { title: "Users",       icon: "👤", path: "/admin/users",   color: "#f43f5e" },
    { title: "Token",       icon: "🔑", path: "/admin/token",   color: "#06b6d4" },
  ]

  /* max value for bar highlight */
  const maxJumlah = Math.max(...chartData.map(d => d.jumlah), 1)

  return (
    <>
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#eef2f7" }}
        className="min-h-screen">

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
            className="font-semibold text-slate-800">Admin</p>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <main className="lg:ml-60 pt-14 lg:pt-0">
          <div className="p-4 md:p-6 lg:p-7 max-w-7xl mx-auto space-y-5">

            {/* ── HERO ── */}
            <div className="fade-up d1 relative rounded-2xl overflow-hidden" style={{ background: G.hero }}>
              {/* grid */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(rgba(56,189,248,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.05) 1px,transparent 1px)",
                  backgroundSize: "32px 32px",
                }} />
              {/* glows */}
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(56,189,248,.18),transparent 70%)" }} />
              <div className="absolute bottom-0 left-32 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(129,140,248,.12),transparent 70%)" }} />
              {/* top line */}
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: "linear-gradient(90deg,transparent,rgba(56,189,248,.6),rgba(129,140,248,.4),transparent)" }} />

              <div className="relative px-6 py-7 md:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase mb-3"
                    style={{ background: "rgba(56,189,248,.14)", border: "1px solid rgba(56,189,248,.28)", color: "#7dd3fc" }}>
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-sky-400" />
                    Academic Management System
                  </div>
                  <h1 style={{ fontFamily: "'Inter',sans-serif", lineHeight: "1.3", fontSize: "19px" }}
                    className="font-semibold text-white">
                    Selamat datang, <span style={{ color: "#7dd3fc" }}>{adminName}</span>
                  </h1>
                  <p style={{ fontWeight: 400, color: "#b6cfe4" }} className="mt-1.5 text-[13px] max-w-md leading-relaxed">
                    Kelola aktivitas pembelajaran, ujian siswa, dan monitoring akademik secara modern dan efisien.
                  </p>
                </div>

                <div className="flex flex-row lg:flex-col gap-2 lg:w-48">
                  {[
                    { label: "Soal Aktif",    value: totalSoal,  color: "#38bdf8", clickable: false },
                    { label: "Siswa",         value: totalUser,  color: "#34d399", clickable: false },
                    { label: "Ujian Selesai", value: totalHasil, color: "#fbbf24", clickable: true  },
                  ].map((s) => (
                    <div key={s.label}
                      onClick={s.clickable ? openUjianSelesai : undefined}
                      className={`hero-mini-stat flex items-center gap-3 px-4 py-2.5 rounded-xl flex-1 lg:flex-none ${s.clickable ? "hero-mini-stat-clickable" : ""}`}
                      style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}>
                      <div className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                      <p style={{ color: "#cbdcec" }} className="text-xs flex-1">{s.label}</p>
                      <p style={{ fontFamily: "'Inter',sans-serif", color: "#fff" }}
                        className="font-semibold text-sm">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STATS.map((s, idx) => (
                <div key={s.title}
                  onClick={s.clickable ? openUjianSelesai : undefined}
                  className={`stat-card fade-up d${idx + 2} rounded-2xl p-5 text-white relative overflow-hidden ${s.clickable ? "stat-card-clickable" : ""}`}
                  style={{ background: s.grad, boxShadow: `0 8px 28px ${s.glow}33` }}>
                  <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,.1)" }} />
                  <div className="absolute -right-2 top-8 w-16 h-16 rounded-full"  style={{ background: "rgba(255,255,255,.07)" }} />
                  <div className="relative">
                    <p style={{ letterSpacing: "1px", fontSize: "11px" }} className="font-medium text-white/80">{s.title}</p>
                    <p style={{ fontFamily: "'Inter',sans-serif" }} className="text-[26px] font-semibold mt-1.5 leading-none">{s.value}</p>
                    <p className="text-xs text-white/70 mt-1.5">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── BAR CHART + TOP USER ── */}
            <div className="fade-up d5 grid grid-cols-1 xl:grid-cols-5 gap-5">

              {/* ── Analytics (dropdown: Per Hari / Per Paket / Per Kelas) ── */}
              <div className="xl:col-span-3 bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: "1px solid rgba(15,23,42,.08)" }}>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div>
                    <p style={{ color: "#0284c7", letterSpacing: "1px", fontSize: "10px" }}
                      className="font-medium uppercase">Analytics</p>
                    <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "15px" }}
                      className="font-semibold text-slate-900 mt-0.5">
                      {analyticsView === "harian" ? "Ujian Per Hari" : analyticsView === "paket" ? "Ujian per Paket" : "Ujian per Kelas"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {analyticsView === "harian" && (
                      <>
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#0ea5e9" }} />
                        <span style={{ fontSize: "11px", color: "#64748b" }} className="font-medium">jumlah ujian</span>
                      </>
                    )}
                    {analyticsView === "paket" && paketTanpaSoal > 0 && (
                      <span className="text-[11px] font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(239,68,68,.08)", color: "#b91c1c" }}>
                        {paketTanpaSoal} paket belum ada soal
                      </span>
                    )}
                    {analyticsView === "kelas" && kelasTanpaPaket > 0 && (
                      <span className="text-[11px] font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(239,68,68,.08)", color: "#b91c1c" }}>
                        {kelasTanpaPaket} kelas tanpa paket
                      </span>
                    )}
                    <select
                      value={analyticsView}
                      onChange={(e) => setAnalyticsView(e.target.value as AnalyticsView)}
                      className="text-[11px] font-semibold pl-3 pr-2 py-1.5 rounded-full bg-slate-100 text-slate-700 border-none outline-none cursor-pointer"
                    >
                      <option value="harian">Per Hari</option>
                      <option value="paket">Per Paket</option>
                      <option value="kelas">Per Kelas</option>
                    </select>
                  </div>
                </div>

                <div style={{ height: 240, overflowY: analyticsView === "harian" ? "visible" : "auto" }}>
                  {analyticsView === "harian" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="tanggal"
                          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "'DM Sans',sans-serif" }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "'DM Sans',sans-serif" }}
                          axisLine={false} tickLine={false} allowDecimals={false}
                        />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(14,165,233,.08)", radius: 6 }} />
                        <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.jumlah === maxJumlah ? "#0284c7" : "#93c5fd"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {analyticsView === "paket" && (
                    paketStats.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-16">Belum ada data penyelesaian paket</p>
                    ) : (
                      <div className="space-y-3 pr-1">
                        {paketStats.map((p) => {
                          const pct = p.totalSiswa ? Math.round((p.selesai / p.totalSiswa) * 100) : 0
                          return (
                            <div key={p.key} className="flex items-center gap-3">
                              <span
                                className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 max-w-[140px] truncate"
                                style={{ background: "rgba(13,148,136,.1)", color: "#0d9488" }}
                                title={p.nama}
                              >
                                {p.nama}
                              </span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef2f7" }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#0d9488" }} />
                              </div>
                              <span className="text-xs font-semibold shrink-0 w-16 text-right" style={{ color: "#334155" }}>
                                {p.selesai}/{p.totalSiswa}
                              </span>
                              <span className="text-xs font-medium shrink-0 w-10 text-right" style={{ color: "#64748b" }}>
                                {pct}%
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  )}

                  {analyticsView === "kelas" && (
                    kelasStats.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-16">Belum ada data penyelesaian kelas</p>
                    ) : (
                      <div className="space-y-3 pr-1">
                        {kelasStats.map((k) => {
                          const pct = k.totalSiswa ? Math.round((k.selesai / k.totalSiswa) * 100) : 0
                          return (
                            <div key={k.key} className="flex items-center gap-3">
                              <span
                                className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 max-w-[140px] truncate"
                                style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}
                                title={k.nama}
                              >
                                {k.nama}
                                {k.hasUndeterminedPkg && <span title="Kelas ini punya paket yang belum bisa dipastikan status wajibnya" style={{ marginLeft: 4 }}>⚠</span>}
                              </span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef2f7" }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#7c3aed" }} />
                              </div>
                              <span className="text-xs font-semibold shrink-0 w-16 text-right" style={{ color: "#334155" }}>
                                {k.selesai}/{k.totalSiswa}
                              </span>
                              <span className="text-xs font-medium shrink-0 w-10 text-right" style={{ color: "#64748b" }}>
                                {pct}%
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  )}
                </div>

                <p style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", textAlign: analyticsView === "harian" ? "center" : "left" }}>
                  {analyticsView === "harian" && "Bar berwarna biru tua = hari dengan ujian terbanyak"}
                  {analyticsView === "paket" && "Selesai = siswa sudah punya nilai untuk 3 mapel wajib + 1 mapel pendamping pilihannya (bukan sekadar pernah mengerjakan)."}
                  {analyticsView === "kelas" && "Selesai = siswa sudah menyelesaikan semua paket yang terhubung ke kelas ini. ⚠ = kelas punya paket yang belum bisa dipastikan status wajibnya."}
                </p>
              </div>

              {/* ── Top Siswa ── */}
              <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm"
                style={{ border: "1px solid rgba(15,23,42,.08)" }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <p style={{ color: "#7c3aed", letterSpacing: "1px", fontSize: "10px" }}
                      className="font-medium uppercase">Leaderboard</p>
                    <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "15px" }}
                      className="font-semibold text-slate-900 mt-0.5">Top Siswa</h2>
                  </div>
                  <select
                    value={lbFilter}
                    onChange={(e) => handleLbFilterChange(e.target.value)}
                    className="text-[11px] font-semibold pl-3 pr-2 py-1.5 rounded-full bg-slate-100 text-slate-700 border-none outline-none cursor-pointer max-w-[140px]"
                  >
                    <option value="all">Semua Siswa</option>
                    <optgroup label="Per Paket">
                      {lbPackages.map((p) => (
                        <option key={`paket:${p.id}`} value={`paket:${p.id}`}>{p.nama_paket}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Per Kelas">
                      {lbKelas.map((k) => (
                        <option key={`kelas:${k.id}`} value={`kelas:${k.id}`}>{k.nama_kelas}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1">
                  {topUser.map((u, i) => {
                    const rs = rankStyle(i)
                    return (
                      <div key={i} className="tu-row flex items-center gap-2.5 px-2 py-2 cursor-pointer">

                        {/* rank medal */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
                          style={{ background: rs.bg, border: `1px solid ${rs.border}` }}>
                          {i < 3
                            ? <span>{rs.medal}</span>
                            : <span style={{ fontSize: "11px", fontWeight: 800, color: rs.text }}>{i + 1}</span>
                          }
                        </div>

                        {/* avatar */}
                        {u.foto
                          ? <img src={u.foto} className="w-8 h-8 rounded-xl object-cover shrink-0" alt="" />
                          : (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white"
                              style={{ background: avatarGrad(u.nama) }}>
                              {u.nama.charAt(0).toUpperCase()}
                            </div>
                          )
                        }

                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: "13px" }} className="font-semibold text-slate-900 truncate leading-tight">{u.nama}</p>
                          <p style={{ fontSize: "10px" }} className="text-slate-500 truncate mt-0.5">{u.email}</p>
                        </div>

                        {/* score badge */}
                        <div className="shrink-0 flex items-center justify-center rounded-lg px-2.5 py-1"
                          style={{ background: "rgba(14,165,233,.1)", border: "1px solid rgba(14,165,233,.2)", minWidth: "48px" }}>
                          <span className="score-badge" style={{ color: "#0369a1" }}>{u.skor}</span>
                        </div>
                      </div>
                    )
                  })}

                  {topUser.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">Belum ada data</p>
                  )}
                </div>

                {/* legend */}
                <div className="mt-4 pt-3 flex items-center gap-1.5"
                  style={{ borderTop: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "10px", color: "#64748b" }} className="font-medium">Skor tertinggi per siswa</span>
                  <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "auto" }}>
                    {lbFilter === "all"
                      ? "dari semua ujian"
                      : lbFilter.startsWith("paket:")
                        ? `di ${lbPackages.find(p => String(p.id) === lbFilter.slice(6))?.nama_paket || "paket ini"}`
                        : `di ${lbKelas.find(k => String(k.id) === lbFilter.slice(6))?.nama_kelas || "kelas ini"}`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* ── MONITORING PROGRESS SISWA ── */}
            <div className="fade-up d5 bg-white rounded-2xl p-5 shadow-sm"
              style={{ border: "1px solid rgba(15,23,42,.08)" }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <p style={{ color: "#0d9488", letterSpacing: "1px", fontSize: "10px" }}
                    className="font-medium uppercase">Monitoring</p>
                  <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "15px" }}
                    className="font-semibold text-slate-900 mt-0.5">Progress Pengerjaan Siswa</h2>
                </div>
                <select
                  value={monitorFilterKelas}
                  onChange={(e) => setMonitorFilterKelas(e.target.value)}
                  className="text-[11px] font-semibold pl-3 pr-2 py-1.5 rounded-full bg-slate-100 text-slate-700 border-none outline-none cursor-pointer"
                >
                  <option value="all">Semua Kelas</option>
                  {monitorKelasList.map((k) => (
                    <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>
                  ))}
                </select>
              </div>

              {/* ringkasan tahap */}
              {(() => {
                const filtered = monitorFilterKelas === "all"
                  ? monitorData
                  : monitorData.filter((s) => s.kelasNama.split(", ").includes(monitorFilterKelas))
                const belum   = filtered.filter((s) => s.status === "belum").length
                const proses  = filtered.filter((s) => s.status === "proses").length
                const selesai = filtered.filter((s) => s.status === "selesai").length

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-xl px-3 py-2.5" style={{ background: "#f1f5f9" }}>
                        <p style={{ fontSize: "10px", color: "#64748b" }} className="font-medium uppercase tracking-wide">Belum Mulai</p>
                        <p style={{ fontFamily: "'Inter',sans-serif" }} className="text-lg font-bold text-slate-700 mt-0.5">{belum}</p>
                      </div>
                      <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(245,158,11,.1)" }}>
                        <p style={{ fontSize: "10px", color: "#b45309" }} className="font-medium uppercase tracking-wide">Sedang Jalan</p>
                        <p style={{ fontFamily: "'Inter',sans-serif" }} className="text-lg font-bold text-amber-600 mt-0.5">{proses}</p>
                      </div>
                      <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(16,185,129,.1)" }}>
                        <p style={{ fontSize: "10px", color: "#047857" }} className="font-medium uppercase tracking-wide">Selesai Semua</p>
                        <p style={{ fontFamily: "'Inter',sans-serif" }} className="text-lg font-bold text-emerald-600 mt-0.5">{selesai}</p>
                      </div>
                    </div>

                    {/* daftar siswa */}
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {filtered.map((s) => {
                        const isOpen = expandedStudent === s.user_id
                        const statusStyle = s.status === "selesai"
                          ? { bg: "rgba(16,185,129,.1)", text: "#047857", label: "Selesai" }
                          : s.status === "proses"
                            ? { bg: "rgba(245,158,11,.1)", text: "#b45309", label: "Proses" }
                            : { bg: "#f1f5f9", text: "#64748b", label: "Belum Mulai" }
                        return (
                          <div key={s.user_id} className="rounded-xl" style={{ border: "1px solid rgba(15,23,42,.06)" }}>
                            <button
                              onClick={() => setExpandedStudent(isOpen ? null : s.user_id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                            >
                              {s.foto
                                ? <img src={s.foto} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
                                : (
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white"
                                    style={{ background: avatarGrad(s.nama) }}>
                                    {s.nama.charAt(0).toUpperCase()}
                                  </div>
                                )
                              }
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: "13px" }} className="font-semibold text-slate-900 truncate leading-tight">{s.nama}</p>
                                <p style={{ fontSize: "10px" }} className="text-slate-500 truncate mt-0.5">{s.kelasNama}</p>
                              </div>
                              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                                style={{ background: statusStyle.bg, color: statusStyle.text }}>
                                {statusStyle.label}
                              </span>
                              <span className="text-xs font-semibold shrink-0 w-14 text-right" style={{ color: "#334155" }}>
                                {s.paketSelesai}/{s.paketTotal} paket
                              </span>
                              <span style={{ color: "#94a3b8", fontSize: "11px" }} className="shrink-0">
                                {isOpen ? "▲" : "▼"}
                              </span>
                            </button>

                            {isOpen && (
                              <div className="px-3 pb-3 pt-1 space-y-2" style={{ borderTop: "1px solid rgba(15,23,42,.06)" }}>
                                {s.paketList.length === 0 && (
                                  <p className="text-xs text-slate-400 pt-2">Belum ada paket yang terhubung ke kelas siswa ini.</p>
                                )}
                                {s.paketList.map((p) => {
                                  const undetermined = p.mapelTotal === 0
                                  const pct = undetermined ? 0 : Math.round((p.mapelDone / p.mapelTotal) * 100)
                                  return (
                                    <div key={p.pkgId} className="flex items-center gap-3 pt-2">
                                      <span style={{ fontSize: "11px", color: "#334155" }} className="font-medium w-32 shrink-0 truncate" title={p.namaPaket}>
                                        {p.namaPaket}
                                      </span>
                                      {undetermined ? (
                                        <span style={{ fontSize: "10px", color: "#b91c1c" }} className="flex-1">belum bisa dipastikan</span>
                                      ) : (
                                        <>
                                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef2f7" }}>
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.mapelDone === p.mapelTotal ? "#10b981" : "#0ea5e9" }} />
                                          </div>
                                          <span style={{ fontSize: "11px", color: "#64748b" }} className="w-20 text-right shrink-0 font-medium">
                                            {p.mapelDone}/{p.mapelTotal} mapel
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {filtered.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-10">Belum ada siswa yang terdaftar di kelas manapun</p>
                      )}
                    </div>
                  </>
                )
              })()}

              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "12px" }}>
                Klik nama siswa untuk lihat rincian per paket & per mapel. "Selesai" = sudah menuntaskan 3 mapel wajib + 1 mapel pendamping di setiap paket kelasnya.
              </p>
            </div>

            {/* ── QUICK MENU ── */}
            <div className="fade-up d6">
              <p style={{ fontSize: "11px", letterSpacing: "0.5px", color: "#64748b" }}
                className="font-medium uppercase mb-3">Menu Cepat</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {QUICK.map((m) => (
                  <button key={m.path} onClick={() => router.push(m.path)}
                    className="qm-card bg-white rounded-2xl p-4 text-center"
                    style={{ border: "1px solid rgba(15,23,42,.08)" }}>
                    <div className="w-11 h-11 mx-auto rounded-xl flex items-center justify-center text-xl mb-2.5"
                      style={{ background: `${m.color}1c`, border: `1px solid ${m.color}33` }}>
                      {m.icon}
                    </div>
                    <p style={{ fontSize: "11.5px" }} className="font-semibold text-slate-800 leading-tight">{m.title}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ── MODAL DETAIL UJIAN SELESAI ── */}
      {showUjianModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(10,15,30,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowUjianModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "880px",
              maxHeight: "82vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,.35)",
            }}
          >
            {/* header, style seragam sama G.amber di stat card */}
<div style={{ background: G.amber, padding: "20px 22px 22px", position: "relative" }}>
  {/* dekorasi lingkaran — dibungkus terpisah biar overflow-hidden gak motong teks judul */}
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
    <div style={{ position: "absolute", right: "-20px", top: "-20px", width: "112px", height: "112px", borderRadius: "9999px", background: "rgba(255,255,255,.1)" }} />
    <div style={{ position: "absolute", right: "20px", top: "50px", width: "70px", height: "70px", borderRadius: "9999px", background: "rgba(255,255,255,.07)" }} />
  </div>

  <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
    <div>
      <p style={{ color: "rgba(255,255,255,.85)", fontSize: "10px", letterSpacing: "1px", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>
        Riwayat Ujian
      </p>
      <h2 style={{ fontFamily: "'Inter',sans-serif", color: "#fff", fontSize: "17px", fontWeight: 700, margin: "4px 0 0", lineHeight: 1.3 }}>
        Ujian Selesai ({ujianDetail.length})
      </h2>
    </div>
    <button
      onClick={() => setShowUjianModal(false)}
      style={{
        color: "#fff",
        fontSize: "18px",
        lineHeight: 1,
        background: "rgba(0,0,0,.18)",
        border: "1px solid rgba(255,255,255,.3)",
        borderRadius: "8px",
        width: "30px",
        height: "30px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      ×
    </button>
  </div>
</div>

            {/* search bar */}
            <div style={{ padding: "14px 22px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ position: "relative" }}>
                <input
                  value={ujianSearch}
                  onChange={(e) => setUjianSearch(e.target.value)}
                  placeholder="Cari nama siswa, email, paket, atau kelas..."
                  style={{
                    width: "100%",
                    height: "38px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    padding: "0 14px",
                    fontSize: "13px",
                    color: "#0f172a",
                    background: "#f8fafc",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loadingUjianDetail ? (
                <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                  Memuat data ujian...
                </div>
              ) : filteredUjianDetail.length === 0 ? (
                <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                  {ujianSearch ? "Tidak ditemukan hasil yang cocok" : "Belum ada ujian yang selesai"}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "10px 22px", color: "#64748b", fontWeight: 600, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Siswa</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Paket</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Kelas</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Mapel</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Skor</th>
                      <th style={{ textAlign: "left", padding: "10px 22px", color: "#64748b", fontWeight: 600, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUjianDetail.map((item) => (
                      <tr key={item.id} className="ujian-row" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 22px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {item.foto ? (
                              <img src={item.foto} alt="" style={{ width: "30px", height: "30px", borderRadius: "9px", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{
                                width: "30px", height: "30px", borderRadius: "9px",
                                background: avatarGrad(item.namaSiswa), color: "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "11px", fontWeight: 700, flexShrink: 0,
                              }}>
                                {item.namaSiswa.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, color: "#0f172a", fontWeight: 600, fontSize: "12.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                                {item.namaSiswa}
                              </p>
                              <p style={{ margin: 0, color: "#94a3b8", fontSize: "10.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                                {item.emailSiswa}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", color: "#334155", fontWeight: 500, maxWidth: "150px" }}>
                          {item.namaPaket}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#334155" }}>
                          {item.namaKelas}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{
                            fontSize: "10.5px", fontWeight: 600, padding: "3px 9px", borderRadius: "999px",
                            background: "rgba(14,165,233,.1)", color: "#0369a1",
                          }}>
                            {item.kategori}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{
                            fontFamily: "'Inter',sans-serif",
                            fontWeight: 700,
                            fontSize: "13px",
                            color: item.skor >= 80 ? "#059669" : item.skor >= 60 ? "#d97706" : "#e11d48",
                          }}>
                            {item.skor}
                          </span>
                        </td>
                        <td style={{ padding: "10px 22px", color: "#64748b", whiteSpace: "nowrap" }}>
                          {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
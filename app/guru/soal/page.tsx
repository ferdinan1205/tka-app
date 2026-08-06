"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { supabase } from "../../../lib/supabase"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import { MathJaxContext } from "better-react-mathjax"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import "react-quill-new/dist/quill.snow.css"
import {
  LayoutDashboard,
  FileQuestion,
  BookOpen,
  Package,
  Layers,
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
  Plus,
  Search,
  FileUp,
  FileDown,
  AlertTriangle,
  PackageCheck,
  LogOut,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/* DESAIN — sama persis dengan app/guru/page.tsx (dashboard)          */
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
  { href: "/guru/kelas", label: "Kelas", icon: Layers },
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

const quillStyle = `
  .ql-container { min-height: 120px; font-size: 15px; }
  .ql-editor { min-height: 120px; max-height: 320px; overflow-y: auto; line-height: 1.8; color: #242A38 !important; font-size: 15px; }
  .ql-editor p { color: #242A38 !important; }
  .ql-editor.ql-blank::before { color: #98A0B2; font-style: normal; font-size: 14px; }
  .ql-toolbar { border-bottom: 1px solid #E7E2D4 !important; background: #F5F3EC; }
  .ql-container.ql-snow { border: none !important; }
  .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #E7E2D4 !important; }
  .ql-toolbar .ql-stroke { stroke: #6B7080 !important; }
  .ql-toolbar .ql-fill { fill: #6B7080 !important; }
  .ql-toolbar .ql-picker { color: #6B7080 !important; }
  .ql-toolbar button:hover .ql-stroke { stroke: #1B2A4A !important; }
  .ql-toolbar button:hover .ql-fill { fill: #1B2A4A !important; }
  .ql-toolbar .ql-active .ql-stroke { stroke: #D98C2B !important; }
  .ql-toolbar .ql-active .ql-fill { fill: #D98C2B !important; }
`

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

type Soal = {
  id?: number
  pertanyaan: string
  opsi_a: string
  opsi_b: string
  opsi_c: string
  opsi_d: string
  opsi_e: string
  jawaban_benar: string
  kategori: string
  paket?: string
  pembahasan?: string
  video_url?: string
  gambar?: string
  pengantar?: string
  bacaan?: string
  package_ids?: number[]
  is_active?: boolean
}

type PackageT = {
  id: number
  nama_paket: string
}

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

const kategoriList = [
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris",
  "Fisika", "Kimia", "Biologi", "Ekonomi", "Geografi",
  "Sosiologi", "Sejarah", "Antropologi", "Bahasa Arab",
  "Bahasa Mandarin", "Bahasa Jepang", "Bahasa Korea",
  "Bahasa Jerman", "Bahasa Prancis", "PPKN", "PKK", "TPS", "Literasi",
]

const CARD_ACCENTS = ["#D98C2B", "#2F7A6D", "#1B2A4A", "#A32D2D", "#3B6D11", "#185FA5"]

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
    return <div className={`leading-7 ${className}`} style={{ color: palette.ink }} dangerouslySetInnerHTML={{ __html: normalized }} />
  }
  return <div ref={ref} className={`leading-7 ${className}`} style={{ color: palette.ink }} dangerouslySetInnerHTML={{ __html: normalized }} />
}

function MathPreview({ html }: { html: string }) {
  const [debouncedHtml, setDebouncedHtml] = useState(html)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedHtml(html), 400)
    return () => clearTimeout(id)
  }, [html])
  const normalized = useMemo(() => normalizeContent(debouncedHtml), [debouncedHtml])
  if (!normalized) return null
  return (
    <div className="mt-2 p-3 rounded-xl text-sm" style={{ background: palette.amberSoft, border: `1px solid ${palette.amber}` }}>
      <div className="text-xs mb-1 font-bold" style={{ color: palette.amberText }}>Preview:</div>
      <MathContent html={debouncedHtml} />
    </div>
  )
}

function stripHtml(html?: string | null) {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .trim()
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

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function KelolaSoalPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

const [checking, setChecking] = useState(true)
const [namaGuru, setNamaGuru] = useState("Guru")
const [foto, setFoto] = useState("")

const [showNotif, setShowNotif] = useState(false)
const [showProfileMenu, setShowProfileMenu] = useState(false)

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ script: "sub" }, { script: "super" }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }], ["blockquote"], ["link", "image"], ["clean"],
    ],
  }), [])

  const [soal, setSoal] = useState<Soal[]>([])
  const [packages, setPackages] = useState<PackageT[]>([])
  const [soalPackageMap, setSoalPackageMap] = useState<Record<number, string[]>>({})
  const [selectedKategori, setSelectedKategori] = useState("Semua")
  // selectedPaketId bisa berupa id numerik paket, null (semua soal), atau "belum" (soal tanpa paket sama sekali)
  const [selectedPaketId, setSelectedPaketId] = useState<number | null | "belum">(null)
  const [selectedStatus, setSelectedStatus] = useState<"semua" | "aktif" | "nonaktif">("semua")
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({})
  const [exportingPdf, setExportingPdf] = useState(false)
  const [paketSoalIds, setPaketSoalIds] = useState<number[]>([])

  const [form, setForm] = useState<Soal>({
    pertanyaan: "", opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
    jawaban_benar: "a", kategori: "Matematika", paket: "",
    pembahasan: "", video_url: "", gambar: "", pengantar: "", bacaan: "",
    package_ids: [],
  })

  useEffect(() => { checkAccessAndLoad() }, [])

  // Kalau datang dari halaman lain (mis. dashboard, "Kelengkapan Konten") dengan
  // query param, otomatis terapkan filter yang sesuai supaya soal yang dimaksud
  // langsung ketemu:
  //   ?cari=...            -> isi kolom pencarian
  //   ?status=aktif|nonaktif -> filter status aktif/nonaktif
  //   ?paket=belum          -> filter soal yang belum masuk paket manapun
  useEffect(() => {
    const cari = searchParams.get("cari")
    if (cari) setSearch(cari)

    const status = searchParams.get("status")
    if (status === "aktif" || status === "nonaktif") setSelectedStatus(status)

    const paketParam = searchParams.get("paket")
    if (paketParam === "belum") setSelectedPaketId("belum")
  }, [searchParams])

  // Kalau ?paket=NamaPaket (bukan "belum"), cocokkan dengan nama paket setelah
  // daftar paket selesai dimuat, lalu set sebagai filter aktif.
  useEffect(() => {
    const paketParam = searchParams.get("paket")
    if (!paketParam || paketParam === "belum" || packages.length === 0) return
    const match = packages.find((p) => p.nama_paket.toLowerCase() === paketParam.toLowerCase())
    if (match) setSelectedPaketId(match.id)
  }, [searchParams, packages])

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
await Promise.all([getSoal(), getPackages()])
  }

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar?")) return
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function getSoal() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("soal").select("*").order("id", { ascending: true })
      if (error) { console.log(error); return }
      setSoal((data || []) as Soal[])

      const { data: pkgSoal } = await supabase
        .from("package_soal")
        .select("soal_id, package_id, packages(nama_paket)")

      const map: Record<number, string[]> = {}
      for (const row of pkgSoal || []) {
        const sid = row.soal_id as number
        const nama = (row.packages as any)?.nama_paket || ""
        if (!map[sid]) map[sid] = []
        if (nama && !map[sid].includes(nama)) map[sid].push(nama)
      }
      setSoalPackageMap(map)
    } finally { setLoading(false) }
  }

  async function getPackages() {
    const { data } = await supabase
      .from("packages")
      .select("id, nama_paket")

    const sorted = (data || []).sort((a, b) =>
      a.nama_paket.localeCompare(b.nama_paket, "id", { numeric: true, sensitivity: "base" })
    )
    setPackages(sorted as PackageT[])
  }

  async function getPackageIdsForSoal(soalId: number): Promise<number[]> {
    const { data } = await supabase
      .from("package_soal").select("package_id").eq("soal_id", soalId)
    return (data || []).map((d: any) => d.package_id)
  }

  useEffect(() => {
    if (typeof selectedPaketId !== "number") { setPaketSoalIds([]); return }

    const selectedPkg = packages.find(p => p.id === selectedPaketId)
    const pkgNameRaw = selectedPkg?.nama_paket?.toLowerCase() || ""
    const legacyKey = pkgNameRaw.startsWith("paket ")
      ? pkgNameRaw.replace("paket ", "").trim()
      : pkgNameRaw

    supabase
      .from("package_soal")
      .select("soal_id")
      .eq("package_id", selectedPaketId)
      .then(({ data }) => {
        const idsFromRelasi = (data || []).map((d: any) => d.soal_id as number)
        const idsFromLegacy = soal
          .filter(s => s.paket?.toLowerCase().trim() === legacyKey)
          .map(s => s.id!)
          .filter(Boolean)
        const merged = Array.from(new Set([...idsFromRelasi, ...idsFromLegacy]))
        setPaketSoalIds(merged)
      })
  }, [selectedPaketId, packages, soal])

  async function uploadGambar(file: File) {
    try {
      setUploading(true)
      const fileName = `${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from("soal").upload(fileName, file)
      if (error) { alert("Upload gagal"); return }
      const { data } = supabase.storage.from("soal").getPublicUrl(fileName)
      setForm((prev) => ({ ...prev, gambar: data.publicUrl }))
      alert("Upload berhasil")
    } finally { setUploading(false) }
  }

  async function handleSubmit() {
    const cleanText = (text?: string) =>
      text ? text.replace(/<p><br\s*\/?><\/p>/g, "").replace(/<[^>]*>/g, "").trim() : ""
    if (!cleanText(form.pertanyaan)) { alert("Pertanyaan wajib diisi"); return }
    if (!cleanText(form.opsi_a)) { alert("Opsi A wajib diisi"); return }
    if (!cleanText(form.opsi_b)) { alert("Opsi B wajib diisi"); return }
    if (!cleanText(form.opsi_c)) { alert("Opsi C wajib diisi"); return }
    if (!cleanText(form.opsi_d)) { alert("Opsi D wajib diisi"); return }

    const payload = {
      pertanyaan: form.pertanyaan, opsi_a: form.opsi_a, opsi_b: form.opsi_b,
      opsi_c: form.opsi_c, opsi_d: form.opsi_d, opsi_e: form.opsi_e || "",
      jawaban_benar: form.jawaban_benar.toLowerCase().trim(),
      kategori: form.kategori.trim(), paket: form.paket?.trim() || "",
      pembahasan: form.pembahasan || `Jawaban benar adalah ${form.jawaban_benar.toUpperCase()}`,
      video_url: form.video_url || "", gambar: form.gambar || "",
      pengantar: form.pengantar || "", bacaan: form.bacaan || "", is_active: true,
    }

    try {
      setSaving(true)
      let soalId = form.id

      if (form.id) {
        const { error } = await supabase.from("soal").update(payload).eq("id", form.id)
        if (error) { alert(error.message); return }
      } else {
        const { data, error } = await supabase.from("soal").insert([payload]).select("id").single()
        if (error) { alert(error.message); return }
        soalId = data.id
      }

      if (soalId) {
        let finalPackageIds: number[] = [...(form.package_ids || [])]

        if (form.paket) {
          const legacyKey = form.paket.toLowerCase().trim()
          const matchingPkg = packages.find(p => {
            const name = p.nama_paket.toLowerCase().trim()
            return name === legacyKey || name === `paket ${legacyKey}` || name.replace("paket ", "") === legacyKey
          })
          if (matchingPkg && !finalPackageIds.includes(matchingPkg.id)) {
            finalPackageIds.push(matchingPkg.id)
          }
        }

        await supabase.from("package_soal").delete().eq("soal_id", soalId)
        if (finalPackageIds.length > 0) {
          const rows = finalPackageIds.map((pid) => ({ package_id: pid, soal_id: soalId }))
          const { error: insertError } = await supabase.from("package_soal").insert(rows)
          if (insertError) { alert("Gagal menyimpan relasi paket: " + insertError.message); return }
        }
      }

      alert("Berhasil disimpan")
      setShowModal(false)
      resetForm()
      await getSoal()
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan")
    } finally { setSaving(false) }
  }

  async function handleEdit(item: Soal) {
    let packageIds = item.id ? await getPackageIdsForSoal(item.id) : []

    if (item.paket) {
      const matchingPkg = packages.find(p => {
        const name = p.nama_paket.toLowerCase().trim()
        const legacy = item.paket!.toLowerCase().trim()
        return name === legacy || name === `paket ${legacy}` || name.replace("paket ", "") === legacy
      })
      if (matchingPkg && !packageIds.includes(matchingPkg.id)) {
        packageIds = [...packageIds, matchingPkg.id]
      }
    }

    setForm({
      ...item,
      opsi_a: item.opsi_a || "", opsi_b: item.opsi_b || "",
      opsi_c: item.opsi_c || "", opsi_d: item.opsi_d || "", opsi_e: item.opsi_e || "",
      paket: item.paket || "", pengantar: item.pengantar || "", bacaan: item.bacaan || "",
      pembahasan: item.pembahasan || "", gambar: item.gambar || "",
      package_ids: packageIds,
    })
    setShowPreview({})
    setShowModal(true)
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus soal?")) return
    await supabase.from("package_soal").delete().eq("soal_id", id)
    await supabase.from("soal").delete().eq("id", id)
    getSoal()
  }

  function resetForm() {
    setForm({
      pertanyaan: "", opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
      jawaban_benar: "a", kategori: "Matematika", paket: "",
      pembahasan: "", video_url: "", gambar: "", pengantar: "", bacaan: "",
      package_ids: [],
    })
    setShowPreview({})
  }

  function togglePackageId(id: number) {
    setForm((prev) => {
      const ids = prev.package_ids || []
      return {
        ...prev,
        package_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      }
    })
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const items = Array.from(soal)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setSoal(items)
  }

  function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })
      for (const row of json as any[]) {
        await supabase.from("soal").insert([{
          pengantar: String(row.pengantar || ""), bacaan: String(row.bacaan || ""),
          pertanyaan: String(row.pertanyaan || ""), opsi_a: String(row.opsi_a || ""),
          opsi_b: String(row.opsi_b || ""), opsi_c: String(row.opsi_c || ""),
          opsi_d: String(row.opsi_d || ""), opsi_e: String(row.opsi_e || ""),
          jawaban_benar: String(row.jawaban_benar || "").toLowerCase().trim(),
          kategori: String(row.kategori || "").trim(), paket: String(row.paket || "").trim(),
          pembahasan: String(row.pembahasan || ""), video_url: String(row.video_url || ""),
          gambar: String(row.gambar || ""),
        }])
      }
      alert("Upload Excel berhasil!")
      getSoal()
    }
    reader.readAsArrayBuffer(file)
  }

async function handleExportPdf() {
  if (filteredSoal.length === 0) { alert("Tidak ada soal untuk diexport"); return }
  try {
    setExportingPdf(true)

    const namaFilter = typeof selectedPaketId === "number"
      ? packages.find(p => p.id === selectedPaketId)?.nama_paket || "Semua Paket"
      : selectedPaketId === "belum"
        ? "Tanpa Paket"
        : "Semua Paket"

    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 48
    const contentWidth = pageWidth - margin * 2
    let y = margin

    function addNewPageIfNeeded(neededHeight: number) {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
    }

    function writeWrapped(text: string, x: number, fontSize: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [30, 30, 30], lineGap = 1.3) {
      if (!text) return
      doc.setFont("helvetica", style)
      doc.setFontSize(fontSize)
      doc.setTextColor(color[0], color[1], color[2])
      const maxWidth = contentWidth - (x - margin)
      const lines = doc.splitTextToSize(text, maxWidth)
      const lineHeight = fontSize * lineGap
      addNewPageIfNeeded(lines.length * lineHeight)
      doc.text(lines, x, y)
      y += lines.length * lineHeight
    }

    // ── HEADER ──
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(217, 140, 43) // amber
    doc.text("BANK SOAL", pageWidth / 2, y, { align: "center" })
    y += 18

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(27, 42, 74) // navy
    doc.text(namaFilter, pageWidth / 2, y, { align: "center" })
    y += 18

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(140, 140, 140)
    const subInfo = `${selectedKategori === "Semua" ? "Semua Kategori" : selectedKategori} \u00b7 ${filteredSoal.length} Soal`
    doc.text(subInfo, pageWidth / 2, y, { align: "center" })
    y += 14

    doc.setDrawColor(231, 226, 212)
    doc.setLineWidth(1.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 24

    // ── ISI SOAL ──
    filteredSoal.forEach((s, i) => {
      addNewPageIfNeeded(60)

      // Nomor + kategori
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(27, 42, 74)
      doc.text(`${i + 1}.`, margin, y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(138, 84, 18)
      doc.text(`[${s.kategori}]`, margin + 20, y)
      y += 16

      // Pengantar
      if (s.pengantar) {
        writeWrapped(stripHtml(s.pengantar), margin, 9.5, "normal", [85, 85, 85])
        y += 6
      }

      // Bacaan
      if (s.bacaan) {
        writeWrapped(stripHtml(s.bacaan), margin, 9.5, "normal", [68, 68, 68])
        y += 6
      }

      // Pertanyaan
      writeWrapped(stripHtml(s.pertanyaan), margin, 11, "normal", [17, 17, 17])
      y += 8

      // Opsi
      const opsiList = [
        { l: "A", v: s.opsi_a }, { l: "B", v: s.opsi_b },
        { l: "C", v: s.opsi_c }, { l: "D", v: s.opsi_d },
        { l: "E", v: s.opsi_e },
      ].filter(o => stripHtml(o.v))

      opsiList.forEach((o) => {
        const isCorrect = s.jawaban_benar?.toLowerCase() === o.l.toLowerCase()
        const text = `${o.l}. ${stripHtml(o.v)}${isCorrect ? "  \u2713" : ""}`
        writeWrapped(
          text, margin + 14, 10,
          isCorrect ? "bold" : "normal",
          isCorrect ? [31, 85, 72] : [51, 51, 51]
        )
      })
      y += 6

      // Pembahasan
      const pembahasan = stripHtml(s.pembahasan)
      if (pembahasan) {
        addNewPageIfNeeded(30)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(31, 85, 72)
        doc.text("Pembahasan:", margin, y)
        y += 12
        writeWrapped(pembahasan, margin, 9, "normal", [31, 85, 72])
      }

      y += 18
      addNewPageIfNeeded(1)
      doc.setDrawColor(231, 226, 212)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 18
    })

    // ── FOOTER tanggal cetak di halaman terakhir ──
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(170, 170, 170)
    const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    doc.text(`Dicetak pada ${tanggal}`, pageWidth / 2, pageHeight - 20, { align: "center" })

    doc.save(`soal_${namaFilter.replace(/\s+/g, "_").toLowerCase()}.pdf`)

  } catch (err) {
    console.error(err)
    alert("Gagal export")
  } finally {
    setExportingPdf(false)
  }
}

  // Soal yang tampil sesuai filter paket: id numerik (paket tertentu),
  // "belum" (belum masuk paket manapun -- baik lewat relasi package_soal
  // maupun kolom legacy `paket`), atau null (semua soal).
  const displayedSoal = useMemo(() => {
    if (selectedPaketId === "belum") {
      return soal.filter((s) => {
        const relasiPaket = s.id ? (soalPackageMap[s.id] || []) : []
        return relasiPaket.length === 0 && !s.paket?.trim()
      })
    }
    if (selectedPaketId === null) return soal
    return soal.filter(s => s.id && paketSoalIds.includes(s.id))
  }, [soal, selectedPaketId, paketSoalIds, soalPackageMap])

  const filteredSoal = useMemo(() =>
    displayedSoal
      .filter((s) => selectedKategori === "Semua" || s.kategori === selectedKategori)
      .filter((s) => selectedStatus === "semua" || (selectedStatus === "aktif" ? !!s.is_active : !s.is_active))
      .filter((s) => s.pertanyaan?.toLowerCase().includes(search.toLowerCase())),
    [displayedSoal, selectedKategori, selectedStatus, search]
  )

  // --- Ringkasan untuk dropdown notifikasi (dihitung dari data yang sudah ada) ---
  const notifDraft = useMemo(() => soal.filter((s) => !s.is_active).length, [soal])
  const notifTanpaPaket = useMemo(() => soal.filter((s) => {
    const relasiPaket = s.id ? (soalPackageMap[s.id] || []) : []
    return relasiPaket.length === 0 && !s.paket?.trim()
  }).length, [soal, soalPackageMap])

  const editorFields = [
    { label: "Pengantar", key: "pengantar" }, { label: "Bacaan", key: "bacaan" },
    { label: "Pertanyaan *", key: "pertanyaan" }, { label: "Opsi A *", key: "opsi_a" },
    { label: "Opsi B *", key: "opsi_b" }, { label: "Opsi C *", key: "opsi_c" },
    { label: "Opsi D *", key: "opsi_d" }, { label: "Opsi E", key: "opsi_e" },
    { label: "Pembahasan", key: "pembahasan" },
  ]

  function KategoriPill({ label, value }: { label: string; value: string }) {
    const active = selectedKategori === value
    return (
      <button
        type="button"
        onClick={() => setSelectedKategori(value)}
        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
        style={{
          background: active ? palette.navy : palette.card,
          color: active ? "#FFFFFF" : palette.inkSoft,
          borderColor: active ? palette.navy : palette.border,
        }}
      >
        {label}
      </button>
    )
  }

  function PaketPill({ label, pkgId }: { label: string; pkgId: number | null | "belum" }) {
    const active = selectedPaketId === pkgId
    const isWarning = pkgId === "belum"
    return (
      <button
        type="button"
        onClick={() => setSelectedPaketId(pkgId)}
        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
        style={{
          background: active ? (isWarning ? palette.danger : palette.amber) : palette.card,
          color: active ? "#FFFFFF" : (isWarning ? palette.danger : palette.inkSoft),
          borderColor: active ? (isWarning ? palette.danger : palette.amber) : (isWarning ? "#E9B8AC" : palette.border),
        }}
      >
        {label}
      </button>
    )
  }

  function StatusPill({ label, value }: { label: string; value: "semua" | "aktif" | "nonaktif" }) {
    const active = selectedStatus === value
    const isNonaktif = value === "nonaktif"
    return (
      <button
        type="button"
        onClick={() => setSelectedStatus(value)}
        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
        style={{
          background: active ? (isNonaktif ? "#8A7A4E" : palette.teal) : palette.card,
          color: active ? "#FFFFFF" : palette.inkSoft,
          borderColor: active ? (isNonaktif ? "#8A7A4E" : palette.teal) : palette.border,
        }}
      >
        {label}
      </button>
    )
  }

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
      <style>{quillStyle}</style>

      <div className="h-screen w-full flex overflow-hidden" style={{ background: palette.paper, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
        {/* SIDEBAR — fixed, tidak ikut scroll konten tengah */}
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
          <div className="shrink-0 flex items-center justify-between px-6 md:px-10 py-4" style={{ background: palette.card, borderBottom: `1px solid ${palette.border}` }}>
            <div>
              <h1 className="text-xl font-bold" style={{ color: palette.ink }}>Kelola Soal</h1>
              <p className="text-sm" style={{ color: palette.inkSoft }}>Tambah, edit, dan kelola soal TKA di sini.</p>
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
                              <button
                                type="button"
                                onClick={() => { setSelectedStatus("nonaktif"); setShowNotif(false) }}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left transition"
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F1EFE8" }}>
                                  <AlertTriangle size={14} style={{ color: "#8A7A4E" }} />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold" style={{ color: palette.ink }}>{notifDraft} soal berstatus draft</p>
                                  <p className="text-[11px] mt-0.5" style={{ color: palette.inkFaint }}>Belum aktif, cek dan simpan ulang</p>
                                </div>
                              </button>
                            )}
                            {notifTanpaPaket > 0 && (
                              <button
                                type="button"
                                onClick={() => { setSelectedPaketId("belum"); setShowNotif(false) }}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left transition"
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: palette.dangerSoft }}>
                                  <PackageCheck size={14} style={{ color: palette.danger }} />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold" style={{ color: palette.ink }}>{notifTanpaPaket} soal belum ada paket</p>
                                  <p className="text-[11px] mt-0.5" style={{ color: palette.inkFaint }}>Assign ke paket biar bisa dipakai tryout</p>
                                </div>
                              </button>
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
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-9 h-9 border-2 rounded-full animate-spin" style={{ borderColor: palette.border, borderTopColor: palette.amber }} />
                  <p className="text-sm" style={{ color: palette.inkSoft }}>Memuat data soal...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">

                {/* HERO STRIP */}
                <div
                  className="rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4"
                  style={{ background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.navySoft} 100%)` }}
                >
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#8FA0C4" }}>Bank Soal</p>
                    <h2 className="text-xl font-bold text-white">Kelola seluruh soal TKA di sini</h2>
                    <p className="text-sm mt-1" style={{ color: "#AEB8CC" }}>
                      {soal.length} soal &middot; {new Set(soal.map(s => s.kategori)).size} mata pelajaran &middot; {packages.length} paket
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setShowModal(true) }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
                    style={{ background: palette.amber, color: "#40260A" }}
                  >
                    <Plus size={16} />
                    Tambah Soal
                  </button>
                </div>

                {/* STAT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl p-5" style={{ background: palette.navy }}>
                    <p className="text-sm" style={{ color: "#AEB8CC" }}>Total Soal</p>
                    <h2 className="text-3xl font-bold mt-1 text-white">{soal.length}</h2>
                    <p className="text-xs mt-1.5" style={{ color: "#8C9AB8" }}>Soal yang telah dibuat</p>
                  </div>
                  <div className="rounded-2xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                    <p className="text-sm" style={{ color: palette.inkSoft }}>Mata Pelajaran</p>
                    <h2 className="text-3xl font-bold mt-1" style={{ color: palette.ink }}>{new Set(soal.map(s => s.kategori)).size}</h2>
                    <p className="text-xs mt-1.5" style={{ color: palette.inkFaint }}>Mata pelajaran dikelola</p>
                  </div>
                  <div className="rounded-2xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                    <p className="text-sm" style={{ color: palette.inkSoft }}>Total Paket</p>
                    <h2 className="text-3xl font-bold mt-1" style={{ color: palette.ink }}>{packages.length}</h2>
                    <p className="text-xs mt-1.5" style={{ color: palette.inkFaint }}>Paket siap digunakan</p>
                  </div>
                </div>

                {/* FILTER KATEGORI / PAKET / STATUS */}
                <div className="rounded-2xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                  <p className="text-[11px] font-semibold tracking-wider uppercase mb-2.5" style={{ color: palette.inkFaint }}>Filter Kategori</p>
                  <div className="flex gap-2 flex-wrap">
                    <KategoriPill label="Semua" value="Semua" />
                    {kategoriList.map((k) => <KategoriPill key={k} label={k} value={k} />)}
                  </div>

                  <p className="text-[11px] font-semibold tracking-wider uppercase mb-2.5 mt-5" style={{ color: palette.inkFaint }}>Filter Paket</p>
                  <div className="flex gap-2 flex-wrap">
                    <PaketPill label="Semua Soal" pkgId={null} />
                    {packages.map((pkg) => (
                      <PaketPill key={pkg.id} label={pkg.nama_paket} pkgId={pkg.id} />
                    ))}
                    <PaketPill label="Belum Ada Paket" pkgId="belum" />
                  </div>

                  <p className="text-[11px] font-semibold tracking-wider uppercase mb-2.5 mt-5" style={{ color: palette.inkFaint }}>Filter Status</p>
                  <div className="flex gap-2 flex-wrap">
                    <StatusPill label="Semua Status" value="semua" />
                    <StatusPill label="Aktif" value="aktif" />
                    <StatusPill label="Draft / Nonaktif" value="nonaktif" />
                  </div>
                </div>

                {/* TOOLBAR */}
                <div className="flex gap-3 items-center flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: palette.inkFaint }} />
                    <input
                      placeholder="Cari soal..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-10 rounded-xl pl-9 pr-4 text-sm outline-none transition"
                      style={{ background: palette.card, border: `1px solid ${palette.border}`, color: palette.ink }}
                    />
                  </div>
                  <label
                    className="h-10 px-4 rounded-xl text-sm flex items-center gap-2 cursor-pointer transition"
                    style={{ background: palette.card, border: `1px solid ${palette.border}`, color: palette.ink }}
                  >
                    <FileUp size={15} />
                    Import Excel
                    <input type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={exportingPdf || filteredSoal.length === 0}
                    className="h-10 px-4 rounded-xl text-sm flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: palette.tealSoft, border: `1px solid ${palette.teal}`, color: palette.tealText }}
                  >
                    <FileDown size={15} />
                    {exportingPdf ? "Menyiapkan..." : `Export PDF (${filteredSoal.length})`}
                  </button>
                </div>

                {/* LIST HEADER */}
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: palette.ink }}>Daftar Soal</p>
                  <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ background: palette.amberSoft, color: palette.amberText }}>
                    {filteredSoal.length} soal
                  </span>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="soal-list">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                        {filteredSoal.length === 0 && (
                          <div className="rounded-2xl p-10 text-center" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                            <p className="text-sm" style={{ color: palette.inkSoft }}>Tidak ada soal ditemukan</p>
                          </div>
                        )}
                        {filteredSoal.map((item, index) => {
                          const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length]
                          const paketNames = soalPackageMap[item.id!] || []
                          const catStyle = subjectStyle(item.kategori)
                          const CatIcon = catStyle.icon
                          return (
                            <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                              {(provided) => (
                               <div
  ref={provided.innerRef}
  {...provided.draggableProps}
  style={{
    ...provided.draggableProps.style,
    background: palette.card,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: palette.border,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: palette.border,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: palette.border,
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    borderLeftColor: accentColor,
  }}
  className="rounded-2xl p-4 transition"
>
                                  <div className="flex gap-3">
                                    <div {...provided.dragHandleProps} className="cursor-grab select-none mt-0.5 text-lg" style={{ color: palette.inkFaint }}>☰</div>
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                      style={{ background: catStyle.bg }}
                                    >
                                      <CatIcon size={15} style={{ color: catStyle.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <MathContent html={item.pertanyaan} />
                                      {item.gambar && (
                                        <img src={item.gambar} alt="gambar soal" className="mt-3 rounded-xl w-40" style={{ border: `1px solid ${palette.border}` }} />
                                      )}
                                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                                        {([
                                          { label: "A", value: item.opsi_a },
                                          { label: "B", value: item.opsi_b },
                                          { label: "C", value: item.opsi_c },
                                          { label: "D", value: item.opsi_d },
                                          { label: "E", value: item.opsi_e },
                                        ] as { label: string; value: string }[])
                                          .filter((o) => o.value)
                                          .map((o) => {
                                            const isCorrect = item.jawaban_benar.toLowerCase() === o.label.toLowerCase()
                                            return (
                                              <div key={o.label} className="flex gap-1.5 items-start">
                                                <span className="text-xs font-bold w-5 shrink-0 mt-0.5" style={{ color: isCorrect ? palette.tealText : palette.inkFaint }}>
                                                  {o.label}.
                                                </span>
                                                <div className="text-xs leading-5" style={{ color: palette.inkSoft }}>
                                                  <MathContent html={o.value} />
                                                </div>
                                              </div>
                                            )
                                          })}
                                      </div>
                                      <div className="flex gap-2 mt-3 flex-wrap">
                                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: catStyle.bg, color: catStyle.color }}>
                                          {item.kategori}
                                        </span>
                                        {!item.is_active && (
                                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "#F1EFE8", color: "#8A7A4E" }}>
                                            Draft
                                          </span>
                                        )}
                                        {paketNames.length > 0
                                          ? paketNames.map((nama) => {
                                              const st = paketBadgeStyle(nama)
                                              return (
                                                <span key={nama} className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                                                  {nama}
                                                </span>
                                              )
                                            })
                                          : item.paket && (() => {
                                              const st = paketBadgeStyle(item.paket)
                                              return (
                                                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                                                  {item.paket.toUpperCase()}
                                                </span>
                                              )
                                            })()
                                        }
                                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "#EAF3DE", color: "#27500A" }}>
                                          ✓ {item.jawaban_benar.toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                      <button
                                        type="button" onClick={() => handleEdit(item)}
                                        className="h-8 px-3 rounded-lg text-xs font-semibold transition"
                                        style={{ background: palette.amberSoft, color: palette.amberText }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button" onClick={() => handleDelete(item.id!)}
                                        className="h-8 px-3 rounded-lg text-xs font-semibold transition"
                                        style={{ background: palette.dangerSoft, color: palette.danger }}
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL TAMBAH/EDIT SOAL */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(27,42,74,0.6)" }}>
          <div className="w-full max-w-4xl rounded-3xl overflow-hidden max-h-[95vh] flex flex-col" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: palette.navy }}>
              <h2 className="text-base font-semibold text-white">
                {form.id ? "Edit Soal" : "Tambah Soal Baru"}
              </h2>
              <button
                type="button" onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xl leading-none transition"
                style={{ border: `1px solid ${palette.navySoft}`, color: "#C4CCDE" }}
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: palette.card }}>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Gambar Soal</label>
                <input
                  type="file" accept="image/*"
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) await uploadGambar(f) }}
                  className="w-full p-2.5 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold cursor-pointer"
                  style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                />
                {uploading && <p className="mt-1 text-xs font-medium" style={{ color: palette.amberText }}>Mengupload...</p>}
                {form.gambar && <img src={form.gambar} alt="preview" className="w-36 mt-3 rounded-xl" style={{ border: `1px solid ${palette.border}` }} />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Kategori</label>
                  <select
                    value={form.kategori} onChange={(e) => setForm((p) => ({ ...p, kategori: e.target.value }))}
                    className="w-full p-2.5 rounded-xl text-sm font-medium outline-none transition"
                    style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                  >
                    {kategoriList.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Paket</label>
                  <select
                    value={form.paket} onChange={(e) => setForm((p) => ({ ...p, paket: e.target.value }))}
                    className="w-full p-2.5 rounded-xl text-sm font-medium outline-none transition"
                    style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                  >
                    <option value="">Pilih Paket</option>
                    {["ipa", "ips", "smk", "bahasa"].map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Assign ke Paket</label>
                <p className="text-xs mb-3" style={{ color: palette.inkSoft }}>
                  Pilih paket mana saja yang boleh menggunakan soal ini. Soal bisa masuk ke beberapa paket sekaligus.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {packages.map((pkg) => {
                    const isSelected = (form.package_ids || []).includes(pkg.id)
                    return (
                      <button
                        key={pkg.id} type="button" onClick={() => togglePackageId(pkg.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all"
                        style={{
                          background: isSelected ? palette.navy : palette.paper,
                          border: `2px solid ${isSelected ? palette.navy : palette.border}`,
                          color: isSelected ? "#FFFFFF" : palette.inkSoft,
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                          style={{ background: isSelected ? "#FFFFFF" : "transparent", borderColor: isSelected ? "#FFFFFF" : palette.border }}
                        >
                          {isSelected && <span className="text-[10px] font-black" style={{ color: palette.navy }}>✓</span>}
                        </span>
                        <span className="truncate">{pkg.nama_paket}</span>
                      </button>
                    )
                  })}
                </div>
                {(form.package_ids || []).length > 0 && (
                  <p className="mt-2 text-xs font-semibold" style={{ color: palette.amberText }}>
                    ✓ {(form.package_ids || []).length} paket dipilih
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1" style={{ background: palette.border }} />
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: palette.amber }}>Konten Soal</span>
                <div className="h-px flex-1" style={{ background: palette.border }} />
              </div>

              {editorFields.map((field) => (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold uppercase tracking-wider" style={{ color: palette.ink }}>{field.label}</label>
                    <button
                      type="button"
                      onClick={() => setShowPreview((p) => ({ ...p, [field.key]: !p[field.key] }))}
                      className="text-xs font-semibold underline transition"
                      style={{ color: palette.amberText }}
                    >
                      {showPreview[field.key] ? "Sembunyikan preview" : "Lihat preview"}
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden transition" style={{ border: `2px solid ${palette.border}`, background: palette.card }}>
                    <ReactQuill
                      theme="snow" modules={quillModules}
                      value={(form as any)[field.key] || ""}
                      onChange={(value) => setForm((p) => ({ ...p, [field.key]: value }))}
                      style={{ display: "flex", flexDirection: "column" }}
                    />
                  </div>
                  {showPreview[field.key] && <MathPreview html={(form as any)[field.key] || ""} />}
                </div>
              ))}

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Jawaban Benar</label>
                <select
                  value={form.jawaban_benar} onChange={(e) => setForm((p) => ({ ...p, jawaban_benar: e.target.value }))}
                  className="w-full p-2.5 rounded-xl text-sm font-medium outline-none transition"
                  style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                >
                  {["a", "b", "c", "d", "e"].map((x) => <option key={x} value={x}>{x.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: `2px solid ${palette.border}`, background: palette.card }}>
              <button
                type="button" onClick={() => setShowModal(false)}
                className="h-10 px-5 rounded-xl text-sm font-semibold transition"
                style={{ border: `2px solid ${palette.border}`, color: palette.inkSoft }}
              >
                Batal
              </button>
              <button
                type="button" disabled={saving} onClick={handleSubmit}
                className="h-10 px-6 rounded-xl text-sm font-bold transition disabled:opacity-50"
                style={{ background: palette.amber, color: "#40260A" }}
              >
                {saving ? "Menyimpan..." : "Simpan Soal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MathJaxContext>
  )
}
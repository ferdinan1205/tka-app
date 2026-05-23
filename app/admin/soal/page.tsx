"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import * as XLSX from "xlsx"
import { MathJaxContext } from "better-react-mathjax"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import "react-quill-new/dist/quill.snow.css"

// Override tinggi editor Quill secara global
const quillStyle = `
  .ql-container { min-height: 120px; font-size: 14px; }
  .ql-editor { min-height: 120px; max-height: 320px; overflow-y: auto; line-height: 1.7; }
  .ql-editor.ql-blank::before { color: #B4B2A9; font-style: normal; }
  .ql-toolbar { border-bottom: 1px solid #E5E3DC !important; background: #FAFAFA; }
  .ql-container.ql-snow { border: none !important; }
  .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #E5E3DC !important; }
`

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

// ── Tipe ──────────────────────────────────────────────────────────────
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
}

// ── Konstanta ─────────────────────────────────────────────────────────
const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
    packages: { "[+]": ["mhchem", "boldsymbol"] },
  },
  chtml: { scale: 1, minScale: 0.5, matchFontHeight: false, adaptiveCSS: false },
  options: {
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    renderActions: { addMenu: [] },
  },
  startup: {
    typeset: false,
    // Langsung ready begitu MathJax loaded — tidak typeset seluruh halaman
    ready() {
      // @ts-ignore
      MathJax.startup.defaultReady()
    },
  },
}

const kategoriList = [
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris",
  "Fisika", "Kimia", "Biologi", "Ekonomi", "Geografi",
  "Sosiologi", "Sejarah", "Antropologi", "Bahasa Arab",
  "Bahasa Mandarin", "Bahasa Jepang", "Bahasa Korea",
  "Bahasa Jerman", "Bahasa Prancis", "PPKN", "PKK", "TPS", "Literasi",
]
const paketList = ["ipa", "ips", "smk", "bahasa"]

const CARD_ACCENTS = [
  "#7F77DD", "#1D9E75", "#D85A30", "#D4537E", "#BA7517", "#378ADD",
]
const PAKET_BADGE: Record<string, string> = {
  ipa:    "bg-[#EAF3DE] text-[#27500A]",
  ips:    "bg-[#FAEEDA] text-[#633806]",
  smk:    "bg-[#FAECE7] text-[#712B13]",
  bahasa: "bg-[#FBEAF0] text-[#72243E]",
}

// ── Helper ────────────────────────────────────────────────────────────
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

// ── Komponen MathContent yang dioptimalkan ────────────────────────────
// Pakai ref + MathJax.typesetPromise langsung agar TIDAK re-render lambat
function MathContent({ html, className = "" }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const normalized = useMemo(() => normalizeContent(html), [html])
  const isMath = useMemo(() => hasMath(normalized), [normalized])

  useEffect(() => {
    if (!isMath || !ref.current) return

    ref.current.innerHTML = normalized

    // typesetPromise hanya pada elemen ini — bukan seluruh halaman
    const win = window as any
    if (win.MathJax?.typesetPromise) {
      win.MathJax.typesetPromise([ref.current]).catch(() => {})
    }
  }, [normalized, isMath])

  if (!isMath) {
    return (
      <div
        className={`leading-7 text-[#2C2C2A] ${className}`}
        dangerouslySetInnerHTML={{ __html: normalized }}
      />
    )
  }

  // Langsung render isi, MathJax akan typeset via effect di atas
  return (
    <div
      ref={ref}
      className={`leading-7 text-[#2C2C2A] ${className}`}
      dangerouslySetInnerHTML={{ __html: normalized }}
    />
  )
}

// ── Preview di modal: debounce 400 ms agar tidak typeset tiap keystroke
function MathPreview({ html }: { html: string }) {
  const [debouncedHtml, setDebouncedHtml] = useState(html)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedHtml(html), 400)
    return () => clearTimeout(id)
  }, [html])

  const normalized = useMemo(() => normalizeContent(debouncedHtml), [debouncedHtml])
  if (!normalized) return null

  return (
    <div className="mt-2 p-3 bg-[#EEEDFE] border border-[#AFA9EC] rounded-xl text-sm">
      <div className="text-xs text-[#534AB7] mb-1 font-semibold">Preview:</div>
      <MathContent html={debouncedHtml} />
    </div>
  )
}

// ── Komponen utama ────────────────────────────────────────────────────
export default function AdminSoal() {
  const router = useRouter()

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
  const [filteredPaketSoal, setFilteredPaketSoal] = useState<Soal[]>([])
  const [selectedKategori, setSelectedKategori] = useState("Semua")
  const [selectedPaket, setSelectedPaket] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState<Soal>({
    pertanyaan: "", opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
    jawaban_benar: "a", kategori: "Matematika", paket: "",
    pembahasan: "", video_url: "", gambar: "", pengantar: "", bacaan: "",
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()
    if (!profile || profile.role !== "admin") { alert("Akses ditolak!"); router.push("/dashboard"); return }
    getSoal()
  }

  async function getSoal() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("soal").select("*").order("id", { ascending: true })
      if (error) { console.log(error); return }
      setSoal((data || []) as Soal[])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!selectedPaket) { setFilteredPaketSoal([]); return }
    const hasil = soal.filter((s) => {
      const paketMatch = s.paket?.toLowerCase() === selectedPaket.toLowerCase()
      const kategoriMatch = selectedKategori === "Semua" || s.kategori === selectedKategori
      return paketMatch && kategoriMatch
    }).slice(0, 25)
    setFilteredPaketSoal(hasil)
  }, [selectedPaket, selectedKategori, soal])

  function acakSoal() {
    if (!selectedPaket) return
    const hasil = soal.filter((s) => {
      const paketMatch = s.paket?.toLowerCase() === selectedPaket.toLowerCase()
      const kategoriMatch = selectedKategori === "Semua" || s.kategori === selectedKategori
      return paketMatch && kategoriMatch
    }).sort(() => Math.random() - 0.5).slice(0, 25)
    setFilteredPaketSoal(hasil)
  }

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
      const result = form.id
        ? await supabase.from("soal").update(payload).eq("id", form.id)
        : await supabase.from("soal").insert([payload])
      if (result.error) { alert(result.error.message); return }
      alert("Berhasil disimpan")
      setShowModal(false)
      resetForm()
      await getSoal()
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan")
    } finally { setSaving(false) }
  }

  function handleEdit(item: Soal) {
    setForm({
      ...item,
      opsi_a: item.opsi_a || "", opsi_b: item.opsi_b || "",
      opsi_c: item.opsi_c || "", opsi_d: item.opsi_d || "", opsi_e: item.opsi_e || "",
      paket: item.paket || "", pengantar: item.pengantar || "", bacaan: item.bacaan || "",
      pembahasan: item.pembahasan || "", gambar: item.gambar || "",
    })
    setShowPreview({})
    setShowModal(true)
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus soal?")) return
    await supabase.from("soal").delete().eq("id", id)
    getSoal()
  }

  function resetForm() {
    setForm({
      pertanyaan: "", opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
      jawaban_benar: "a", kategori: "Matematika", paket: "",
      pembahasan: "", video_url: "", gambar: "", pengantar: "", bacaan: "",
    })
    setShowPreview({})
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
    reader.onload = async (evt: ProgressEvent<FileReader>) => {
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
      alert("Upload berhasil!")
      getSoal()
    }
    reader.readAsArrayBuffer(file)
  }

  const displayedSoal = selectedPaket ? filteredPaketSoal : soal
  const filteredSoal = displayedSoal
    .filter((s) => selectedKategori === "Semua" || s.kategori === selectedKategori)
    .filter((s) => s.pertanyaan?.toLowerCase().includes(search.toLowerCase()))

  const editorFields = [
    { label: "Pengantar", key: "pengantar" }, { label: "Bacaan", key: "bacaan" },
    { label: "Pertanyaan", key: "pertanyaan" }, { label: "Opsi A", key: "opsi_a" },
    { label: "Opsi B", key: "opsi_b" }, { label: "Opsi C", key: "opsi_c" },
    { label: "Opsi D", key: "opsi_d" }, { label: "Opsi E", key: "opsi_e" },
    { label: "Pembahasan", key: "pembahasan" },
  ]

  function KategoriPill({ label, value }: { label: string; value: string }) {
    const active = selectedKategori === value
    return (
      <button
        type="button"
        onClick={() => setSelectedKategori(value)}
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
          active
            ? "bg-[#534AB7] text-[#EEEDFE] border-[#534AB7]"
            : "bg-[#F1EFE8] text-[#5F5E5A] border-[#B4B2A9] hover:bg-[#D3D1C7]"
        }`}
      >
        {label}
      </button>
    )
  }

  function PaketPill({ label, value }: { label: string; value: string }) {
    const active = selectedPaket === value
    const activeClass =
      value === "" ? "bg-[#0F6E56] text-[#E1F5EE] border-[#0F6E56]"
      : value === "ipa" ? "bg-[#27500A] text-[#EAF3DE] border-[#27500A]"
      : value === "ips" ? "bg-[#633806] text-[#FAEEDA] border-[#633806]"
      : value === "smk" ? "bg-[#712B13] text-[#FAECE7] border-[#712B13]"
      : "bg-[#72243E] text-[#FBEAF0] border-[#72243E]"
    return (
      <button
        type="button"
        onClick={() => setSelectedPaket(value)}
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
          active
            ? activeClass
            : "bg-[#F1EFE8] text-[#5F5E5A] border-[#B4B2A9] hover:bg-[#D3D1C7]"
        }`}
      >
        {label}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1EFE8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-[#AFA9EC] border-t-[#534AB7] rounded-full animate-spin" />
          <p className="text-sm text-[#888780]">Memuat data soal...</p>
        </div>
      </div>
    )
  }

  return (
    <MathJaxContext version={3} config={mathJaxConfig}>
      <style>{quillStyle}</style>
      <div className="min-h-screen bg-[#F1EFE8]">

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-40 bg-[#26215C] border-b border-[#3C3489]">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold tracking-[3px] text-[#AFA9EC] uppercase leading-none mb-0.5">
                Admin Panel
              </p>
              <h1 className="text-[15px] font-semibold text-[#EEEDFE] leading-none">
                Manajemen Soal
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="h-8 px-4 rounded-lg border border-[#534AB7] text-[12px] text-[#AFA9EC] hover:bg-[#3C3489] hover:text-[#CECBF6] transition"
              >
                ← Kembali
              </button>
              <button
                type="button"
                onClick={() => { resetForm(); setShowModal(true) }}
                className="h-8 px-4 rounded-lg bg-[#AFA9EC] text-[#26215C] text-[12px] font-semibold hover:bg-[#CECBF6] transition"
              >
                + Tambah Soal
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">

          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#534AB7] p-4">
              <p className="text-[10px] font-semibold tracking-widest text-[#AFA9EC] uppercase mb-1">Total Soal</p>
              <p className="text-3xl font-bold text-[#EEEDFE]">{soal.length}</p>
            </div>
            <div className="rounded-xl bg-[#0F6E56] p-4">
              <p className="text-[10px] font-semibold tracking-widest text-[#5DCAA5] uppercase mb-1">Mata Pelajaran</p>
              <p className="text-3xl font-bold text-[#E1F5EE]">{new Set(soal.map(s => s.kategori)).size}</p>
            </div>
            <div className="rounded-xl bg-[#993C1D] p-4">
              <p className="text-[10px] font-semibold tracking-widest text-[#F0997B] uppercase mb-1">Paket Aktif</p>
              <p className="text-3xl font-bold text-[#FAECE7]">{paketList.length}</p>
            </div>
          </div>

          {/* ── FILTER KATEGORI ── */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[#5F5E5A] uppercase mb-2">Filter Kategori</p>
            <div className="flex gap-2 flex-wrap">
              <KategoriPill label="Semua" value="Semua" />
              {kategoriList.map((k) => <KategoriPill key={k} label={k} value={k} />)}
            </div>
          </div>

          {/* ── FILTER PAKET ── */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[#5F5E5A] uppercase mb-2">Filter Paket</p>
            <div className="flex gap-2 flex-wrap items-center">
              <PaketPill label="Semua Soal" value="" />
              {paketList.map((p) => <PaketPill key={p} label={p.toUpperCase()} value={p} />)}
              {selectedPaket && (
                <button
                  type="button"
                  onClick={acakSoal}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27] hover:bg-[#FAC775] transition"
                >
                  🎲 Acak 25 Soal
                </button>
              )}
            </div>
          </div>

          {/* ── TOOLBAR ── */}
          <div className="flex gap-3 items-center">
            <input
              placeholder="Cari soal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 h-10 border border-[#B4B2A9] rounded-xl bg-white px-4 text-sm text-[#2C2C2A] placeholder:text-[#888780] outline-none focus:border-[#7F77DD] focus:ring-2 focus:ring-[#EEEDFE] transition"
            />
            <label className="h-10 px-4 rounded-xl border border-[#B4B2A9] bg-white text-sm text-[#444441] flex items-center gap-2 cursor-pointer hover:bg-[#F1EFE8] transition">
              📥 Import Excel
              <input type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
            </label>
          </div>

          {/* ── LIST HEADER ── */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#2C2C2A]">Daftar Soal</p>
            <span className="text-[11px] font-semibold bg-[#EEEDFE] text-[#3C3489] rounded-full px-2.5 py-0.5">
              {filteredSoal.length} soal
            </span>
          </div>

          {/* ── SOAL LIST ── */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="soal-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {filteredSoal.length === 0 && (
                    <div className="bg-white border border-[#D3D1C7] rounded-2xl p-10 text-center">
                      <p className="text-sm text-[#888780]">Tidak ada soal ditemukan</p>
                    </div>
                  )}
                  {filteredSoal.map((item, index) => {
                    const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length]
                    const paketBadge = PAKET_BADGE[item.paket || ""] || "bg-[#EEEDFE] text-[#3C3489]"
                    return (
                      <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              borderLeft: `4px solid ${accentColor}`,
                            }}
                            className="bg-white border border-[#D3D1C7] rounded-2xl p-4 hover:border-[#888780] transition"
                          >
                            <div className="flex gap-3">
                              {/* Drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab text-[#B4B2A9] select-none mt-0.5 text-lg"
                              >
                                ☰
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <MathContent html={item.pertanyaan} />

                                {item.gambar && (
                                  <img
                                    src={item.gambar}
                                    alt="gambar soal"
                                    className="mt-3 rounded-xl w-40 border border-[#D3D1C7]"
                                  />
                                )}

                                {/* Opsi */}
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
                                      const isCorrect =
                                        item.jawaban_benar.toLowerCase() === o.label.toLowerCase()
                                      return (
                                        <div key={o.label} className="flex gap-1.5 items-start">
                                          <span
                                            className={`text-xs font-bold w-5 shrink-0 mt-0.5 ${
                                              isCorrect ? "text-[#0F6E56]" : "text-[#888780]"
                                            }`}
                                          >
                                            {o.label}.
                                          </span>
                                          <div className="text-xs text-[#444441] leading-5">
                                            <MathContent html={o.value} />
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>

                                {/* Tags */}
                                <div className="flex gap-2 mt-3 flex-wrap">
                                  <span className="text-[10px] font-semibold bg-[#EEEDFE] text-[#3C3489] px-2.5 py-0.5 rounded-full">
                                    {item.kategori}
                                  </span>
                                  {item.paket && (
                                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${paketBadge}`}>
                                      {item.paket.toUpperCase()}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-semibold bg-[#EAF3DE] text-[#27500A] px-2.5 py-0.5 rounded-full">
                                    ✓ Jawaban: {item.jawaban_benar.toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  className="h-8 px-3 rounded-lg bg-[#FAEEDA] text-[#854F0B] text-xs font-semibold hover:bg-[#FAC775] transition"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id!)}
                                  className="h-8 px-3 rounded-lg bg-[#FCEBEB] text-[#A32D2D] text-xs font-semibold hover:bg-[#F7C1C1] transition"
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

        {/* ── MODAL ── */}
        {showModal && (
          <div className="fixed inset-0 bg-[#26215C]/60 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden max-h-[95vh] flex flex-col border border-[#D3D1C7]">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#26215C] shrink-0">
                <h2 className="text-base font-semibold text-[#EEEDFE]">
                  {form.id ? "Edit Soal" : "Tambah Soal Baru"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg border border-[#534AB7] text-[#AFA9EC] hover:bg-[#3C3489] flex items-center justify-center text-xl leading-none transition"
                >
                  ×
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAFAFA]">

                {/* Upload gambar */}
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider mb-2">
                    Gambar Soal
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (f) await uploadGambar(f)
                    }}
                    className="w-full border border-[#B4B2A9] p-2.5 rounded-xl text-sm bg-white"
                  />
                  {uploading && <p className="mt-1 text-xs text-[#534AB7]">Mengupload...</p>}
                  {form.gambar && (
                    <img
                      src={form.gambar}
                      alt="preview"
                      className="w-36 mt-3 rounded-xl border border-[#D3D1C7]"
                    />
                  )}
                </div>

                {/* Kategori + Paket */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider mb-2">
                      Kategori
                    </label>
                    <select
                      value={form.kategori}
                      onChange={(e) => setForm((p) => ({ ...p, kategori: e.target.value }))}
                      className="w-full border border-[#B4B2A9] p-2.5 rounded-xl text-sm bg-white outline-none focus:border-[#7F77DD] transition"
                    >
                      {kategoriList.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider mb-2">
                      Paket
                    </label>
                    <select
                      value={form.paket}
                      onChange={(e) => setForm((p) => ({ ...p, paket: e.target.value }))}
                      className="w-full border border-[#B4B2A9] p-2.5 rounded-xl text-sm bg-white outline-none focus:border-[#7F77DD] transition"
                    >
                      <option value="">Pilih Paket</option>
                      {paketList.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[#EEEDFE]" />
                  <span className="text-[10px] font-semibold text-[#7F77DD] tracking-widest uppercase">
                    Konten Soal
                  </span>
                  <div className="h-px flex-1 bg-[#EEEDFE]" />
                </div>

                {/* Editor fields */}
                {editorFields.map((field) => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">
                        {field.label}
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowPreview((p) => ({ ...p, [field.key]: !p[field.key] }))
                        }
                        className="text-[11px] text-[#534AB7] hover:text-[#3C3489] underline transition"
                      >
                        {showPreview[field.key] ? "Sembunyikan preview" : "Lihat preview"}
                      </button>
                    </div>
                    <div className="border border-[#B4B2A9] rounded-xl overflow-hidden bg-white focus-within:border-[#7F77DD] focus-within:ring-2 focus-within:ring-[#EEEDFE] transition">
                      <ReactQuill
                        theme="snow"
                        modules={quillModules}
                        value={(form as any)[field.key] || ""}
                        onChange={(value) =>
                          setForm((p) => ({ ...p, [field.key]: value }))
                        }
                        style={{ display: "flex", flexDirection: "column" }}
                      />
                    </div>
                    {showPreview[field.key] && (
                      <MathPreview html={(form as any)[field.key] || ""} />
                    )}
                  </div>
                ))}

                {/* Jawaban benar */}
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider mb-2">
                    Jawaban Benar
                  </label>
                  <select
                    value={form.jawaban_benar}
                    onChange={(e) => setForm((p) => ({ ...p, jawaban_benar: e.target.value }))}
                    className="w-full border border-[#B4B2A9] p-2.5 rounded-xl text-sm bg-white outline-none focus:border-[#7F77DD] transition"
                  >
                    {["a", "b", "c", "d", "e"].map((x) => (
                      <option key={x} value={x}>{x.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal footer */}
              <div className="border-t border-[#EEEDFE] bg-white px-6 py-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-5 rounded-xl border border-[#B4B2A9] text-sm text-[#5F5E5A] hover:bg-[#F1EFE8] transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmit}
                  className="h-9 px-6 rounded-xl bg-[#534AB7] text-[#EEEDFE] text-sm font-semibold hover:bg-[#3C3489] disabled:opacity-50 transition"
                >
                  {saving ? "Menyimpan..." : "Simpan Soal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MathJaxContext>
  )
}
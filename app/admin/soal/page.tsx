"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import * as XLSX from "xlsx"
import { MathJax, MathJaxContext } from "better-react-mathjax"
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import "react-quill-new/dist/quill.snow.css"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

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

const mathJaxConfig = {
  loader: {
    load: ["input/tex", "output/chtml"],
  },
  tex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
    processEscapes: true,
    processEnvironments: true,
    // Tambahan untuk kimia & biologi
    packages: { "[+]": ["mhchem", "boldsymbol"] },
  },
  chtml: {
    scale: 1,
    minScale: 0.5,
    matchFontHeight: false,
    // Penting: matikan animasi biar tidak gerak-gerak
    adaptiveCSS: false,
  },
  options: {
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    // Penting: render sekali saja, tidak re-render terus
    renderActions: {
      addMenu: [],
    },
  },
  startup: {
    // Jangan auto-typeset seluruh halaman, biar MathJax component yang kontrol
    typeset: false,
  },
}

const kategoriList = [
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris",
  "Fisika", "Kimia", "Biologi", "Ekonomi", "Geografi",
  "Sosiologi", "Sejarah", "Antropologi", "Bahasa Arab",
  "Bahasa Mandarin", "Bahasa Jepang", "Bahasa Korea",
  "Bahasa Jerman", "Bahasa Prancis", "PPKN", "PKK", "TPS", "Literasi",
]

const paketList = ["ipa", "ips", "smk",  "bahasa"]

/**
 * Deteksi apakah teks mengandung LaTeX
 */
function hasMath(text: string = "") {
  return (
    text.includes("$") ||
    text.includes("\\(") ||
    text.includes("\\[") ||
    text.includes("\\frac") ||
    text.includes("\\sqrt") ||
    text.includes("\\times") ||
    text.includes("\\ce{") ||    // kimia mhchem
    text.includes("\\text{") ||
    text.includes("^{") ||
    text.includes("_{") ||
    /\^\d/.test(text) ||
    /\_\d/.test(text)
  )
}

/**
 * Bersihkan HTML dari Quill agar aman di-render
 * Sekaligus JAGA LaTeX jangan ikut dihapus
 */
function cleanHtml(html: string = "") {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    // Hapus <p><br></p> kosong → ganti <br/>
    .replace(/<p><br\s*\/?><\/p>/gi, "<br/>")
    // Buka tag <p> tanpa menghapus isinya
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "<br/>")
    // Hapus span kosong
    .replace(/<span[^>]*><\/span>/gi, "")
    .trim()
    // Hapus trailing <br/> di akhir
    .replace(/(<br\s*\/?>\s*)+$/gi, "")
}

/**
 * Konversi teks plain (dari Excel/DB lama) yang punya LaTeX
 * tapi tidak punya HTML tag → wrap jadi HTML-safe
 * 
 * Quill menyimpan konten sebagai HTML, tapi data lama dari Excel
 * bisa berupa plain text dengan LaTeX di dalamnya.
 * Fungsi ini mendeteksi & membungkusnya agar bisa dirender.
 */
function normalizeContent(content: string = "") {
  if (!content) return ""
  
  // Kalau sudah ada HTML tag (dari Quill), langsung clean
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return cleanHtml(content)
  }
  
  // Plain text: ganti newline → <br/>, biarkan LaTeX apa adanya
  return content
    .split("\n")
    .map((line) => line.trim())
    .join("<br/>")
}

/**
 * Komponen render konten dengan MathJax
 * Stabil — tidak gerak-gerak karena key tidak berubah setiap render
 */
function MathContent({ html }: { html: string }) {
  const normalized = normalizeContent(html)
  
  // Kalau tidak ada math, render biasa saja (lebih cepat)
  if (!hasMath(normalized)) {
    return (
      <div
        className="prose max-w-none leading-7 text-gray-800"
        dangerouslySetInnerHTML={{ __html: normalized }}
      />
    )
  }

  return (
    <div className="prose max-w-none leading-7 text-gray-800">
      <MathJax
        // KUNCI: jangan pakai dynamic={true} — itu yang bikin gerak-gerak!
        // dynamic hanya untuk konten yang benar-benar berubah runtime
        hideUntilTypeset="first"
      >
        <div dangerouslySetInnerHTML={{ __html: normalized }} />
      </MathJax>
    </div>
  )
}

/**
 * Preview real-time di dalam modal editor
 * Ini boleh pakai dynamic karena konten memang berubah saat user mengetik
 */
function MathPreview({ html }: { html: string }) {
  const normalized = normalizeContent(html)
  if (!normalized) return null

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
      <div className="text-xs text-blue-500 mb-1 font-semibold">Preview:</div>
      <MathJax dynamic hideUntilTypeset="first">
        <div
          className="prose max-w-none leading-7"
          dangerouslySetInnerHTML={{ __html: normalized }}
        />
      </MathJax>
    </div>
  )
}

export default function AdminSoal() {
  const router = useRouter()

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ script: "sub" }, { script: "super" }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["blockquote"],
        ["link", "image"],
        ["clean"],
      ],
    }),
    []
  )

  const [soal, setSoal] = useState<Soal[]>([])
  const [filteredPaketSoal, setFilteredPaketSoal] = useState<Soal[]>([])
  const [selectedKategori, setSelectedKategori] = useState("Semua")
  const [selectedPaket, setSelectedPaket] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Preview toggle per field
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState<Soal>({
    pertanyaan: "",
    opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
    jawaban_benar: "a",
    kategori: "Matematika",
    paket: "",
    pembahasan: "",
    video_url: "",
    gambar: "",
    pengantar: "",
    bacaan: "",
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak!")
      router.push("/dashboard")
      return
    }

    getSoal()
  }

  async function getSoal() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("soal")
        .select("*")
        .order("id", { ascending: true })

      if (error) { console.log(error); return }
      setSoal((data || []) as Soal[])
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedPaket) { setFilteredPaketSoal([]); return }

    const hasil = soal
      .filter((s) => {
        const paketMatch = s.paket?.toLowerCase() === selectedPaket.toLowerCase()
        const kategoriMatch = selectedKategori === "Semua" ? true : s.kategori === selectedKategori
        return paketMatch && kategoriMatch
      })
      .slice(0, 25)

    setFilteredPaketSoal(hasil)
  }, [selectedPaket, selectedKategori, soal])

  function acakSoal() {
    if (!selectedPaket) return
    const hasil = soal
      .filter((s) => {
        const paketMatch = s.paket?.toLowerCase() === selectedPaket.toLowerCase()
        const kategoriMatch = selectedKategori === "Semua" ? true : s.kategori === selectedKategori
        return paketMatch && kategoriMatch
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, 25)
    setFilteredPaketSoal(hasil)
  }

  function generatePembahasan() {
    return `Jawaban benar adalah ${form.jawaban_benar.toUpperCase()}`
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
    } catch (err) {
      console.log(err)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    const cleanText = (text?: string) => {
      if (!text) return ""
      return text.replace(/<p><br\s*\/?><\/p>/g, "").replace(/<[^>]*>/g, "").trim()
    }

    if (!cleanText(form.pertanyaan)) { alert("Pertanyaan wajib diisi"); return }
    if (!cleanText(form.opsi_a)) { alert("Opsi A wajib diisi"); return }
    if (!cleanText(form.opsi_b)) { alert("Opsi B wajib diisi"); return }
    if (!cleanText(form.opsi_c)) { alert("Opsi C wajib diisi"); return }
    if (!cleanText(form.opsi_d)) { alert("Opsi D wajib diisi"); return }

    const payload = {
      pertanyaan: form.pertanyaan,
      opsi_a: form.opsi_a,
      opsi_b: form.opsi_b,
      opsi_c: form.opsi_c,
      opsi_d: form.opsi_d,
      opsi_e: form.opsi_e || "",
      jawaban_benar: form.jawaban_benar.toLowerCase().trim(),
      kategori: form.kategori.trim(),
      paket: form.paket?.trim() || "",
      pembahasan: form.pembahasan || generatePembahasan(),
      video_url: form.video_url || "",
      gambar: form.gambar || "",
      pengantar: form.pengantar || "",
      bacaan: form.bacaan || "",
      is_active: true,
    }

    try {
      setSaving(true)
      let result

      if (form.id) {
        result = await supabase.from("soal").update(payload).eq("id", form.id)
      } else {
        result = await supabase.from("soal").insert([payload])
      }

      if (result.error) {
        console.log("SUPABASE ERROR:", result.error)
        alert(result.error.message)
        return
      }

      alert("Berhasil disimpan")
      setShowModal(false)
      resetForm()
      await getSoal()
    } catch (err: any) {
      console.log(err)
      alert(err.message || "Gagal menyimpan")
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(item: Soal) {
    setForm({
      ...item,
      opsi_a: item.opsi_a || "",
      opsi_b: item.opsi_b || "",
      opsi_c: item.opsi_c || "",
      opsi_d: item.opsi_d || "",
      opsi_e: item.opsi_e || "",
      paket: item.paket || "",
      pengantar: item.pengantar || "",
      bacaan: item.bacaan || "",
      pembahasan: item.pembahasan || "",
      gambar: item.gambar || "",
    })
    setShowPreview({})
    setShowModal(true)
  }

  async function handleDelete(id: number) {
    const confirmDelete = confirm("Hapus soal?")
    if (!confirmDelete) return
    try {
      await supabase.from("soal").delete().eq("id", id)
      getSoal()
    } catch (err) {
      console.log(err)
    }
  }

  function resetForm() {
    setForm({
      pertanyaan: "",
      opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
      jawaban_benar: "a",
      kategori: "Matematika",
      paket: "",
      pembahasan: "",
      video_url: "",
      gambar: "",
      pengantar: "",
      bacaan: "",
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
        const payload = {
          pengantar: String(row.pengantar || ""),
          bacaan: String(row.bacaan || ""),
          pertanyaan: String(row.pertanyaan || ""),
          opsi_a: String(row.opsi_a || ""),
          opsi_b: String(row.opsi_b || ""),
          opsi_c: String(row.opsi_c || ""),
          opsi_d: String(row.opsi_d || ""),
          opsi_e: String(row.opsi_e || ""),
          jawaban_benar: String(row.jawaban_benar || "").toLowerCase().trim(),
          kategori: String(row.kategori || "").trim(),
          paket: String(row.paket || "").trim(),
          pembahasan: String(row.pembahasan || ""),
          video_url: String(row.video_url || ""),
          gambar: String(row.gambar || ""),
        }
        await supabase.from("soal").insert([payload])
      }

      alert("Upload berhasil 🚀")
      getSoal()
    }
    reader.readAsArrayBuffer(file)
  }

  const displayedSoal = selectedPaket ? filteredPaketSoal : soal

  const filteredSoal = displayedSoal
    .filter((s) => {
      const kategoriMatch = selectedKategori === "Semua" ? true : s.kategori === selectedKategori
      return kategoriMatch
    })
    .filter((s) =>
      s.pertanyaan?.toLowerCase().includes(search.toLowerCase())
    )

  // Field editor config
  const editorFields = [
    { label: "Pengantar", key: "pengantar" },
    { label: "Bacaan", key: "bacaan" },
    { label: "Pertanyaan", key: "pertanyaan" },
    { label: "Opsi A", key: "opsi_a" },
    { label: "Opsi B", key: "opsi_b" },
    { label: "Opsi C", key: "opsi_c" },
    { label: "Opsi D", key: "opsi_d" },
    { label: "Opsi E", key: "opsi_e" },
    { label: "Pembahasan", key: "pembahasan" },
  ]

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="bg-gray-100 min-h-screen text-black">

        {/* HEADER */}
        <div className="bg-blue-800 text-white p-6 flex justify-between items-center sticky top-0 z-40">
          <h1 className="text-3xl font-bold">Admin Soal</h1>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="border border-white px-4 py-2 rounded-lg"
            >
              ← Admin
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); setShowModal(true) }}
              className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold"
            >
              + Tambah Soal
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">

          {/* KATEGORI */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedKategori("Semua")}
              className={`px-4 py-2 rounded-xl border ${selectedKategori === "Semua" ? "bg-blue-700 text-white" : "bg-white"}`}
            >
              Semua
            </button>
            {kategoriList.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setSelectedKategori(k)}
                className={`px-4 py-2 rounded-xl border ${selectedKategori === k ? "bg-blue-700 text-white" : "bg-white"}`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* PAKET */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedPaket("")}
              className={`px-4 py-2 rounded-xl border ${selectedPaket === "" ? "bg-blue-700 text-white" : "bg-white"}`}
            >
              Semua Soal
            </button>
            {paketList.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setSelectedPaket(p)}
                className={`px-4 py-2 rounded-xl border ${selectedPaket === p ? "bg-green-600 text-white" : "bg-white"}`}
              >
                {p.toUpperCase()}
              </button>
            ))}
            {selectedPaket && (
              <button
                type="button"
                onClick={acakSoal}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white"
              >
                🎲 Acak 25 Soal
              </button>
            )}
          </div>

          {/* SEARCH */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <input
              placeholder="Cari soal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border p-3 rounded-xl bg-white"
            />
            <input
              type="file"
              accept=".xlsx"
              onChange={handleExcelUpload}
              className="border p-3 rounded-xl bg-white"
            />
          </div>

          {/* LIST */}
          {loading ? (
            <div className="bg-white p-10 rounded-2xl text-center">Loading...</div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="soal-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {filteredSoal.map((item, index) => (
                      <Draggable
                        key={String(item.id)}
                        draggableId={String(item.id)}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{ ...provided.draggableProps.style }}
                            className="bg-white p-5 mb-4 rounded-2xl shadow border"
                          >
                            <div className="flex justify-between gap-4">
                              <div className="flex gap-4 flex-1">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab text-2xl select-none"
                                >
                                  ☰
                                </div>

                                <div className="flex-1">
                                  {/* Pertanyaan */}
                                  <MathContent html={item.pertanyaan} />

                                  {/* Opsi */}
                                  <div className="mt-4 space-y-3">
                                    {[
                                      { label: "A", value: item.opsi_a },
                                      { label: "B", value: item.opsi_b },
                                      { label: "C", value: item.opsi_c },
                                      { label: "D", value: item.opsi_d },
                                      { label: "E", value: item.opsi_e },
                                    ]
                                      .filter((opsi) => opsi.value)
                                      .map((opsi) => (
                                        <div key={opsi.label} className="flex gap-2 items-start">
                                          <div className="font-bold w-5 shrink-0">{opsi.label}.</div>
                                          <div className="flex-1">
                                            <MathContent html={opsi.value} />
                                          </div>
                                        </div>
                                      ))}
                                  </div>

                                  {item.gambar && (
                                    <img
                                      src={item.gambar}
                                      alt="gambar"
                                      className="mt-4 rounded-xl w-48 border"
                                    />
                                  )}

                                  <div className="flex gap-2 mt-3 flex-wrap">
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                                      {item.kategori}
                                    </span>
                                    {item.paket && (
                                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                                        {item.paket}
                                      </span>
                                    )}
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                                      Jawaban: {item.jawaban_benar.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 shrink-0 relative z-20">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  className="bg-yellow-400 text-white px-4 py-2 rounded-xl hover:bg-yellow-500"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id!)}
                                  className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

              {/* HEADER */}
              <div className="flex items-center justify-between px-8 py-5 border-b bg-white z-30 shrink-0">
                <h2 className="text-2xl font-bold">
                  {form.id ? "Edit Soal" : "Tambah Soal"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-3xl leading-none text-gray-500 hover:text-red-500"
                >
                  ×
                </button>
              </div>

              {/* BODY */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">

                {/* GAMBAR */}
                <div>
                  <label className="font-semibold block mb-2">Upload Gambar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) await uploadGambar(file)
                    }}
                    className="w-full border p-3 rounded-xl"
                  />
                  {uploading && <p className="mt-2 text-blue-600">Uploading...</p>}
                  {form.gambar && (
                    <img src={form.gambar} alt="preview" className="w-48 mt-4 rounded-xl border" />
                  )}
                </div>

                {/* KATEGORI */}
                <select
                  value={form.kategori}
                  onChange={(e) => setForm((prev) => ({ ...prev, kategori: e.target.value }))}
                  className="w-full border p-4 rounded-xl"
                >
                  {kategoriList.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>

                {/* PAKET */}
                <select
                  value={form.paket}
                  onChange={(e) => setForm((prev) => ({ ...prev, paket: e.target.value }))}
                  className="w-full border p-4 rounded-xl"
                >
                  <option value="">Pilih Paket</option>
                  {paketList.map((p) => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>

                {/* EDITOR FIELDS */}
                {editorFields.map((field) => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-semibold">{field.label}</label>
                      {/* Toggle preview per field */}
                      <button
                        type="button"
                        onClick={() =>
                          setShowPreview((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key],
                          }))
                        }
                        className="text-xs text-blue-600 underline"
                      >
                        {showPreview[field.key] ? "Sembunyikan Preview" : "Lihat Preview"}
                      </button>
                    </div>

                    <div className="bg-white rounded-xl overflow-hidden border">
                      <ReactQuill
                        theme="snow"
                        modules={quillModules}
                        value={(form as any)[field.key] || ""}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, [field.key]: value }))
                        }
                      />
                    </div>

                    {/* Preview MathJax real-time */}
                    {showPreview[field.key] && (
                      <MathPreview html={(form as any)[field.key] || ""} />
                    )}
                  </div>
                ))}

                {/* JAWABAN */}
                <div>
                  <label className="font-semibold block mb-2">Jawaban Benar</label>
                  <select
                    value={form.jawaban_benar}
                    onChange={(e) => setForm((prev) => ({ ...prev, jawaban_benar: e.target.value }))}
                    className="w-full border p-4 rounded-xl"
                  >
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                    <option value="e">E</option>
                  </select>
                </div>
              </div>

              {/* FOOTER */}
              <div className="border-t bg-white px-8 py-5 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border px-6 py-3 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmit}
                  className="bg-blue-700 text-white px-6 py-3 rounded-xl disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MathJaxContext>
  )
}
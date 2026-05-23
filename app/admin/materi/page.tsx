"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type Materi = {
  id?: number
  judul: string
  kategori: string
  tipe: string
  link: string
  gambar?: string | null
}

const KATEGORI_OPTIONS = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "TPS",
  "Literasi",
]

const TIPE_OPTIONS = [
  { value: "video",   label: "Video"   },
  { value: "pdf",     label: "PDF"     },
  { value: "artikel", label: "Artikel" },
]

const TIPE_STYLE: Record<string, string> = {
  video:   "bg-sky-100 text-sky-700",
  pdf:     "bg-rose-100 text-rose-700",
  artikel: "bg-emerald-100 text-emerald-700",
}

const KATEGORI_STYLE: Record<string, string> = {
  "Matematika":       "bg-violet-100 text-violet-700",
  "Bahasa Indonesia": "bg-amber-100  text-amber-700",
  "Bahasa Inggris":   "bg-sky-100    text-sky-700",
  "TPS":              "bg-teal-100   text-teal-700",
  "Literasi":         "bg-orange-100 text-orange-700",
}

export default function AdminMateri() {

  const router = useRouter()

  const [materi,     setMateri    ] = useState<Materi[]>([])
  const [loading,    setLoading   ] = useState(true)
  const [showModal,  setShowModal ] = useState(false)
  const [editingId,  setEditingId ] = useState<number | null>(null)
  const [file,       setFile      ] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form,       setForm      ] = useState<Materi>({
    judul: "", kategori: "Matematika", tipe: "video", link: "", gambar: null,
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", data.user.id).single()

    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak")
      router.push("/dashboard")
      return
    }

    await getMateri()
    setLoading(false)
  }

  async function getMateri() {
    const { data } = await supabase
      .from("materi").select("*").order("id", { ascending: false })
    setMateri(data || [])
  }

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function openTambah() {
    setEditingId(null)
    setForm({ judul: "", kategori: "Matematika", tipe: "video", link: "", gambar: null })
    setFile(null)
    setShowModal(true)
  }

  function openEdit(item: Materi) {
    setEditingId(item.id || null)
    setForm(item)
    setFile(null)
    setShowModal(true)
  }

  async function uploadGambar() {
    if (!file) return null
    const ext      = file.name.split(".").pop()
    const fileName = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("materi").upload(fileName, file)
    if (error) { alert("Upload gagal: " + error.message); return null }
    const { data } = supabase.storage.from("materi").getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleSubmit() {
    if (!form.judul || !form.link) { alert("Judul & link wajib diisi"); return }
    if (!editingId && !file)       { alert("Gambar wajib diisi!");       return }

    setSubmitting(true)

    let gambarUrl = form.gambar || null
    if (file) {
      const uploaded = await uploadGambar()
      if (!uploaded) { setSubmitting(false); return }
      gambarUrl = uploaded
    }

    const payload = { ...form, gambar: gambarUrl }
    const res = editingId
      ? await supabase.from("materi").update(payload).eq("id", editingId)
      : await supabase.from("materi").insert([payload])

    setSubmitting(false)

    if (res.error) { alert("Gagal simpan: " + res.error.message); return }

    setShowModal(false)
    getMateri()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus materi ini?")) return
    await supabase.from("materi").delete().eq("id", id)
    getMateri()
  }

  // ── loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memuat materi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[3px] text-indigo-500 uppercase leading-none mb-0.5">
              Admin
            </p>
            <h1 className="text-[15px] font-semibold text-slate-800 leading-none">
              Materi Pembelajaran
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
              onClick={openTambah}
              className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-700 transition"
            >
              + Tambah
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* COUNT */}
        <div className="flex items-center gap-2 mb-5">
          <p className="text-sm font-medium text-slate-600">Daftar materi</p>
          <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
            {materi.length} materi
          </span>
        </div>

        {/* EMPTY STATE */}
        {materi.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-sm font-medium text-slate-700">Belum ada materi</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol tambah untuk menambahkan materi baru</p>
          </div>
        )}

        {/* CARD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {materi.map((item) => (
            <MateriCard
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id!)}
            />
          ))}
        </div>

      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-[15px] font-semibold text-slate-800">
                {editingId ? "Edit materi" : "Tambah materi"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-4 space-y-3">

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Judul materi</label>
                <input
                  name="judul"
                  placeholder="Masukkan judul materi"
                  value={form.judul}
                  onChange={handleChange}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                  <select
                    name="kategori"
                    value={form.kategori}
                    onChange={handleChange}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition bg-white"
                  >
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipe</label>
                  <select
                    name="tipe"
                    value={form.tipe}
                    onChange={handleChange}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition bg-white"
                  >
                    {TIPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Link materi</label>
                <input
                  name="link"
                  placeholder="https://..."
                  value={form.link}
                  onChange={handleChange}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Gambar {editingId && <span className="text-slate-400">(kosongkan jika tidak diganti)</span>}
                </label>

                {/* preview gambar lama saat edit */}
                {editingId && form.gambar && !file && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-slate-200">
                    <img src={form.gambar} alt="preview" className="w-full h-32 object-cover" />
                  </div>
                )}

                {/* preview file baru */}
                {file && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview baru"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 h-10 border border-dashed border-slate-300 rounded-xl px-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                  <span className="text-sm text-slate-400">
                    {file ? file.name : "Pilih gambar..."}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-9 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 h-9 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {submitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

// ── MATERI CARD ───────────────────────────────────────────────
function MateriCard({
  item, onEdit, onDelete
}: {
  item: Materi
  onEdit: () => void
  onDelete: () => void
}) {
  const tipeStyle     = TIPE_STYLE[item.tipe]     ?? "bg-slate-100 text-slate-600"
  const kategoriStyle = KATEGORI_STYLE[item.kategori] ?? "bg-slate-100 text-slate-600"

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 group">

      {/* Gambar */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        <img
          src={item.gambar || "https://via.placeholder.com/400x200"}
          alt={item.judul}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Tipe badge */}
        <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-1 rounded-full ${tipeStyle}`}>
          {item.tipe}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">

        {/* Kategori */}
        <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full mb-2 ${kategoriStyle}`}>
          {item.kategori}
        </span>

        {/* Judul */}
        <h2 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mb-4">
          {item.judul}
        </h2>

        {/* Aksi */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 h-8 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 h-8 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition"
          >
            Hapus
          </button>
        </div>

      </div>
    </div>
  )
}
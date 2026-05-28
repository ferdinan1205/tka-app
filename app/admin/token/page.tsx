"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type PackageType = {
  id: number
  nama_paket: string
  token: string
  is_custom: boolean
  image_url?: string
}

type SubjectType = {
  id: number
  package_id: number
  subject: string
}

const ALL_SUBJECTS = [
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris",
  "Fisika", "Kimia", "Biologi",
  "Ekonomi", "Geografi", "Sosiologi",
  "PPKN", "PKK",
  "Bahasa Arab", "Bahasa Jepang", "Bahasa Jerman",
  "Sejarah", "Antropologi", "TPS", "Literasi",
]

function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("")
}

// ── Komponen input URL manual ──
function ImageUrlInput({
  defaultValue,
  onSave,
}: {
  defaultValue: string
  onSave: (url: string) => void
}) {
  const [val, setVal] = useState(defaultValue)
  const [editing, setEditing] = useState(false)

  return editing ? (
    <div className="space-y-1.5">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="https://..."
        className="w-full h-8 border border-indigo-300 rounded-lg px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => { onSave(val); setEditing(false) }}
          className="flex-1 h-7 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
        >
          ✓ Simpan URL
        </button>
        <button
          onClick={() => setEditing(false)}
          className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition"
        >
          Batal
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition"
    >
      {defaultValue ? "✎ Ganti URL gambar" : "+ Atau pakai URL"}
    </button>
  )
}

export default function AdminManajemenPaket() {
  const router = useRouter()

  const [packages, setPackages] = useState<PackageType[]>([])
  const [subjects, setSubjects] = useState<SubjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Form buat paket baru
  const [newNama, setNewNama] = useState("")
  const [newToken, setNewToken] = useState("")
  const [saving, setSaving] = useState(false)

  // Inline edit token
  const [editingTokenId, setEditingTokenId] = useState<number | null>(null)
  const [editingToken, setEditingToken] = useState("")
  const [savingTokenId, setSavingTokenId] = useState<number | null>(null)

  // Inline edit nama
  const [editingNamaId, setEditingNamaId] = useState<number | null>(null)
  const [editingNama, setEditingNama] = useState("")

  // Atur pendamping
  const [editingPendampingId, setEditingPendampingId] = useState<number | null>(null)
  const [newSubject, setNewSubject] = useState("")
  const [savingSubject, setSavingSubject] = useState(false)

  // Upload gambar
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push("/login"); return }
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", authData.user.id).single()
    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak"); router.push("/dashboard"); return
    }
    await getData()
    setLoading(false)
  }

  async function getData() {
    const [{ data: pkgData }, { data: subData }] = await Promise.all([
      supabase.from("packages").select("*").order("id"),
      supabase.from("package_subjects").select("*").order("id"),
    ])
    setPackages((pkgData || []) as PackageType[])
    setSubjects((subData || []) as SubjectType[])
  }

  // ── Buat paket baru ──
  async function buatPaket() {
    if (!newNama.trim()) { alert("Nama paket wajib diisi"); return }
    if (!newToken.trim()) { alert("Token wajib diisi"); return }
    setSaving(true)
    const { error } = await supabase.from("packages").insert([{
      nama_paket: newNama.trim(),
      token: newToken.trim().toUpperCase(),
      is_custom: true,
    }])
    setSaving(false)
    if (error) { alert("Gagal buat paket: " + error.message); return }
    setNewNama(""); setNewToken("")
    await getData()
  }

  // ── Edit token ──
  async function simpanToken(id: number) {
    setSavingTokenId(id)
    const { error } = await supabase
      .from("packages")
      .update({ token: editingToken.trim().toUpperCase() || null })
      .eq("id", id)
    setSavingTokenId(null)
    if (error) { alert("Gagal: " + error.message); return }
    setEditingTokenId(null); setEditingToken("")
    await getData()
  }

  // ── Edit nama ──
  async function simpanNama(id: number) {
    if (!editingNama.trim()) { alert("Nama tidak boleh kosong"); return }
    const { error } = await supabase
      .from("packages").update({ nama_paket: editingNama.trim() }).eq("id", id)
    if (error) { alert("Gagal: " + error.message); return }
    setEditingNamaId(null); setEditingNama("")
    await getData()
  }

  // ── Hapus paket ──
  async function hapusPaket(id: number, nama: string) {
    if (!confirm(`Hapus paket "${nama}"? Semua data terkait juga akan terhapus.`)) return
    await supabase.from("package_subjects").delete().eq("package_id", id)
    await supabase.from("package_soal").delete().eq("package_id", id)
    await supabase.from("packages").delete().eq("id", id)
    await getData()
  }

  // ── Tambah pendamping ──
  async function tambahPendamping(packageId: number) {
    if (!newSubject) { alert("Pilih mata pelajaran"); return }
    const sudahAda = subjects.some(
      (s) => s.package_id === packageId && s.subject === newSubject
    )
    if (sudahAda) { alert("Mata pelajaran sudah ada di paket ini"); return }
    setSavingSubject(true)
    const { error } = await supabase
      .from("package_subjects").insert([{ package_id: packageId, subject: newSubject }])
    setSavingSubject(false)
    if (error) { alert("Gagal: " + error.message); return }
    setNewSubject("")
    await getData()
  }

  // ── Hapus pendamping ──
  async function hapusPendamping(id: number) {
    if (!confirm("Hapus mata pelajaran ini dari paket?")) return
    await supabase.from("package_subjects").delete().eq("id", id)
    await getData()
  }

  // ── Upload gambar ke Supabase Storage ──
  async function uploadGambar(packageId: number, file: File) {
    setUploadingImageId(packageId)
    const ext = file.name.split(".").pop()
    const path = `package-images/${packageId}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert("Gagal upload: " + uploadError.message)
      setUploadingImageId(null)
      return
    }

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
    const { error: updateError } = await supabase
      .from("packages")
      .update({ image_url: urlData.publicUrl })
      .eq("id", packageId)

    setUploadingImageId(null)
    if (updateError) { alert("Gagal simpan URL: " + updateError.message); return }
    await getData()
  }

  // ── Simpan URL gambar manual ──
  async function simpanImageUrl(packageId: number, url: string) {
    const { error } = await supabase
      .from("packages")
      .update({ image_url: url || null })
      .eq("id", packageId)
    if (error) { alert("Gagal: " + error.message); return }
    await getData()
  }

  const filtered = packages.filter((p) =>
    p.nama_paket.toLowerCase().includes(search.toLowerCase()) ||
    (p.token || "").toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memuat data paket...</p>
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
            <p className="text-[10px] font-semibold tracking-[3px] text-indigo-500 uppercase leading-none mb-0.5">Admin</p>
            <h1 className="text-[15px] font-semibold text-slate-800 leading-none">Manajemen Paket</h1>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="h-8 px-4 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── FORM BUAT PAKET BARU ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-800">Buat paket baru</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nama paket</label>
              <input
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                placeholder="Contoh: Paket IPA 4"
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Token</label>
              <div className="flex gap-2">
                <input
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value.toUpperCase())}
                  placeholder="Token..."
                  className="flex-1 h-10 border border-slate-200 rounded-xl px-3 text-sm font-mono font-semibold text-slate-800 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
                />
                <button
                  onClick={() => setNewToken(generateToken())}
                  className="h-10 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition"
                >🎲</button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={buatPaket}
                disabled={saving}
                className="w-full h-10 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? "Menyimpan..." : "+ Buat paket"}
              </button>
            </div>
          </div>
        </div>

        {/* ── DAFTAR PAKET ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-800">Atur paket</h2>
              <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
                {packages.length} paket
              </span>
            </div>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari paket atau token..."
                className="h-9 w-56 border border-slate-200 rounded-xl bg-white px-3 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-400">Tidak ada paket ditemukan</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item) => {
              const isEditingToken = editingTokenId === item.id
              const isEditingNama = editingNamaId === item.id
              const isEditingPendamping = editingPendampingId === item.id
              const isSavingToken = savingTokenId === item.id
              const isUploadingImage = uploadingImageId === item.id
              const paketSubjects = subjects.filter((s) => s.package_id === item.id)
              const usedSubjects = paketSubjects.map((s) => s.subject)
              const availableSubjects = ALL_SUBJECTS.filter((s) => !usedSubjects.includes(s))

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-4 transition space-y-3 ${
                    isEditingToken || isEditingNama || isEditingPendamping
                      ? "border-indigo-300 bg-indigo-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* ── NAMA ── */}
                  {!isEditingNama ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 flex-1 truncate">{item.nama_paket}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.is_custom ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                        }`}>
                          {item.is_custom ? "Custom" : "Default"}
                        </span>
                        <button
                          onClick={() => { setEditingNamaId(item.id); setEditingNama(item.nama_paket) }}
                          className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xs"
                          title="Edit nama"
                        >✏️</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        autoFocus
                        value={editingNama}
                        onChange={(e) => setEditingNama(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") simpanNama(item.id)
                          if (e.key === "Escape") setEditingNamaId(null)
                        }}
                        className="w-full h-8 border border-indigo-300 rounded-lg px-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                      />
                      <div className="flex gap-1.5">
                        <button onClick={() => simpanNama(item.id)}
                          className="flex-1 h-7 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition">
                          ✓ Simpan
                        </button>
                        <button onClick={() => setEditingNamaId(null)}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition">
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── PENDAMPING ── */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran Pendamping</p>
                      <button
                        onClick={() => {
                          setEditingPendampingId(isEditingPendamping ? null : item.id)
                          setNewSubject("")
                        }}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                      >
                        {isEditingPendamping ? "Selesai" : "+ Tambah"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {paketSubjects.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">Belum ada pendamping</span>
                      )}
                      {paketSubjects.map((s) => (
                        <div key={s.id}
                          className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {s.subject}
                          <button
                            onClick={() => hapusPendamping(s.id)}
                            className="text-slate-400 hover:text-red-500 transition ml-0.5 leading-none"
                          >×</button>
                        </div>
                      ))}
                    </div>

                    {isEditingPendamping && (
                      <div className="flex gap-1.5 mt-2">
                        <select
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="flex-1 h-8 border border-slate-200 rounded-lg px-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition bg-white"
                        >
                          <option value="">Pilih mapel...</option>
                          {availableSubjects.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => tambahPendamping(item.id)}
                          disabled={savingSubject}
                          className="h-8 px-3 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {savingSubject ? "..." : "Tambah"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── TOKEN ── */}
                  <div className="border-t border-slate-100 pt-3">
                    {!isEditingToken ? (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          {item.token ? (
                            <span className="font-mono text-base font-black text-indigo-600 tracking-widest">
                              {item.token}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum ada token</span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => { setEditingTokenId(item.id); setEditingToken(item.token || "") }}
                            className="h-7 px-3 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition"
                          >
                            Edit token
                          </button>
                          {item.is_custom && (
                            <button
                              onClick={() => hapusPaket(item.id, item.nama_paket)}
                              className="h-7 px-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            value={editingToken}
                            onChange={(e) => setEditingToken(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") simpanToken(item.id)
                              if (e.key === "Escape") { setEditingTokenId(null); setEditingToken("") }
                            }}
                            placeholder="Masukkan token..."
                            className="flex-1 h-9 border border-indigo-300 rounded-lg px-3 text-sm font-mono font-bold text-slate-800 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 bg-white transition"
                          />
                          <button
                            onClick={() => setEditingToken(generateToken())}
                            className="h-9 px-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs hover:bg-slate-200 transition"
                          >🎲</button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => simpanToken(item.id)}
                            disabled={isSavingToken}
                            className="flex-1 h-8 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            {isSavingToken ? "Menyimpan..." : "✓ Simpan"}
                          </button>
                          <button
                            onClick={() => { setEditingTokenId(null); setEditingToken("") }}
                            className="h-8 px-3 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── GAMBAR ── */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foto Paket</p>

                    {/* Preview */}
                    {item.image_url && (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200">
                        <img
                          src={item.image_url}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => simpanImageUrl(item.id, "")}
                          className="absolute top-1 right-1 w-5 h-5 bg-white/80 rounded text-slate-500 text-xs hover:bg-white hover:text-red-500 transition"
                          title="Hapus gambar"
                        >×</button>
                      </div>
                    )}

                    {/* Upload file */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Upload gambar</label>
                      <label className={`flex items-center justify-center gap-1.5 h-8 w-full rounded-lg border border-dashed cursor-pointer transition text-xs font-medium
                        ${isUploadingImage
                          ? "border-indigo-300 text-indigo-400 bg-indigo-50/50"
                          : "border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30"
                        }`}>
                        {isUploadingImage ? (
                          <><span className="animate-spin inline-block">⏳</span> Mengupload...</>
                        ) : (
                          <><span>📁</span> Pilih file (JPG/PNG)</>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingImage}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) uploadGambar(item.id, file)
                            e.target.value = ""
                          }}
                        />
                      </label>
                    </div>

                    {/* Atau URL manual */}
                    <ImageUrlInput
                      defaultValue={item.image_url || ""}
                      onSave={(url) => simpanImageUrl(item.id, url)}
                    />
                  </div>

                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
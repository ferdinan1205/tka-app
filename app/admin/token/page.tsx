"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type Jadwal = {
  id: number
  kategori: string
  token: string
  durasi: number
  status: boolean
}

type PackageType = {
  id: number
  nama_paket: string
  token: string
  is_custom: boolean
  pendamping_subject?: string
}

const KATEGORI_LIST = [
  "Matematika","Bahasa Indonesia","Bahasa Inggris","Fisika","Kimia",
  "Biologi","Ekonomi","Geografi","Sosiologi","Sejarah","Antropologi",
  "Bahasa Arab","Bahasa Mandarin","Bahasa Jepang","Bahasa Korea",
  "Bahasa Jerman","Bahasa Prancis","PPKN","PKK","TPS","Literasi",
]

function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("")
}

export default function AdminToken() {
  const router = useRouter()

  // mapel state
  const [kategori, setKategori] = useState("Matematika")
  const [token,    setToken   ] = useState("")
  const [durasi,   setDurasi  ] = useState(90)
  const [data,     setData    ] = useState<Jadwal[]>([])

  // package state
  const [packages, setPackages] = useState<PackageType[]>([])

  // inline edit state: key = package id, value = token string being edited
  const [editingId,    setEditingId   ] = useState<number | null>(null)
  const [editingToken, setEditingToken] = useState("")
  const [savingId,     setSavingId    ] = useState<number | null>(null)

  // global
  const [loading,  setLoading ] = useState(true)
  const [search,   setSearch  ] = useState("")
  const [savingMapel, setSavingMapel] = useState(false)

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
    const { data: jadwalData } = await supabase
      .from("jadwal_ujian").select("*").order("id", { ascending: false })
    setData((jadwalData || []) as Jadwal[])

    const { data: packageData } = await supabase
      .from("packages").select("*").order("id")
    setPackages((packageData || []) as PackageType[])
  }

  // ── Token Mapel ──────────────────────────────────────────────

  async function simpanToken() {
    if (!token) { alert("Token wajib diisi"); return }
    setSavingMapel(true)
    await supabase.from("jadwal_ujian").update({ status: false }).eq("kategori", kategori)
    const { error } = await supabase.from("jadwal_ujian").insert([{
      kategori, token: token.trim().toUpperCase(), durasi: Number(durasi), status: true,
    }])
    setSavingMapel(false)
    if (error) { alert(error.message); return }
    setToken(""); setDurasi(90)
    await getData()
  }

  async function hapusToken(id: number) {
    if (!confirm("Hapus token ini?")) return
    await supabase.from("jadwal_ujian").delete().eq("id", id)
    await getData()
  }

  async function toggleStatus(item: Jadwal) {
    if (!item.status) {
      await supabase.from("jadwal_ujian").update({ status: false }).eq("kategori", item.kategori)
    }
    await supabase.from("jadwal_ujian").update({ status: !item.status }).eq("id", item.id)
    await getData()
  }

  // ── Token Package (inline edit) ──────────────────────────────

  function startEdit(item: PackageType) {
    setEditingId(item.id)
    setEditingToken(item.token || "")
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingToken("")
  }

async function simpanTokenPackage(id: number) {
  console.log("SAVING id:", id)
  console.log("TOKEN:", editingToken)
  
  setSavingId(id)
  const { data, error } = await supabase
    .from("packages")
    .update({ token: editingToken.trim().toUpperCase() || null })
    .eq("id", id)
    .select() // ← tambah ini

  console.log("RESULT:", data)
  console.log("ERROR:", error)
  
  setSavingId(null)
  if (error) { alert("Gagal: " + error.message); return }
  setEditingId(null)
  setEditingToken("")
  await getData()
}
  async function hapusTokenPackage(id: number) {
    if (!confirm("Hapus token paket ini?")) return
    const { error } = await supabase
      .from("packages").update({ token: null }).eq("id", id)
    if (error) { alert("Gagal hapus token"); return }
    await getData()
  }

  // ── Filter ───────────────────────────────────────────────────

  const filteredData = data.filter((item) =>
    item.kategori.toLowerCase().includes(search.toLowerCase()) ||
    item.token.toLowerCase().includes(search.toLowerCase())
  )

  // ── Loading ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memuat data token...</p>
        </div>
      </div>
    )
  }

  // ── UI ───────────────────────────────────────────────────────

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
              Manajemen Token
            </h1>
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

        {/* ── FORM BUAT TOKEN MAPEL ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-800">Buat token mapel</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Kategori */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mata pelajaran</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition bg-white"
              >
                {KATEGORI_LIST.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Token */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Token</label>
              <div className="flex gap-2">
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="Token..."
                  className="flex-1 h-10 border border-slate-200 rounded-xl px-3 text-sm font-mono font-semibold text-slate-800 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
                />
                <button
                  onClick={() => setToken(generateToken())}
                  className="h-10 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition whitespace-nowrap"
                >
                  🎲
                </button>
              </div>
            </div>

            {/* Durasi */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Durasi (menit)</label>
              <input
                type="number"
                value={durasi}
                onChange={(e) => setDurasi(Number(e.target.value))}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
              />
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <button
                onClick={simpanToken}
                disabled={savingMapel}
                className="w-full h-10 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {savingMapel ? "Menyimpan..." : "Simpan token"}
              </button>
            </div>
          </div>
        </div>

        {/* ── TOKEN PAKET ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800">Token paket</h2>
            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
              {packages.length} paket
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {packages.map((item) => {
              const isEditing = editingId === item.id
              const isSaving  = savingId  === item.id

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-4 transition ${
                    isEditing
                      ? "border-indigo-300 bg-indigo-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Nama + badge */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 flex-1 truncate">
                      {item.nama_paket}
                    </p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      item.is_custom
                        ? "bg-violet-100 text-violet-700"
                        : "bg-sky-100 text-sky-700"
                    }`}>
                      {item.is_custom ? "Custom" : "Default"}
                    </span>
                  </div>

                  {/* Pendamping */}
                  {item.pendamping_subject && (
                    <p className="text-[11px] text-slate-400 mb-2 truncate">
                      {item.pendamping_subject}
                    </p>
                  )}

                  {/* Mode normal: tampilkan token */}
                  {!isEditing && (
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
                          onClick={() => startEdit(item)}
                          className="h-7 px-3 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition"
                        >
                          Edit
                        </button>
                        {item.token && (
                          <button
                            onClick={() => hapusTokenPackage(item.id)}
                            className="h-7 px-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode edit: input inline */}
                  {isEditing && (
                    <div className="space-y-2 mt-1">
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={editingToken}
                          onChange={(e) => setEditingToken(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") simpanTokenPackage(item.id)
                            if (e.key === "Escape") cancelEdit()
                          }}
                          placeholder="Masukkan token..."
                          className="flex-1 h-9 border border-indigo-300 rounded-lg px-3 text-sm font-mono font-bold text-slate-800 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 bg-white transition"
                        />
                        <button
                          onClick={() => setEditingToken(generateToken())}
                          className="h-9 px-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs hover:bg-slate-200 transition"
                          title="Random token"
                        >
                          🎲
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => simpanTokenPackage(item.id)}
                          disabled={isSaving}
                          className="flex-1 h-8 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                        >
                          {isSaving ? "Menyimpan..." : "✓ Simpan"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="h-8 px-3 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── DAFTAR TOKEN MAPEL ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-700">Daftar token mapel</h2>
              <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
                {filteredData.length} token
              </span>
            </div>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari token atau mapel..."
                className="h-9 w-64 border border-slate-200 rounded-xl bg-white px-3 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          {filteredData.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm text-slate-400">Belum ada token mapel</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-slate-300 transition"
              >
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  item.status ? "bg-emerald-500" : "bg-slate-300"
                }`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.kategori}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg tracking-widest">
                      {item.token}
                    </span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg font-medium">
                      {item.durasi} menit
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${
                      item.status
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {item.status ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`h-7 px-3 rounded-lg text-xs font-medium transition ${
                      item.status
                        ? "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {item.status ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => hapusToken(item.id)}
                    className="h-7 px-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
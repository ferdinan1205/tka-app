"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"

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

type JadwalUjian = {
  id: number
  kategori: string
  durasi: number
  status: boolean
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

// ── nav & theme (sama seperti dashboard admin) ──────────────────

const MENU = [
  { label: "Dashboard",      icon: "⌂",  path: "/admin"         },
  { label: "Kelola Soal",    icon: "✎",  path: "/admin/soal"    },
  { label: "Materi",         icon: "◈",  path: "/admin/materi"  },
  { label: "Kelas",          icon: "▤",  path: "/admin/kelas"   },   // ← tambahin ini
  { label: "Ranking",        icon: "◎",  path: "/admin/ranking" },
  { label: "Rekap Nilai",    icon: "≋",  path: "/admin/rekap"   },
  { label: "Manajemen User", icon: "◉",  path: "/admin/users"   },
  { label: "Manajemen Token", icon: "⟐",  path: "/admin/token"   },
]
const G = {
  teal:   "linear-gradient(135deg,#0ea5e9,#0d9488)",
  violet: "linear-gradient(135deg,#7c3aed,#4f46e5)",
  amber:  "linear-gradient(135deg,#f59e0b,#ef4444)",
  emerald:"linear-gradient(135deg,#10b981,#059669)",
}

const AVATAR_COLORS = [
  ["#0ea5e9","#0284c7"],["#7c3aed","#4f46e5"],["#f59e0b","#ef4444"],
  ["#10b981","#059669"],["#f43f5e","#e11d48"],["#06b6d4","#0891b2"],
  ["#8b5cf6","#6d28d9"],["#ec4899","#db2777"],
]
const avatarGrad = (name: string) => {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  const [a, b] = AVATAR_COLORS[idx]
  return `linear-gradient(135deg,${a},${b})`
}

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
        className="tp-input w-full h-8 rounded-lg px-2.5 text-xs text-slate-800 outline-none bg-white"
        style={{ border: "1px solid rgba(14,165,233,.4)" }}
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => { onSave(val); setEditing(false) }}
          className="flex-1 h-7 text-white rounded-lg text-xs font-semibold transition"
          style={{ background: "#10b981" }}
        >
          ✓ Simpan URL
        </button>
        <button
          onClick={() => setEditing(false)}
          className="h-7 px-2.5 rounded-lg text-slate-500 text-xs hover:bg-slate-50 transition"
          style={{ border: "1px solid rgba(15,23,42,.1)" }}
        >
          Batal
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="text-[11px] font-medium transition"
      style={{ color: "#0284c7" }}
    >
      {defaultValue ? "✎ Ganti URL gambar" : "+ Atau pakai URL"}
    </button>
  )
}

export default function AdminManajemenPaket() {
  const router   = useRouter()
  const pathname = usePathname()

  const [packages, setPackages] = useState<PackageType[]>([])
  const [subjects, setSubjects] = useState<SubjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [adminName,   setAdminName  ] = useState("Admin")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [newNama, setNewNama] = useState("")
  const [newToken, setNewToken] = useState("")
  const [saving, setSaving] = useState(false)

  const [editingTokenId, setEditingTokenId] = useState<number | null>(null)
  const [editingToken, setEditingToken] = useState("")
  const [savingTokenId, setSavingTokenId] = useState<number | null>(null)

  const [editingNamaId, setEditingNamaId] = useState<number | null>(null)
  const [editingNama, setEditingNama] = useState("")

  const [editingPendampingId, setEditingPendampingId] = useState<number | null>(null)
  const [newSubject, setNewSubject] = useState("")
  const [savingSubject, setSavingSubject] = useState(false)

  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null)

  const [jadwalList, setJadwalList] = useState<JadwalUjian[]>([])
  const [editingWaktuKategori, setEditingWaktuKategori] = useState<string | null>(null)
  const [editingDurasi, setEditingDurasi] = useState<number>(90)
  const [savingWaktu, setSavingWaktu] = useState(false)
  const [addingMapel, setAddingMapel] = useState(false)
  const [newMapelNama, setNewMapelNama] = useState("")
  const [newMapelDurasi, setNewMapelDurasi] = useState(90)
  const [waktuSearch, setWaktuSearch] = useState("")

  useEffect(() => { init() }, [])

  async function init() {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push("/login"); return }
    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", authData.user.id).single()
    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak"); router.push("/dashboard"); return
    }
    setAdminName(profile.nama || "Admin")
    await getData()
    setLoading(false)
  }

  async function getData() {
    const [{ data: pkgData }, { data: subData }, { data: jadwalData }] = await Promise.all([
      supabase.from("packages").select("*").order("id"),
      supabase.from("package_subjects").select("*").order("id"),
      supabase.from("jadwal_ujian").select("*").order("kategori"),
    ])
    setPackages((pkgData || []) as PackageType[])
    setSubjects((subData || []) as SubjectType[])
    setJadwalList((jadwalData || []) as JadwalUjian[])
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

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

  async function simpanNama(id: number) {
    if (!editingNama.trim()) { alert("Nama tidak boleh kosong"); return }
    const { error } = await supabase
      .from("packages").update({ nama_paket: editingNama.trim() }).eq("id", id)
    if (error) { alert("Gagal: " + error.message); return }
    setEditingNamaId(null); setEditingNama("")
    await getData()
  }

  async function hapusPaket(id: number, nama: string) {
    if (!confirm(`Hapus paket "${nama}"? Semua data terkait juga akan terhapus.`)) return
    await supabase.from("package_subjects").delete().eq("package_id", id)
    await supabase.from("package_soal").delete().eq("package_id", id)
    await supabase.from("packages").delete().eq("id", id)
    await getData()
  }

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

  async function hapusPendamping(id: number) {
    if (!confirm("Hapus mata pelajaran ini dari paket?")) return
    await supabase.from("package_subjects").delete().eq("id", id)
    await getData()
  }

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

  async function simpanImageUrl(packageId: number, url: string) {
    const { error } = await supabase
      .from("packages")
      .update({ image_url: url || null })
      .eq("id", packageId)
    if (error) { alert("Gagal: " + error.message); return }
    await getData()
  }

  async function simpanWaktu(kategori: string) {
    if (!editingDurasi || editingDurasi < 1) { alert("Durasi tidak valid"); return }
    setSavingWaktu(true)

    const existing = jadwalList.find((j) => j.kategori === kategori)

    if (existing) {
      const { error } = await supabase
        .from("jadwal_ujian")
        .update({ durasi: editingDurasi })
        .eq("id", existing.id)
      if (error) { alert("Gagal: " + error.message); setSavingWaktu(false); return }
    } else {
      const { error } = await supabase
        .from("jadwal_ujian")
        .insert([{ kategori, durasi: editingDurasi, status: false }])
      if (error) { alert("Gagal: " + error.message); setSavingWaktu(false); return }
    }

    setSavingWaktu(false)
    setEditingWaktuKategori(null)
    await getData()
  }

  async function tambahMapelBaru() {
    if (!newMapelNama.trim()) { alert("Nama mapel wajib diisi"); return }
    if (!newMapelDurasi || newMapelDurasi < 1) { alert("Durasi tidak valid"); return }

    const sudahAda = jadwalList.some(
      (j) => j.kategori.toLowerCase() === newMapelNama.trim().toLowerCase()
    )
    if (sudahAda) { alert("Mapel ini sudah ada"); return }

    setSavingWaktu(true)
    const { error } = await supabase
      .from("jadwal_ujian")
      .insert([{ kategori: newMapelNama.trim(), durasi: newMapelDurasi, status: false }])
    setSavingWaktu(false)

    if (error) { alert("Gagal: " + error.message); return }
    setNewMapelNama("")
    setNewMapelDurasi(90)
    setAddingMapel(false)
    await getData()
  }

  async function toggleStatusMapel(jadwal: JadwalUjian) {
    const { error } = await supabase
      .from("jadwal_ujian")
      .update({ status: !jadwal.status })
      .eq("id", jadwal.id)
    if (error) { alert("Gagal: " + error.message); return }
    await getData()
  }

  async function hapusMapel(jadwal: JadwalUjian) {
    if (!confirm(`Hapus jadwal ujian "${jadwal.kategori}"?`)) return
    await supabase.from("jadwal_ujian").delete().eq("id", jadwal.id)
    await getData()
  }

  const filtered = packages.filter((p) =>
    p.nama_paket.toLowerCase().includes(search.toLowerCase()) ||
    (p.token || "").toLowerCase().includes(search.toLowerCase())
  )

  const filteredJadwal = jadwalList.filter((j) =>
    j.kategori.toLowerCase().includes(waktuSearch.toLowerCase())
  )

  /* ─── Sidebar (identik dengan dashboard admin) ─── */
  const Sidebar = () => (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

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

        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { opacity:0; animation: fadeUp .5s cubic-bezier(.4,0,.2,1) forwards; }
        .d1{animation-delay:.04s}.d2{animation-delay:.10s}.d3{animation-delay:.16s}

        .tp-card { transition: border-color .18s ease, box-shadow .18s ease; }
        .tp-input:focus { border-color: rgba(14,165,233,.5) !important; box-shadow: 0 0 0 3px rgba(14,165,233,.1); }
        .tp-input-amber:focus { border-color: rgba(245,158,11,.5) !important; box-shadow: 0 0 0 3px rgba(245,158,11,.12); }
        .tp-row:hover { background: rgba(14,165,233,.03); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 4px; }
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
<div className="px-5 pt-6 pb-4 flex items-center justify-center" style={{ borderBottom: "1px solid rgba(56,189,248,.1)" }}>
  <img
    src="/logo-lampung-cerdas.png"
    alt="Lampung Cerdas"
    className="h-12 w-auto object-contain"
  />
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060f22" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-11 h-11">
            <div className="absolute inset-0 rounded-full border-2 border-sky-900" />
            <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          </div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "1px", color: "#7dabc9" }}
            className="text-xs font-medium">Memuat data paket</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#eef2f7" }} className="min-h-screen">

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
          className="font-semibold text-slate-800">Manajemen Paket</p>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-7 max-w-6xl mx-auto space-y-5">

          {/* ── PAGE HEADER ── */}
          <div className="fade-up d1">
            <p style={{ color: "#0284c7", letterSpacing: "1px", fontSize: "10px" }}
              className="font-medium uppercase">Admin</p>
            <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "19px" }}
              className="font-semibold text-slate-900 mt-0.5">Manajemen Paket</h1>
          </div>

          {/* ── FORM BUAT PAKET BARU ── */}
          <div className="fade-up d2 bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full" style={{ background: G.teal }} />
              <h2 className="text-sm font-semibold text-slate-800">Buat paket baru</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama paket</label>
                <input
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Paket IPA 4"
                  className="tp-input w-full h-10 rounded-xl px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition"
                  style={{ border: "1px solid rgba(15,23,42,.08)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Token</label>
                <div className="flex gap-2">
                  <input
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value.toUpperCase())}
                    placeholder="Token..."
                    className="tp-input flex-1 h-10 rounded-xl px-3 text-sm font-mono font-semibold text-slate-800 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 outline-none transition"
                    style={{ border: "1px solid rgba(15,23,42,.08)" }}
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
                  className="w-full h-10 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition"
                  style={{ background: G.teal, boxShadow: "0 4px 12px rgba(14,165,233,.28)" }}
                >
                  {saving ? "Menyimpan..." : "+ Buat paket"}
                </button>
              </div>
            </div>
          </div>

          {/* ── DAFTAR PAKET ── */}
          <div className="fade-up d2 bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full" style={{ background: G.emerald }} />
                <h2 className="text-sm font-semibold text-slate-800">Atur paket</h2>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(14,165,233,.1)", color: "#0369a1" }}>
                  {packages.length} paket
                </span>
              </div>
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari paket atau token..."
                  className="tp-input h-9 w-56 rounded-xl bg-white px-3 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition"
                  style={{ border: "1px solid rgba(15,23,42,.08)" }}
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
                const isActiveEditing = isEditingToken || isEditingNama || isEditingPendamping

                return (
                  <div
                    key={item.id}
                    className="tp-card rounded-xl p-4 space-y-3"
                    style={{
                      border: isActiveEditing ? "1px solid rgba(14,165,233,.4)" : "1px solid rgba(15,23,42,.08)",
                      background: isActiveEditing ? "rgba(14,165,233,.04)" : "#fff",
                      boxShadow: isActiveEditing ? "0 4px 14px rgba(14,165,233,.1)" : "none",
                    }}
                  >
                    {/* ── NAMA ── */}
                    {!isEditingNama ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 flex-1 truncate">{item.nama_paket}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={item.is_custom
                              ? { background: "rgba(124,58,237,.12)", color: "#6d28d9" }
                              : { background: "rgba(14,165,233,.12)", color: "#0369a1" }
                            }>
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
                          className="w-full h-8 rounded-lg px-2.5 text-sm font-semibold text-slate-800 outline-none bg-white"
                          style={{ border: "1px solid rgba(14,165,233,.4)" }}
                        />
                        <div className="flex gap-1.5">
                          <button onClick={() => simpanNama(item.id)}
                            className="flex-1 h-7 text-white rounded-lg text-xs font-semibold transition"
                            style={{ background: "#10b981" }}>
                            ✓ Simpan
                          </button>
                          <button onClick={() => setEditingNamaId(null)}
                            className="h-7 px-2.5 rounded-lg text-slate-500 text-xs hover:bg-slate-50 transition"
                            style={{ border: "1px solid rgba(15,23,42,.1)" }}>
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
                          className="text-[10px] font-semibold transition"
                          style={{ color: "#0284c7" }}
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
                            className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            style={{ background: "#f1f5f9" }}>
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
                            className="tp-input flex-1 h-8 rounded-lg px-2 text-xs text-slate-800 outline-none transition bg-white"
                            style={{ border: "1px solid rgba(15,23,42,.08)" }}
                          >
                            <option value="">Pilih mapel...</option>
                            {availableSubjects.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => tambahPendamping(item.id)}
                            disabled={savingSubject}
                            className="h-8 px-3 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                            style={{ background: G.teal }}
                          >
                            {savingSubject ? "..." : "Tambah"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── TOKEN ── */}
                    <div className="pt-3" style={{ borderTop: "1px solid rgba(15,23,42,.06)" }}>
                      {!isEditingToken ? (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            {item.token ? (
                              <span className="font-mono text-base font-black tracking-widest" style={{ color: "#0284c7" }}>
                                {item.token}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Belum ada token</span>
                            )}
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => { setEditingTokenId(item.id); setEditingToken(item.token || "") }}
                              className="h-7 px-3 rounded-lg text-xs font-medium transition"
                              style={{ background: "rgba(245,158,11,.12)", color: "#b45309" }}
                            >
                              Edit token
                            </button>
                            {item.is_custom && (
                              <button
                                onClick={() => hapusPaket(item.id, item.nama_paket)}
                                className="h-7 px-3 rounded-lg text-xs font-medium transition"
                                style={{ background: "rgba(244,63,94,.1)", color: "#e11d48" }}
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
                              className="flex-1 h-9 rounded-lg px-3 text-sm font-mono font-bold text-slate-800 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 outline-none bg-white transition"
                              style={{ border: "1px solid rgba(14,165,233,.4)" }}
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
                              className="flex-1 h-8 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                              style={{ background: "#10b981" }}
                            >
                              {isSavingToken ? "Menyimpan..." : "✓ Simpan"}
                            </button>
                            <button
                              onClick={() => { setEditingTokenId(null); setEditingToken("") }}
                              className="h-8 px-3 rounded-lg text-slate-500 text-xs hover:bg-slate-50 transition"
                              style={{ border: "1px solid rgba(15,23,42,.1)" }}
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── GAMBAR ── */}
                    <div className="pt-3 space-y-2" style={{ borderTop: "1px solid rgba(15,23,42,.06)" }}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foto Paket</p>

                      {item.image_url && (
                        <div className="relative w-full h-24 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
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

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Upload gambar</label>
                        <label className="flex items-center justify-center gap-1.5 h-8 w-full rounded-lg border border-dashed cursor-pointer transition text-xs font-medium"
                          style={isUploadingImage
                            ? { borderColor: "rgba(14,165,233,.4)", color: "#0284c7", background: "rgba(14,165,233,.05)" }
                            : { borderColor: "rgba(15,23,42,.15)", color: "#64748b" }
                          }>
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

          {/* ── MANAJEMEN WAKTU MAPEL ── */}
          <div className="fade-up d3 bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full" style={{ background: G.amber }} />
                <h2 className="text-sm font-semibold text-slate-800">Manajemen Waktu Mapel</h2>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,.1)", color: "#b45309" }}>
                  {jadwalList.length} mapel
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    value={waktuSearch}
                    onChange={(e) => setWaktuSearch(e.target.value)}
                    placeholder="Cari mapel..."
                    className="tp-input-amber h-9 w-44 rounded-xl bg-white px-3 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition"
                    style={{ border: "1px solid rgba(15,23,42,.08)" }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                </div>
                <button
                  onClick={() => { setAddingMapel(!addingMapel); setNewMapelNama(""); setNewMapelDurasi(90) }}
                  className="h-9 px-4 rounded-xl text-xs font-semibold transition"
                  style={addingMapel
                    ? { background: "#f1f5f9", color: "#475569" }
                    : { background: G.amber, color: "#fff", boxShadow: "0 4px 12px rgba(245,158,11,.28)" }
                  }
                >
                  {addingMapel ? "Batal" : "+ Tambah Mapel"}
                </button>
              </div>
            </div>

            {/* Form tambah mapel baru */}
            {addingMapel && (
              <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#b45309" }}>Tambah mapel baru ke jadwal</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nama Mapel</label>
                    <select
                      value={newMapelNama}
                      onChange={(e) => setNewMapelNama(e.target.value)}
                      className="tp-input-amber w-full h-10 rounded-xl px-3 text-sm text-slate-800 outline-none transition bg-white"
                      style={{ border: "1px solid rgba(15,23,42,.08)" }}
                    >
                      <option value="">Pilih mapel...</option>
                      {ALL_SUBJECTS.filter(
                        (s) => !jadwalList.some((j) => j.kategori.toLowerCase() === s.toLowerCase())
                      ).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="__custom__">Nama lainnya (ketik manual)</option>
                    </select>
                    {newMapelNama === "__custom__" && (
                      <input
                        autoFocus
                        value=""
                        onChange={(e) => setNewMapelNama(e.target.value)}
                        placeholder="Ketik nama mapel..."
                        className="mt-2 w-full h-10 rounded-xl px-3 text-sm text-slate-800 outline-none bg-white transition"
                        style={{ border: "1px solid rgba(245,158,11,.4)" }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Durasi (menit)</label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={newMapelDurasi}
                      onChange={(e) => setNewMapelDurasi(Number(e.target.value))}
                      className="tp-input-amber w-full h-10 rounded-xl px-3 text-sm font-semibold text-slate-800 outline-none transition"
                      style={{ border: "1px solid rgba(15,23,42,.08)" }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={tambahMapelBaru}
                    disabled={savingWaktu}
                    className="h-9 px-5 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                    style={{ background: G.amber }}
                  >
                    {savingWaktu ? "Menyimpan..." : "✓ Simpan"}
                  </button>
                  <button
                    onClick={() => setAddingMapel(false)}
                    className="h-9 px-4 rounded-xl text-slate-500 text-xs hover:bg-slate-50 transition"
                    style={{ border: "1px solid rgba(15,23,42,.1)" }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {filteredJadwal.length === 0 && (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-400">
                  {waktuSearch ? "Tidak ada mapel ditemukan" : "Belum ada jadwal ujian. Tambah mapel terlebih dahulu."}
                </p>
              </div>
            )}

            {/* Tabel waktu mapel */}
            {filteredJadwal.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(15,23,42,.06)" }}>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-3 pl-1">Mata Pelajaran</th>
                      <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-3">Durasi</th>
                      <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-3">Status</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-3 pr-1">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredJadwal.map((jadwal) => {
                      const isEditing = editingWaktuKategori === jadwal.kategori
                      return (
                        <tr key={jadwal.id} className={`tp-row transition ${isEditing ? "" : ""}`}
                          style={isEditing ? { background: "rgba(245,158,11,.05)" } : {}}>
                          {/* Nama mapel */}
                          <td className="py-3 pl-1">
                            <span className="font-semibold text-slate-800">{jadwal.kategori}</span>
                          </td>

                          {/* Durasi */}
                          <td className="py-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  autoFocus
                                  type="number"
                                  min={1}
                                  max={300}
                                  value={editingDurasi}
                                  onChange={(e) => setEditingDurasi(Number(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") simpanWaktu(jadwal.kategori)
                                    if (e.key === "Escape") setEditingWaktuKategori(null)
                                  }}
                                  className="w-20 h-8 rounded-lg px-2.5 text-sm font-bold text-center text-slate-800 outline-none bg-white"
                                  style={{ border: "1px solid rgba(245,158,11,.4)" }}
                                />
                                <span className="text-xs text-slate-400">menit</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-black text-slate-800">{jadwal.durasi}</span>
                                <span className="text-xs text-slate-400">menit</span>
                                <span className="text-[10px] text-slate-300">
                                  ({Math.floor(jadwal.durasi / 60) > 0 ? `${Math.floor(jadwal.durasi / 60)}j ` : ""}
                                  {jadwal.durasi % 60 > 0 ? `${jadwal.durasi % 60}m` : ""})
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Status buka/tutup */}
                          <td className="py-3 text-center">
                            <button
                              onClick={() => toggleStatusMapel(jadwal)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition"
                              style={jadwal.status
                                ? { background: "rgba(16,185,129,.12)", color: "#047857" }
                                : { background: "#f1f5f9", color: "#64748b" }
                              }
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: jadwal.status ? "#10b981" : "#94a3b8" }} />
                              {jadwal.status ? "Dibuka" : "Ditutup"}
                            </button>
                          </td>

                          {/* Aksi */}
                          <td className="py-3 pr-1 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => simpanWaktu(jadwal.kategori)}
                                  disabled={savingWaktu}
                                  className="h-7 px-3 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                                  style={{ background: "#10b981" }}
                                >
                                  {savingWaktu ? "..." : "✓ Simpan"}
                                </button>
                                <button
                                  onClick={() => setEditingWaktuKategori(null)}
                                  className="h-7 px-2.5 rounded-lg text-slate-500 text-xs hover:bg-slate-50 transition"
                                  style={{ border: "1px solid rgba(15,23,42,.1)" }}
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingWaktuKategori(jadwal.kategori)
                                    setEditingDurasi(jadwal.durasi)
                                  }}
                                  className="h-7 px-3 rounded-lg text-xs font-medium transition"
                                  style={{ background: "rgba(245,158,11,.12)", color: "#b45309" }}
                                >
                                  Edit waktu
                                </button>
                                <button
                                  onClick={() => hapusMapel(jadwal)}
                                  className="h-7 px-3 rounded-lg text-xs font-medium transition"
                                  style={{ background: "rgba(244,63,94,.1)", color: "#e11d48" }}
                                >
                                  Hapus
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 flex flex-wrap gap-4 text-[11px] text-slate-400" style={{ borderTop: "1px solid rgba(15,23,42,.06)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
                Dibuka = siswa bisa akses ujian
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Ditutup = ujian tidak bisa diakses
              </span>
              <span className="flex items-center gap-1.5">
                ⏱ Durasi diatur dalam menit
              </span>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
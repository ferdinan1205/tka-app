"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"

type Materi = {
  id?: number
  judul: string
  kategori: string
  tipe: string
  link: string
  gambar?: string | null
}

/* ------------------------------------------------------------------ */
/* DESAIN — sidebar & warna dasar disamakan dengan app/admin/page.tsx  */
/* (dashboard admin), sama seperti app/admin/soal/page.tsx.            */
/* ------------------------------------------------------------------ */

// Menu sidebar — sama persis dengan MENU di app/admin/page.tsx
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

// Palette avatar gradient — sama persis dengan AVATAR_COLORS/avatarGrad di app/admin/page.tsx
const AVATAR_COLORS = [
  ["#0ea5e9","#0284c7"],["#7c3aed","#4f46e5"],["#f59e0b","#ef4444"],
  ["#10b981","#059669"],["#f43f5e","#e11d48"],["#06b6d4","#0891b2"],
  ["#8b5cf6","#6d28d9"],["#ec4899","#db2777"],
]
const avatarGrad = (name: string) => {
  const idx = (name || "A").charCodeAt(0) % AVATAR_COLORS.length
  const [a, b] = AVATAR_COLORS[idx]
  return `linear-gradient(135deg,${a},${b})`
}

const KATEGORI_OPTIONS = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Fisika",
  "Kimia",
  "Biologi",
  "Ekonomi",
  "Geografi",
  "Sosiologi",
  "Sejarah",
  "Antropologi",
  "Bahasa Arab",
  "Bahasa Mandarin",
  "Bahasa Jepang",
  "Bahasa Korea",
  "Bahasa Jerman",
  "Bahasa Prancis",
  "PPKN",
  "PKK",
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
  "Fisika":           "bg-blue-100   text-blue-700",
  "Kimia":            "bg-purple-100 text-purple-700",
  "Biologi":          "bg-green-100  text-green-700",
  "Ekonomi":          "bg-yellow-100 text-yellow-700",
  "Geografi":         "bg-lime-100   text-lime-700",
  "Sosiologi":        "bg-pink-100   text-pink-700",
  "Sejarah":          "bg-rose-100   text-rose-700",
  "Antropologi":      "bg-fuchsia-100 text-fuchsia-700",
  "Bahasa Arab":      "bg-cyan-100   text-cyan-700",
  "Bahasa Mandarin":  "bg-red-100    text-red-700",
  "Bahasa Jepang":    "bg-orange-100 text-orange-700",
  "Bahasa Korea":     "bg-indigo-100 text-indigo-700",
  "Bahasa Jerman":    "bg-slate-100  text-slate-700",
  "Bahasa Prancis":   "bg-blue-100   text-blue-700",
  "PPKN":             "bg-teal-100   text-teal-700",
  "PKK":              "bg-emerald-100 text-emerald-700",
  "TPS":              "bg-teal-100   text-teal-700",
  "Literasi":         "bg-orange-100 text-orange-700",
}

export default function AdminMateri() {

  const router   = useRouter()
  const pathname = usePathname()

  const [materi,      setMateri     ] = useState<Materi[]>([])
  const [loading,     setLoading    ] = useState(true)
  const [showModal,   setShowModal  ] = useState(false)
  const [editingId,   setEditingId  ] = useState<number | null>(null)
  const [file,        setFile       ] = useState<File | null>(null)
  const [submitting,  setSubmitting ] = useState(false)
  const [adminName,   setAdminName  ] = useState("Admin")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [form,        setForm       ] = useState<Materi>({
    judul: "", kategori: "Matematika", tipe: "video", link: "", gambar: null,
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", data.user.id).single()

    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak")
      router.push("/dashboard")
      return
    }

    setAdminName(profile.nama || "Admin")
    await getMateri()
    setLoading(false)
  }

  async function getMateri() {
    const { data } = await supabase
      .from("materi").select("*").order("id", { ascending: false })
    setMateri(data || [])
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060f22" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-11 h-11">
            <div className="absolute inset-0 rounded-full border-2 border-sky-900" />
            <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          </div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "1px", color: "#7dabc9" }}
            className="text-xs font-medium">Memuat materi...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#eef2f7" }} className="min-h-screen">
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
        .mc-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .mc-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 4px; }
      `}</style>

      {/* SIDEBAR — sama persis dengan sidebar app/admin/page.tsx (dashboard) */}
      <aside
        style={{
          background: "linear-gradient(180deg,#0c1a35 0%,#0f2040 100%)",
          borderRight: "1px solid rgba(56,189,248,.12)",
        }}
        className={`fixed top-0 left-0 z-40 h-screen w-60 flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
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
          className="font-semibold text-slate-800">Materi</p>
      </div>

      {/* MAIN */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-7 max-w-6xl mx-auto space-y-5">

          {/* HEADER */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p style={{ color: "#0284c7", letterSpacing: "1px", fontSize: "10px" }}
                className="font-medium uppercase">Admin</p>
              <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "18px" }}
                className="font-semibold text-slate-900 mt-0.5">Materi Pembelajaran</h1>
            </div>
            <button
              onClick={openTambah}
              className="h-9 px-4 rounded-xl text-white text-[13px] font-semibold transition"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0d9488)", boxShadow: "0 8px 20px rgba(14,165,233,.25)" }}
            >
              + Tambah Materi
            </button>
          </div>

          {/* COUNT */}
          <div className="flex items-center gap-2">
            <p style={{ fontSize: "13px" }} className="font-medium text-slate-700">Daftar materi</p>
            <span className="text-[11px] font-semibold text-slate-500 bg-white rounded-full px-2.5 py-0.5"
              style={{ border: "1px solid rgba(15,23,42,.08)" }}>
              {materi.length} materi
            </span>
          </div>

          {/* EMPTY STATE */}
          {materi.length === 0 && (
            <div className="bg-white rounded-2xl p-16 text-center" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
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
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(10,15,30,.55)" }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ background: "linear-gradient(135deg,#0c1a35,#0f2040)" }}>
              <h2 className="text-[15px] font-semibold text-white">
                {editingId ? "Edit materi" : "Tambah materi"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sky-100 hover:bg-white/10 transition text-lg leading-none"
                style={{ border: "1px solid rgba(255,255,255,.2)" }}
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
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                  <select
                    name="kategori"
                    value={form.kategori}
                    onChange={handleChange}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition bg-white"
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
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition bg-white"
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
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition"
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

                <label className="flex items-center gap-2 h-10 border border-dashed border-slate-300 rounded-xl px-3 cursor-pointer hover:border-sky-300 hover:bg-sky-50/40 transition">
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
                className="flex-1 h-9 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition"
                style={{ background: "linear-gradient(135deg,#0ea5e9,#0d9488)" }}
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
    <div className="mc-card bg-white rounded-2xl overflow-hidden group" style={{ border: "1px solid rgba(15,23,42,.08)" }}>

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
        <h2 style={{ fontSize: "13.5px" }} className="font-semibold text-slate-800 leading-snug line-clamp-2 mb-4">
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
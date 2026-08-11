"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"

/* ══════════════════════════════════════════════════════════
   Halaman: Kelola Kelas (Admin)
   Sama fungsinya dengan app/guru/kelas/page.tsx (bundling
   beberapa paket jadi satu kelas + token kelas), tapi tampilan
   di-reskin supaya seragam dengan app/admin/page.tsx.
══════════════════════════════════════════════════════════ */

type PackageType = {
  id: number
  nama_paket: string
  token: string
  is_custom: boolean
  image_url?: string
}

type KelasType = {
  id: number
  nama_kelas: string
  deskripsi?: string
  token: string
  image_url?: string
  created_at: string
}

type KelasWithPaket = KelasType & {
  paket_list: PackageType[]
}

const MENU = [
  { label: "Dashboard",      icon: "⌂",  path: "/admin"         },
  { label: "Kelola Soal",    icon: "✎",  path: "/admin/soal"    },
  { label: "Materi",         icon: "◈",  path: "/admin/materi"  },
  { label: "Kelas",          icon: "▤",  path: "/admin/kelas"   },
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

/* avatar/nama gradient palette per initial */
const AVATAR_COLORS = [
  ["#0ea5e9","#0284c7"],["#7c3aed","#4f46e5"],["#f59e0b","#ef4444"],
  ["#10b981","#059669"],["#f43f5e","#e11d48"],["#06b6d4","#0891b2"],
  ["#8b5cf6","#6d28d9"],["#ec4899","#db2777"],
]
const avatarGrad = (name: string) => {
  const idx = (name || "K").charCodeAt(0) % AVATAR_COLORS.length
  const [a, b] = AVATAR_COLORS[idx]
  return `linear-gradient(135deg,${a},${b})`
}

function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("")
}

/* Input URL gambar manual (opsional, mendampingi tombol upload file) */
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
        className="w-full h-8 rounded-lg px-2.5 text-xs outline-none border"
        style={{ borderColor: "#38bdf8", color: "#0f172a" }}
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => { onSave(val); setEditing(false) }}
          className="flex-1 h-7 rounded-lg text-xs font-semibold text-white"
          style={{ background: "#0d9488" }}
        >
          ✓ Simpan URL
        </button>
        <button
          onClick={() => setEditing(false)}
          className="h-7 px-2.5 rounded-lg text-xs text-slate-500 border"
          style={{ borderColor: "#e2e8f0" }}
        >
          Batal
        </button>
      </div>
    </div>
  ) : (
    <button onClick={() => setEditing(true)} className="text-[11px] font-semibold" style={{ color: "#0284c7" }}>
      {defaultValue ? "✎ Ganti URL gambar" : "+ Atau pakai URL"}
    </button>
  )
}

export default function AdminKelasPage() {
  const router   = useRouter()
  const pathname = usePathname()

  const [adminName,   setAdminName  ] = useState("Admin")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checking,    setChecking   ] = useState(true)
  const [loading,     setLoading    ] = useState(true)

  const [kelasList,    setKelasList   ] = useState<KelasWithPaket[]>([])
  const [allPackages,  setAllPackages ] = useState<PackageType[]>([])

  // Modal buat kelas baru
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [namaKelasBaru,   setNamaKelasBaru  ] = useState("")
  const [deskripsiBaru,   setDeskripsiBaru  ] = useState("")
  const [tokenBaru,       setTokenBaru      ] = useState("")
  const [imageUrlBaru,    setImageUrlBaru   ] = useState("")
  const [uploadingNewImage, setUploadingNewImage] = useState(false)
  const [saving, setSaving] = useState(false)

  // Modal atur paket dalam kelas
  const [editingKelas,     setEditingKelas    ] = useState<KelasWithPaket | null>(null)
  const [selectedPaketIds, setSelectedPaketIds] = useState<number[]>([])

  // Edit nama kelas inline
  const [renamingId,  setRenamingId ] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Edit token kelas inline
  const [editingTokenId,    setEditingTokenId   ] = useState<number | null>(null)
  const [editingTokenValue, setEditingTokenValue] = useState("")
  const [savingTokenId,     setSavingTokenId    ] = useState<number | null>(null)

  // Upload gambar kelas (kartu existing)
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null)

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
    setChecking(false)
    await loadData()
  }

  async function loadData() {
    setLoading(true)

    const [{ data: packagesData }, { data: kelasData }, { data: relasiData }] = await Promise.all([
      supabase.from("packages").select("id, nama_paket, token, is_custom, image_url").order("nama_paket", { ascending: true }),
      supabase.from("kelas").select("id, nama_kelas, deskripsi, token, image_url, created_at").order("created_at", { ascending: false }),
      supabase.from("kelas_paket").select("kelas_id, package_id"),
    ])

    const packages: PackageType[] = packagesData || []
    setAllPackages(packages)

    const kelasWithPaket: KelasWithPaket[] = (kelasData || []).map((k: any) => {
      const paketIds = (relasiData || []).filter((r: any) => r.kelas_id === k.id).map((r: any) => r.package_id)
      const paket_list = packages.filter((p: PackageType) => paketIds.includes(p.id))
      return { ...k, paket_list }
    })

    setKelasList(kelasWithPaket)
    setLoading(false)
  }

  /* ── UPLOAD GAMBAR ── */
  async function uploadGambarKelas(kelasId: number, file: File) {
    setUploadingImageId(kelasId)
    const ext = file.name.split(".").pop()
    const path = `kelas-images/${kelasId}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from("images").upload(path, file, { upsert: true })
    if (uploadError) {
      alert("Gagal upload: " + uploadError.message)
      setUploadingImageId(null)
      return
    }

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
    const { error: updateError } = await supabase.from("kelas").update({ image_url: urlData.publicUrl }).eq("id", kelasId)

    setUploadingImageId(null)
    if (updateError) { alert("Gagal simpan URL: " + updateError.message); return }
    await loadData()
  }

  async function simpanImageUrlKelas(kelasId: number, url: string) {
    const { error } = await supabase.from("kelas").update({ image_url: url || null }).eq("id", kelasId)
    if (error) { alert("Gagal: " + error.message); return }
    await loadData()
  }

  async function uploadGambarBaru(file: File) {
    setUploadingNewImage(true)
    const ext = file.name.split(".").pop()
    const path = `kelas-images/new-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from("images").upload(path, file, { upsert: true })
    setUploadingNewImage(false)
    if (uploadError) { alert("Gagal upload: " + uploadError.message); return }

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
    setImageUrlBaru(urlData.publicUrl)
  }

  async function handleCreateKelas() {
    if (!namaKelasBaru.trim()) return
    if (!tokenBaru.trim()) { alert("Token kelas wajib diisi"); return }
    setSaving(true)

    const { error } = await supabase.from("kelas").insert({
      nama_kelas: namaKelasBaru.trim(),
      deskripsi: deskripsiBaru.trim() || null,
      token: tokenBaru.trim().toUpperCase(),
      image_url: imageUrlBaru.trim() || null,
    })

    setSaving(false)
    if (error) { alert("Gagal membuat kelas: " + error.message); return }

    setNamaKelasBaru("")
    setDeskripsiBaru("")
    setTokenBaru("")
    setImageUrlBaru("")
    setShowCreateModal(false)
    await loadData()
  }

  async function handleDeleteKelas(id: number) {
    if (!confirm("Hapus kelas ini? Paket di dalamnya tidak akan ikut terhapus.")) return
    const { error } = await supabase.from("kelas").delete().eq("id", id)
    if (error) { alert("Gagal menghapus kelas: " + error.message); return }
    await loadData()
  }

  function openAturPaket(kelas: KelasWithPaket) {
    setEditingKelas(kelas)
    setSelectedPaketIds(kelas.paket_list.map((p) => p.id))
  }

  function togglePaketSelection(id: number) {
    setSelectedPaketIds((prev) => prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id])
  }

  async function handleSavePaketKelas() {
    if (!editingKelas) return
    setSaving(true)

    const { error: delError } = await supabase.from("kelas_paket").delete().eq("kelas_id", editingKelas.id)
    if (delError) { setSaving(false); alert("Gagal menyimpan: " + delError.message); return }

    if (selectedPaketIds.length > 0) {
      const rows = selectedPaketIds.map((package_id) => ({ kelas_id: editingKelas.id, package_id }))
      const { error: insError } = await supabase.from("kelas_paket").insert(rows)
      if (insError) { setSaving(false); alert("Gagal menyimpan: " + insError.message); return }
    }

    setSaving(false)
    setEditingKelas(null)
    await loadData()
  }

  function startRename(kelas: KelasWithPaket) {
    setRenamingId(kelas.id)
    setRenameValue(kelas.nama_kelas)
  }

  async function saveRename(id: number) {
    if (!renameValue.trim()) return
    const { error } = await supabase.from("kelas").update({ nama_kelas: renameValue.trim() }).eq("id", id)
    if (error) { alert("Gagal mengubah nama: " + error.message); return }
    setRenamingId(null)
    await loadData()
  }

  function startEditToken(kelas: KelasWithPaket) {
    setEditingTokenId(kelas.id)
    setEditingTokenValue(kelas.token || "")
  }

  async function saveToken(id: number) {
    if (!editingTokenValue.trim()) { alert("Token tidak boleh kosong"); return }
    setSavingTokenId(id)
    const { error } = await supabase.from("kelas").update({ token: editingTokenValue.trim().toUpperCase() }).eq("id", id)
    setSavingTokenId(null)
    if (error) { alert("Gagal menyimpan token: " + error.message); return }
    setEditingTokenId(null)
    setEditingTokenValue("")
    await loadData()
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  /* ─── Sidebar (identik dengan app/admin/page.tsx) ─── */
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
        .d4{animation-delay:.22s}.d5{animation-delay:.28s}.d6{animation-delay:.34s}

        .kls-card { transition: transform .22s ease, box-shadow .22s ease; }
        .kls-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.10); }

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

  if (checking || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060f22" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-11 h-11">
          <div className="absolute inset-0 rounded-full border-2 border-sky-900" />
          <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "1px", color: "#7dabc9" }}
          className="text-xs font-medium">Memuat kelas</p>
      </div>
    </div>
  )

  return (
    <>
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#eef2f7" }} className="min-h-screen">
        <Sidebar />

        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
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
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: "13px" }} className="font-semibold text-slate-800">Admin</p>
        </div>

        <main className="lg:ml-60 pt-14 lg:pt-0">
          <div className="p-4 md:p-6 lg:p-7 max-w-7xl mx-auto space-y-5">

            {/* ── HERO ── */}
            <div className="fade-up d1 relative rounded-2xl overflow-hidden" style={{ background: G.hero }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(rgba(56,189,248,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.05) 1px,transparent 1px)",
                  backgroundSize: "32px 32px",
                }} />
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(56,189,248,.18),transparent 70%)" }} />
              <div className="absolute bottom-0 left-32 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(129,140,248,.12),transparent 70%)" }} />
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: "linear-gradient(90deg,transparent,rgba(56,189,248,.6),rgba(129,140,248,.4),transparent)" }} />

              <div className="relative px-6 py-7 md:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase mb-3"
                    style={{ background: "rgba(56,189,248,.14)", border: "1px solid rgba(56,189,248,.28)", color: "#7dd3fc" }}>
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-sky-400" />
                    Manajemen Kelas
                  </div>
                  <h1 style={{ fontFamily: "'Inter',sans-serif", lineHeight: "1.3", fontSize: "19px" }} className="font-semibold text-white">
                    Kelola <span style={{ color: "#7dd3fc" }}>Kelas &amp; Bundling Paket</span>
                  </h1>
                  <p style={{ fontWeight: 400, color: "#b6cfe4" }} className="mt-1.5 text-[13px] max-w-md leading-relaxed">
                    Bungkus beberapa paket soal jadi satu kelas — siswa masuk 1x pakai token kelas, semua paket di dalamnya otomatis terbuka.
                  </p>
                </div>

                <button
                  onClick={() => { setShowCreateModal(true); setTokenBaru(generateToken()) }}
                  className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "rgba(56,189,248,.16)", border: "1px solid rgba(56,189,248,.35)" }}
                >
                  + Buat Kelas Baru
                </button>
              </div>
            </div>

            {/* ── RINGKASAN ── */}
            <div className="fade-up d2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: G.teal, boxShadow: "0 8px 28px #0ea5e933" }}>
                <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,.1)" }} />
                <p style={{ letterSpacing: "1px", fontSize: "11px" }} className="font-medium text-white/80">Total Kelas</p>
                <p style={{ fontFamily: "'Inter',sans-serif" }} className="text-[26px] font-semibold mt-1.5 leading-none">{kelasList.length}</p>
                <p className="text-xs text-white/70 mt-1.5">kelas terdaftar</p>
              </div>
              <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: G.violet, boxShadow: "0 8px 28px #7c3aed33" }}>
                <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,.1)" }} />
                <p style={{ letterSpacing: "1px", fontSize: "11px" }} className="font-medium text-white/80">Total Paket</p>
                <p style={{ fontFamily: "'Inter',sans-serif" }} className="text-[26px] font-semibold mt-1.5 leading-none">{allPackages.length}</p>
                <p className="text-xs text-white/70 mt-1.5">paket tersedia untuk dibundel</p>
              </div>
              <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: G.amber, boxShadow: "0 8px 28px #f59e0b33" }}>
                <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,.1)" }} />
                <p style={{ letterSpacing: "1px", fontSize: "11px" }} className="font-medium text-white/80">Kelas Tanpa Paket</p>
                <p style={{ fontFamily: "'Inter',sans-serif" }} className="text-[26px] font-semibold mt-1.5 leading-none">
                  {kelasList.filter((k) => k.paket_list.length === 0).length}
                </p>
                <p className="text-xs text-white/70 mt-1.5">belum dibundel paket apapun</p>
              </div>
            </div>

            {/* ── DAFTAR KELAS ── */}
            <div className="fade-up d3">
              {kelasList.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
                  <p className="text-sm text-slate-500">Belum ada kelas. Klik "Buat Kelas Baru" untuk mulai mengelompokkan paket.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {kelasList.map((kelas) => {
                    const isEditingToken = editingTokenId === kelas.id
                    const isSavingToken = savingTokenId === kelas.id
                    const isUploadingImage = uploadingImageId === kelas.id

                    return (
                      <div key={kelas.id} className="kls-card bg-white rounded-2xl p-5 flex flex-col shadow-sm"
                        style={{ border: "1px solid rgba(15,23,42,.08)" }}>

                        <div className="flex items-start justify-between mb-2">
                          {renamingId === kelas.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="flex-1 rounded-lg px-2 py-1 text-sm outline-none border"
                                style={{ borderColor: "#38bdf8", color: "#0f172a" }}
                                autoFocus
                              />
                              <button onClick={() => saveRename(kelas.id)} style={{ color: "#0d9488" }}>✓</button>
                              <button onClick={() => setRenamingId(null)} style={{ color: "#e11d48" }}>✕</button>
                            </div>
                          ) : (
                            <h3 style={{ fontFamily: "'Inter',sans-serif" }} className="font-semibold text-[15px] text-slate-900">{kelas.nama_kelas}</h3>
                          )}
                        </div>

                        {kelas.deskripsi && (
                          <p className="text-xs text-slate-500 mb-3">{kelas.deskripsi}</p>
                        )}

                        {/* ── TOKEN KELAS ── */}
                        <div className="mb-3 pt-3 pb-3" style={{ borderTop: "1px solid #eef2f7", borderBottom: "1px solid #eef2f7" }}>
                          <p style={{ fontSize: "10px", letterSpacing: "1px", color: "#94a3b8" }} className="font-medium uppercase mb-1.5">
                            Token Kelas
                          </p>

                          {!isEditingToken ? (
                            <div className="flex items-center justify-between gap-2">
                              {kelas.token ? (
                                <span className="font-mono text-base font-black tracking-widest" style={{ color: "#0369a1" }}>
                                  {kelas.token}
                                </span>
                              ) : (
                                <span className="text-xs italic text-slate-400">Belum ada token</span>
                              )}
                              <button
                                onClick={() => startEditToken(kelas)}
                                className="text-[11px] font-semibold px-3 py-1 rounded-lg shrink-0"
                                style={{ background: "rgba(14,165,233,.1)", color: "#0369a1" }}
                              >
                                Edit token
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  autoFocus
                                  value={editingTokenValue}
                                  onChange={(e) => setEditingTokenValue(e.target.value.toUpperCase())}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveToken(kelas.id)
                                    if (e.key === "Escape") setEditingTokenId(null)
                                  }}
                                  placeholder="Token kelas..."
                                  className="flex-1 h-9 rounded-lg px-3 text-sm font-mono font-bold outline-none border"
                                  style={{ borderColor: "#38bdf8", color: "#0f172a" }}
                                />
                                <button
                                  onClick={() => setEditingTokenValue(generateToken())}
                                  className="h-9 px-2.5 rounded-lg border text-slate-500"
                                  style={{ borderColor: "#e2e8f0" }}
                                  title="Buat token acak"
                                >
                                  🎲
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveToken(kelas.id)}
                                  disabled={isSavingToken}
                                  className="flex-1 h-8 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                                  style={{ background: "#0d9488" }}
                                >
                                  {isSavingToken ? "Menyimpan..." : "✓ Simpan"}
                                </button>
                                <button
                                  onClick={() => setEditingTokenId(null)}
                                  className="h-8 px-3 rounded-lg text-xs border text-slate-500"
                                  style={{ borderColor: "#e2e8f0" }}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── FOTO KELAS ── */}
                        <div className="mb-3 pb-3 space-y-2" style={{ borderBottom: "1px solid #eef2f7" }}>
                          <p style={{ fontSize: "10px", letterSpacing: "1px", color: "#94a3b8" }} className="font-medium uppercase">Foto Kelas</p>

                          {kelas.image_url && (
                            <div className="relative w-full h-24 rounded-lg overflow-hidden border" style={{ borderColor: "#eef2f7" }}>
                              <img src={kelas.image_url} alt="preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => simpanImageUrlKelas(kelas.id, "")}
                                className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-xs text-slate-500"
                                style={{ background: "rgba(255,255,255,0.85)" }}
                                title="Hapus gambar"
                              >
                                ×
                              </button>
                            </div>
                          )}

                          <label
                            className="flex items-center justify-center gap-1.5 h-9 w-full rounded-lg cursor-pointer text-xs font-semibold"
                            style={{
                              border: `1.5px dashed ${isUploadingImage ? "#38bdf8" : "#e2e8f0"}`,
                              color: isUploadingImage ? "#0369a1" : "#64748b",
                              background: isUploadingImage ? "rgba(14,165,233,.06)" : "#f8fafc",
                            }}
                          >
                            {isUploadingImage ? "⏳ Mengupload..." : "📷 Pilih file (JPG/PNG)"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploadingImage}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) uploadGambarKelas(kelas.id, file)
                                e.target.value = ""
                              }}
                            />
                          </label>

                          <ImageUrlInput
                            defaultValue={kelas.image_url || ""}
                            onSave={(url) => simpanImageUrlKelas(kelas.id, url)}
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-500 mb-2">
                            {kelas.paket_list.length} paket dalam kelas ini
                          </p>
                          <div className="space-y-1.5">
                            {kelas.paket_list.length === 0 ? (
                              <p className="text-xs italic text-slate-400">Belum ada paket</p>
                            ) : (
                              kelas.paket_list.map((p) => (
                                <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm" style={{ background: "#f8fafc" }}>
                                  <span className="text-slate-800">{p.nama_paket}</span>
                                  <span className="text-xs font-mono text-slate-500">{p.token}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid #eef2f7" }}>
                          <button
                            onClick={() => openAturPaket(kelas)}
                            className="flex-1 text-sm font-semibold rounded-lg py-2"
                            style={{ background: "rgba(14,165,233,.1)", color: "#0369a1" }}
                          >
                            Atur Paket
                          </button>
                          <button
                            onClick={() => startRename(kelas)}
                            className="p-2 rounded-lg text-slate-600"
                            title="Ubah nama"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteKelas(kelas.id)}
                            className="p-2 rounded-lg"
                            style={{ color: "#e11d48", background: "rgba(225,29,72,.08)" }}
                            title="Hapus kelas"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* Modal: Buat Kelas Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(10,15,30,.55)" }}
          onClick={() => setShowCreateModal(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl overflow-hidden max-h-[90vh] flex flex-col bg-white"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: G.hero }}>
              <h3 style={{ fontFamily: "'Inter',sans-serif" }} className="text-base font-semibold text-white">Buat Kelas Baru</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ background: "rgba(255,255,255,.12)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-slate-700">Nama Kelas</label>
                <input
                  value={namaKelasBaru}
                  onChange={(e) => setNamaKelasBaru(e.target.value)}
                  placeholder="Contoh: Kelas 9A"
                  className="w-full p-2.5 rounded-xl text-sm outline-none border"
                  style={{ borderColor: "#e2e8f0" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-slate-700">Token Kelas</label>
                <div className="flex gap-2">
                  <input
                    value={tokenBaru}
                    onChange={(e) => setTokenBaru(e.target.value.toUpperCase())}
                    placeholder="Token kelas..."
                    className="flex-1 h-10 rounded-xl px-3 text-sm font-mono font-bold outline-none border"
                    style={{ borderColor: "#e2e8f0" }}
                  />
                  <button
                    onClick={() => setTokenBaru(generateToken())}
                    className="h-10 px-3 rounded-xl border text-slate-500"
                    style={{ borderColor: "#e2e8f0" }}
                    title="Buat token acak"
                  >
                    🎲
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Token ini yang dimasukkan siswa untuk membuka kelas. Sekali masuk, semua paket di dalamnya otomatis terbuka tanpa token paket.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-slate-700">Gambar Kelas</label>

                {imageUrlBaru.trim() && (
                  <div className="relative w-full mb-2 rounded-xl overflow-hidden border" style={{ aspectRatio: "16/9", borderColor: "#e2e8f0" }}>
                    <img src={imageUrlBaru} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImageUrlBaru("")}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded flex items-center justify-center text-sm text-slate-500"
                      style={{ background: "rgba(255,255,255,0.85)" }}
                    >
                      ×
                    </button>
                  </div>
                )}

                <label
                  className="flex items-center justify-center gap-1.5 h-10 w-full rounded-xl cursor-pointer text-sm font-semibold"
                  style={{
                    border: `1.5px dashed ${uploadingNewImage ? "#38bdf8" : "#e2e8f0"}`,
                    color: uploadingNewImage ? "#0369a1" : "#64748b",
                    background: uploadingNewImage ? "rgba(14,165,233,.06)" : "#f8fafc",
                  }}
                >
                  {uploadingNewImage ? "⏳ Mengupload..." : "📷 Pilih file (JPG/PNG)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingNewImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadGambarBaru(file)
                      e.target.value = ""
                    }}
                  />
                </label>

                <div className="mt-1.5">
                  <ImageUrlInput defaultValue={imageUrlBaru} onSave={(url) => setImageUrlBaru(url)} />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Opsional. Kalau dikosongkan, kartu kelas akan pakai ikon &amp; gradient default.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2 text-slate-700">Deskripsi (opsional)</label>
                <textarea
                  value={deskripsiBaru}
                  onChange={(e) => setDeskripsiBaru(e.target.value)}
                  placeholder="Catatan singkat tentang kelas ini"
                  rows={3}
                  className="w-full p-2.5 rounded-xl text-sm outline-none border"
                  style={{ borderColor: "#e2e8f0" }}
                />
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: "1px solid #eef2f7" }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="h-10 px-5 rounded-xl text-sm font-semibold border text-slate-500"
                style={{ borderColor: "#e2e8f0" }}
              >
                Batal
              </button>
              <button
                onClick={handleCreateKelas}
                disabled={saving || !namaKelasBaru.trim() || !tokenBaru.trim()}
                className="h-10 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: G.teal }}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Atur Paket dalam Kelas */}
      {editingKelas && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(10,15,30,.55)" }}
          onClick={() => setEditingKelas(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[80vh] flex flex-col bg-white"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: G.hero }}>
              <h3 style={{ fontFamily: "'Inter',sans-serif" }} className="text-base font-semibold text-white">
                Atur Paket — {editingKelas.nama_kelas}
              </h3>
              <button
                onClick={() => setEditingKelas(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ background: "rgba(255,255,255,.12)" }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs text-slate-500 mb-3">
                Pilih paket yang masuk ke kelas ini. Token &amp; isi paket tidak berubah.
              </p>

              <div className="space-y-1.5">
                {allPackages.map((p) => {
                  const checked = selectedPaketIds.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer border"
                      style={{
                        borderColor: checked ? "#38bdf8" : "#e2e8f0",
                        background: checked ? "rgba(14,165,233,.06)" : "#f8fafc",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={() => togglePaketSelection(p.id)} />
                        <span className="text-sm text-slate-800">{p.nama_paket}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{p.token}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: "1px solid #eef2f7" }}>
              <button
                onClick={() => setEditingKelas(null)}
                className="h-10 px-5 rounded-xl text-sm font-semibold border text-slate-500"
                style={{ borderColor: "#e2e8f0" }}
              >
                Batal
              </button>
              <button
                onClick={handleSavePaketKelas}
                disabled={saving}
                className="h-10 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: G.teal }}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import {
  LayoutDashboard,
  FileQuestion,
  BookOpen,
  Package,
  Layers,
  UserRound,
  Bell,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Dices,
  KeyRound,
  AlertTriangle,
  PackageCheck,
  LogOut,
  Sparkles,
  ImagePlus,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/* DESAIN — sama persis dengan app/guru/page.tsx, soal, materi, paket  */
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

function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("")
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "GR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/* Komponen kecil: input URL gambar manual (opsional, mendampingi tombol upload file) */
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
        className="w-full h-8 rounded-lg px-2.5 text-xs outline-none"
        style={{ border: `1.5px solid ${palette.amber}`, color: palette.ink, background: palette.card }}
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => { onSave(val); setEditing(false) }}
          className="flex-1 h-7 rounded-lg text-xs font-semibold transition"
          style={{ background: palette.teal, color: "#fff" }}
        >
          ✓ Simpan URL
        </button>
        <button
          onClick={() => setEditing(false)}
          className="h-7 px-2.5 rounded-lg text-xs transition"
          style={{ border: `1px solid ${palette.border}`, color: palette.inkSoft }}
        >
          Batal
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="text-[11px] font-semibold transition"
      style={{ color: palette.amberText }}
    >
      {defaultValue ? "✎ Ganti URL gambar" : "+ Atau pakai URL"}
    </button>
  )
}

export default function KelasPage() {
  const pathname = usePathname()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [namaGuru, setNamaGuru] = useState("Guru")
  const [foto, setFoto] = useState("")
  const [showNotif, setShowNotif] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifDraft, setNotifDraft] = useState(0)
  const [notifTanpaPaket, setNotifTanpaPaket] = useState(0)

  const [loading, setLoading] = useState(true)
  const [kelasList, setKelasList] = useState<KelasWithPaket[]>([])
  const [allPackages, setAllPackages] = useState<PackageType[]>([])

  // Modal buat kelas baru
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [namaKelasBaru, setNamaKelasBaru] = useState("")
  const [deskripsiBaru, setDeskripsiBaru] = useState("")
  const [tokenBaru, setTokenBaru] = useState("")
  const [imageUrlBaru, setImageUrlBaru] = useState("")
  const [uploadingNewImage, setUploadingNewImage] = useState(false)
  const [saving, setSaving] = useState(false)

  // Modal atur paket dalam kelas
  const [editingKelas, setEditingKelas] = useState<KelasWithPaket | null>(null)
  const [selectedPaketIds, setSelectedPaketIds] = useState<number[]>([])

  // Edit nama kelas inline
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Edit token kelas inline
  const [editingTokenId, setEditingTokenId] = useState<number | null>(null)
  const [editingTokenValue, setEditingTokenValue] = useState("")
  const [savingTokenId, setSavingTokenId] = useState<number | null>(null)

  // Upload gambar kelas (existing card)
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null)

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

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
    await loadData()
    loadNotifikasi()
  }

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar?")) return
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Ringkasan kecil untuk dropdown notifikasi — logika sama dengan halaman guru lain
  async function loadNotifikasi() {
    const [{ data: soalData }, { data: relasiData }] = await Promise.all([
      supabase.from("soal").select("id, is_active, paket"),
      supabase.from("package_soal").select("soal_id"),
    ])
    const relasiSet = new Set((relasiData || []).map((r: any) => r.soal_id as number))
    const draft = (soalData || []).filter((s: any) => !s.is_active).length
    const tanpaPaket = (soalData || []).filter((s: any) => !relasiSet.has(s.id) && !(s.paket || "").trim()).length
    setNotifDraft(draft)
    setNotifTanpaPaket(tanpaPaket)
  }

  async function loadData() {
    setLoading(true)

    const { data: packagesData, error: pkgError } = await supabase
      .from("packages")
      .select("id, nama_paket, token, is_custom, image_url")
      .order("nama_paket", { ascending: true })

    const { data: kelasData, error: kelasError } = await supabase
      .from("kelas")
      .select("id, nama_kelas, deskripsi, token, image_url, created_at")
      .order("created_at", { ascending: false })

    const { data: relasiData } = await supabase
      .from("kelas_paket")
      .select("kelas_id, package_id")

    if (kelasError) {
      console.error("Gagal memuat kelas:", kelasError.message)
    }
    if (pkgError) {
      console.error("Gagal memuat paket:", pkgError.message)
    }

    const packages = packagesData || []
    setAllPackages(packages)

    const kelasWithPaket: KelasWithPaket[] = (kelasData || []).map((k) => {
      const paketIds = (relasiData || [])
        .filter((r) => r.kelas_id === k.id)
        .map((r) => r.package_id)
      const paket_list = packages.filter((p) => paketIds.includes(p.id))
      return { ...k, paket_list }
    })

    setKelasList(kelasWithPaket)
    setLoading(false)
  }

  /* ── UPLOAD GAMBAR — pola sama seperti halaman Paket Soal ── */
  async function uploadGambarKelas(kelasId: number, file: File) {
    setUploadingImageId(kelasId)
    const ext = file.name.split(".").pop()
    const path = `kelas-images/${kelasId}-${Date.now()}.${ext}`

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
      .from("kelas")
      .update({ image_url: urlData.publicUrl })
      .eq("id", kelasId)

    setUploadingImageId(null)
    if (updateError) { alert("Gagal simpan URL: " + updateError.message); return }
    await loadData()
  }

  async function simpanImageUrlKelas(kelasId: number, url: string) {
    const { error } = await supabase
      .from("kelas")
      .update({ image_url: url || null })
      .eq("id", kelasId)
    if (error) { alert("Gagal: " + error.message); return }
    await loadData()
  }

  /* Upload gambar untuk kelas yang BELUM dibuat (dipakai di modal create) */
  async function uploadGambarBaru(file: File) {
    setUploadingNewImage(true)
    const ext = file.name.split(".").pop()
    const path = `kelas-images/new-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(path, file, { upsert: true })

    setUploadingNewImage(false)

    if (uploadError) {
      alert("Gagal upload: " + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path)
    setImageUrlBaru(urlData.publicUrl)
  }

  async function handleCreateKelas() {
    if (!namaKelasBaru.trim()) return
    if (!tokenBaru.trim()) {
      alert("Token kelas wajib diisi")
      return
    }
    setSaving(true)

    const { error } = await supabase.from("kelas").insert({
      nama_kelas: namaKelasBaru.trim(),
      deskripsi: deskripsiBaru.trim() || null,
      token: tokenBaru.trim().toUpperCase(),
      image_url: imageUrlBaru.trim() || null,
    })

    setSaving(false)

    if (error) {
      alert("Gagal membuat kelas: " + error.message)
      return
    }

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
    if (error) {
      alert("Gagal menghapus kelas: " + error.message)
      return
    }
    await loadData()
  }

  function openAturPaket(kelas: KelasWithPaket) {
    setEditingKelas(kelas)
    setSelectedPaketIds(kelas.paket_list.map((p) => p.id))
  }

  function togglePaketSelection(id: number) {
    setSelectedPaketIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    )
  }

  async function handleSavePaketKelas() {
    if (!editingKelas) return
    setSaving(true)

    const { error: delError } = await supabase
      .from("kelas_paket")
      .delete()
      .eq("kelas_id", editingKelas.id)

    if (delError) {
      setSaving(false)
      alert("Gagal menyimpan: " + delError.message)
      return
    }

    if (selectedPaketIds.length > 0) {
      const rows = selectedPaketIds.map((package_id) => ({
        kelas_id: editingKelas.id,
        package_id,
      }))
      const { error: insError } = await supabase.from("kelas_paket").insert(rows)
      if (insError) {
        setSaving(false)
        alert("Gagal menyimpan: " + insError.message)
        return
      }
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
    const { error } = await supabase
      .from("kelas")
      .update({ nama_kelas: renameValue.trim() })
      .eq("id", id)

    if (error) {
      alert("Gagal mengubah nama: " + error.message)
      return
    }
    setRenamingId(null)
    await loadData()
  }

  function startEditToken(kelas: KelasWithPaket) {
    setEditingTokenId(kelas.id)
    setEditingTokenValue(kelas.token || "")
  }

  async function saveToken(id: number) {
    if (!editingTokenValue.trim()) {
      alert("Token tidak boleh kosong")
      return
    }
    setSavingTokenId(id)
    const { error } = await supabase
      .from("kelas")
      .update({ token: editingTokenValue.trim().toUpperCase() })
      .eq("id", id)
    setSavingTokenId(null)

    if (error) {
      alert("Gagal menyimpan token: " + error.message)
      return
    }
    setEditingTokenId(null)
    setEditingTokenValue("")
    await loadData()
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
    <div className="h-screen w-full flex overflow-hidden" style={{ background: palette.paper, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      {/* SIDEBAR */}
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

      {/* MAIN */}
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <div className="shrink-0 flex items-center justify-between px-6 md:px-10 py-4" style={{ background: palette.card, borderBottom: `1px solid ${palette.border}` }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: palette.ink }}>Kelola Kelas</h1>
            <p className="text-sm" style={{ color: palette.inkSoft }}>
              Bungkus beberapa paket soal jadi satu kelas — siswa masuk 1x pakai token kelas.
            </p>
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
                            <Link
                              href="/guru/soal?status=nonaktif"
                              onClick={() => setShowNotif(false)}
                              className="flex items-start gap-3 px-4 py-3 transition"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F1EFE8" }}>
                                <AlertTriangle size={14} style={{ color: "#8A7A4E" }} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold" style={{ color: palette.ink }}>{notifDraft} soal berstatus draft</p>
                                <p className="text-[11px] mt-0.5" style={{ color: palette.inkFaint }}>Belum aktif, cek dan simpan ulang</p>
                              </div>
                            </Link>
                          )}
                          {notifTanpaPaket > 0 && (
                            <Link
                              href="/guru/soal?paket=belum"
                              onClick={() => setShowNotif(false)}
                              className="flex items-start gap-3 px-4 py-3 transition"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: palette.dangerSoft }}>
                                <PackageCheck size={14} style={{ color: palette.danger }} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold" style={{ color: palette.ink }}>{notifTanpaPaket} soal belum ada paket</p>
                                <p className="text-[11px] mt-0.5" style={{ color: palette.inkFaint }}>Assign ke paket biar bisa dipakai tryout</p>
                              </div>
                            </Link>
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
                <p className="text-sm" style={{ color: palette.inkSoft }}>Memuat data kelas...</p>
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
                  <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#8FA0C4" }}>Kelas</p>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} style={{ color: palette.amber }} />
                    Kelola kelas & bundling paket
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#AEB8CC" }}>
                    {kelasList.length} kelas &middot; siswa masuk 1x dengan token kelas, semua paket di dalamnya otomatis terbuka
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(true)
                    setTokenBaru(generateToken())
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
                  style={{ background: palette.amber, color: "#40260A" }}
                >
                  <Plus size={16} />
                  Buat Kelas Baru
                </button>
              </div>

              {/* DAFTAR KELAS */}
              {kelasList.length === 0 ? (
                <div className="rounded-2xl p-10 text-center" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                  <p className="text-sm" style={{ color: palette.inkSoft }}>
                    Belum ada kelas. Klik "Buat Kelas Baru" untuk mulai mengelompokkan paket.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kelasList.map((kelas) => {
                    const isEditingToken = editingTokenId === kelas.id
                    const isSavingToken = savingTokenId === kelas.id
                    const isUploadingImage = uploadingImageId === kelas.id

                    return (
                      <div
                        key={kelas.id}
                        className="rounded-2xl p-5 flex flex-col"
                        style={{ background: palette.card, border: `1px solid ${palette.border}` }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          {renamingId === kelas.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="flex-1 rounded-lg px-2 py-1 text-sm outline-none"
                                style={{ border: `1.5px solid ${palette.amber}`, color: palette.ink, background: palette.paper }}
                                autoFocus
                              />
                              <button onClick={() => saveRename(kelas.id)} style={{ color: palette.teal }}>
                                <Check size={18} />
                              </button>
                              <button onClick={() => setRenamingId(null)} style={{ color: palette.danger }}>
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-bold text-lg" style={{ color: palette.ink }}>{kelas.nama_kelas}</h3>
                          )}
                        </div>

                        {kelas.deskripsi && (
                          <p className="text-sm mb-3" style={{ color: palette.inkSoft }}>{kelas.deskripsi}</p>
                        )}

                        {/* ── TOKEN KELAS ── */}
                        <div className="mb-3 pt-3 pb-3" style={{ borderTop: `1px solid ${palette.border}`, borderBottom: `1px solid ${palette.border}` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: palette.inkFaint }}>
                            <KeyRound size={11} />
                            Token Kelas
                          </p>

                          {!isEditingToken ? (
                            <div className="flex items-center justify-between gap-2">
                              {kelas.token ? (
                                <span className="font-mono text-base font-black tracking-widest" style={{ color: palette.amberText }}>
                                  {kelas.token}
                                </span>
                              ) : (
                                <span className="text-xs italic" style={{ color: palette.inkFaint }}>Belum ada token</span>
                              )}
                              <button
                                onClick={() => startEditToken(kelas)}
                                className="text-xs font-semibold px-3 py-1 rounded-lg transition shrink-0"
                                style={{ background: palette.amberSoft, color: palette.amberText }}
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
                                  className="flex-1 h-9 rounded-lg px-3 text-sm font-mono font-bold outline-none"
                                  style={{ border: `1.5px solid ${palette.amber}`, color: palette.ink, background: palette.card }}
                                />
                                <button
                                  onClick={() => setEditingTokenValue(generateToken())}
                                  className="h-9 px-2.5 rounded-lg transition"
                                  style={{ background: palette.paper, border: `1px solid ${palette.border}`, color: palette.inkSoft }}
                                  title="Buat token acak"
                                >
                                  <Dices size={14} />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveToken(kelas.id)}
                                  disabled={isSavingToken}
                                  className="flex-1 h-8 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                  style={{ background: palette.teal, color: "#fff" }}
                                >
                                  {isSavingToken ? "Menyimpan..." : "✓ Simpan"}
                                </button>
                                <button
                                  onClick={() => setEditingTokenId(null)}
                                  className="h-8 px-3 rounded-lg text-xs transition"
                                  style={{ border: `1px solid ${palette.border}`, color: palette.inkSoft }}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── FOTO KELAS — pola sama seperti halaman Paket Soal ── */}
                        <div className="mb-3 pb-3 space-y-2" style={{ borderBottom: `1px solid ${palette.border}` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: palette.inkFaint }}>Foto Kelas</p>

                          {kelas.image_url && (
                            <div className="relative w-full h-24 rounded-lg overflow-hidden" style={{ border: `1px solid ${palette.border}` }}>
                              <img src={kelas.image_url} alt="preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => simpanImageUrlKelas(kelas.id, "")}
                                className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-xs transition"
                                style={{ background: "rgba(255,255,255,0.85)", color: palette.inkSoft }}
                                title="Hapus gambar"
                              >
                                ×
                              </button>
                            </div>
                          )}

                          <label
                            className="flex items-center justify-center gap-1.5 h-9 w-full rounded-lg cursor-pointer transition text-xs font-semibold"
                            style={{
                              border: `1.5px dashed ${isUploadingImage ? palette.amber : palette.border}`,
                              color: isUploadingImage ? palette.amberText : palette.inkSoft,
                              background: isUploadingImage ? palette.amberSoft : palette.paper,
                            }}
                          >
                            {isUploadingImage ? (
                              <>⏳ Mengupload...</>
                            ) : (
                              <>
                                <ImagePlus size={14} /> Pilih file (JPG/PNG)
                              </>
                            )}
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
                          <p className="text-xs font-medium mb-2" style={{ color: palette.inkSoft }}>
                            {kelas.paket_list.length} paket dalam kelas ini
                          </p>
                          <div className="space-y-1.5">
                            {kelas.paket_list.length === 0 ? (
                              <p className="text-xs italic" style={{ color: palette.inkFaint }}>Belum ada paket</p>
                            ) : (
                              kelas.paket_list.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
                                  style={{ background: palette.paper }}
                                >
                                  <span style={{ color: palette.ink }}>{p.nama_paket}</span>
                                  <span className="text-xs font-mono" style={{ color: palette.inkSoft }}>{p.token}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${palette.border}` }}>
                          <button
                            onClick={() => openAturPaket(kelas)}
                            className="flex-1 text-sm font-semibold rounded-lg py-2 transition"
                            style={{ background: palette.amberSoft, color: palette.amberText }}
                          >
                            Atur Paket
                          </button>
                          <button
                            onClick={() => startRename(kelas)}
                            className="p-2 rounded-lg transition"
                            style={{ color: palette.ink }}
                            title="Ubah nama"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteKelas(kelas.id)}
                            className="p-2 rounded-lg transition"
                            style={{ color: palette.danger, background: palette.dangerSoft }}
                            title="Hapus kelas"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Buat Kelas Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(27,42,74,0.6)" }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden max-h-[90vh] flex flex-col" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: palette.navy }}>
              <h3 className="text-base font-semibold text-white">Buat Kelas Baru</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition"
                style={{ border: `1px solid ${palette.navySoft}`, color: "#C4CCDE" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Nama Kelas</label>
                <input
                  value={namaKelasBaru}
                  onChange={(e) => setNamaKelasBaru(e.target.value)}
                  placeholder="Contoh: Kelas 9A"
                  className="w-full p-2.5 rounded-xl text-sm outline-none transition"
                  style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Token Kelas</label>
                <div className="flex gap-2">
                  <input
                    value={tokenBaru}
                    onChange={(e) => setTokenBaru(e.target.value.toUpperCase())}
                    placeholder="Token kelas..."
                    className="flex-1 h-10 rounded-xl px-3 text-sm font-mono font-bold outline-none transition"
                    style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                  />
                  <button
                    onClick={() => setTokenBaru(generateToken())}
                    className="h-10 px-3 rounded-xl transition"
                    style={{ background: palette.paper, border: `2px solid ${palette.border}`, color: palette.inkSoft }}
                    title="Buat token acak"
                  >
                    <Dices size={15} />
                  </button>
                </div>
                <p className="mt-1.5 text-xs" style={{ color: palette.inkFaint }}>
                  Token ini yang dimasukkan siswa untuk membuka kelas. Sekali masuk, semua paket di dalamnya otomatis terbuka tanpa token paket.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>
                  Gambar Kelas
                </label>

                {imageUrlBaru.trim() && (
                  <div className="relative w-full mb-2 rounded-xl overflow-hidden" style={{ aspectRatio: "16/9", border: `1px solid ${palette.border}` }}>
                    <img src={imageUrlBaru} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImageUrlBaru("")}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded flex items-center justify-center text-sm transition"
                      style={{ background: "rgba(255,255,255,0.85)", color: palette.inkSoft }}
                      title="Hapus gambar"
                    >
                      ×
                    </button>
                  </div>
                )}

                <label
                  className="flex items-center justify-center gap-1.5 h-10 w-full rounded-xl cursor-pointer transition text-sm font-semibold"
                  style={{
                    border: `1.5px dashed ${uploadingNewImage ? palette.amber : palette.border}`,
                    color: uploadingNewImage ? palette.amberText : palette.inkSoft,
                    background: uploadingNewImage ? palette.amberSoft : palette.paper,
                  }}
                >
                  {uploadingNewImage ? (
                    <>⏳ Mengupload...</>
                  ) : (
                    <>
                      <ImagePlus size={15} /> Pilih file (JPG/PNG)
                    </>
                  )}
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

                <p className="mt-1.5 text-xs" style={{ color: palette.inkFaint }}>
                  Opsional. Kalau dikosongkan, kartu kelas akan pakai ikon & gradient default.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Deskripsi (opsional)</label>
                <textarea
                  value={deskripsiBaru}
                  onChange={(e) => setDeskripsiBaru(e.target.value)}
                  placeholder="Catatan singkat tentang kelas ini"
                  rows={3}
                  className="w-full p-2.5 rounded-xl text-sm outline-none transition"
                  style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                />
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: `2px solid ${palette.border}` }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="h-10 px-5 rounded-xl text-sm font-semibold transition"
                style={{ border: `2px solid ${palette.border}`, color: palette.inkSoft }}
              >
                Batal
              </button>
              <button
                onClick={handleCreateKelas}
                disabled={saving || !namaKelasBaru.trim() || !tokenBaru.trim()}
                className="h-10 px-6 rounded-xl text-sm font-bold transition disabled:opacity-50"
                style={{ background: palette.amber, color: "#40260A" }}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Atur Paket dalam Kelas */}
      {editingKelas && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(27,42,74,0.6)" }}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[80vh] flex flex-col" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: palette.navy }}>
              <h3 className="text-base font-semibold text-white">
                Atur Paket — {editingKelas.nama_kelas}
              </h3>
              <button
                onClick={() => setEditingKelas(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition"
                style={{ border: `1px solid ${palette.navySoft}`, color: "#C4CCDE" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs mb-3" style={{ color: palette.inkSoft }}>
                Pilih paket yang masuk ke kelas ini. Token & isi paket tidak berubah.
              </p>

              <div className="space-y-1.5">
                {allPackages.map((p) => {
                  const checked = selectedPaketIds.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition"
                      style={{
                        border: `2px solid ${checked ? palette.amber : palette.border}`,
                        background: checked ? palette.amberSoft : palette.paper,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePaketSelection(p.id)}
                        />
                        <span className="text-sm" style={{ color: palette.ink }}>{p.nama_paket}</span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: palette.inkSoft }}>{p.token}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: `2px solid ${palette.border}` }}>
              <button
                onClick={() => setEditingKelas(null)}
                className="h-10 px-5 rounded-xl text-sm font-semibold transition"
                style={{ border: `2px solid ${palette.border}`, color: palette.inkSoft }}
              >
                Batal
              </button>
              <button
                onClick={handleSavePaketKelas}
                disabled={saving}
                className="h-10 px-6 rounded-xl text-sm font-bold transition disabled:opacity-50"
                style={{ background: palette.amber, color: "#40260A" }}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
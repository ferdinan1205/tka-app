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
  AlertTriangle,
  PackageCheck,
  LogOut,
  Plus,
  Search,
  Pencil,
  Trash2,
  ImagePlus,
  Dices,
  Clock,
  Sparkles,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/* DESAIN — sama persis dengan app/guru/page.tsx, soal, materi, profil */
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
  violet: "#534AB7",
  violetSoft: "#EEEDFE",
}

const navItems = [
  { href: "/guru", label: "Dashboard", icon: LayoutDashboard },
  { href: "/guru/soal", label: "Kelola Soal", icon: FileQuestion },
  { href: "/guru/materi", label: "Materi Pelajaran", icon: BookOpen },
  { href: "/guru/paket", label: "Paket Soal", icon: Package },
  { href: "/guru/kelas", label: "Kelas", icon: Layers },
]

const ALL_SUBJECTS = [
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris",
  "Fisika", "Kimia", "Biologi",
  "Ekonomi", "Geografi", "Sosiologi",
  "PPKN", "PKK",
  "Bahasa Arab", "Bahasa Jepang", "Bahasa Jerman",
  "Sejarah", "Antropologi", "TPS", "Literasi",
]

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

export default function PaketGuruPage() {
  const pathname = usePathname()
  const router = useRouter()

const [checking, setChecking] = useState(true)
const [namaGuru, setNamaGuru] = useState("Guru")
const [foto, setFoto] = useState("")
const [showNotif, setShowNotif] = useState(false)
const [showProfileMenu, setShowProfileMenu] = useState(false)

  const [packages, setPackages] = useState<PackageType[]>([])
  const [subjects, setSubjects] = useState<SubjectType[]>([])
  const [jadwalList, setJadwalList] = useState<JadwalUjian[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [search, setSearch] = useState("")

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

  const [editingWaktuKategori, setEditingWaktuKategori] = useState<string | null>(null)
  const [editingDurasi, setEditingDurasi] = useState<number>(90)
  const [savingWaktu, setSavingWaktu] = useState(false)
  const [addingMapel, setAddingMapel] = useState(false)
  const [newMapelNama, setNewMapelNama] = useState("")
  const [newMapelDurasi, setNewMapelDurasi] = useState(90)
  const [waktuSearch, setWaktuSearch] = useState("")

  // Notifikasi topbar (soal draft & belum ada paket) — konsisten dengan halaman guru lain
  const [notifDraft, setNotifDraft] = useState(0)
  const [notifTanpaPaket, setNotifTanpaPaket] = useState(0)

  useEffect(() => { checkAccessAndLoad() }, [])

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
getData()
loadNotifikasi()
  }

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar?")) return
    await supabase.auth.signOut()
    router.push("/login")
  }

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

  async function getData() {
    setLoadingData(true)
    const [{ data: pkgData }, { data: subData }, { data: jadwalData }] = await Promise.all([
      supabase.from("packages").select("*").order("id"),
      supabase.from("package_subjects").select("*").order("id"),
      supabase.from("jadwal_ujian").select("*").order("kategori"),
    ])
    setPackages((pkgData || []) as PackageType[])
    setSubjects((subData || []) as SubjectType[])
    setJadwalList((jadwalData || []) as JadwalUjian[])
    setLoadingData(false)
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

  const filtered = useMemo(
    () =>
      packages.filter((p) =>
        p.nama_paket.toLowerCase().includes(search.toLowerCase()) ||
        (p.token || "").toLowerCase().includes(search.toLowerCase())
      ),
    [packages, search]
  )

  const filteredJadwal = useMemo(
    () => jadwalList.filter((j) => j.kategori.toLowerCase().includes(waktuSearch.toLowerCase())),
    [jadwalList, waktuSearch]
  )

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: palette.paper }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-9 h-9 border-2 rounded-full animate-spin"
            style={{ borderColor: palette.border, borderTopColor: palette.amber }}
          />
          <p className="text-sm" style={{ color: palette.inkSoft }}>Memeriksa akses...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-screen w-full flex overflow-hidden"
      style={{ background: palette.paper, fontFamily: "Inter, ui-sans-serif, system-ui" }}
    >
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
        <div
          className="shrink-0 flex items-center justify-between px-6 md:px-10 py-4"
          style={{ background: palette.card, borderBottom: `1px solid ${palette.border}` }}
        >
          <div>
            <h1 className="text-xl font-bold" style={{ color: palette.ink }}>Paket Soal</h1>
            <p className="text-sm" style={{ color: palette.inkSoft }}>Kelola paket, token, mata pelajaran pendamping, dan waktu ujian.</p>
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
          {loadingData ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-9 h-9 border-2 rounded-full animate-spin"
                  style={{ borderColor: palette.border, borderTopColor: palette.amber }}
                />
                <p className="text-sm" style={{ color: palette.inkSoft }}>Memuat data paket...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">

              {/* HERO STRIP */}
              <div
                className="rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4"
                style={{ background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.navySoft} 100%)` }}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#8FA0C4" }}>Paket &amp; Jadwal</p>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} style={{ color: palette.amber }} />
                    Kelola paket tryout kamu
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#AEB8CC" }}>
                    {packages.length} paket &middot; {jadwalList.length} jadwal mata pelajaran diatur
                  </p>
                </div>
              </div>

              {/* ── FORM BUAT PAKET BARU ── */}
              <div className="rounded-2xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 rounded-full" style={{ background: palette.amber }} />
                  <h2 className="text-sm font-bold" style={{ color: palette.ink }}>Buat Paket Baru</h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: palette.inkSoft }}>Nama paket</label>
                    <input
                      value={newNama}
                      onChange={(e) => setNewNama(e.target.value)}
                      placeholder="Contoh: Paket IPA 4"
                      className="w-full h-10 rounded-xl px-3 text-sm outline-none transition"
                      style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: palette.inkSoft }}>Token</label>
                    <div className="flex gap-2">
                      <input
                        value={newToken}
                        onChange={(e) => setNewToken(e.target.value.toUpperCase())}
                        placeholder="Token..."
                        className="flex-1 h-10 rounded-xl px-3 text-sm font-mono font-bold outline-none transition"
                        style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                      />
                      <button
                        onClick={() => setNewToken(generateToken())}
                        className="h-10 px-3 rounded-xl transition"
                        style={{ background: palette.paper, border: `2px solid ${palette.border}`, color: palette.inkSoft }}
                        title="Buat token acak"
                      >
                        <Dices size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={buatPaket}
                      disabled={saving}
                      className="w-full h-10 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: palette.amber, color: "#40260A" }}
                    >
                      <Plus size={16} />
                      {saving ? "Menyimpan..." : "Buat Paket"}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── DAFTAR PAKET ── */}
              <div className="rounded-2xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full" style={{ background: palette.teal }} />
                    <h2 className="text-sm font-bold" style={{ color: palette.ink }}>Atur Paket</h2>
                    <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ background: palette.amberSoft, color: palette.amberText }}>
                      {packages.length} paket
                    </span>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: palette.inkFaint }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari paket atau token..."
                      className="h-9 w-56 rounded-xl pl-8 pr-3 text-sm outline-none transition"
                      style={{ border: `1px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                    />
                  </div>
                </div>

                {filtered.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-sm" style={{ color: palette.inkSoft }}>Tidak ada paket ditemukan</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((item) => {
                    const isEditingToken = editingTokenId === item.id
                    const isEditingNama = editingNamaId === item.id
                    const isEditingPendamping = editingPendampingId === item.id
                    const isSavingToken = savingTokenId === item.id
                    const isUploadingImage = uploadingImageId === item.id
                    const paketSubjects = subjects.filter((s) => s.package_id === item.id)
                    const usedSubjects = paketSubjects.map((s) => s.subject)
                    const availableSubjects = ALL_SUBJECTS.filter((s) => !usedSubjects.includes(s))
                    const isHighlighted = isEditingToken || isEditingNama || isEditingPendamping

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl p-4 transition space-y-3"
                        style={{
                          border: `1.5px solid ${isHighlighted ? palette.amber : palette.border}`,
                          background: isHighlighted ? palette.amberSoft + "55" : palette.card,
                        }}
                      >
                        {/* ── NAMA ── */}
                        {!isEditingNama ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold flex-1 truncate" style={{ color: palette.ink }}>{item.nama_paket}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: item.is_custom ? palette.violetSoft : "#E6F1FB",
                                  color: item.is_custom ? palette.violet : "#185FA5",
                                }}
                              >
                                {item.is_custom ? "Custom" : "Default"}
                              </span>
                              <button
                                onClick={() => { setEditingNamaId(item.id); setEditingNama(item.nama_paket) }}
                                className="h-6 w-6 rounded flex items-center justify-center transition"
                                style={{ color: palette.inkFaint }}
                                title="Edit nama"
                              >
                                <Pencil size={12} />
                              </button>
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
                              className="w-full h-8 rounded-lg px-2.5 text-sm font-bold outline-none"
                              style={{ border: `1.5px solid ${palette.amber}`, color: palette.ink, background: palette.card }}
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => simpanNama(item.id)}
                                className="flex-1 h-7 rounded-lg text-xs font-semibold transition"
                                style={{ background: palette.teal, color: "#fff" }}
                              >
                                ✓ Simpan
                              </button>
                              <button
                                onClick={() => setEditingNamaId(null)}
                                className="h-7 px-2.5 rounded-lg text-xs transition"
                                style={{ border: `1px solid ${palette.border}`, color: palette.inkSoft }}
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── PENDAMPING ── */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: palette.inkFaint }}>Mapel Pendamping</p>
                            <button
                              onClick={() => {
                                setEditingPendampingId(isEditingPendamping ? null : item.id)
                                setNewSubject("")
                              }}
                              className="text-[10px] font-semibold transition"
                              style={{ color: palette.amberText }}
                            >
                              {isEditingPendamping ? "Selesai" : "+ Tambah"}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {paketSubjects.length === 0 && (
                              <span className="text-[11px] italic" style={{ color: palette.inkFaint }}>Belum ada pendamping</span>
                            )}
                            {paketSubjects.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium"
                                style={{ background: palette.paper, color: palette.ink }}
                              >
                                {s.subject}
                                <button
                                  onClick={() => hapusPendamping(s.id)}
                                  className="ml-0.5 leading-none transition"
                                  style={{ color: palette.inkFaint }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>

                          {isEditingPendamping && (
                            <div className="flex gap-1.5 mt-2">
                              <select
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                className="flex-1 h-8 rounded-lg px-2 text-xs outline-none transition"
                                style={{ border: `1.5px solid ${palette.border}`, color: palette.ink, background: palette.paper }}
                              >
                                <option value="">Pilih mapel...</option>
                                {availableSubjects.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => tambahPendamping(item.id)}
                                disabled={savingSubject}
                                className="h-8 px-3 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                style={{ background: palette.amber, color: "#40260A" }}
                              >
                                {savingSubject ? "..." : "Tambah"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ── TOKEN ── */}
                        <div className="pt-3" style={{ borderTop: `1px solid ${palette.border}` }}>
                          {!isEditingToken ? (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                {item.token ? (
                                  <span className="font-mono text-base font-black tracking-widest" style={{ color: palette.amberText }}>
                                    {item.token}
                                  </span>
                                ) : (
                                  <span className="text-xs italic" style={{ color: palette.inkFaint }}>Belum ada token</span>
                                )}
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => { setEditingTokenId(item.id); setEditingToken(item.token || "") }}
                                  className="h-7 px-3 rounded-lg text-xs font-semibold transition"
                                  style={{ background: palette.amberSoft, color: palette.amberText }}
                                >
                                  Edit token
                                </button>
                                {item.is_custom && (
                                  <button
                                    onClick={() => hapusPaket(item.id, item.nama_paket)}
                                    className="h-7 px-3 rounded-lg text-xs font-semibold transition"
                                    style={{ background: palette.dangerSoft, color: palette.danger }}
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
                                  className="flex-1 h-9 rounded-lg px-3 text-sm font-mono font-bold outline-none transition"
                                  style={{ border: `1.5px solid ${palette.amber}`, color: palette.ink, background: palette.card }}
                                />
                                <button
                                  onClick={() => setEditingToken(generateToken())}
                                  className="h-9 px-2.5 rounded-lg transition"
                                  style={{ background: palette.paper, border: `1px solid ${palette.border}`, color: palette.inkSoft }}
                                >
                                  <Dices size={14} />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => simpanToken(item.id)}
                                  disabled={isSavingToken}
                                  className="flex-1 h-8 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                  style={{ background: palette.teal, color: "#fff" }}
                                >
                                  {isSavingToken ? "Menyimpan..." : "✓ Simpan"}
                                </button>
                                <button
                                  onClick={() => { setEditingTokenId(null); setEditingToken("") }}
                                  className="h-8 px-3 rounded-lg text-xs transition"
                                  style={{ border: `1px solid ${palette.border}`, color: palette.inkSoft }}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── GAMBAR ── */}
                        <div className="pt-3 space-y-2" style={{ borderTop: `1px solid ${palette.border}` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: palette.inkFaint }}>Foto Paket</p>

                          {item.image_url && (
                            <div className="relative w-full h-24 rounded-lg overflow-hidden" style={{ border: `1px solid ${palette.border}` }}>
                              <img src={item.image_url} alt="preview" className="w-full h-full object-cover" />
                              <button
                                onClick={() => simpanImageUrl(item.id, "")}
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
                                if (file) uploadGambar(item.id, file)
                                e.target.value = ""
                              }}
                            />
                          </label>

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
              <div className="rounded-2xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full" style={{ background: palette.amber }} />
                    <h2 className="text-sm font-bold" style={{ color: palette.ink }}>Manajemen Waktu Mapel</h2>
                    <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ background: palette.amberSoft, color: palette.amberText }}>
                      {jadwalList.length} mapel
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: palette.inkFaint }} />
                      <input
                        value={waktuSearch}
                        onChange={(e) => setWaktuSearch(e.target.value)}
                        placeholder="Cari mapel..."
                        className="h-9 w-44 rounded-xl pl-8 pr-3 text-sm outline-none transition"
                        style={{ border: `1px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                      />
                    </div>
                    <button
                      onClick={() => { setAddingMapel(!addingMapel); setNewMapelNama(""); setNewMapelDurasi(90) }}
                      className="h-9 px-4 rounded-xl text-xs font-semibold transition"
                      style={{
                        background: addingMapel ? palette.paper : palette.amber,
                        color: addingMapel ? palette.inkSoft : "#40260A",
                        border: addingMapel ? `1px solid ${palette.border}` : "none",
                      }}
                    >
                      {addingMapel ? "Batal" : "+ Tambah Mapel"}
                    </button>
                  </div>
                </div>

                {addingMapel && (
                  <div className="mb-5 p-4 rounded-xl" style={{ background: palette.amberSoft, border: `1px solid ${palette.amber}` }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: palette.amberText }}>Tambah mapel baru ke jadwal</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: palette.inkSoft }}>Nama Mapel</label>
                        <select
                          value={newMapelNama}
                          onChange={(e) => setNewMapelNama(e.target.value)}
                          className="w-full h-10 rounded-xl px-3 text-sm outline-none transition"
                          style={{ border: `1.5px solid ${palette.border}`, background: palette.card, color: palette.ink }}
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
                            className="mt-2 w-full h-10 rounded-xl px-3 text-sm outline-none transition"
                            style={{ border: `1.5px solid ${palette.amber}`, background: palette.card, color: palette.ink }}
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: palette.inkSoft }}>Durasi (menit)</label>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={newMapelDurasi}
                          onChange={(e) => setNewMapelDurasi(Number(e.target.value))}
                          className="w-full h-10 rounded-xl px-3 text-sm font-bold outline-none transition"
                          style={{ border: `1.5px solid ${palette.border}`, background: palette.card, color: palette.ink }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={tambahMapelBaru}
                        disabled={savingWaktu}
                        className="h-9 px-5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                        style={{ background: palette.amber, color: "#40260A" }}
                      >
                        {savingWaktu ? "Menyimpan..." : "✓ Simpan"}
                      </button>
                      <button
                        onClick={() => setAddingMapel(false)}
                        className="h-9 px-4 rounded-xl text-xs transition"
                        style={{ border: `1px solid ${palette.border}`, color: palette.inkSoft }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {filteredJadwal.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-sm" style={{ color: palette.inkSoft }}>
                      {waktuSearch ? "Tidak ada mapel ditemukan" : "Belum ada jadwal ujian. Tambah mapel terlebih dahulu."}
                    </p>
                  </div>
                )}

                {filteredJadwal.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                          <th className="text-left text-[10px] font-bold uppercase tracking-widest pb-3 pl-1" style={{ color: palette.inkFaint }}>Mata Pelajaran</th>
                          <th className="text-center text-[10px] font-bold uppercase tracking-widest pb-3" style={{ color: palette.inkFaint }}>Durasi</th>
                          <th className="text-center text-[10px] font-bold uppercase tracking-widest pb-3" style={{ color: palette.inkFaint }}>Status</th>
                          <th className="text-right text-[10px] font-bold uppercase tracking-widest pb-3 pr-1" style={{ color: palette.inkFaint }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJadwal.map((jadwal, idx) => {
                          const isEditing = editingWaktuKategori === jadwal.kategori
                          return (
                            <tr
                              key={jadwal.id}
                              className="transition"
                              style={{ borderTop: idx === 0 ? "none" : `1px solid ${palette.border}`, background: isEditing ? palette.amberSoft + "55" : "transparent" }}
                            >
                              <td className="py-3 pl-1">
                                <span className="font-bold" style={{ color: palette.ink }}>{jadwal.kategori}</span>
                              </td>

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
                                      className="w-20 h-8 rounded-lg px-2.5 text-sm font-bold text-center outline-none"
                                      style={{ border: `1.5px solid ${palette.amber}`, color: palette.ink, background: palette.card }}
                                    />
                                    <span className="text-xs" style={{ color: palette.inkFaint }}>menit</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Clock size={13} style={{ color: palette.inkFaint }} />
                                    <span className="font-black" style={{ color: palette.ink }}>{jadwal.durasi}</span>
                                    <span className="text-xs" style={{ color: palette.inkFaint }}>menit</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 text-center">
                                <button
                                  onClick={() => toggleStatusMapel(jadwal)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition"
                                  style={{
                                    background: jadwal.status ? palette.tealSoft : palette.paper,
                                    color: jadwal.status ? palette.tealText : palette.inkSoft,
                                    border: jadwal.status ? "none" : `1px solid ${palette.border}`,
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: jadwal.status ? palette.teal : palette.inkFaint }} />
                                  {jadwal.status ? "Dibuka" : "Ditutup"}
                                </button>
                              </td>

                              <td className="py-3 pr-1 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => simpanWaktu(jadwal.kategori)}
                                      disabled={savingWaktu}
                                      className="h-7 px-3 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                      style={{ background: palette.teal, color: "#fff" }}
                                    >
                                      {savingWaktu ? "..." : "✓ Simpan"}
                                    </button>
                                    <button
                                      onClick={() => setEditingWaktuKategori(null)}
                                      className="h-7 px-2.5 rounded-lg text-xs transition"
                                      style={{ border: `1px solid ${palette.border}`, color: palette.inkSoft }}
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
                                      className="h-7 px-3 rounded-lg text-xs font-semibold transition"
                                      style={{ background: palette.amberSoft, color: palette.amberText }}
                                    >
                                      Edit waktu
                                    </button>
                                    <button
                                      onClick={() => hapusMapel(jadwal)}
                                      className="h-7 px-3 rounded-lg text-xs font-semibold transition"
                                      style={{ background: palette.dangerSoft, color: palette.danger }}
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
                <div className="mt-4 pt-4 flex flex-wrap gap-4 text-[11px]" style={{ borderTop: `1px solid ${palette.border}`, color: palette.inkFaint }}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: palette.teal }} />
                    Dibuka = siswa bisa akses ujian
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: palette.inkFaint }} />
                    Ditutup = ujian tidak bisa diakses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} /> Durasi diatur dalam menit
                  </span>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
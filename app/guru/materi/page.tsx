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
  Search,
  Video,
  FileText,
  HelpCircle,
  Dumbbell,
  FileDown as FilePdf,
  Pencil,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Layers3,
  Sparkles,
  AlertTriangle,
  PackageCheck,
  LogOut,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/* DESAIN — sama persis dengan app/guru/page.tsx & app/guru/soal       */
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

// Kategori dibuat sama seperti di Kelola Soal biar taksonomi mapelnya konsisten
const kategoriList = [
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris",
  "Fisika", "Kimia", "Biologi", "Ekonomi", "Geografi",
  "Sosiologi", "Sejarah", "Antropologi", "Bahasa Arab",
  "Bahasa Mandarin", "Bahasa Jepang", "Bahasa Korea",
  "Bahasa Jerman", "Bahasa Prancis", "PPKN", "PKK", "TPS", "Literasi",
]

const TIPE_LIST = ["video", "artikel", "pdf", "kuis", "latihan"] as const
type Tipe = (typeof TIPE_LIST)[number]

const TIPE_STYLES: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  video:   { color: "#B3432E", bg: "#FBE7E2", icon: Video,      label: "Video" },
  artikel: { color: "#8A5412", bg: "#FBEBD6", icon: FileText,   label: "Artikel" },
  pdf:     { color: "#1F5548", bg: "#E1F0EC", icon: FilePdf,    label: "PDF" },
  kuis:    { color: "#534AB7", bg: "#EEEDFE", icon: HelpCircle, label: "Kuis" },
  latihan: { color: "#185FA5", bg: "#E6F1FB", icon: Dumbbell,   label: "Latihan" },
}
const DEFAULT_TIPE_STYLE = { color: "#6B7080", bg: "#EEECE3", icon: FileText, label: "Materi" }

function tipeStyle(tipe: string) {
  return TIPE_STYLES[tipe?.toLowerCase()] || DEFAULT_TIPE_STYLE
}

type Materi = {
  id?: number
  judul: string
  kategori: string
  tipe: string
  link: string
  gambar?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "GR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function MateriGuruPage() {
  const pathname = usePathname()
  const router = useRouter()

const [checking, setChecking] = useState(true)
const [namaGuru, setNamaGuru] = useState("Guru")
const [foto, setFoto] = useState("")
const [showNotif, setShowNotif] = useState(false)
const [showProfileMenu, setShowProfileMenu] = useState(false)


  const [notifDraft, setNotifDraft] = useState(0)
  const [notifTanpaPaket, setNotifTanpaPaket] = useState(0)

  const [materi, setMateri] = useState<Materi[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedKategori, setSelectedKategori] = useState("Semua")
  const [selectedTipe, setSelectedTipe] = useState<"Semua" | Tipe>("Semua")

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState<Materi>({
    judul: "", kategori: "Matematika", tipe: "artikel", link: "", gambar: "",
  })

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
getMateri()
loadNotifikasi()
  }

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar?")) return
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Ringkasan kecil untuk dropdown notifikasi — dihitung dari tabel soal,
  // pakai logika yang sama dengan Dashboard & Kelola Soal (relasi package_soal + kolom legacy paket).
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

  async function getMateri() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("materi")
        .select("*")
        .order("id", { ascending: false })
      if (error) { console.log(error); return }
      setMateri((data || []) as Materi[])
    } finally {
      setLoading(false)
    }
  }

  async function uploadGambar(file: File) {
    try {
      setUploading(true)
      const fileName = `${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from("materi").upload(fileName, file)
      if (error) { alert("Upload gagal: " + error.message); return }
      const { data } = supabase.storage.from("materi").getPublicUrl(fileName)
      setForm((prev) => ({ ...prev, gambar: data.publicUrl }))
    } finally {
      setUploading(false)
    }
  }

  function resetForm() {
    setForm({ judul: "", kategori: "Matematika", tipe: "artikel", link: "", gambar: "" })
  }

  function handleEdit(item: Materi) {
    setForm({ ...item, gambar: item.gambar || "" })
    setShowModal(true)
  }

  async function handleSubmit() {
    if (!form.judul.trim()) { alert("Judul wajib diisi"); return }
    if (!form.link.trim()) { alert("Link materi wajib diisi"); return }

    const payload = {
      judul: form.judul.trim(),
      kategori: form.kategori,
      tipe: form.tipe,
      link: form.link.trim(),
      gambar: form.gambar || "",
    }

    try {
      setSaving(true)
      if (form.id) {
        const { error } = await supabase.from("materi").update(payload).eq("id", form.id)
        if (error) { alert(error.message); return }
      } else {
        const { error } = await supabase.from("materi").insert([payload])
        if (error) { alert(error.message); return }
      }
      setShowModal(false)
      resetForm()
      await getMateri()
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan materi")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id?: number) {
    if (!id) return
    if (!confirm("Hapus materi ini?")) return
    await supabase.from("materi").delete().eq("id", id)
    getMateri()
  }

  const filteredMateri = useMemo(() => {
    return materi
      .filter((m) => selectedKategori === "Semua" || m.kategori === selectedKategori)
      .filter((m) => selectedTipe === "Semua" || m.tipe?.toLowerCase() === selectedTipe)
      .filter((m) => m.judul?.toLowerCase().includes(search.toLowerCase()))
  }, [materi, selectedKategori, selectedTipe, search])

  const perTipeCount = useMemo(() => {
    const map: Record<string, number> = {}
    materi.forEach((m) => {
      const key = m.tipe?.toLowerCase() || "lainnya"
      map[key] = (map[key] || 0) + 1
    })
    return map
  }, [materi])

  function KategoriPill({ label, value }: { label: string; value: string }) {
    const active = selectedKategori === value
    return (
      <button
        type="button"
        onClick={() => setSelectedKategori(value)}
        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
        style={{
          background: active ? palette.navy : palette.card,
          color: active ? "#FFFFFF" : palette.inkSoft,
          borderColor: active ? palette.navy : palette.border,
        }}
      >
        {label}
      </button>
    )
  }

  function TipePill({ value }: { value: "Semua" | Tipe }) {
    const active = selectedTipe === value
    const st = value === "Semua" ? null : tipeStyle(value)
    return (
      <button
        type="button"
        onClick={() => setSelectedTipe(value)}
        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
        style={{
          background: active ? (st ? st.color : palette.amber) : palette.card,
          color: active ? "#FFFFFF" : (st ? st.color : palette.inkSoft),
          borderColor: active ? (st ? st.color : palette.amber) : palette.border,
        }}
      >
        {value === "Semua" ? "Semua Tipe" : tipeStyle(value).label}
      </button>
    )
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
            <h1 className="text-xl font-bold" style={{ color: palette.ink }}>Materi Pelajaran</h1>
            <p className="text-sm" style={{ color: palette.inkSoft }}>Kelola video, artikel, PDF, kuis, dan latihan untuk siswa.</p>
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
                <p className="text-sm" style={{ color: palette.inkSoft }}>Memuat data materi...</p>
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
                  <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#8FA0C4" }}>Pusat Belajar</p>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} style={{ color: palette.amber }} />
                    Kelola materi belajar siswa
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#AEB8CC" }}>
                    {materi.length} materi &middot; tersebar di {new Set(materi.map(m => m.kategori)).size} mata pelajaran
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowModal(true) }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
                  style={{ background: palette.amber, color: "#40260A" }}
                >
                  <Plus size={16} />
                  Tambah Materi
                </button>
              </div>

              {/* STAT CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="rounded-2xl p-5" style={{ background: palette.navy }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <Layers3 size={17} style={{ color: "#F0C98A" }} />
                  </div>
                  <p className="text-sm" style={{ color: "#AEB8CC" }}>Total Materi</p>
                  <h2 className="text-2xl font-bold mt-1 text-white">{materi.length}</h2>
                </div>
                {TIPE_LIST.map((t) => {
                  const st = tipeStyle(t)
                  const Icon = st.icon
                  return (
                    <div key={t} className="rounded-2xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: st.bg }}>
                        <Icon size={17} style={{ color: st.color }} />
                      </div>
                      <p className="text-sm" style={{ color: palette.inkSoft }}>{st.label}</p>
                      <h2 className="text-2xl font-bold mt-1" style={{ color: palette.ink }}>{perTipeCount[t] || 0}</h2>
                    </div>
                  )
                })}
              </div>

              {/* FILTER */}
              <div className="rounded-2xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <p className="text-[11px] font-semibold tracking-wider uppercase mb-2.5" style={{ color: palette.inkFaint }}>Filter Kategori</p>
                <div className="flex gap-2 flex-wrap">
                  <KategoriPill label="Semua" value="Semua" />
                  {kategoriList.map((k) => <KategoriPill key={k} label={k} value={k} />)}
                </div>

                <p className="text-[11px] font-semibold tracking-wider uppercase mb-2.5 mt-5" style={{ color: palette.inkFaint }}>Filter Tipe</p>
                <div className="flex gap-2 flex-wrap">
                  <TipePill value="Semua" />
                  {TIPE_LIST.map((t) => <TipePill key={t} value={t} />)}
                </div>
              </div>

              {/* SEARCH */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: palette.inkFaint }} />
                <input
                  placeholder="Cari judul materi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 rounded-xl pl-9 pr-4 text-sm outline-none transition"
                  style={{ background: palette.card, border: `1px solid ${palette.border}`, color: palette.ink }}
                />
              </div>

              {/* LIST HEADER */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: palette.ink }}>Daftar Materi</p>
                <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ background: palette.amberSoft, color: palette.amberText }}>
                  {filteredMateri.length} materi
                </span>
              </div>

              {/* GRID MATERI */}
              {filteredMateri.length === 0 ? (
                <div className="rounded-2xl p-10 text-center" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                  <p className="text-sm" style={{ color: palette.inkSoft }}>Tidak ada materi ditemukan</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMateri.map((item) => {
                    const st = tipeStyle(item.tipe)
                    const Icon = st.icon
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: palette.card, border: `1px solid ${palette.border}` }}
                      >
                        <div className="relative" style={{ height: 130, background: palette.paper }}>
                          {item.gambar ? (
                            <img src={item.gambar} alt={item.judul} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: st.bg }}>
                              <Icon size={32} style={{ color: st.color }} />
                            </div>
                          )}
                          <span
                            className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: palette.paper, color: palette.inkSoft }}
                            >
                              {item.kategori}
                            </span>
                            <h3 className="text-sm font-bold mt-2 leading-snug line-clamp-2" style={{ color: palette.ink }}>
                              {item.judul}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                              style={{ background: palette.amberSoft, color: palette.amberText }}
                            >
                              <ExternalLink size={13} />
                              Buka
                            </a>
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition"
                              style={{ background: palette.paper, border: `1px solid ${palette.border}`, color: palette.inkSoft }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition"
                              style={{ background: palette.dangerSoft, color: palette.danger }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* MODAL TAMBAH/EDIT MATERI */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(27,42,74,0.6)" }}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[95vh] flex flex-col" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: palette.navy }}>
              <h2 className="text-base font-semibold text-white">
                {form.id ? "Edit Materi" : "Tambah Materi Baru"}
              </h2>
              <button
                type="button" onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xl leading-none transition"
                style={{ border: `1px solid ${palette.navySoft}`, color: "#C4CCDE" }}
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Thumbnail</label>
                <input
                  type="file" accept="image/*"
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) await uploadGambar(f) }}
                  className="w-full p-2.5 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold cursor-pointer"
                  style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                />
                {uploading && <p className="mt-1 text-xs font-medium" style={{ color: palette.amberText }}>Mengupload...</p>}
                {form.gambar && (
                  <div className="mt-3 relative w-full" style={{ height: 120 }}>
                    <img src={form.gambar} alt="preview" className="w-full h-full object-cover rounded-xl" style={{ border: `1px solid ${palette.border}` }} />
                  </div>
                )}
                {!form.gambar && (
                  <p className="mt-1.5 text-xs flex items-center gap-1.5" style={{ color: palette.inkFaint }}>
                    <ImageIcon size={12} /> Opsional — kalau kosong, ikon tipe materi akan dipakai sebagai gambar
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Judul Materi *</label>
                <input
                  value={form.judul}
                  onChange={(e) => setForm((p) => ({ ...p, judul: e.target.value }))}
                  placeholder="Contoh: Trik Cepat Integral Substitusi"
                  className="w-full p-2.5 rounded-xl text-sm outline-none transition"
                  style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Kategori</label>
                  <select
                    value={form.kategori} onChange={(e) => setForm((p) => ({ ...p, kategori: e.target.value }))}
                    className="w-full p-2.5 rounded-xl text-sm font-medium outline-none transition"
                    style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                  >
                    {kategoriList.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Tipe</label>
                  <select
                    value={form.tipe} onChange={(e) => setForm((p) => ({ ...p, tipe: e.target.value }))}
                    className="w-full p-2.5 rounded-xl text-sm font-medium outline-none transition"
                    style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                  >
                    {TIPE_LIST.map((t) => <option key={t} value={t}>{tipeStyle(t).label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: palette.ink }}>Link Materi *</label>
                <input
                  value={form.link}
                  onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-xl text-sm outline-none transition"
                  style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                />
                <p className="mt-1.5 text-xs" style={{ color: palette.inkFaint }}>
                  Link Youtube, Google Drive, PDF, atau halaman kuis/latihan siswa.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: `2px solid ${palette.border}`, background: palette.card }}>
              <button
                type="button" onClick={() => setShowModal(false)}
                className="h-10 px-5 rounded-xl text-sm font-semibold transition"
                style={{ border: `2px solid ${palette.border}`, color: palette.inkSoft }}
              >
                Batal
              </button>
              <button
                type="button" disabled={saving} onClick={handleSubmit}
                className="h-10 px-6 rounded-xl text-sm font-bold transition disabled:opacity-50"
                style={{ background: palette.amber, color: "#40260A" }}
              >
                {saving ? "Menyimpan..." : "Simpan Materi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
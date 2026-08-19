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
  Camera,
  Save,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/* DESAIN — sama persis dengan app/guru/page.tsx, soal, materi         */
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

type SoalRow = {
  id: number
  kategori: string
  pertanyaan: string
  created_at?: string
  is_active?: boolean | null
}

type MateriRow = {
  id: number
  judul: string
  kategori: string
  tipe: string
  created_at?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "GR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function ProfilGuruPage() {
  const pathname = usePathname()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [saved, setSaved] = useState(false)

  const [userId, setUserId] = useState("")
  const [namaGuru, setNamaGuru] = useState("Guru")
  const [editNama, setEditNama] = useState("")
  const [email, setEmail] = useState("")
  const [foto, setFoto] = useState("")

  const [showNotif, setShowNotif] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const [soal, setSoal] = useState<SoalRow[]>([])
  const [materi, setMateri] = useState<MateriRow[]>([])
  const [packagesCount, setPackagesCount] = useState(0)
  const [soalIdsDenganPaket, setSoalIdsDenganPaket] = useState<Set<number>>(new Set())

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  async function checkAccessAndLoad() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push("/login")
      return
    }
    setUserId(data.user.id)
    setEmail(data.user.email || "")

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

    const nama = profile.nama_lengkap || profile.full_name || profile.nama || "Guru"
    setNamaGuru(nama)
    setEditNama(nama)
    setFoto(profile.foto || profile.avatar_url || "")
    setChecking(false)
    loadData()
  }

  async function handleLogout() {
    if (!confirm("Yakin ingin keluar?")) return
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function loadData() {
    setLoadingData(true)
    const [{ data: soalData }, { data: materiData }, { count: pkgCount }, { data: relasiData }] = await Promise.all([
      supabase
        .from("soal")
        .select("id, kategori, pertanyaan, created_at, is_active")
        .order("created_at", { ascending: false }),
      supabase
        .from("materi")
        .select("id, judul, kategori, tipe, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("packages").select("id", { count: "exact", head: true }),
      supabase.from("package_soal").select("soal_id"),
    ])
    setSoal((soalData || []) as SoalRow[])
    setMateri((materiData || []) as MateriRow[])
    setPackagesCount(pkgCount || 0)
    setSoalIdsDenganPaket(new Set((relasiData || []).map((r: any) => r.soal_id as number)))
    setLoadingData(false)
  }

  async function saveNama() {
    if (!editNama.trim()) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from("profiles")
        .update({ nama_lengkap: editNama.trim(), nama: editNama.trim(), full_name: editNama.trim() })
        .eq("id", userId)
      if (error) { alert(error.message); return }
      setNamaGuru(editNama.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function uploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) { alert("Ukuran foto maksimal 2MB"); return }
      setUploadingFoto(true)
      const ext = file.name.split(".").pop()
      const fileName = `${userId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from("foto-profile").upload(fileName, file, { upsert: true })
      if (upErr) { alert(upErr.message); return }
      const { data: urlData } = supabase.storage.from("foto-profile").getPublicUrl(fileName)
      const url = urlData.publicUrl
      const { error: dbErr } = await supabase.from("profiles").update({ foto: url }).eq("id", userId)
      if (dbErr) { alert(dbErr.message); return }
      setFoto(url)
    } catch {
      alert("Terjadi kesalahan saat upload foto")
    } finally {
      setUploadingFoto(false)
    }
  }

  const soalNonaktif = useMemo(() => soal.filter((s) => !s.is_active).length, [soal])
  const tanpaPaket = useMemo(() => soal.filter((s) => !soalIdsDenganPaket.has(s.id)).length, [soal, soalIdsDenganPaket])
  const notifDraft = soalNonaktif
  const notifTanpaPaket = tanpaPaket


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
     <div className="px-6 pt-7 pb-6 flex items-center justify-center">
  <img src="/logo-lampung-cerdas.png" alt="Logo" className="h-14 w-auto" />
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
            <h1 className="text-xl font-bold" style={{ color: palette.ink }}>Profil Saya</h1>
            <p className="text-sm" style={{ color: palette.inkSoft }}>Kelola informasi akun dan lihat ringkasan aktivitasmu.</p>
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
                <p className="text-sm" style={{ color: palette.inkSoft }}>Memuat data profil...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">

              {/* HERO STRIP */}
              <div
                className="rounded-2xl p-6 flex items-center justify-between flex-wrap gap-6"
                style={{ background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.navySoft} 100%)` }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    {foto ? (
                      <img
                        src={foto}
                        alt="avatar"
                        className="w-16 h-16 rounded-full object-cover"
                        style={{ border: "3px solid rgba(255,255,255,0.25)" }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ background: palette.amber, color: "#40260A", border: "3px solid rgba(255,255,255,0.25)" }}
                      >
                        {initials(namaGuru)}
                      </div>
                    )}
                    <label
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: palette.amber, border: `2px solid ${palette.navy}` }}
                    >
                      {uploadingFoto ? (
                        <span className="text-[9px] text-white">…</span>
                      ) : (
                        <Camera size={11} style={{ color: "#40260A" }} />
                      )}
                      <input type="file" hidden accept="image/*" onChange={uploadFoto} />
                    </label>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#8FA0C4" }}>Guru &middot; Lampung Cerdas</p>
                    <h2 className="text-xl font-bold text-white truncate">{namaGuru}</h2>
                    <p className="text-sm mt-0.5 truncate" style={{ color: "#AEB8CC" }}>{email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: "#6EE7B7" }} />
                    <span className="text-xs font-semibold text-white">Akun Aktif</span>
                  </div>
                </div>
              </div>

              {/* EDIT PROFIL */}
              <div className="rounded-2xl p-8" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <h3 className="text-lg font-bold mb-1" style={{ color: palette.ink }}>Edit Profil</h3>
                <p className="text-sm mb-6" style={{ color: palette.inkFaint }}>Perbarui nama tampilan kamu</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: palette.inkFaint }}>
                      Nama Lengkap
                    </label>
                    <input
                      value={editNama}
                      onChange={(e) => setEditNama(e.target.value)}
                      placeholder="Masukkan nama lengkap..."
                      className="w-full p-3 rounded-xl text-sm outline-none transition"
                      style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.ink }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: palette.inkFaint }}>
                      Email
                    </label>
                    <div
                      className="p-3 rounded-xl text-sm"
                      style={{ border: `2px solid ${palette.border}`, background: palette.paper, color: palette.inkSoft }}
                    >
                      {email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveNama}
                    className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-bold transition disabled:opacity-50"
                    style={{ background: palette.amber, color: "#40260A" }}
                  >
                    <Save size={15} />
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                  {saved && (
                    <span
                      className="text-xs font-semibold px-3 py-2 rounded-lg"
                      style={{ background: palette.tealSoft, color: palette.tealText }}
                    >
                      ✓ Tersimpan
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
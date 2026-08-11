"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, usePathname } from "next/navigation"

type UserType = {
  id: string
  nama: string
  email: string
  role: string
  foto?: string
}

type HasilType = {
  user_id: string
  skor: number
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
  { label: "Token Ujian",    icon: "⟐",  path: "/admin/token"   },
]

const G = {
  teal:   "linear-gradient(135deg,#0ea5e9,#0d9488)",
  violet: "linear-gradient(135deg,#7c3aed,#4f46e5)",
  amber:  "linear-gradient(135deg,#f59e0b,#ef4444)",
  sky:    "linear-gradient(135deg,#38bdf8,#0284c7)",
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

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  admin: { label: "Admin", bg: "rgba(124,58,237,.12)", text: "#6d28d9" },
  guru:  { label: "Guru",  bg: "rgba(245,158,11,.12)", text: "#b45309" },
  siswa: { label: "Siswa", bg: "rgba(14,165,233,.12)", text: "#0369a1" },
}

function getRoleConfig(role: string) {
  return ROLE_CONFIG[role] ?? { label: role || "-", bg: "#f1f5f9", text: "#64748b" }
}

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "siswa", label: "Siswa" },
  { key: "guru",  label: "Guru"  },
  { key: "admin", label: "Admin" },
]

export default function AdminUsersPage() {

  const router   = useRouter()
  const pathname = usePathname()

  const [users,   setUsers  ] = useState<UserType[]>([])
  const [hasil,   setHasil  ] = useState<HasilType[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch ] = useState("")
  const [activeTab, setActiveTab] = useState("semua")
  const [adminName,   setAdminName  ] = useState("Admin")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({ nama: "", email: "", password: "" })

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
    await getUsers()
    await getHasil()
    setLoading(false)
  }

  async function getUsers() {
    const { data, error } = await supabase
      .from("profiles").select("*").order("nama", { ascending: true })
    if (error) { console.log(error); return }
    setUsers(data || [])
  }

  async function getHasil() {
    const { data, error } = await supabase.from("hasil").select("*")
    if (error) { console.log(error); return }
    setHasil(data || [])
  }

  async function hapusUser(id: string) {
    const ok = confirm("Yakin ingin menghapus user ini?")
    if (!ok) return
    await supabase.from("hasil").delete().eq("user_id", id)
    await supabase.from("profiles").delete().eq("id", id)
    alert("User berhasil dihapus")
    getUsers()
    getHasil()
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
    let pass = ""
    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)]
    setForm((f) => ({ ...f, password: pass }))
  }

  async function handleAddGuru(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!form.nama.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("Semua field wajib diisi")
      return
    }
    if (form.password.trim().length < 6) {
      setFormError("Password minimal 6 karakter")
      return
    }

    setSubmitting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        setFormError("Sesi login habis, silakan login ulang")
        setSubmitting(false)
        return
      }

      const res = await fetch("/api/admin/create-teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })

      const contentType = res.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        const raw = await res.text()
        console.error("Response bukan JSON:", raw.slice(0, 300))
        setFormError(`Server error (status ${res.status})`)
        setSubmitting(false)
        return
      }

      const result = await res.json()

      if (!res.ok) {
        setFormError(result.error || `Gagal (status ${res.status})`)
        setSubmitting(false)
        return
      }

      setShowModal(false)
      setForm({ nama: "", email: "", password: "" })
      await getUsers()
      alert("Akun guru berhasil dibuat")
    } catch (err: any) {
      console.error("handleAddGuru error:", err)
      setFormError(err?.message || "Terjadi kesalahan, coba lagi")
    }
    setSubmitting(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const filteredUsers = useMemo(() => {
    const key = search.toLowerCase()
    return users.filter((u) => {
      const matchSearch =
        u.nama?.toLowerCase().includes(key) ||
        u.email?.toLowerCase().includes(key)
      const matchTab = activeTab === "semua" || u.role === activeTab
      return matchSearch && matchTab
    })
  }, [users, search, activeTab])

  function getTotalUjian(userId: string) {
    return hasil.filter((h) => h.user_id === userId).length
  }

  function getRataNilai(userId: string) {
    const data = hasil.filter((h) => h.user_id === userId)
    if (data.length === 0) return 0
    return Math.round(data.reduce((a, b) => a + b.skor, 0) / data.length)
  }

  const totalSiswa = users.filter((u) => u.role === "siswa").length
  const totalGuru  = users.filter((u) => u.role === "guru").length
  const totalAdmin = users.filter((u) => u.role === "admin").length

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
        .d1{animation-delay:.04s}.d2{animation-delay:.10s}.d3{animation-delay:.16s}.d4{animation-delay:.22s}

        .rk-chip { transition: all .18s ease; }
        .rk-btn  { transition: all .18s ease; }
        .rk-btn:hover { transform: translateY(-1px); }
        .rk-row  { transition: background .15s ease; }
        .rk-row:hover { background: rgba(14,165,233,.04); }

        .um-input:focus {
          border-color: rgba(14,165,233,.5) !important;
          box-shadow: 0 0 0 3px rgba(14,165,233,.12);
        }

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
    </>
  )

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
            className="text-xs font-medium">Memuat data user</p>
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
          className="font-semibold text-slate-800">Manajemen User</p>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-7 max-w-6xl mx-auto space-y-5">

          {/* ── PAGE HEADER ── */}
          <div className="fade-up d1 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p style={{ color: "#0284c7", letterSpacing: "1px", fontSize: "10px" }}
                className="font-medium uppercase">Admin</p>
              <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "19px" }}
                className="font-semibold text-slate-900 mt-0.5">Manajemen User</h1>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="rk-btn h-9 px-4 rounded-xl text-[13px] font-medium text-white"
              style={{ background: G.teal, boxShadow: "0 4px 12px rgba(14,165,233,.28)" }}
            >
              + Tambah Guru
            </button>
          </div>

          {/* ── STAT CARDS ── */}
          <div className="fade-up d2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total user"  value={users.length}  grad={G.teal}   glow="#0ea5e9" />
            <StatCard label="Siswa"       value={totalSiswa}    grad={G.sky}    glow="#38bdf8" />
            <StatCard label="Guru"        value={totalGuru}     grad={G.amber}  glow="#f59e0b" />
            <StatCard label="Admin"       value={totalAdmin}    grad={G.violet} glow="#7c3aed" />
          </div>

          {/* ── TABS ── */}
          <div className="fade-up d3 flex items-center gap-1.5 bg-white rounded-xl p-1 w-fit"
            style={{ border: "1px solid rgba(15,23,42,.08)" }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="rk-chip h-8 px-4 rounded-lg text-[13px] font-medium"
                style={activeTab === tab.key
                  ? { background: G.teal, color: "#fff" }
                  : { color: "#64748b", background: "transparent" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── SEARCH ── */}
          <div className="fade-up d3 relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="um-input w-full h-11 rounded-xl bg-white px-4 pr-10 text-sm outline-none transition"
              style={{ color: "#0f172a", border: "1px solid rgba(15,23,42,.08)" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          </div>

          {/* ── COUNT ── */}
          <div className="fade-up d3 flex items-center gap-2">
            <p className="text-sm font-medium text-slate-600">Daftar user</p>
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
              style={{ background: "rgba(14,165,233,.1)", color: "#0369a1" }}>
              {filteredUsers.length} akun
            </span>
          </div>

          {/* ── TABLE ── */}
          <div className="fade-up d4 bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">

                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid rgba(15,23,42,.08)" }}>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Ujian
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Rata-rata
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="text-sm text-slate-500">Tidak ada user ditemukan</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const roleConfig  = getRoleConfig(user.role)
                      const totalUjian  = getTotalUjian(user.id)
                      const rata        = getRataNilai(user.id)
                      const isAdmin     = user.role === "admin"

                      return (
                        <tr key={user.id} className="rk-row transition">
                          {/* NAMA + AVATAR */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {user.foto ? (
                                <img
                                  src={user.foto}
                                  alt="foto"
                                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                                  style={{ border: "1px solid rgba(15,23,42,.08)" }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                                  style={{ background: avatarGrad(user.nama) }}>
                                  {user.nama?.slice(0, 2).toUpperCase() ?? "?"}
                                </div>
                              )}
                              <span className="text-sm font-medium text-slate-800 truncate max-w-[140px]">
                                {user.nama || "-"}
                              </span>
                            </div>
                          </td>

                          {/* EMAIL */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-500 truncate max-w-[180px] block">
                              {user.email}
                            </span>
                          </td>

                          {/* ROLE */}
                          <td className="px-4 py-3">
                            <span className="inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ background: roleConfig.bg, color: roleConfig.text }}>
                              {roleConfig.label}
                            </span>
                          </td>

                          {/* TOTAL UJIAN */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-700 font-medium">
                              {totalUjian}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">kali</span>
                          </td>

                          {/* RATA-RATA */}
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold" style={{
                              color: rata >= 80 ? "#059669"
                                : rata >= 60 ? "#d97706"
                                : rata === 0 ? "#94a3b8"
                                : "#e11d48"
                            }}>
                              {rata === 0 ? "—" : rata}
                            </span>
                          </td>

                          {/* AKSI */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/admin/siswa/${user.id}`)}
                                className="h-7 px-3 rounded-lg text-xs font-medium transition"
                                style={{ background: "rgba(14,165,233,.1)", color: "#0369a1" }}
                              >
                                Detail
                              </button>
                              {!isAdmin && (
                                <button
                                  onClick={() => hapusUser(user.id)}
                                  className="h-7 px-3 rounded-lg text-xs font-medium transition"
                                  style={{ background: "rgba(244,63,94,.1)", color: "#e11d48" }}
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      )
                    })
                  )}
                </tbody>

              </table>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL TAMBAH GURU */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(10,15,30,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "384px",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,.35)",
            }}
          >
            {/* header, gradient teal senada tombol Tambah Guru */}
            <div style={{ background: G.teal, padding: "18px 20px 20px", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
                <div style={{ position: "absolute", right: "-16px", top: "-16px", width: "90px", height: "90px", borderRadius: "9999px", background: "rgba(255,255,255,.1)" }} />
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>
                  Tambah Akun Guru
                </h2>
                <button
                  onClick={() => { setShowModal(false); setFormError("") }}
                  style={{
                    color: "#fff", fontSize: "16px", lineHeight: 1,
                    background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.3)",
                    borderRadius: "8px", width: "26px", height: "26px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              <form onSubmit={handleAddGuru} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 500, color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Nama lengkap
                  </label>
                  <input
                    value={form.nama}
                    onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                    className="um-input"
                    style={{
                      width: "100%",
                      height: "38px",
                      borderRadius: "9px",
                      border: "1px solid rgba(15,23,42,.1)",
                      padding: "0 12px",
                      fontSize: "14px",
                      color: "#0f172a",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    placeholder="Nama guru"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 500, color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="um-input"
                    style={{
                      width: "100%",
                      height: "38px",
                      borderRadius: "9px",
                      border: "1px solid rgba(15,23,42,.1)",
                      padding: "0 12px",
                      fontSize: "14px",
                      color: "#0f172a",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    placeholder="guru@email.com"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 500, color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Password
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="um-input"
                      style={{
                        flex: 1,
                        height: "38px",
                        borderRadius: "9px",
                        border: "1px solid rgba(15,23,42,.1)",
                        padding: "0 12px",
                        fontSize: "14px",
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      placeholder="Min. 6 karakter"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      style={{
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "9px",
                        background: "#f1f5f9",
                        color: "#475569",
                        fontSize: "12px",
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Generate
                    </button>
                  </div>
                </div>

                {formError && (
                  <p style={{ fontSize: "12px", color: "#e11d48", margin: 0 }}>{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    height: "38px",
                    borderRadius: "9px",
                    background: submitting ? "rgba(14,165,233,.5)" : G.teal,
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "none",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: submitting ? "none" : "0 4px 12px rgba(14,165,233,.3)",
                  }}
                >
                  {submitting ? "Menyimpan..." : "Buat Akun Guru"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────

function StatCard({ label, value, grad, glow }: { label: string; value: number; grad: string; glow: string }) {
  return (
    <div className="rounded-2xl px-4 py-3.5 text-white relative overflow-hidden"
      style={{ background: grad, boxShadow: `0 6px 20px ${glow}33` }}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,.1)" }} />
      <div className="relative">
        <p className="text-[11px] font-medium mb-1 text-white/80">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}
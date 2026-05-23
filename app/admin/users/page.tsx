"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

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

const AVATAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-sky-100",    text: "text-sky-700"    },
  { bg: "bg-emerald-100",text: "text-emerald-700"},
  { bg: "bg-rose-100",   text: "text-rose-700"   },
  { bg: "bg-amber-100",  text: "text-amber-700"  },
  { bg: "bg-teal-100",   text: "text-teal-700"   },
  { bg: "bg-fuchsia-100",text: "text-fuchsia-700"},
  { bg: "bg-orange-100", text: "text-orange-700" },
]

function getAvatarColor(name: string) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

export default function AdminUsersPage() {

  const router = useRouter()

  const [users,   setUsers  ] = useState<UserType[]>([])
  const [hasil,   setHasil  ] = useState<HasilType[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch ] = useState("")

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

  const filteredUsers = useMemo(() => {
    const key = search.toLowerCase()
    return users.filter((u) =>
      u.nama?.toLowerCase().includes(key) ||
      u.email?.toLowerCase().includes(key)
    )
  }, [users, search])

  function getTotalUjian(userId: string) {
    return hasil.filter((h) => h.user_id === userId).length
  }

  function getRataNilai(userId: string) {
    const data = hasil.filter((h) => h.user_id === userId)
    if (data.length === 0) return 0
    return Math.round(data.reduce((a, b) => a + b.skor, 0) / data.length)
  }

  const totalSiswa = users.filter((u) => u.role !== "admin").length
  const totalAdmin = users.filter((u) => u.role === "admin").length

  // ── loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memuat data user...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[3px] text-indigo-500 uppercase leading-none mb-0.5">
              Admin
            </p>
            <h1 className="text-[15px] font-semibold text-slate-800 leading-none">
              Manajemen User
            </h1>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="h-8 px-4 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">

        {/* STAT CARDS */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total user"  value={users.length}  color="indigo" />
          <StatCard label="Total siswa" value={totalSiswa}    color="emerald" />
          <StatCard label="Total admin" value={totalAdmin}    color="violet" />
        </div>

        {/* SEARCH */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full h-10 rounded-xl bg-white border border-slate-200 px-4 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        </div>

        {/* COUNT */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-600">Daftar user</p>
          <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
            {filteredUsers.length} akun
          </span>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
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
                    const color      = getAvatarColor(user.nama)
                    const totalUjian = getTotalUjian(user.id)
                    const rata       = getRataNilai(user.id)
                    const isAdmin    = user.role === "admin"

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50 transition"
                      >
                        {/* NAMA + AVATAR */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {user.foto ? (
                              <img
                                src={user.foto}
                                alt="foto"
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${color.bg} ${color.text}`}>
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
                          <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                            isAdmin
                              ? "bg-violet-100 text-violet-700"
                              : "bg-sky-100 text-sky-700"
                          }`}>
                            {user.role}
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
                          <span className={`text-sm font-semibold ${
                            rata >= 80 ? "text-emerald-600"
                            : rata >= 60 ? "text-amber-600"
                            : rata === 0 ? "text-slate-400"
                            : "text-rose-500"
                          }`}>
                            {rata === 0 ? "—" : rata}
                          </span>
                        </td>

                        {/* AKSI */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/siswa/${user.id}`)}
                              className="h-7 px-3 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition"
                            >
                              Detail
                            </button>
                            {!isAdmin && (
                              <button
                                onClick={() => hapusUser(user.id)}
                                className="h-7 px-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition"
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
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────
const STAT_STYLES: Record<string, { bg: string; num: string; label: string }> = {
  indigo:  { bg: "bg-indigo-50  border-indigo-100",  num: "text-indigo-700",  label: "text-indigo-400"  },
  emerald: { bg: "bg-emerald-50 border-emerald-100", num: "text-emerald-700", label: "text-emerald-400" },
  violet:  { bg: "bg-violet-50  border-violet-100",  num: "text-violet-700",  label: "text-violet-400"  },
}

function StatCard({
  label, value, color
}: { label: string; value: number; color: string }) {
  const s = STAT_STYLES[color] ?? STAT_STYLES.indigo
  return (
    <div className={`border rounded-xl px-4 py-3 ${s.bg}`}>
      <p className={`text-[11px] font-medium mb-1 ${s.label}`}>{label}</p>
      <p className={`text-2xl font-bold ${s.num}`}>{value}</p>
    </div>
  )
}
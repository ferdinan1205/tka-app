"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"
import CustomAlert, { AlertState } from "@/components/CustomAlert"

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [alert, setAlert] = useState<AlertState | null>(null)

  const showAlert = (type: "success" | "error" | "warning" | "info", title: string, message: string) => {
    setAlert({ type, title, message })
  }

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()

    if (!email.trim() || !password) {
      showAlert("warning", "Data Belum Lengkap", "Silakan masukkan email dan kata sandi Anda.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setLoading(false)
        showAlert(
          "error",
          "Gagal Masuk",
          error.message === "Invalid login credentials"
            ? "Email atau kata sandi yang Anda masukkan salah."
            : error.message
        )
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (!user) {
        setLoading(false)
        showAlert("error", "Pengguna Tidak Ditemukan", "Akun pengguna tidak dapat diverifikasi.")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, nama")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        setLoading(false)
        showAlert("error", "Profil Tidak Ditemukan", "Data profil akun Anda belum terdaftar.")
        await supabase.auth.signOut()
        return
      }

      showAlert("success", "Berhasil Masuk", `Selamat datang kembali, ${profile.nama || "Siswa"}!`)

      setTimeout(() => {
        setLoading(false)
        switch (profile.role) {
          case "admin":
            router.push("/admin")
            break
          case "guru":
            router.push("/guru")
            break
          case "siswa":
            router.push("/dashboard")
            break
          default:
            showAlert("warning", "Akses Ditolak", "Role akun Anda tidak dikenali.")
            supabase.auth.signOut()
        }
      }, 600)
    } catch (err: any) {
      setLoading(false)
      showAlert("error", "Terjadi Kesalahan", err?.message || "Gagal menghubungkan ke server.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-4 sm:p-6">

      {/* Floating Alert */}
      <CustomAlert alert={alert} onClose={() => setAlert(null)} />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-blue-500/5 p-7 sm:p-9">

        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <img
              src="/logo-lampung-cerdas.png"
              alt="Lampung Cerdas"
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Masuk ke Akun
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gunakan email dan kata sandi yang terdaftar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">

          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="nama@email.com"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-600/15 flex items-center justify-center gap-2 transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Belum punya akun?{" "}
            <a
              href="/register"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition"
            >
              Daftar di sini
            </a>
          </p>
        </div>

      </div>

      {/* Copyright */}
      <p className="text-xs text-slate-400 mt-6">
        © {new Date().getFullYear()} Lampung Cerdas
      </p>

    </div>
  )
}
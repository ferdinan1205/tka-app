"use client"

import { useState, useEffect, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, Loader2, ShieldX } from "lucide-react"
import CustomAlert, { AlertState } from "@/components/CustomAlert"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [alert, setAlert] = useState<AlertState | null>(null)

  // Gerbang kode saat ini terbuka untuk umum
  const [aksesDiizinkan, setAksesDiizinkan] = useState<boolean | null>(true)

  const showAlert = (type: "success" | "error" | "warning" | "info", title: string, message: string) => {
    setAlert({ type, title, message })
  }

  useEffect(() => {
    // Auto isi form kalau datang dari redirect SSO
    if (typeof window !== "undefined") {
      const ssoNama = sessionStorage.getItem("sso_nama")
      const ssoEmail = sessionStorage.getItem("sso_email")
      const ssoPassword = sessionStorage.getItem("sso_password")
      if (ssoNama) setNama(ssoNama)
      if (ssoEmail) setEmail(ssoEmail)
      if (ssoPassword) setPassword(ssoPassword)
    }
  }, [])

  async function handleRegister(e?: React.FormEvent) {
    if (e) e.preventDefault()

    if (!nama.trim() || !email.trim() || !password) {
      showAlert("warning", "Data Belum Lengkap", "Silakan lengkapi nama lengkap, email, dan kata sandi.")
      return
    }

    if (password.length < 6) {
      showAlert("warning", "Kata Sandi Kurang", "Kata sandi minimal harus terdiri dari 6 karakter.")
      return
    }

    setLoading(true)

    try {
      // 1. Supabase Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      })

      if (error) {
        setLoading(false)
        showAlert("error", "Registrasi Gagal", error.message)
        return
      }

      const user = data.user

      // 2. Simpan Profil Siswa
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([{
            id: user.id,
            nama: nama.trim(),
            email: email.trim(),
            role: "siswa",
          }])

        if (profileError) {
          setLoading(false)
          showAlert("error", "Gagal Menyimpan Profil", profileError.message)
          return
        }
      }

      // 3. Otomatis masuk (Auto Sign-In jika diperlukan)
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        })

        if (signInError) {
          setLoading(false)
          showAlert("info", "Pendaftaran Berhasil", "Akun berhasil dibuat. Silakan login dengan akun Anda.")
          setTimeout(() => {
            router.push("/login")
          }, 1500)
          return
        }
      }

      // Bersihkan session storage
      sessionStorage.removeItem("register_access")
      sessionStorage.removeItem("sso_nama")
      sessionStorage.removeItem("sso_email")
      sessionStorage.removeItem("sso_password")

      showAlert("success", "Registrasi Berhasil!", "Selamat datang! Mengalihkan ke dashboard...")

      // Langsung arahkan ke dashboard
      setTimeout(() => {
        setLoading(false)
        router.push("/dashboard")
      }, 1000)

    } catch (err: any) {
      setLoading(false)
      showAlert("error", "Terjadi Kesalahan", err?.message || "Gagal menghubungkan ke server.")
    }
  }

  if (aksesDiizinkan === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Memverifikasi akses...</p>
        </div>
      </div>
    )
  }

  if (aksesDiizinkan === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-blue-500/5 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-rose-50 text-rose-500 w-14 h-14 rounded-2xl flex items-center justify-center">
              <ShieldX size={28} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Akses Dibatasi
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Halaman ini hanya bisa diakses melalui tautan resmi Lampung Cerdas.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold transition"
          >
            Kembali ke Halaman Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-4 sm:p-6">

      {/* Floating Alert */}
      <CustomAlert alert={alert} onClose={() => setAlert(null)} />

      {/* Main Register Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-blue-500/5 p-7 sm:p-9 my-4">

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
            Daftar Akun Baru
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Buat akun untuk mulai belajar dan tryout
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">

          {/* Nama Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="Nama lengkap Anda"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

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
                placeholder="Minimal 6 karakter"
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
                <span>Mendaftarkan...</span>
              </>
            ) : (
              <span>Daftar Akun</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Sudah punya akun?{" "}
            <a
              href="/login"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition"
            >
              Masuk di sini
            </a>
          </p>
        </div>

      </div>

      {/* Copyright */}
      <p className="text-xs text-slate-400 mt-4 mb-2">
        © {new Date().getFullYear()} Lampung Cerdas
      </p>

    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Memuat...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
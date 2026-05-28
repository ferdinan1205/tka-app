"use client"

import { useState, useEffect, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, GraduationCap, ShieldX } from "lucide-react"

function RegisterForm() {

  const router = useRouter()
  const searchParams = useSearchParams()

  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [aksesDiizinkan, setAksesDiizinkan] = useState<boolean | null>(null)

  useEffect(() => {

    const kodeDariUrl = searchParams.get("kode")
    const KODE_VALID = process.env.NEXT_PUBLIC_REGISTER_CODE

    console.log("kode dari url:", kodeDariUrl)
    console.log("kode valid:", KODE_VALID)

    if (kodeDariUrl && kodeDariUrl === KODE_VALID) {
      sessionStorage.setItem("register_access", "true")
      setAksesDiizinkan(true)
      window.history.replaceState({}, "", "/register")
    } else {
      const sudahAda = sessionStorage.getItem("register_access")
      if (sudahAda === "true") {
        setAksesDiizinkan(true)
      } else {
        setAksesDiizinkan(false)
      }
    }

  }, [])

  async function handleRegister() {

    if (!nama || !email || !password) {
      alert("Nama, email dan password wajib diisi")
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      alert("Register gagal: " + error.message)
      return
    }

    const user = data.user

    if (user) {

      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            nama: nama,
            email: email,
            role: "siswa",
          },
        ])

      if (profileError) {
        setLoading(false)
        alert("Gagal simpan profile: " + profileError.message)
        return
      }

    }

    sessionStorage.removeItem("register_access")
    setLoading(false)
    alert("Akun berhasil dibuat, silakan login")
    router.push("/login")

  }

  if (aksesDiizinkan === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200">
        <p className="text-gray-600 text-lg">Memverifikasi akses...</p>
      </div>
    )
  }

  if (aksesDiizinkan === false) {
    return (
      <div className="
      min-h-screen flex items-center justify-center
      bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 p-6
      ">
        <div className="
        w-full max-w-md bg-white/90 backdrop-blur-lg
        rounded-[35px] shadow-2xl border border-white/40 p-8 text-center
        ">
          <div className="flex justify-center mb-5">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center">
              <ShieldX size={38} className="text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-red-600 mb-3">
            Akses Ditolak
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            Halaman ini hanya bisa diakses melalui link resmi. Silakan hubungi pihak bimbel untuk mendapatkan akses.
          </p>
          <a href="/login" className="text-blue-600 font-semibold hover:underline text-sm">
            Kembali ke Login
          </a>
        </div>
      </div>
    )
  }

  return (

    <div className="
    min-h-screen flex items-center justify-center
    bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 p-6
    ">

      <div className="
      w-full max-w-md bg-white/90 backdrop-blur-lg
      rounded-[35px] shadow-2xl border border-white/40 p-8
      ">

        <div className="flex justify-center mb-5">
          <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center shadow-lg">
            <GraduationCap size={38} className="text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-center text-blue-700 mb-2">
          Lampung Cerdas
        </h1>

        <p className="text-center text-gray-600 mb-8 text-sm">
          Buat Akun Baru
        </p>

        <div className="mb-4">
          <label className="text-gray-700 font-semibold text-sm mb-2 block">
            Nama Lengkap
          </label>
          <input
            type="text"
            placeholder="Masukkan nama lengkap"
            className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="text-gray-700 font-semibold text-sm mb-2 block">
            Email
          </label>
          <input
            type="email"
            placeholder="Masukkan email"
            className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="text-gray-700 font-semibold text-sm mb-2 block">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 pr-14 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-600 transition"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white p-4 rounded-2xl font-bold text-lg shadow-lg transition hover:scale-[1.02] disabled:opacity-60 mb-4"
        >
          {loading ? "Loading..." : "Register"}
        </button>

        <p className="text-center text-gray-600 text-sm">
          Sudah punya akun?{" "}
          <a href="/login" className="text-blue-600 font-semibold hover:underline">
            Login di sini
          </a>
        </p>

        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 Lampung Cerdas
        </p>

      </div>

    </div>

  )

}

export default function Register() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
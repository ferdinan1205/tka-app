"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Login() {

  const router = useRouter()

  const [nama, setNama] =
    useState("")

  const [email, setEmail] =
    useState("")

  const [password, setPassword] =
    useState("")

  const [loading, setLoading] =
    useState(false)

  // =============================
  // LOGIN
  // =============================
  async function handleLogin() {

    if (!email || !password) {

      alert(
        "Email dan password wajib diisi"
      )

      return
    }

    setLoading(true)

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {

      setLoading(false)

      alert(
        "Login gagal: " +
        error.message
      )

      return
    }

    // 🔥 AMBIL USER LOGIN
    const { data: userData } =
      await supabase.auth.getUser()

    const user =
      userData.user

    if (!user) {

      setLoading(false)

      alert(
        "User tidak ditemukan"
      )

      return
    }

    // 🔥 AMBIL ROLE
    const { data: profile } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    setLoading(false)

    // 🔥 CEK ROLE
    if (
      profile?.role === "admin"
    ) {

      router.push("/admin")

    } else {

      router.push("/dashboard")
    }
  }

  // =============================
  // REGISTER
  // =============================
  async function handleRegister() {

    if (
      !nama ||
      !email ||
      !password
    ) {

      alert(
        "Nama, email dan password wajib diisi"
      )

      return
    }

    setLoading(true)

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
      })

    if (error) {

      setLoading(false)

      alert(
        "Register gagal: " +
        error.message
      )

      return
    }

    const user =
      data.user

    // 🔥 INSERT PROFILE
    if (user) {

      const {
        error: profileError
      } = await supabase
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

        alert(
          "Gagal simpan profile: " +
          profileError.message
        )

        return
      }
    }

    setLoading(false)

    alert(
      "Akun berhasil dibuat, silakan login"
    )

    // 🔥 RESET FORM
    setNama("")
    setEmail("")
    setPassword("")
  }

  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 p-6">

      <div className="bg-white shadow-2xl rounded-3xl p-8 w-full max-w-md">

        {/* TITLE */}
        <h1 className="text-3xl font-black text-center mb-2 text-blue-700">
          🎓 Lampung Cerdas
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Login / Register Akun
        </p>

        {/* NAMA */}
        <input
          type="text"
          placeholder="Nama Lengkap (isi saat register)"
          className="border border-gray-300 focus:border-blue-500 outline-none p-3 mb-3 w-full rounded-xl"
          value={nama}
          onChange={(e) =>
            setNama(e.target.value)
          }
        />

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          className="border border-gray-300 focus:border-blue-500 outline-none p-3 mb-3 w-full rounded-xl"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 focus:border-blue-500 outline-none p-3 mb-5 w-full rounded-xl"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        {/* LOGIN */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full p-3 rounded-xl mb-3 font-bold transition disabled:opacity-60"
        >
          {loading
            ? "Loading..."
            : "Login"}
        </button>

        {/* REGISTER */}
        <button
          onClick={handleRegister}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white w-full p-3 rounded-xl font-bold transition disabled:opacity-60"
        >
          {loading
            ? "Loading..."
            : "Register"}
        </button>

      </div>

    </div>
  )
}
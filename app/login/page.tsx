"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  GraduationCap,
} from "lucide-react"

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

  const [showPassword,
    setShowPassword] =
    useState(false)

  // =============================
  // LOGIN
  // =============================

  async function handleLogin() {

    if (
      !email ||
      !password
    ) {

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

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    setLoading(false)

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

    setNama("")
    setEmail("")
    setPassword("")

  }

  return (

    <div className="
    min-h-screen
    flex
    items-center
    justify-center
    bg-gradient-to-br
    from-blue-200
    via-indigo-200
    to-purple-200
    p-6
    ">

      <div className="
      w-full
      max-w-md
      bg-white/90
      backdrop-blur-lg
      rounded-[35px]
      shadow-2xl
      border
      border-white/40
      p-8
      ">

        {/* ICON */}

        <div className="
        flex
        justify-center
        mb-5
        ">

          <div className="
          bg-blue-600
          w-20
          h-20
          rounded-full
          flex
          items-center
          justify-center
          shadow-lg
          ">

            <GraduationCap
              size={38}
              className="text-white"
            />

          </div>

        </div>

        {/* TITLE */}

        <h1 className="
        text-4xl
        font-black
        text-center
        text-blue-700
        mb-2
        ">

          Lampung Cerdas

        </h1>

        <p className="
        text-center
        text-gray-600
        mb-8
        text-sm
        ">

          Platform Tryout & Pembelajaran Pintar

        </p>

        {/* NAMA */}

        <div className="mb-4">

          <label className="
          text-gray-700
          font-semibold
          text-sm
          mb-2
          block
          ">

            Nama Lengkap

          </label>

          <input
            type="text"
            placeholder="Masukkan nama lengkap"
            className="
            w-full
            bg-gray-100
            border
            border-gray-200
            rounded-2xl
            p-4
            text-gray-900
            placeholder:text-gray-500
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            transition
            "
            value={nama}
            onChange={(e) =>
              setNama(
                e.target.value
              )
            }
          />

        </div>

        {/* EMAIL */}

        <div className="mb-4">

          <label className="
          text-gray-700
          font-semibold
          text-sm
          mb-2
          block
          ">

            Email

          </label>

          <input
            type="email"
            placeholder="Masukkan email"
            className="
            w-full
            bg-gray-100
            border
            border-gray-200
            rounded-2xl
            p-4
            text-gray-900
            placeholder:text-gray-500
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            transition
            "
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

        </div>

        {/* PASSWORD */}

        <div className="mb-6">

          <label className="
          text-gray-700
          font-semibold
          text-sm
          mb-2
          block
          ">

            Password

          </label>

          <div className="relative">

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Masukkan password"
              className="
              w-full
              bg-gray-100
              border
              border-gray-200
              rounded-2xl
              p-4
              pr-14
              text-gray-900
              placeholder:text-gray-500
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
              transition
              "
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              className="
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              text-gray-500
              hover:text-blue-600
              transition
              "
            >

              {
                showPassword
                  ?

                  <EyeOff size={22} />

                  :

                  <Eye size={22} />
              }

            </button>

          </div>

        </div>

        {/* LOGIN BUTTON */}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="
          w-full
          bg-blue-600
          hover:bg-blue-700
          text-white
          p-4
          rounded-2xl
          font-bold
          text-lg
          shadow-lg
          transition
          hover:scale-[1.02]
          disabled:opacity-60
          mb-4
          "
        >

          {
            loading
              ?

              "Loading..."

              :

              "Login"
          }

        </button>

        {/* REGISTER BUTTON */}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="
          w-full
          bg-green-500
          hover:bg-green-600
          text-white
          p-4
          rounded-2xl
          font-bold
          text-lg
          shadow-lg
          transition
          hover:scale-[1.02]
          disabled:opacity-60
          "
        >

          {
            loading
              ?

              "Loading..."

              :

              "Register"
          }

        </button>

        {/* FOOTER */}

        <p className="
        text-center
        text-gray-500
        text-sm
        mt-6
        ">

          © 2026 Lampung Cerdas

        </p>

      </div>

    </div>

  )

}
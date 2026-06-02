"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { GraduationCap } from "lucide-react"

export default function SSOProcess() {

  const router = useRouter()
  const [status, setStatus] = useState("Memverifikasi akses...")

  useEffect(() => { handleSSO() }, [])

  async function handleSSO() {

    try {

      // Ambil data dari cookie via API (sekali pakai)
      setStatus("Mengambil data...")
      const res = await fetch("/api/sso/data")

      if (!res.ok) {
        // Cookie tidak ada atau expired → tolak akses
        router.push("/login")
        return
      }

      const { nama, email, password } = await res.json()

      if (!email || !password) {
        router.push("/login")
        return
      }

      // Coba login dulu
      setStatus("Memproses akun...")
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!loginError) {
        // Login berhasil → cek role → redirect
        setStatus("Masuk ke dashboard...")
        const { data: userData } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user!.id)
          .single()

        router.push(profile?.role === "admin" ? "/admin" : "/dashboard")
        return
      }

      // Login gagal → belum punya akun → auto register
      setStatus("Membuat akun baru...")
      const { data: regData, error: regError } = await supabase.auth.signUp({
        email,
        password,
      })

      // Auto register gagal → arahkan ke form register manual
      if (regError || !regData.user) {
        sessionStorage.setItem("register_access", "true")
        sessionStorage.setItem("sso_nama",     nama)
        sessionStorage.setItem("sso_email",    email)
        sessionStorage.setItem("sso_password", password)
        router.push("/register")
        return
      }

      // Simpan profile
      const { error: profileError } = await supabase.from("profiles").insert([{
        id: regData.user.id,
        nama,
        email,
        role: "siswa",
      }])

      // Simpan profile gagal → arahkan ke register manual juga
      if (profileError) {
        console.error("Profile error:", profileError)
        sessionStorage.setItem("register_access", "true")
        sessionStorage.setItem("sso_nama",     nama)
        sessionStorage.setItem("sso_email",    email)
        sessionStorage.setItem("sso_password", password)
        router.push("/register")
        return
      }

      // Login setelah register berhasil
      setStatus("Masuk ke dashboard...")
      await supabase.auth.signInWithPassword({ email, password })
      router.push("/dashboard")

    } catch (e) {
      console.error("SSO process error:", e)
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 p-6">
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-lg rounded-[35px] shadow-2xl border border-white/40 p-8 text-center">

        <div className="flex justify-center mb-5">
          <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center shadow-lg">
            <GraduationCap size={38} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-blue-700 mb-2">
          Lampung Cerdas
        </h1>

        <div className="flex justify-center my-6">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>

        <p className="text-gray-500 text-sm">{status}</p>

        <p className="text-gray-400 text-xs mt-6">
          © 2026 Lampung Cerdas
        </p>

      </div>
    </div>
  )
}
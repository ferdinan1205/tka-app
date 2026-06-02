"use client"

import { useEffect, useState, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap } from "lucide-react"

function SSOProcess() {

  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState("Memverifikasi akses...")

  useEffect(() => { handleSSO() }, [])

  async function handleSSO() {

    try {

      const email = searchParams.get("email")
      const password = searchParams.get("password")

      // Tidak ada email/password → tolak
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

      // Login gagal → arahkan ke register manual
      setStatus("Mengarahkan ke registrasi...")
      sessionStorage.setItem("register_access", "true")
      sessionStorage.setItem("sso_nama", "")
      sessionStorage.setItem("sso_email", email)
      sessionStorage.setItem("sso_password", password)
      router.push("/register")

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

export default function Page() {
  return (
    <Suspense>
      <SSOProcess />
    </Suspense>
  )
}
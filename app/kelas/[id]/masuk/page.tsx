"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../../lib/supabase"

/* ─────────────────────────────────────
   STYLES (konsisten dengan halaman paket)
───────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes mk-fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mk-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes mk-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes mk-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes mk-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }

  .mk-fadeUp { animation: mk-fadeUp .45s cubic-bezier(.22,.61,.36,1) both; }
  .mk-fadeIn { animation: mk-fadeIn .35s ease both; }
  .mk-spin   { animation: mk-spin .9s linear infinite; }
  .mk-float  { animation: mk-float 3s ease-in-out infinite; }
  .mk-shake  { animation: mk-shake .4s ease; }

  .mk-btn-press { transition: transform .15s ease, box-shadow .15s ease; }
  .mk-btn-press:hover  { transform: translateY(-2px); }
  .mk-btn-press:active { transform: scale(.96); }

  .mk-input-focus { transition: border-color .2s, box-shadow .2s; }
  .mk-input-focus:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 4px rgba(124,58,237,.15);
  }
`

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: STYLES }} />
}

function Blobs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #ddd6fe, #a5f3fc)", filter: "blur(80px)" }} />
      <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #fde68a, #fbcfe8)", filter: "blur(90px)" }} />
      <div className="absolute -bottom-24 right-1/3 w-72 h-72 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, #bbf7d0, #a5f3fc)", filter: "blur(80px)" }} />
    </div>
  )
}

type KelasType = {
  id: number
  nama_kelas: string
  token: string
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      <GlobalStyles /><Blobs />
      <div className="mk-fadeIn flex flex-col items-center gap-5">
        <div className="mk-spin w-14 h-14 rounded-full"
          style={{ border: "3px solid #ede9fe", borderTopColor: "#7c3aed" }} />
        <p className="font-black text-violet-700 text-lg">Memuat Kelas</p>
      </div>
    </div>
  )
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <GlobalStyles />
      <div className="mk-fadeUp bg-white rounded-[28px] shadow-xl p-8 text-center max-w-sm w-full border border-red-100">
        <div className="mk-float text-6xl mb-4">😢</div>
        <h1 className="text-2xl font-black text-red-600 mb-2">Kelas Tidak Ditemukan</h1>
        <p className="text-slate-500 text-sm">Cek kembali link yang kamu gunakan</p>
      </div>
    </div>
  )
}

export default function MasukKelasPage() {
  const params  = useParams()
  const router  = useRouter()
  const kelasId = parseInt(params.id as string)

  const [kelas,    setKelas]    = useState<KelasType | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [token,    setToken]    = useState("")
  const [error,    setError]    = useState("")
  const [checking, setChecking] = useState(false)
  const [shake,    setShake]    = useState(false)

  useEffect(() => {
    if (isNaN(kelasId)) { setLoading(false); return }
    getData()
  }, [kelasId])

  async function getData() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("kelas")
        .select("id, nama_kelas, token")
        .eq("id", kelasId)
        .maybeSingle()

      if (error || !data) { setKelas(null); setLoading(false); return }
      setKelas(data)

      // Kalau user sudah pernah unlock, langsung lempar ke halaman kelas
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (user) {
        const { data: akses } = await supabase
          .from("akses_kelas")
          .select("id")
          .eq("user_id", user.id)
          .eq("kelas_id", kelasId)
          .maybeSingle()

        if (akses) {
          router.replace(`/kelas/${kelasId}`)
          return
        }
      }

      setLoading(false)
    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!kelas) return
    setError("")

    if (token.trim() === "") {
      setError("Token tidak boleh kosong")
      triggerShake()
      return
    }

    setChecking(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      setError("Kamu belum login")
      setChecking(false)
      return
    }

    if (token.trim() !== kelas.token) {
      setError("Token kelas salah")
      setChecking(false)
      triggerShake()
      return
    }

    const { error: insertError } = await supabase
      .from("akses_kelas")
      .upsert(
        { user_id: user.id, kelas_id: kelas.id },
        { onConflict: "user_id,kelas_id" }
      )

    if (insertError) {
      console.log(insertError)
      setError("Gagal membuka kelas, coba lagi")
      setChecking(false)
      return
    }

    router.push(`/kelas/${kelas.id}`)
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  if (loading) return <LoadingScreen />
  if (!kelas) return <NotFoundScreen />

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <GlobalStyles /><Blobs />
      <div className="mk-fadeUp w-full max-w-sm">
        <div className={`bg-white rounded-[32px] shadow-2xl border border-violet-100 overflow-hidden ${shake ? "mk-shake" : ""}`}>
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }} />
          <div className="p-7 md:p-8">
            <div className="mk-float w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>
              🏫
            </div>
            <div className="text-center mb-6">
              <p className="text-[10px] font-black tracking-[4px] text-violet-400 uppercase mb-1">Token Kelas Diperlukan</p>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">Masuk Kelas</h1>
              <p className="text-sm text-slate-400 font-semibold">{kelas.nama_kelas}</p>
            </div>

            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Token kelas…"
              disabled={checking}
              className="mk-input-focus w-full h-12 md:h-14 rounded-2xl border-2 border-slate-200 px-4 text-slate-800 font-bold text-sm bg-slate-50 mb-3"
            />

            {error && (
              <p className="text-red-500 text-xs font-bold mb-3 text-center">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={checking}
              className="mk-btn-press w-full h-12 md:h-14 rounded-2xl text-white font-black text-sm md:text-base shadow-lg disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}
            >
              {checking ? "Memeriksa…" : "Masuk Kelas →"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4 font-semibold">
          Sekali masuk, semua paket di kelas ini terbuka otomatis
        </p>
      </div>
    </div>
  )
}
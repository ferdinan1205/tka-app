"use client"

import {
  useEffect,
  useState,
  memo,
  useMemo,
  useRef,
} from "react"

import Image from "next/image"

import { supabase } from "../../../lib/supabase"

import {
  useRouter,
  useParams,
  useSearchParams,
} from "next/navigation"

import {
  MathJax,
  MathJaxContext,
} from "better-react-mathjax"

// ======================
// CACHE VERSION
// ======================

const CACHE_VERSION = "v4"

// ======================
// TYPES
// ======================

type Soal = {
  id: number
  pertanyaan: string
  pengantar?: string
  bacaan?: string
  opsi_a: string
  opsi_b: string
  opsi_c: string
  opsi_d: string
  opsi_e?: string
  jawaban_benar: string
  kategori: string
  gambar?: string
}

type SavedState = {
  answers: Record<number, string>
  currentSoal: number
  timeLeft: number
}

// ======================
// MATH CONFIG
// ======================

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
  },
  chtml: { scale: 1, minScale: 0.5, matchFontHeight: false, adaptiveCSS: false },
  options: {
    enableMenu: false,
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    renderActions: { addMenu: [] },
  },
  startup: { typeset: false },
}

function hasContent(text?: string) {
  if (!text) return false
  const stripped = text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s/g, "")
  return stripped.length > 0
}

function hasMath(text: string = "") {
  return (
    text.includes("$") || text.includes("\\(") || text.includes("\\[") ||
    text.includes("\\frac") || text.includes("\\sqrt") || text.includes("\\times") ||
    text.includes("\\ce{") || text.includes("\\text{") ||
    text.includes("^{") || text.includes("_{") ||
    /\^\d/.test(text) || /\_\d/.test(text)
  )
}

function cleanHtml(html: string = "") {
  return html
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/<p><br\s*\/?><\/p>/gi, "<br/>").replace(/<p>/gi, "").replace(/<\/p>/gi, "<br/>")
    .replace(/<span[^>]*><\/span>/gi, "").trim().replace(/(<br\s*\/?>\s*)+$/gi, "")
}

function normalizeContent(content: string = "") {
  if (!content) return ""
  if (/<[a-z][\s\S]*>/i.test(content)) return cleanHtml(content)
  return content.split("\n").map((line) => line.trim()).join("<br/>")
}

const MathRenderer = memo(({ text, className = "" }: { text: string; className?: string }) => {
  const normalized = useMemo(() => normalizeContent(text), [text])
  if (!hasMath(normalized)) {
    return (
      <div className={`overflow-x-auto break-words whitespace-normal w-full ${className}`}>
        <div className="text-wrap break-words leading-loose [&_*]:max-w-full [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: normalized }} />
      </div>
    )
  }
  return (
    <div className={`overflow-x-auto break-words whitespace-normal w-full ${className}`}>
      <MathJax hideUntilTypeset="first">
        <div className="text-wrap break-words leading-loose [&_*]:max-w-full [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: normalized }} />
      </MathJax>
    </div>
  )
})
MathRenderer.displayName = "MathRenderer"

// ======================
// HASIL MODAL
// ======================
function HasilModal({ skor, total, onClose }: { skor: number; total: number; onClose: () => void }) {
  const pct = Math.round((skor / total) * 100)

  type Tier = { emoji: string; title: string; sub: string; bg: string; ring: string; btnBg: string; confetti: string[]; particleAnim: string }

  const tier: Tier = pct === 100
    ? {
        emoji: "🏆",
        title: "SEMPURNA!",
        sub: "Luar biasa! Kamu menjawab semua soal dengan benar!",
        bg: "from-yellow-50 to-amber-50",
        ring: "#F59E0B",
        btnBg: "from-amber-500 to-yellow-500 shadow-amber-200",
        confetti: ["#F59E0B", "#FCD34D", "#FDE68A", "#FBBF24", "#fff"],
        particleAnim: "bounce",
      }
    : pct >= 80
    ? {
        emoji: "🎉",
        title: "Hebat!",
        sub: "Hasil yang sangat baik! Terus pertahankan prestasimu.",
        bg: "from-indigo-50 to-blue-50",
        ring: "#6366F1",
        btnBg: "from-indigo-600 to-blue-600 shadow-indigo-200",
        confetti: ["#6366F1", "#818CF8", "#A5B4FC", "#60A5FA", "#fff"],
        particleAnim: "float",
      }
    : pct >= 50
    ? {
        emoji: "💪",
        title: "Lumayan!",
        sub: "Nilaimu sudah cukup, tapi masih bisa lebih baik lagi.",
        bg: "from-orange-50 to-yellow-50",
        ring: "#F97316",
        btnBg: "from-orange-500 to-yellow-500 shadow-orange-200",
        confetti: ["#F97316", "#FB923C", "#FCD34D", "#FBBF24", "#fff"],
        particleAnim: "wiggle",
      }
    : {
        emoji: "📚",
        title: "Harus Belajar Lagi",
        sub: "Jangan menyerah! Pelajari materi lebih giat dan coba lagi.",
        bg: "from-red-50 to-rose-50",
        ring: "#EF4444",
        btnBg: "from-red-500 to-rose-500 shadow-red-200",
        confetti: ["#EF4444", "#F87171", "#FCA5A5", "#FDA4AF", "#fff"],
        particleAnim: "pulse",
      }

  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    color: tier.confetti[i % tier.confetti.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    duration: `${1.2 + Math.random() * 1.2}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
  }))

  const r = 54; const c = 2 * Math.PI * r

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.85) translateY(24px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes fall { 0% { opacity:1; transform:translateY(-20px) rotate(0deg); } 100% { opacity:0; transform:translateY(340px) rotate(720deg); } }
        @keyframes scoreCount { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
        @keyframes ringDraw { from { stroke-dashoffset: ${c}; } to { stroke-dashoffset: ${c * (1 - pct / 100)}; } }
        @keyframes emojiPop { 0%{transform:scale(0) rotate(-30deg);} 60%{transform:scale(1.3) rotate(10deg);} 100%{transform:scale(1) rotate(0deg);} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>

      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {particles.map((p) => (
        <div key={p.id} className="absolute top-0 pointer-events-none"
          style={{
            left: p.left, width: p.size, height: p.size,
            backgroundColor: p.color, borderRadius: "2px",
            animation: `fall ${p.duration} ${p.delay} ease-in both`,
            transform: `rotate(${p.rotate})`,
          }} />
      ))}

      <div
        className={`relative w-full max-w-sm bg-gradient-to-br ${tier.bg} rounded-3xl shadow-2xl border border-white overflow-hidden`}
        style={{ animation: "modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div className="h-1.5 w-full" style={{ background: tier.ring }} />

        <div className="p-7 flex flex-col items-center text-center gap-4">
          <div className="text-6xl" style={{ animation: "emojiPop 0.6s 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            {tier.emoji}
          </div>

          <div className="relative">
            <svg width="140" height="140">
              <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="10" />
              <circle cx="70" cy="70" r={r} fill="none"
                stroke={tier.ring} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - pct / 100)}
                transform="rotate(-90 70 70)"
                style={{ animation: `ringDraw 1.2s 0.3s cubic-bezier(0.4,0,0.2,1) both` }}
              />
              <text x="70" y="62" textAnchor="middle" fontSize="26" fontWeight="900" fill={tier.ring}
                style={{ animation: "scoreCount 0.5s 0.8s both" }}>
                {skor}
              </text>
              <text x="70" y="80" textAnchor="middle" fontSize="11" fontWeight="700" fill="#94A3B8">
                dari {total}
              </text>
              <text x="70" y="98" textAnchor="middle" fontSize="13" fontWeight="900" fill={tier.ring}>
                {pct}%
              </text>
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-1"
              style={{ animation: "shimmer 2s 1s ease-in-out infinite", color: tier.ring }}>
              {tier.title}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">{tier.sub}</p>
          </div>

          <div className="w-full grid grid-cols-3 gap-2">
            {[
              { label: "Benar", value: skor / 4, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { label: "Salah", value: Math.round(total / 4) - (skor / 4), color: "text-red-500", bg: "bg-red-50 border-red-100" },
              { label: "Skor", value: skor, color: "text-slate-700", bg: "bg-white border-slate-100" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border rounded-2xl py-2.5 px-1 text-center`}>
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          <button onClick={onClose}
            className={`w-full h-12 rounded-2xl bg-gradient-to-r ${tier.btnBg} text-white font-black text-sm shadow-lg transition hover:opacity-90 active:scale-[0.98]`}>
            Lihat Review →
          </button>
        </div>
      </div>
    </div>
  )
}

// ======================
// COLLAPSIBLE BOX
// ======================
function CollapsibleBox({
  label,
  colorScheme,
  children,
  defaultOpen = false,
}: {
  label: string
  colorScheme: "blue" | "amber" | "slate"
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const scheme = {
    blue:  { bg: "bg-blue-50",  border: "border-blue-100",  badge: "bg-blue-100 text-blue-500",  icon: "text-blue-400",  label: "text-blue-500"  },
    amber: { bg: "bg-amber-50", border: "border-amber-100", badge: "bg-amber-100 text-amber-600", icon: "text-amber-400", label: "text-amber-600" },
    slate: { bg: "bg-slate-50", border: "border-slate-100", badge: "bg-slate-100 text-slate-500", icon: "text-slate-400", label: "text-slate-500" },
  }[colorScheme]

  return (
    <>
      <div className={`md:hidden rounded-2xl border ${scheme.border} overflow-hidden`}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 ${scheme.bg} transition`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-widest ${scheme.label}`}>{label}</span>
            {!open && (
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${scheme.badge}`}>
                Tap untuk baca
              </span>
            )}
          </div>
          <svg
            width="14" height="14" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth="2.5"
            className={`transition-transform duration-200 shrink-0 ${scheme.icon} ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && (
          <div className={`px-3.5 pb-3.5 pt-2 ${scheme.bg}`}>
            {children}
          </div>
        )}
      </div>

      <div className={`hidden md:block ${scheme.bg} border ${scheme.border} rounded-2xl p-4`}>
        <p className={`text-[9px] font-black uppercase tracking-widest ${scheme.label} mb-2`}>{label}</p>
        {children}
      </div>
    </>
  )
}

// ======================
// OPTION BADGE
// ======================
function OptionBadge({ label, selected, answered }: { label: string; selected: boolean; answered: boolean }) {
  return (
    <div className={`
      w-8 h-8 min-w-[32px] rounded-lg flex items-center justify-center
      text-[13px] font-black transition-all duration-200 shrink-0
      ${selected
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
        : answered
        ? "bg-indigo-50 text-indigo-400 border border-indigo-200"
        : "bg-slate-100 text-slate-500 border border-slate-200"
      }
    `}>
      {label}
    </div>
  )
}

// ======================
// TIMER RING
// ======================
function TimerRing({ timeLeft, totalTime, urgent }: { timeLeft: number; totalTime: number; urgent: boolean }) {
  const r = 22
  const c = 2 * Math.PI * r
  const pct = Math.max(0, timeLeft / totalTime)
  const menit = Math.floor(timeLeft / 60)
  const detik = timeLeft % 60
  const timeStr = `${String(menit).padStart(2, "0")}:${String(detik).padStart(2, "0")}`

  return (
    <div className="flex flex-col items-center">
      <svg width="60" height="60">
        <circle cx="30" cy="30" r={r} fill="none" stroke={urgent ? "#FEE2E2" : "#EEF2FF"} strokeWidth="4" />
        <circle cx="30" cy="30" r={r} fill="none"
          stroke={urgent ? "#EF4444" : "#6366F1"}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 30 30)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="900"
          fill={urgent ? "#EF4444" : "#6366F1"}>
          {timeStr}
        </text>
      </svg>
      <p className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${urgent ? "text-red-400" : "text-indigo-300"}`}>
        Waktu
      </p>
    </div>
  )
}

// ======================
// MAIN PAGE
// ======================
export default function UjianPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const kategori = decodeURIComponent(params.kategori as string)
  const paket = searchParams.get("paket") || ""
  const packageId = searchParams.get("package_id") || null

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [tokenInput, setTokenInput] = useState("")
  const [soal, setSoal] = useState<Soal[]>([])
  const [jawabanUser, setJawabanUser] = useState<Record<number, string>>({})
  const [currentSoal, setCurrentSoal] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [storageKey, setStorageKey] = useState("")
  const [tokenKey, setTokenKey] = useState("")
  const [imgError, setImgError] = useState<Record<number, boolean>>({})
  const [showNav, setShowNav] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [hasilModal, setHasilModal] = useState<{ skor: number; total: number } | null>(null)

  const stateRef = useRef({ jawabanUser, currentSoal, timeLeft })
  useEffect(() => { stateRef.current = { jawabanUser, currentSoal, timeLeft } }, [jawabanUser, currentSoal, timeLeft])

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (!allowed || !storageKey || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1
        const { jawabanUser, currentSoal } = stateRef.current
        localStorage.setItem(storageKey, JSON.stringify({ answers: jawabanUser, currentSoal, timeLeft: newTime }))
        if (newTime <= 0) { clearInterval(interval); handleAutoSubmit(); return 0 }
        return newTime
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [allowed, storageKey, timeLeft])

  async function init() {
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) { router.push("/login"); return }
      const userId = user.id
      const key = `ujian_${kategori}_${packageId}_${userId}`
      const tokenStorage = `token_${kategori}_${packageId}_${userId}`
      setStorageKey(key)
      setTokenKey(tokenStorage)

      let tokenQuery = supabase.from("token_used").select("*").eq("user_id", userId).eq("kategori", kategori)
      if (packageId) tokenQuery = tokenQuery.eq("package_id", packageId)
      const { data: tokenUsed } = await tokenQuery.maybeSingle()
      if (tokenUsed) { alert("Kamu sudah mengerjakan ujian ini"); router.push("/dashboard"); return }

      const { data: jadwal } = await supabase.from("jadwal_ujian").select("*").eq("kategori", kategori).eq("status", true).single()
      if (!jadwal) { alert("Ujian belum dibuka"); router.push("/dashboard"); return }

      await getSoal(userId)

      const saved = localStorage.getItem(key)
      const dur = jadwal.durasi * 60
      if (saved) {
        const parsed: SavedState = JSON.parse(saved)
        setJawabanUser(parsed.answers || {})
        setCurrentSoal(parsed.currentSoal || 0)
        setTimeLeft(parsed.timeLeft || dur)
      } else {
        setTimeLeft(dur)
      }
      setTotalTime(dur)

      const savedToken = localStorage.getItem(tokenStorage)
      if (savedToken === "true") setAllowed(true)
      setLoading(false)
    } catch (err) {
      console.log(err); alert("Terjadi kesalahan"); setLoading(false)
    }
  }

  async function getSoal(userId: string) {
    const soalKey = `soal_${kategori}_${packageId}_${userId}_${CACHE_VERSION}`
    const oldKeys = [
      `soal_${kategori}_${packageId}_${userId}`,
      `soal_${kategori}_${packageId}_${userId}_v1`,
      `soal_${kategori}_${packageId}_${userId}_v2`,
      `soal_${kategori}_${packageId}_${userId}_v3`,
    ]
    oldKeys.forEach((k) => { if (localStorage.getItem(k)) localStorage.removeItem(k) })

    const saved = localStorage.getItem(soalKey)
    if (saved) { setSoal(JSON.parse(saved)); return }

    const normalizedPaket = paket.replace(/^paket\s*/i, "").toLowerCase().trim()
    let query = supabase.from("soal").select("*").eq("kategori", kategori)
    if (normalizedPaket) query = query.ilike("paket", normalizedPaket)
    const { data, error } = await query

    if (error || !data || data.length === 0) { alert(`Soal tidak ditemukan`); return }

    const soalDenganGambar = data.filter((s) => s.gambar && s.gambar.trim() !== "")
    const soalTanpaGambar = data.filter((s) => !s.gambar || s.gambar.trim() === "")
    const shuffledDG = [...soalDenganGambar].sort(() => Math.random() - 0.5)
    const shuffledTG = [...soalTanpaGambar].sort(() => Math.random() - 0.5)
    const selected = [...shuffledDG, ...shuffledTG].slice(0, 25).sort(() => Math.random() - 0.5)

    localStorage.setItem(soalKey, JSON.stringify(selected))
    setSoal(selected as Soal[])
  }

  function pilihJawaban(id: number, jawaban: string) {
    const updated = { ...jawabanUser, [id]: jawaban }
    setJawabanUser(updated)
    localStorage.setItem(storageKey, JSON.stringify({ answers: updated, currentSoal, timeLeft }))
  }

  function goToSoal(index: number) {
    setCurrentSoal(index)
    setAnimKey((k) => k + 1)
    setShowNav(false)
  }

  async function verifyToken() {
    const { data } = await supabase.from("jadwal_ujian").select("*").eq("kategori", kategori).eq("token", tokenInput).eq("status", true).single()
    if (!data) { alert("Token salah"); return }
    localStorage.setItem(tokenKey, "true")
    setAllowed(true)
  }

  async function handleAutoSubmit() {
    if (submitting) return
    await submitUjian(true)
  }

  async function submitUjian(autoSubmit = false) {
    try {
      if (submitting) return
      setSubmitting(true)
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) { alert("User tidak ditemukan"); return }

      let usedQuery = supabase.from("token_used").select("*").eq("user_id", userId).eq("kategori", kategori)
      if (packageId) usedQuery = usedQuery.eq("package_id", packageId)
      const { data: used } = await usedQuery.maybeSingle()
      if (used) { alert("Ujian sudah pernah dikirim"); router.push("/dashboard"); return }

      let total = 0

      // ✅ FIX: simpan soal lengkap termasuk pengantar + bacaan
      const detail = soal.map((item) => {
        const jawaban = jawabanUser[item.id]
        const benar = jawaban === item.jawaban_benar
        if (benar) total += 4

        const soalLengkap = [
          item.pengantar ? `<div class="pengantar">${item.pengantar}</div>` : "",
          item.bacaan    ? `<div class="bacaan">${item.bacaan}</div>`       : "",
          item.pertanyaan,
        ].filter(Boolean).join("")

        return {
          soal: soalLengkap,
          jawaban_user: jawaban || "-",
          jawaban_benar: item.jawaban_benar,
          benar,
        }
      })

      const { error: hasilError } = await supabase.from("hasil").insert([{
        skor: total, kategori, tanggal: new Date().toISOString(),
        user_id: userId, detail, paket: paket || null, package_id: packageId || null,
      }])
      if (hasilError) { alert("Gagal simpan hasil"); return }

      await supabase.from("token_used").insert([{ user_id: userId, kategori, package_id: packageId || null }])

      if (packageId) {
        const { data: rankingData } = await supabase.from("ranking_tka").select("*").eq("user_id", userId).eq("package_id", packageId).maybeSingle()
        if (!rankingData) {
          await supabase.from("ranking_tka").insert([{ user_id: userId, package_id: packageId, total_skor: total, jumlah_ujian: 1, selesai: 1 >= 4 }])
        } else {
          const newJumlah = (rankingData.jumlah_ujian || 0) + 1
          await supabase.from("ranking_tka").update({ total_skor: (rankingData.total_skor || 0) + total, jumlah_ujian: newJumlah, selesai: newJumlah >= 4 }).eq("id", rankingData.id)
        }
      }

      localStorage.removeItem(storageKey)
      localStorage.removeItem(tokenKey)
      localStorage.removeItem(`soal_${kategori}_${packageId}_${userId}_${CACHE_VERSION}`)

      setHasilModal({ skor: total, total: soal.length * 4 })
    } catch (err) {
      console.log(err); alert("Gagal submit")
    } finally {
      setSubmitting(false)
    }
  }

  // ======================
  // LOADING
  // ======================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-2xl bg-indigo-100 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
          </div>
        </div>
        <p className="text-indigo-400 text-sm font-semibold tracking-widest uppercase">Memuat Soal...</p>
      </div>
    )
  }

  // ======================
  // TOKEN PAGE
  // ======================
  if (!allowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] bg-indigo-100 rounded-full opacity-50 blur-3xl" />
          <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] bg-blue-100 rounded-full opacity-40 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100 border border-indigo-50 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600" />

            <div className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mx-auto mb-5">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="3" stroke="#6366F1" strokeWidth="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1.5" fill="#6366F1" />
                </svg>
              </div>

              <h1 className="text-2xl font-black text-slate-900 text-center mb-1">Token Ujian</h1>
              <p className="text-slate-400 text-sm text-center mb-1 font-medium">{kategori}</p>
              {paket && (
                <div className="flex justify-center mb-6">
                  <span className="inline-block bg-indigo-50 text-indigo-600 text-[11px] font-bold px-3 py-1 rounded-full border border-indigo-100">
                    {paket}
                  </span>
                </div>
              )}
              {!paket && <div className="mb-6" />}

              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Masukkan Token
              </label>
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyToken()}
                placeholder="Token dari pengawas"
                className="w-full h-12 border-2 border-slate-200 focus:border-indigo-400 rounded-2xl px-4 mb-4 outline-none text-slate-800 text-sm font-semibold placeholder:text-slate-300 transition-colors bg-slate-50 focus:bg-white"
              />
              <button
                onClick={verifyToken}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200 active:scale-[0.98] transition-all"
              >
                Mulai Ujian →
              </button>

              <p className="text-center text-xs text-slate-400 mt-4">
                Hubungi pengawas jika belum mendapat token
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ======================
  // EMPTY
  // ======================
  if (!soal.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-2">
        <div className="text-4xl">📭</div>
        <p className="font-bold">Tidak ada soal ditemukan</p>
      </div>
    )
  }

  const soalAktif = soal[currentSoal]
  const progress = ((currentSoal + 1) / soal.length) * 100
  const timerUrgent = timeLeft <= 300
  const totalAnswered = Object.keys(jawabanUser).length

  const opsiList = [
    { key: "a", value: soalAktif.opsi_a },
    { key: "b", value: soalAktif.opsi_b },
    { key: "c", value: soalAktif.opsi_c },
    { key: "d", value: soalAktif.opsi_d },
    ...(soalAktif.opsi_e ? [{ key: "e", value: soalAktif.opsi_e }] : []),
  ]

  const opsiLabels: Record<string, string> = { a: "A", b: "B", c: "C", d: "D", e: "E" }
  const currentAnswered = !!jawabanUser[soalAktif.id]

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-28 md:pb-0">

        {hasilModal && (
          <HasilModal
            skor={hasilModal.skor}
            total={hasilModal.total}
            onClose={() => { setHasilModal(null); router.replace("/review") }}
          />
        )}

        {/* HEADER */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm shadow-slate-100">
          <div className="max-w-5xl mx-auto px-3 md:px-8">
            <div className="flex items-center gap-3 py-3 md:py-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button onClick={() => router.back()}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition shrink-0 md:flex hidden">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <p className="text-[9px] md:text-[10px] font-black tracking-[3px] text-indigo-400 uppercase leading-none">Lampung Cerdas</p>
                  <h1 className="text-sm md:text-base font-black text-slate-900 truncate leading-tight">{kategori}</h1>
                </div>
              </div>

              <div className="hidden md:flex flex-1 max-w-xs flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Soal {currentSoal + 1} dari {soal.length}</span>
                  <span>{totalAnswered} dijawab</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowNav(true)}
                  className="md:hidden flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold transition hover:bg-slate-200">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  {currentSoal + 1}/{soal.length}
                </button>

                <TimerRing timeLeft={timeLeft} totalTime={totalTime || 5400} urgent={timerUrgent} />

                <button onClick={() => submitUjian()} disabled={submitting}
                  className="hidden md:flex items-center gap-2 h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md shadow-indigo-200 transition disabled:opacity-50">
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</>
                  ) : "Kumpulkan"}
                </button>
              </div>
            </div>

            <div className="md:hidden pb-3 -mt-1">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <div className="max-w-5xl mx-auto px-3 md:px-8 py-4 md:py-6 md:grid md:grid-cols-[1fr_280px] md:gap-6 md:items-start">

          <div key={animKey} style={{ animation: "fadeSlideIn 0.25s ease" }}>
            <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm shadow-slate-100 overflow-hidden">

              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-50">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-indigo-100 shrink-0">
                  {currentSoal + 1}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soal</p>
                  <p className="text-xs font-bold text-slate-600">{soalAktif.kategori}</p>
                </div>
                {currentAnswered && (
                  <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-bold px-3 py-1.5 rounded-full border border-emerald-100">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Terjawab
                  </div>
                )}
              </div>

              <div className="px-5 py-4 space-y-4">
                {hasContent(soalAktif.pengantar) && (
                  <CollapsibleBox label="Pengantar" colorScheme="blue">
                    <MathRenderer text={soalAktif.pengantar!}
                      className="text-[13px] md:text-[15px] leading-[1.9] text-slate-700" />
                  </CollapsibleBox>
                )}

                {hasContent(soalAktif.bacaan) && (
                  <CollapsibleBox label="Bacaan" colorScheme="amber">
                    <MathRenderer text={soalAktif.bacaan!}
                      className="text-[13px] md:text-[15px] leading-[1.9] text-slate-700" />
                  </CollapsibleBox>
                )}

                {soalAktif.gambar && soalAktif.gambar.trim() !== "" && !imgError[soalAktif.id] && (
                  <CollapsibleBox label="Gambar Soal" colorScheme="slate">
                    <div className="flex justify-center">
                      <div className="rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm">
                        <Image
                          src={soalAktif.gambar} alt="Gambar soal"
                          width={700} height={500}
                          className="object-contain w-auto h-auto max-h-[220px] md:max-h-[380px]"
                          onError={() => setImgError((prev) => ({ ...prev, [soalAktif.id]: true }))}
                        />
                      </div>
                    </div>
                  </CollapsibleBox>
                )}
                {soalAktif.gambar && soalAktif.gambar.trim() !== "" && imgError[soalAktif.id] && (
                  <div className="flex justify-center">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-sm text-slate-400 text-center">
                      ⚠️ Gambar tidak dapat dimuat
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl px-4 py-4 border border-slate-100">
                  <MathRenderer text={soalAktif.pertanyaan}
                    className="text-[15px] md:text-[16px] leading-[2] text-slate-800 font-semibold" />
                </div>
              </div>

              <div className="px-5 pb-5 space-y-2.5">
                {opsiList.map((opsi, i) => {
                  const selected = jawabanUser[soalAktif.id] === opsi.key
                  return (
                    <button
                      key={opsi.key}
                      onClick={() => pilihJawaban(soalAktif.id, opsi.key)}
                      style={{ animationDelay: `${i * 40}ms`, animation: "fadeSlideIn 0.3s ease both" }}
                      className={`
                        w-full rounded-2xl border-2 p-3.5 flex gap-3 text-left transition-all duration-200
                        ${selected
                          ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200"
                          : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 active:scale-[0.99]"
                        }
                      `}
                    >
                      <OptionBadge label={opsiLabels[opsi.key]} selected={selected} answered={currentAnswered} />
                      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
  <MathRenderer
    key={`${opsi.key}-${selected}`} 
    text={opsi.value}
    className={`text-[14px] md:text-[15px] leading-[1.8] font-medium ${selected ? "text-white" : "text-slate-700"}`}
  />
</div>
                    </button>
                  )
                })}
              </div>

              <div className="hidden md:flex gap-2 px-5 pb-5 border-t border-slate-50 pt-4">
                <button
                  onClick={() => goToSoal(Math.max(currentSoal - 1, 0))}
                  disabled={currentSoal === 0}
                  className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm disabled:opacity-30 transition flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Sebelumnya
                </button>
                <button
                  onClick={() => goToSoal(Math.min(currentSoal + 1, soal.length - 1))}
                  disabled={currentSoal === soal.length - 1}
                  className="flex-1 h-11 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm disabled:opacity-30 transition flex items-center justify-center gap-2"
                >
                  Selanjutnya
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Navigator (desktop) */}
          <div className="hidden md:block sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Dijawab", value: totalAnswered, color: "text-emerald-600 bg-emerald-50", border: "border-emerald-100" },
                  { label: "Belum", value: soal.length - totalAnswered, color: "text-slate-500 bg-slate-50", border: "border-slate-100" },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} ${s.border} border rounded-xl p-3 text-center`}>
                    <p className="text-xl font-black">{s.value}</p>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                  <span>Progress</span>
                  <span>{Math.round((totalAnswered / soal.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(totalAnswered / soal.length) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Navigasi Soal</p>
              <div className="flex flex-wrap gap-1.5">
                {soal.map((s, index) => {
                  const answered = !!jawabanUser[s.id]
                  const isCurrent = index === currentSoal
                  const hasImg = !!(s.gambar && s.gambar.trim() !== "")
                  return (
                    <button
                      key={s.id}
                      onClick={() => goToSoal(index)}
                      className={`
                        w-9 h-9 rounded-xl text-[11px] font-black transition-all duration-150 relative
                        ${isCurrent
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-110"
                          : answered
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }
                      `}
                    >
                      {index + 1}
                      {hasImg && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full border border-white" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex flex-col gap-1.5 text-[10px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-600 inline-block" />Sedang dikerjakan</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Sudah dijawab</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />Belum dijawab</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Ada gambar</span>
              </div>
            </div>

            <button onClick={() => submitUjian()} disabled={submitting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:shadow-xl hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</>
                : <>Kumpulkan Ujian <span className="text-indigo-200">→</span></>}
            </button>
          </div>
        </div>

        {/* BOTTOM NAV (mobile) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 px-3 py-3 shadow-2xl shadow-slate-200">
            <div className="flex gap-2">
              <button
                onClick={() => goToSoal(Math.max(currentSoal - 1, 0))}
                disabled={currentSoal === 0}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 font-bold disabled:opacity-30 transition flex items-center justify-center shrink-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => submitUjian()}
                disabled={submitting}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-sm shadow-md shadow-indigo-200 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</>
                  : "Kumpulkan Ujian"}
              </button>
              <button
                onClick={() => goToSoal(Math.min(currentSoal + 1, soal.length - 1))}
                disabled={currentSoal === soal.length - 1}
                className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 font-bold disabled:opacity-30 transition flex items-center justify-center shrink-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* NAV DRAWER (mobile) */}
        {showNav && (
          <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowNav(false)}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ animation: "slideUp 0.25s ease" }}
            >
              <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Total", value: soal.length, color: "text-slate-700" },
                  { label: "Dijawab", value: totalAnswered, color: "text-emerald-600" },
                  { label: "Belum", value: soal.length - totalAnswered, color: "text-orange-500" },
                ].map((s) => (
                  <div key={s.label} className="text-center bg-slate-50 rounded-xl py-2 border border-slate-100">
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pilih Soal</p>
              <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto">
                {soal.map((s, index) => {
                  const answered = !!jawabanUser[s.id]
                  const isCurrent = index === currentSoal
                  const hasImg = !!(s.gambar && s.gambar.trim() !== "")
                  return (
                    <button
                      key={s.id}
                      onClick={() => goToSoal(index)}
                      className={`
                        w-11 h-11 rounded-xl text-xs font-black transition-all relative
                        ${isCurrent
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                          : answered
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-600"
                        }
                      `}
                    >
                      {index + 1}
                      {hasImg && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </MathJaxContext>
  )
}
"use client"

import {
  useEffect,
  useState,
  memo,
  useMemo,
  useRef,
} from "react"

import { supabase } from "../../../lib/supabase"

import {
  useRouter,
  useParams,
} from "next/navigation"

import {
  MathJax,
  MathJaxContext,
} from "better-react-mathjax"

type Soal = {
  id: number
  pertanyaan: string
  opsi_a: string
  opsi_b: string
  opsi_c: string
  opsi_d: string
  opsi_e?: string
  jawaban_benar: string
  kategori: string
  pembahasan?: string
  video_url?: string
  pengantar?: string
  bacaan?: string
  gambar?: string
}

// ======================
// MATHJAX CONFIG
// ======================
const mathJaxConfig = {
  loader: {
    load: ["input/tex", "output/chtml"],
  },
  tex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
    processEscapes: true,
    packages: { "[+]": ["ams"] },
  },
  options: {
    enableMenu: false,
    renderActions: { addMenu: [] },
  },
  chtml: {
    scale: 1,
    minScale: 0.5,
    matchFontHeight: false,
    mtextInheritFont: true,
  },
}

// ======================
// FORMAT SOAL
// ======================
function formatSoal(text: string): string {
  if (!text) return ""

  return text
    .replace(/\(1\)/g, "<br/><br/>(1)")
    .replace(/\(2\)/g, "<br/>(2)")
    .replace(/\(3\)/g, "<br/>(3)")
    .replace(/\(4\)/g, "<br/>(4)")
    .replace(/\(5\)/g, "<br/>(5)")
    .replace(/\n/g, "<br/>")
}

// ======================
// MATH RENDERER
// ======================
const MathRenderer = memo(
  ({
    text,
    className = "",
  }: {
    text: string
    className?: string
  }) => {
    const html = useMemo(() => formatSoal(text), [text])

    return (
      <div
        className={`overflow-x-auto break-words whitespace-normal ${className}`}
      >
        <MathJax
          key={text}
          dynamic
          renderMode="post"
        >
          <span dangerouslySetInnerHTML={{ __html: html }} />
        </MathJax>
      </div>
    )
  }
)

MathRenderer.displayName = "MathRenderer"

// ======================
// OPTION BADGE
// ======================
function OptionBadge({
  label,
  selected,
}: {
  label: string
  selected: boolean
}) {
  return (
    <span
      className={`
        flex items-center justify-center
        w-7 h-7 min-w-[28px]
        rounded-lg text-[10px]
        font-black transition-all
        ${selected
          ? "bg-white text-blue-700"
          : "bg-slate-100 text-slate-600"
        }
      `}
    >
      {label}
    </span>
  )
}

// ======================
// MAIN COMPONENT
// ======================
export default function Ujian() {
  const router = useRouter()
  const params = useParams()
  const kategori = decodeURIComponent(params.kategori as string)

  const [soal, setSoal] = useState<Soal[]>([])
  const [jawabanUser, setJawabanUser] = useState<Record<number, string>>({})
  const [currentSoal, setCurrentSoal] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [tokenInput, setTokenInput] = useState("")
  const [storageKey, setStorageKey] = useState("")
  const [tokenKey, setTokenKey] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const stateRef = useRef({ jawabanUser, currentSoal, timeLeft })

  useEffect(() => {
    stateRef.current = { jawabanUser, currentSoal, timeLeft }
  }, [jawabanUser, currentSoal, timeLeft])

  useEffect(() => {
    init()
  }, [])

  // ======================
  // TIMER
  // ======================
  useEffect(() => {
    if (!allowed || !storageKey || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1

        const { jawabanUser: j, currentSoal: c } = stateRef.current

        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...j,
            currentSoal: c,
            timeLeft: newTime,
          })
        )

        if (newTime <= 0) {
          clearInterval(interval)
          handleAutoSubmit()
          return 0
        }

        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [allowed, storageKey])

  // ======================
  // INIT
  // ======================
  async function init() {
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      router.push("/login")
      return
    }

    const userId = data.user.id

    const key = `ujian_${kategori}_${userId}`
    const tokenStorage = `token_valid_${kategori}_${userId}`

    setStorageKey(key)
    setTokenKey(tokenStorage)

    const { data: jadwal } = await supabase
      .from("jadwal_ujian")
      .select("*")
      .eq("kategori", kategori)
      .eq("status", true)
      .single()

    if (!jadwal) {
      alert("Ujian belum dibuka admin")
      router.push("/dashboard")
      return
    }

    const { data: used } = await supabase
      .from("token_used")
      .select("*")
      .eq("user_id", userId)
      .eq("kategori", kategori)
      .single()

    if (used) {
      alert("Kamu sudah pernah mengikuti ujian ini")
      router.push("/dashboard")
      return
    }

    await getSoal()

    const saved = localStorage.getItem(key)

    if (saved) {
      const parsed = JSON.parse(saved)

      setJawabanUser(parsed)
      setCurrentSoal(parsed.currentSoal || 0)
      setTimeLeft(parsed.timeLeft || jadwal.durasi * 60)
    } else {
      setTimeLeft(jadwal.durasi * 60)
    }

    const savedToken = localStorage.getItem(tokenStorage)

    if (savedToken === "true") setAllowed(true)

    setLoading(false)
  }

  // ======================
  // GET SOAL
  // ======================
  async function getSoal() {
    const { data: userData } = await supabase.auth.getUser()

    const userId = userData.user?.id
    const soalKey = `soal_${kategori}_${userId}`

    const savedSoal = localStorage.getItem(soalKey)

    if (savedSoal) {
      setSoal(JSON.parse(savedSoal))
      return
    }

    const { data, error } = await supabase
      .from("soal")
      .select("*")
      .eq("kategori", kategori)

    if (error) {
      console.error(error)
      return
    }

    const shuffled = (data || []).sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 25)

    localStorage.setItem(soalKey, JSON.stringify(selected))
    setSoal(selected as Soal[])
  }

  // ======================
  // PILIH JAWABAN
  // ======================
  function pilihJawaban(id: number, jawaban: string) {
    const updated = {
      ...jawabanUser,
      [id]: jawaban,
      currentSoal,
      timeLeft,
    }

    setJawabanUser(updated)

    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  // ======================
  // TIMER FORMAT
  // ======================
  function formatWaktu() {
    const menit = Math.floor(timeLeft / 60)
    const detik = timeLeft % 60

    return `${String(menit).padStart(2, "0")}:${String(
      detik
    ).padStart(2, "0")}`
  }

  // ======================
  // AUTO SUBMIT
  // ======================
  async function handleAutoSubmit() {
    if (submitting) return

    alert("Waktu habis!")

    await submitUjian()
  }

  // ======================
  // SUBMIT
  // ======================
  async function submitUjian() {
    if (submitting) return

    setSubmitting(true)

    let total = 0

    const detail = soal.map((item) => {
      const jawaban = jawabanUser[item.id]
      const benar = jawaban === item.jawaban_benar

      if (benar) total++

      return {
        soal: item.pertanyaan,
        jawaban_user: jawaban,
        jawaban_benar: item.jawaban_benar,
        benar,
      }
    })

    const { data } = await supabase.auth.getUser()

    const userId = data.user?.id

    await supabase.from("hasil").insert([
      {
        skor: total,
        kategori,
        tanggal: new Date(),
        user_id: userId,
        detail,
      },
    ])

    await supabase
      .from("token_used")
      .insert([{ user_id: userId, kategori }])

    localStorage.removeItem(storageKey)
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(`soal_${kategori}_${userId}`)

    alert("Ujian selesai!")

    router.push("/review")
  }

  // ======================
  // VERIFY TOKEN
  // ======================
  async function verifyToken() {
    const { data } = await supabase
      .from("jadwal_ujian")
      .select("*")
      .eq("kategori", kategori)
      .eq("token", tokenInput)
      .eq("status", true)
      .single()

    if (!data) {
      alert("Token salah")
      return
    }

    localStorage.setItem(tokenKey, "true")
    setAllowed(true)
  }

  // ======================
  // LOADING
  // ======================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  // ======================
  // TOKEN
  // ======================
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
          <h1 className="text-2xl font-black text-center mb-2">
            Token Ujian
          </h1>

          <p className="text-center text-slate-500 mb-5 text-sm">
            {kategori}
          </p>

          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Masukkan token"
            className="w-full h-12 border rounded-2xl px-4 mb-3 outline-none"
          />

          <button
            onClick={verifyToken}
            className="w-full h-12 rounded-2xl bg-blue-700 text-white font-bold"
          >
            Mulai Ujian
          </button>
        </div>
      </div>
    )
  }

  if (!soal.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Tidak ada soal
      </div>
    )
  }

  const soalAktif = soal[currentSoal]

  const progress = ((currentSoal + 1) / soal.length) * 100

  const opsiList = [
    { key: "a", value: soalAktif.opsi_a },
    { key: "b", value: soalAktif.opsi_b },
    { key: "c", value: soalAktif.opsi_c },
    { key: "d", value: soalAktif.opsi_d },
    ...(soalAktif.opsi_e
      ? [{ key: "e", value: soalAktif.opsi_e }]
      : []),
  ]

  const answeredCount = Object.keys(jawabanUser).filter(
    (k) => !["currentSoal", "timeLeft"].includes(k)
  ).length

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-slate-100 pb-24">

        {/* =========================
            MOBILE HEADER COMPACT
        ========================= */}
        <div className="sticky top-0 z-50 bg-blue-700 shadow-lg">

          <div className="px-3 pt-2 pb-2">

            {/* TOP */}
            <div className="flex items-center justify-between gap-2">

              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-blue-200">
                  Ujian
                </p>

                <h1 className="text-sm font-black text-white truncate">
                  {kategori}
                </h1>
              </div>

              <div className="flex items-center gap-2">

                <div className="bg-white/15 rounded-xl px-2 py-1">
                  <p className="text-[9px] text-blue-200">
                    Soal
                  </p>

                  <p className="text-xs font-black text-white">
                    {currentSoal + 1}/{soal.length}
                  </p>
                </div>

                <div className="bg-white rounded-xl px-3 py-1">
                  <p className="text-[9px] text-slate-500">
                    Timer
                  </p>

                  <p className="text-sm font-black text-blue-700 tabular-nums">
                    {formatWaktu()}
                  </p>
                </div>

              </div>

            </div>

            {/* PROGRESS */}
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

          </div>

          {/* MOBILE NAV */}
          <div className="overflow-x-auto border-t border-white/10">
            <div className="flex gap-1 px-2 py-2 w-max">

              {soal.map((item, index) => {

                const active = currentSoal === index
                const answered = jawabanUser[item.id]

                return (
                  <button
                    key={index}
                    onClick={() => setCurrentSoal(index)}
                    className={`
                      min-w-[34px] h-8 rounded-lg
                      text-[10px] font-black
                      transition-all
                      ${active
                        ? "bg-white text-blue-700"
                        : answered
                        ? "bg-emerald-500 text-white"
                        : "bg-white/15 text-white"
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                )
              })}

            </div>
          </div>

        </div>

        {/* =========================
            MAIN CONTENT
        ========================= */}
        <div className="max-w-3xl mx-auto px-2 py-2">

          {/* QUESTION CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {/* QUESTION */}
            <div className="p-3 md:p-5">

              {soalAktif.gambar && (
                <div className="mb-3 flex justify-center">
                  <img
                    src={soalAktif.gambar}
                    alt="gambar"
                    className="rounded-xl max-h-[220px] object-contain border"
                  />
                </div>
              )}

              <div className="bg-slate-50 border rounded-2xl p-3 md:p-5">

                <MathRenderer
                  text={soalAktif.pertanyaan}
                  className="
                    text-[14px]
                    md:text-[16px]
                    leading-[1.8]
                    text-slate-800
                    font-medium
                  "
                />

              </div>

            </div>

            {/* OPTIONS */}
            <div className="px-3 pb-4 space-y-2.5">

              {opsiList.map((opsi) => {

                const selected =
                  jawabanUser[soalAktif.id] === opsi.key

                return (
                  <button
                    key={opsi.key}
                    onClick={() =>
                      pilihJawaban(
                        soalAktif.id,
                        opsi.key
                      )
                    }
                    className={`
                      w-full text-left
                      rounded-2xl border
                      p-3 flex gap-3 items-start
                      transition-all
                      ${selected
                        ? "bg-blue-700 border-blue-700"
                        : "bg-white border-slate-200"
                      }
                    `}
                  >

                    <OptionBadge
                      label={opsi.key.toUpperCase()}
                      selected={selected}
                    />

                    <div className="flex-1 min-w-0">

                      <MathRenderer
                        text={opsi.value}
                        className={`
                          text-[13px]
                          md:text-[14px]
                          leading-[1.7]
                          ${selected
                            ? "text-white"
                            : "text-slate-700"
                          }
                        `}
                      />

                    </div>

                  </button>
                )
              })}

            </div>

          </div>

          {/* ANSWERED INFO */}
          <div className="mt-3 bg-white rounded-2xl border border-slate-200 p-3">

            <div className="flex items-center justify-between mb-2">

              <p className="text-xs text-slate-500">
                Progress Jawaban
              </p>

              <p className="text-xs font-bold text-slate-700">
                {answeredCount}/{soal.length}
              </p>

            </div>

            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${
                    (answeredCount / soal.length) * 100
                  }%`,
                }}
              />
            </div>

          </div>

        </div>

        {/* =========================
            BOTTOM NAV
        ========================= */}
        <div className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-slate-200">

          <div className="max-w-3xl mx-auto p-2 flex gap-2">

            <button
              onClick={() =>
                setCurrentSoal((p) =>
                  Math.max(p - 1, 0)
                )
              }
              disabled={currentSoal === 0}
              className="
                flex-1 h-11 rounded-xl
                bg-slate-800 text-white
                text-sm font-bold
                disabled:opacity-40
              "
            >
              Prev
            </button>

            <button
              onClick={submitUjian}
              disabled={submitting}
              className="
                flex-1 h-11 rounded-xl
                bg-blue-700 text-white
                text-sm font-black
                disabled:opacity-50
              "
            >
              {submitting ? "Mengirim..." : "Submit"}
            </button>

            <button
              onClick={() =>
                setCurrentSoal((p) =>
                  Math.min(
                    p + 1,
                    soal.length - 1
                  )
                )
              }
              disabled={
                currentSoal === soal.length - 1
              }
              className="
                flex-1 h-11 rounded-xl
                bg-emerald-600 text-white
                text-sm font-bold
                disabled:opacity-40
              "
            >
              Next
            </button>

          </div>

        </div>

      </div>
    </MathJaxContext>
  )
}
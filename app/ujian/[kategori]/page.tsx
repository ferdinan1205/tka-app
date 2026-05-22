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
// TYPES
// ======================

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
    processEnvironments: true,
  },

  chtml: {
    scale: 1,
    minScale: 0.5,
    matchFontHeight: false,
    adaptiveCSS: false,
  },

  options: {
    enableMenu: false,

    skipHtmlTags: [
      "script",
      "noscript",
      "style",
      "textarea",
      "pre",
      "code",
    ],

    renderActions: {
      addMenu: [],
    },
  },

  startup: {
    typeset: false,
  },
}

// ======================
// DETECT MATH
// ======================

function hasMath(text: string = "") {
  return (
    text.includes("$") ||
    text.includes("\\(") ||
    text.includes("\\[") ||
    text.includes("\\frac") ||
    text.includes("\\sqrt") ||
    text.includes("\\times") ||
    text.includes("\\ce{") ||
    text.includes("\\text{") ||
    text.includes("^{") ||
    text.includes("_{") ||
    /\^\d/.test(text) ||
    /\_\d/.test(text)
  )
}

// ======================
// CLEAN HTML
// ======================

function cleanHtml(html: string = "") {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<p><br\s*\/?><\/p>/gi, "<br/>")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "<br/>")
    .replace(/<span[^>]*><\/span>/gi, "")
    .trim()
    .replace(/(<br\s*\/?>\s*)+$/gi, "")
}

// ======================
// NORMALIZE CONTENT
// ======================

function normalizeContent(content: string = "") {

  if (!content) return ""

  if (/<[a-z][\s\S]*>/i.test(content)) {
    return cleanHtml(content)
  }

  return content
    .split("\n")
    .map((line) => line.trim())
    .join("<br/>")
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

    const normalized = useMemo(
      () => normalizeContent(text),
      [text]
    )

    if (!hasMath(normalized)) {
      return (
        <div
          className={`
            overflow-x-auto
            break-words
            whitespace-normal
            w-full
            ${className}
          `}
        >
          <div
            className="
              text-wrap
              break-words
              leading-loose
              [&_*]:max-w-full
              [&_img]:max-w-full
            "
            dangerouslySetInnerHTML={{
              __html: normalized,
            }}
          />
        </div>
      )
    }

    return (
      <div
        className={`
          overflow-x-auto
          break-words
          whitespace-normal
          w-full
          ${className}
        `}
      >
        <MathJax hideUntilTypeset="first">
          <div
            className="
              text-wrap
              break-words
              leading-loose
              [&_*]:max-w-full
              [&_img]:max-w-full
            "
            dangerouslySetInnerHTML={{
              __html: normalized,
            }}
          />
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
    <div
      className={`
        w-9
        h-9
        min-w-[36px]
        rounded-xl
        flex
        items-center
        justify-center
        text-sm
        font-black
        transition-all
        ${
          selected
            ? "bg-white text-blue-700"
            : "bg-slate-100 text-slate-700"
        }
      `}
    >
      {label}
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

  const kategori =
    decodeURIComponent(
      params.kategori as string
    )

  const paket =
    searchParams.get("paket") || ""

  const packageId =
    searchParams.get("package_id") || null

  // ======================
  // STATES
  // ======================

  const [loading, setLoading] =
    useState(true)

  const [allowed, setAllowed] =
    useState(false)

  const [tokenInput, setTokenInput] =
    useState("")

  const [soal, setSoal] =
    useState<Soal[]>([])

  const [jawabanUser, setJawabanUser] =
    useState<Record<number, string>>({})

  const [currentSoal, setCurrentSoal] =
    useState(0)

  const [timeLeft, setTimeLeft] =
    useState(0)

  const [submitting, setSubmitting] =
    useState(false)

  const [storageKey, setStorageKey] =
    useState("")

  const [tokenKey, setTokenKey] =
    useState("")

  // ======================
  // REF
  // ======================

  const stateRef = useRef({
    jawabanUser,
    currentSoal,
    timeLeft,
  })

  useEffect(() => {

    stateRef.current = {
      jawabanUser,
      currentSoal,
      timeLeft,
    }

  }, [
    jawabanUser,
    currentSoal,
    timeLeft,
  ])

  // ======================
  // INIT
  // ======================

  useEffect(() => {
    init()
  }, [])

  // ======================
  // TIMER
  // ======================

  useEffect(() => {

    if (
      !allowed ||
      !storageKey ||
      timeLeft <= 0
    ) return

    const interval =
      setInterval(() => {

      setTimeLeft((prev) => {

        const newTime = prev - 1

        const {
          jawabanUser,
          currentSoal,
        } = stateRef.current

        localStorage.setItem(
          storageKey,
          JSON.stringify({
            answers: jawabanUser,
            currentSoal,
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

  }, [
    allowed,
    storageKey,
    timeLeft,
  ])

  // ======================
  // INIT APP
  // ======================

  async function init() {

    try {

      const { data } =
        await supabase.auth.getUser()

      const user = data.user

      if (!user) {

        router.push("/login")

        return
      }

      const userId = user.id

      // ======================
      // IMPORTANT FIX
      // PACKAGE ID MASUK KEY
      // BIAR IPA DAN IPS
      // TIDAK NYAMBUNG
      // ======================

      const key =
        `ujian_${kategori}_${packageId}_${userId}`

      const tokenStorage =
        `token_${kategori}_${packageId}_${userId}`

      setStorageKey(key)

      setTokenKey(tokenStorage)

      // ======================
      // CHECK TOKEN USED
      // ======================

      let tokenQuery = supabase
        .from("token_used")
        .select("*")
        .eq("user_id", userId)
        .eq("kategori", kategori)

      // PACKAGE SPECIFIC
      if (packageId) {
        tokenQuery =
          tokenQuery.eq(
            "package_id",
            packageId
          )
      }

      const {
        data: tokenUsed,
      } = await tokenQuery.maybeSingle()

      if (tokenUsed) {

        alert(
          "Kamu sudah mengerjakan ujian ini pada paket ini"
        )

        router.push("/dashboard")

        return
      }

      // ======================
      // CEK JADWAL
      // ======================

      const {
        data: jadwal,
      } = await supabase
        .from("jadwal_ujian")
        .select("*")
        .eq("kategori", kategori)
        .eq("status", true)
        .single()

      if (!jadwal) {

        alert("Ujian belum dibuka")

        router.push("/dashboard")

        return
      }

      // ======================
      // LOAD SOAL
      // ======================

      await getSoal(userId)

      // ======================
      // RESTORE
      // ======================

      const saved =
        localStorage.getItem(key)

      if (saved) {

        const parsed:
          SavedState =
            JSON.parse(saved)

        setJawabanUser(
          parsed.answers || {}
        )

        setCurrentSoal(
          parsed.currentSoal || 0
        )

        setTimeLeft(
          parsed.timeLeft ||
          jadwal.durasi * 60
        )

      } else {

        setTimeLeft(
          jadwal.durasi * 60
        )
      }

      // ======================
      // TOKEN VALID
      // ======================

      const savedToken =
        localStorage.getItem(
          tokenStorage
        )

      if (savedToken === "true") {
        setAllowed(true)
      }

      setLoading(false)

    } catch (err) {

      console.log(err)

      alert("Terjadi kesalahan")

      setLoading(false)
    }
  }

 // ======================
// LOAD SOAL
// ======================

async function getSoal(userId: string) {

  const soalKey =
    `soal_${kategori}_${packageId}_${userId}`

  const saved = localStorage.getItem(soalKey)

  if (saved) {
    setSoal(JSON.parse(saved))
    return
  }

  // ✅ NORMALIZE PAKET: hapus kata "Paket " di depan, lowercase, trim
  // "Paket ips" → "ips", "Paket IPA" → "ipa", "ips" → "ips"
  const normalizedPaket = paket
    .replace(/^paket\s*/i, "")
    .toLowerCase()
    .trim()

  let query = supabase
    .from("soal")
    .select("*")
    .eq("kategori", kategori)

  if (normalizedPaket) {
    query = query.ilike("paket", normalizedPaket)
  }

  const { data, error } = await query

  console.log("KATEGORI:", kategori)
  console.log("PAKET RAW:", paket)
  console.log("PAKET NORMALIZED:", normalizedPaket)
  console.log("TOTAL SOAL:", data?.length)

  if (error) {
    console.log(error)
    return
  }

  if (!data || data.length === 0) {
    alert(
      `Soal ${kategori} paket ${normalizedPaket} tidak ditemukan`
    )
    return
  }

  const shuffled = [...data].sort(
    () => Math.random() - 0.5
  )
  const selected = shuffled.slice(0, 25)

  localStorage.setItem(
    soalKey,
    JSON.stringify(selected)
  )

  setSoal(selected as Soal[])
}
  // ======================
  // PILIH JAWABAN
  // ======================

  function pilihJawaban(
    id: number,
    jawaban: string
  ) {

    const updated = {
      ...jawabanUser,
      [id]: jawaban,
    }

    setJawabanUser(updated)

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        answers: updated,
        currentSoal,
        timeLeft,
      })
    )
  }

  // ======================
  // FORMAT TIMER
  // ======================

  function formatWaktu() {

    const menit =
      Math.floor(timeLeft / 60)

    const detik =
      timeLeft % 60

    return `${String(menit).padStart(2, "0")}:${String(detik).padStart(2, "0")}`
  }

  // ======================
  // VERIFY TOKEN
  // ======================

  async function verifyToken() {

    const { data } =
      await supabase
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

    localStorage.setItem(
      tokenKey,
      "true"
    )

    setAllowed(true)
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

    try {

      if (submitting) return

      setSubmitting(true)

      const {
        data: authData,
      } = await supabase
        .auth
        .getUser()

      const userId =
        authData.user?.id

      if (!userId) {

        alert(
          "User tidak ditemukan"
        )

        return
      }

      // ======================
      // CHECK SUDAH UJIAN
      // PACKAGE SPECIFIC
      // ======================

      let usedQuery =
        supabase
          .from("token_used")
          .select("*")
          .eq("user_id", userId)
          .eq("kategori", kategori)

      if (packageId) {
        usedQuery =
          usedQuery.eq(
            "package_id",
            packageId
          )
      }

      const {
        data: used,
      } = await usedQuery.maybeSingle()

      if (used) {

        alert(
          "Ujian sudah pernah dikirim"
        )

        router.push("/dashboard")

        return
      }

      // ======================
      // HITUNG SKOR
      // ======================

      let total = 0

      const detail =
        soal.map((item) => {

        const jawaban =
          jawabanUser[item.id]

        const benar =
          jawaban ===
          item.jawaban_benar

        if (benar) {
          total += 4
        }

        return {
          soal: item.pertanyaan,
          jawaban_user:
            jawaban || "-",
          jawaban_benar:
            item.jawaban_benar,
          benar,
        }
      })

      // ======================
      // INSERT HASIL
      // ======================

      const {
        error: hasilError,
      } = await supabase
        .from("hasil")
        .insert([
          {
            skor: total,
            kategori: kategori,
            tanggal:
              new Date().toISOString(),
            user_id: userId,
            detail: detail,
            paket: paket || null,
            package_id:
              packageId || null,
          },
        ])

      if (hasilError) {

        console.log(hasilError)

        alert("Gagal simpan hasil")

        return
      }

      // ======================
      // INSERT TOKEN USED
      // ======================

      const {
        error: tokenError,
      } = await supabase
        .from("token_used")
        .insert([
          {
            user_id: userId,
            kategori: kategori,
            package_id:
              packageId || null,
          },
        ])

      if (tokenError) {
        console.log(tokenError)
      }

      // ======================
      // UPDATE RANKING
      // ======================

      if (packageId) {

        const {
          data: rankingData,
        } = await supabase
          .from("ranking_tka")
          .select("*")
          .eq("user_id", userId)
          .eq(
            "package_id",
            packageId
          )
          .maybeSingle()

        if (!rankingData) {

          const selesai =
            1 >= 4

          await supabase
            .from("ranking_tka")
            .insert([
              {
                user_id: userId,
                package_id:
                  packageId,
                total_skor: total,
                jumlah_ujian: 1,
                selesai: selesai,
              },
            ])

        } else {

          const newJumlah =
            (rankingData.jumlah_ujian || 0) + 1

          const newTotal =
            (rankingData.total_skor || 0) + total

          const selesai =
            newJumlah >= 4

          await supabase
            .from("ranking_tka")
            .update({
              total_skor: newTotal,
              jumlah_ujian:
                newJumlah,
              selesai: selesai,
            })
            .eq(
              "id",
              rankingData.id
            )
        }
      }

      // ======================
      // CLEAR STORAGE
      // ======================

      localStorage.removeItem(
        storageKey
      )

      localStorage.removeItem(
        tokenKey
      )

      localStorage.removeItem(
        `soal_${kategori}_${packageId}_${userId}`
      )

      alert(
        `Ujian selesai!\n\nSkor kamu: ${total}/${soal.length}`
      )

      router.replace("/review")

    } catch (err) {

      console.log(err)

      alert("Gagal submit")

    } finally {

      setSubmitting(false)
    }
  }

  // ======================
  // LOADING
  // ======================

  if (loading) {

    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-slate-100
      ">
        <div className="
          w-10
          h-10
          border-4
          border-blue-700
          border-t-transparent
          rounded-full
          animate-spin
        " />
      </div>
    )
  }

  // ======================
  // TOKEN PAGE
  // ======================

  if (!allowed) {

    return (
      <div className="
        min-h-screen
        bg-slate-900
        flex
        items-center
        justify-center
        px-4
      ">

        <div className="
          w-full
          max-w-sm
          bg-white
          rounded-3xl
          p-6
          shadow-2xl
        ">

          <div className="
            text-center
            mb-5
          ">

            <div className="
              text-5xl
              mb-3
            ">
              🔐
            </div>

            <h1 className="
              text-2xl
              font-black
            ">
              Token Ujian
            </h1>

            <p className="
              text-slate-500
              mt-1
            ">
              {kategori}
            </p>

          </div>

          <input
            value={tokenInput}
            onChange={(e) =>
              setTokenInput(
                e.target.value
              )
            }
            placeholder="Masukkan token"
            className="
              w-full
              h-12
              border
              border-slate-300
              rounded-2xl
              px-4
              mb-4
              outline-none
              text-black
            "
          />

          <button
            onClick={verifyToken}
            className="
              w-full
              h-12
              rounded-2xl
              bg-blue-700
              text-white
              font-black
              active:scale-[0.98]
            "
          >
            Mulai Ujian
          </button>

        </div>

      </div>
    )
  }

  // ======================
  // EMPTY
  // ======================

  if (!soal.length) {

    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        text-slate-500
      ">
        Tidak ada soal
      </div>
    )
  }

  const soalAktif =
    soal[currentSoal]

  const progress =
    ((currentSoal + 1) / soal.length) * 100

  const opsiList = [
    {
      key: "a",
      value: soalAktif.opsi_a,
    },

    {
      key: "b",
      value: soalAktif.opsi_b,
    },

    {
      key: "c",
      value: soalAktif.opsi_c,
    },

    {
      key: "d",
      value: soalAktif.opsi_d,
    },

    ...(soalAktif.opsi_e
      ? [
          {
            key: "e",
            value:
              soalAktif.opsi_e,
          },
        ]
      : []),
  ]

  const timerUrgent =
    timeLeft <= 300

  return (

    <MathJaxContext
      config={mathJaxConfig}
    >

      <div className="
        min-h-screen
        bg-slate-100
        pb-28
      ">

        {/* HEADER */}

        <div className="
          sticky
          top-0
          bg-blue-700
          z-50
          shadow-lg
        ">

          <div className="
            px-3
            py-3
          ">

            <div className="
              flex
              justify-between
              gap-3
            ">

              <div className="min-w-0">

                <p className="
                  text-blue-200
                  text-[10px]
                  uppercase
                  tracking-widest
                ">
                  Ujian
                </p>

                <h1 className="
                  text-white
                  font-black
                  text-sm
                  md:text-lg
                  truncate
                ">
                  {kategori}
                </h1>

              </div>

              <div
                className={`
                  rounded-xl
                  px-3
                  py-2
                  shrink-0
                  ${
                    timerUrgent
                      ? "bg-red-500 animate-pulse"
                      : "bg-white"
                  }
                `}
              >

                <p
                  className={`
                    text-[10px]
                    ${
                      timerUrgent
                        ? "text-red-100"
                        : "text-slate-500"
                    }
                  `}
                >
                  Timer
                </p>

                <p
                  className={`
                    font-black
                    tabular-nums
                    ${
                      timerUrgent
                        ? "text-white"
                        : "text-blue-700"
                    }
                  `}
                >
                  {formatWaktu()}
                </p>

              </div>

            </div>

            {/* PROGRESS */}

            <div className="
              mt-3
              h-2
              bg-white/20
              rounded-full
              overflow-hidden
            ">

              <div
                className="
                  h-full
                  bg-white
                  transition-all
                "
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

            <p className="
              text-blue-200
              text-[10px]
              mt-1
              text-right
            ">
              {currentSoal + 1} / {soal.length}
            </p>

          </div>

        </div>

        {/* CONTENT */}

        <div className="
          max-w-3xl
          mx-auto
          px-2
          py-3
        ">

          {/* CARD */}

          <div className="
            bg-white
            rounded-3xl
            border
            border-slate-200
            shadow-sm
            overflow-hidden
          ">

            <div className="
              p-4
              md:p-6
            ">

              {/* NOMOR */}

              <div className="
                flex
                items-center
                gap-3
                mb-4
              ">

                <div className="
                  w-10
                  h-10
                  rounded-2xl
                  bg-blue-700
                  text-white
                  flex
                  items-center
                  justify-center
                  font-black
                ">
                  {currentSoal + 1}
                </div>

                <div>

                  <p className="
                    text-xs
                    text-slate-400
                  ">
                    Soal
                  </p>

                  <h2 className="
                    font-black
                    text-slate-800
                  ">
                    Pilih Jawaban
                  </h2>

                </div>

              </div>

              {/* IMAGE */}

              {soalAktif.gambar && (

                <div className="
                  mb-5
                  flex
                  justify-center
                ">

                  <Image
                    src={soalAktif.gambar}
                    alt="gambar"
                    width={700}
                    height={500}
                    className="
                      rounded-2xl
                      border
                      object-contain
                      w-auto
                      h-auto
                      max-h-[350px]
                    "
                  />

                </div>
              )}

              {/* SOAL */}

              <div className="
                bg-slate-50
                border
                border-slate-200
                rounded-2xl
                p-4
                md:p-5
              ">

                <MathRenderer
                  text={
                    soalAktif.pertanyaan
                  }
                  className="
                    text-[15px]
                    md:text-[17px]
                    leading-[2]
                    text-slate-800
                    font-medium
                  "
                />

              </div>

            </div>

            {/* OPSI */}

            <div className="
              px-4
              pb-5
              space-y-3
            ">

              {opsiList.map((opsi) => {

                const selected =
                  jawabanUser[
                    soalAktif.id
                  ] === opsi.key

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
                      w-full
                      rounded-2xl
                      border
                      p-4
                      flex
                      gap-3
                      text-left
                      transition-all
                      ${
                        selected
                          ? `
                            bg-blue-700
                            border-blue-700
                          `
                          : `
                            bg-white
                            border-slate-200
                            hover:border-blue-300
                          `
                      }
                    `}
                  >

                    <OptionBadge
                      label={opsi.key.toUpperCase()}
                      selected={selected}
                    />

                    <div className="
                      flex-1
                      min-w-0
                      overflow-hidden
                    ">

                      <MathRenderer
                        text={opsi.value}
                        className={`
                          text-[14px]
                          md:text-[15px]
                          leading-[1.9]
                          font-medium
                          ${
                            selected
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

          {/* NAVIGATOR */}

          <div className="
            mt-4
            bg-white
            rounded-2xl
            border
            border-slate-200
            p-4
          ">

            <p className="
              text-xs
              text-slate-400
              mb-3
              font-semibold
              uppercase
              tracking-widest
            ">
              Navigasi Soal
            </p>

            <div className="
              flex
              flex-wrap
              gap-2
            ">

              {soal.map((s, index) => {

                const answered =
                  !!jawabanUser[s.id]

                const isCurrent =
                  index === currentSoal

                return (

                  <button
                    key={s.id}
                    onClick={() =>
                      setCurrentSoal(index)
                    }
                    className={`
                      w-9
                      h-9
                      rounded-xl
                      text-xs
                      font-bold
                      transition-all
                      ${
                        isCurrent
                          ? `
                            bg-blue-700
                            text-white
                            ring-2
                            ring-blue-400
                            ring-offset-1
                          `
                          : answered
                          ? `
                            bg-emerald-500
                            text-white
                          `
                          : `
                            bg-slate-100
                            text-slate-600
                            hover:bg-slate-200
                          `
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                )
              })}

            </div>

            <div className="
              flex
              gap-4
              mt-3
              text-xs
              text-slate-500
            ">

              <span className="
                flex
                items-center
                gap-1
              ">

                <span className="
                  w-3
                  h-3
                  rounded
                  bg-emerald-500
                  inline-block
                " />

                Sudah dijawab (
                {Object.keys(jawabanUser).length}
                )

              </span>

              <span className="
                flex
                items-center
                gap-1
              ">

                <span className="
                  w-3
                  h-3
                  rounded
                  bg-slate-200
                  inline-block
                " />

                Belum (
                {soal.length -
                  Object.keys(jawabanUser).length}
                )

              </span>

            </div>

          </div>

        </div>

        {/* BOTTOM NAV */}

        <div className="
          fixed
          bottom-0
          left-0
          w-full
          bg-white
          border-t
          border-slate-200
          z-50
        ">

          <div className="
            max-w-3xl
            mx-auto
            p-2
            flex
            gap-2
          ">

            <button
              onClick={() =>
                setCurrentSoal((p) =>
                  Math.max(p - 1, 0)
                )
              }
              disabled={currentSoal === 0}
              className="
                flex-1
                h-12
                rounded-xl
                bg-slate-800
                text-white
                font-bold
                disabled:opacity-40
              "
            >
              Prev
            </button>

            <button
              onClick={submitUjian}
              disabled={submitting}
              className="
                flex-1
                h-12
                rounded-xl
                bg-blue-700
                text-white
                font-black
                disabled:opacity-50
              "
            >
              {submitting
                ? "Mengirim..."
                : "Submit"}
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
                currentSoal ===
                soal.length - 1
              }
              className="
                flex-1
                h-12
                rounded-xl
                bg-emerald-600
                text-white
                font-bold
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
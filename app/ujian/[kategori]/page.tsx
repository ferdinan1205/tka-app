"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, useParams } from "next/navigation"

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
  },

  chtml: {
    scale: 1,
    minScale: 0.5,
    matchFontHeight: false,
  },
}

export default function Ujian() {

  const router = useRouter()
  const params = useParams()

  const kategori = decodeURIComponent(
    params.kategori as string
  )

  const [soal, setSoal] =
    useState<Soal[]>([])

  const [jawabanUser,
    setJawabanUser] =
    useState<any>({})

  const [currentSoal,
    setCurrentSoal] =
    useState(0)

  const [timeLeft,
    setTimeLeft] =
    useState(0)

  const [loading,
    setLoading] =
    useState(true)

  const [allowed,
    setAllowed] =
    useState(false)

  const [tokenInput,
    setTokenInput] =
    useState("")

  const [storageKey,
    setStorageKey] =
    useState("")

  const [tokenKey,
    setTokenKey] =
    useState("")

  const [navOpen,
    setNavOpen] =
    useState(false)

  const [submitting,
    setSubmitting] =
    useState(false)

  // ======================
  // FORMAT SOAL BIAR RAPIH
  // ======================
  function formatSoal(text: string) {

    if (!text) return ""

    return text

      // enter setelah titik nomor
      .replace(/\(1\)/g, "<br/><br/>(1)")
      .replace(/\(2\)/g, "<br/>(2)")
      .replace(/\(3\)/g, "<br/>(3)")
      .replace(/\(4\)/g, "<br/>(4)")
      .replace(/\(5\)/g, "<br/>(5)")

      // rapihin line
      .replace(/\n/g, "<br/>")
  }

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

          const newTime =
            prev - 1

          const updated = {
            ...jawabanUser,
            currentSoal,
            timeLeft: newTime,
          }

          localStorage.setItem(
            storageKey,
            JSON.stringify(updated)
          )

          // AUTO SUBMIT
          if (newTime <= 0) {

            clearInterval(interval)

            handleAutoSubmit()

            return 0
          }

          return newTime
        })

      }, 1000)

    return () =>
      clearInterval(interval)

  }, [
    allowed,
    storageKey,
    timeLeft,
    jawabanUser,
    currentSoal
  ])

  // ======================
  // INIT DATA
  // ======================
  async function init() {

    const { data } =
      await supabase.auth.getUser()

    if (!data.user) {

      router.push("/login")

      return
    }

    const userId =
      data.user.id

    const key =
      `ujian_${kategori}_${userId}`

    const tokenStorage =
      `token_valid_${kategori}_${userId}`

    setStorageKey(key)
    setTokenKey(tokenStorage)

    // ======================
    // CEK JADWAL
    // ======================
    const {
      data: jadwal
    } = await supabase
      .from("jadwal_ujian")
      .select("*")
      .eq("kategori", kategori)
      .eq("status", true)
      .single()

    if (!jadwal) {

      alert(
        "Ujian belum dibuka admin"
      )

      router.push("/dashboard")

      return
    }

    // ======================
    // CEK TOKEN USED
    // ======================
    const {
      data: used
    } = await supabase
      .from("token_used")
      .select("*")
      .eq("user_id", userId)
      .eq("kategori", kategori)
      .single()

    if (used) {

      alert(
        "Kamu sudah pernah mengikuti ujian ini"
      )

      router.push("/dashboard")

      return
    }

    // ======================
    // LOAD SOAL
    // ======================
    await getSoal()

    // ======================
    // LOAD SESSION
    // ======================
    const saved =
      localStorage.getItem(key)

    if (saved) {

      const parsed =
        JSON.parse(saved)

      setJawabanUser(parsed)

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
    // TOKEN SUDAH VALID
    // ======================
    const savedToken =
      localStorage.getItem(
        tokenStorage
      )

    if (savedToken === "true") {

      setAllowed(true)
    }

    setLoading(false)
  }

  // ======================
  // GET SOAL
  // ======================
  async function getSoal() {

    const { data: userData } =
      await supabase.auth.getUser()

    const userId =
      userData.user?.id

    const soalKey =
      `soal_${kategori}_${userId}`

    const savedSoal =
      localStorage.getItem(soalKey)

    if (savedSoal) {

      setSoal(
        JSON.parse(savedSoal)
      )

      return
    }

    const {
      data,
      error
    } = await supabase
      .from("soal")
      .select("*")
      .eq("kategori", kategori)

    if (error) {

      console.log(error)

      return
    }

    const shuffled =
      (data || []).sort(
        () => Math.random() - 0.5
      )

    const selected =
      shuffled.slice(0, 25)

    localStorage.setItem(
      soalKey,
      JSON.stringify(selected)
    )

    setSoal(
      selected as Soal[]
    )
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

      currentSoal,

      timeLeft,
    }

    setJawabanUser(updated)

    localStorage.setItem(
      storageKey,
      JSON.stringify(updated)
    )
  }

  // ======================
  // FORMAT TIMER
  // ======================
  function formatWaktu() {

    const menit =
      Math.floor(
        timeLeft / 60
      )

    const detik =
      timeLeft % 60

    return `${menit}:${
      detik < 10
        ? "0"
        : ""
    }${detik}`
  }

  // ======================
  // AUTO SUBMIT
  // ======================
  async function handleAutoSubmit() {

    if (submitting) return

    alert(
      "Waktu habis! Jawaban otomatis dikirim."
    )

    await submitUjian()
  }

  // ======================
  // SUBMIT
  // ======================
  async function submitUjian() {

    if (submitting) return

    setSubmitting(true)

    let total = 0

    const detail =
      soal.map((item) => {

        const jawaban =
          jawabanUser[item.id]

        const benar =
          jawaban ===
          item.jawaban_benar

        if (benar) total++

        return {

          soal:
            item.pertanyaan,

          jawaban_user:
            jawaban,

          jawaban_benar:
            item.jawaban_benar,

          benar,
        }
      })

    const { data } =
      await supabase.auth.getUser()

    const userId =
      data.user?.id

    // SAVE HASIL
    await supabase
      .from("hasil")
      .insert([
        {
          skor: total,
          kategori,
          tanggal: new Date(),
          user_id: userId,
          detail,
        },
      ])

    // SAVE TOKEN USED
    await supabase
      .from("token_used")
      .insert([
        {
          user_id: userId,
          kategori,
        },
      ])

    // REMOVE STORAGE
    localStorage.removeItem(
      storageKey
    )

    localStorage.removeItem(
      tokenKey
    )

    const soalKey =
      `soal_${kategori}_${userId}`

    localStorage.removeItem(
      soalKey
    )

    alert(
      "Ujian selesai!"
    )

    router.push("/review")
  }

  // ======================
  // LOADING
  // ======================
  if (loading) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-100">

        <div className="bg-white px-8 py-5 rounded-3xl shadow-xl font-bold text-blue-700">

          Loading...

        </div>

      </div>
    )
  }

  // ======================
  // TOKEN PAGE
  // ======================
  if (!allowed) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 p-6">

        <div className="bg-white w-full max-w-md p-8 rounded-[35px] shadow-2xl border border-gray-100">

          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-5 text-4xl">
            🔐
          </div>

          <h1 className="text-3xl font-black text-center text-blue-700 mb-3">
            Token Ujian
          </h1>

          <p className="text-center text-gray-600 mb-8 text-sm leading-6">
            Masukkan token ujian untuk memulai
            ujian {kategori}
          </p>

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
              border-2
              border-gray-300
              text-gray-800
              placeholder:text-gray-400
              p-4
              rounded-2xl
              mb-5
              outline-none
              focus:border-blue-500
              bg-white
            "
          />

          <button
            onClick={async () => {

              const {
                data
              } = await supabase
                .from(
                  "jadwal_ujian"
                )
                .select("*")
                .eq(
                  "kategori",
                  kategori
                )
                .eq(
                  "token",
                  tokenInput
                )
                .eq(
                  "status",
                  true
                )
                .single()

              if (!data) {

                alert(
                  "Token salah"
                )

                return
              }

              localStorage.setItem(
                tokenKey,
                "true"
              )

              setAllowed(true)
            }}
            className="
              w-full
              bg-blue-700
              hover:bg-blue-800
              text-white
              py-4
              rounded-2xl
              font-black
              text-base
              transition-all
            "
          >
            Mulai Ujian
          </button>

        </div>

      </div>
    )
  }

  // ======================
  // NO SOAL
  // ======================
  if (!soal.length) {

    return (

      <div className="p-10 text-gray-700">

        Tidak ada soal

      </div>
    )
  }

  const soalAktif =
    soal[currentSoal]

  const progress =
    ((currentSoal + 1)
      / soal.length) * 100

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
  ]

  if (soalAktif.opsi_e) {

    opsiList.push({
      key: "e",
      value: soalAktif.opsi_e,
    })
  }

  return (

    <MathJaxContext config={mathJaxConfig}>

      <div className="min-h-screen bg-[#f3f6fb] pb-28">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white px-5 py-5 shadow-xl">

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>

              <p className="uppercase tracking-[4px] text-[11px] text-blue-200 mb-2">
                Sedang Berlangsung
              </p>

              <h1 className="text-2xl md:text-4xl font-black">
                Ujian {kategori}
              </h1>

            </div>

            <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-3xl px-5 py-3 text-center min-w-[130px]">

              <p className="text-[11px] tracking-widest text-blue-100">
                TIMER
              </p>

              <h2 className="text-2xl font-black mt-1">
                {formatWaktu()}
              </h2>

            </div>

          </div>

        </div>

        {/* PROGRESS */}
        <div className="bg-white shadow-sm sticky top-0 z-30">

          <div className="max-w-7xl mx-auto px-5 py-4">

            <div className="flex items-center gap-4">

              <div className="font-bold text-gray-700 whitespace-nowrap text-sm">
                Soal {currentSoal + 1} / {soal.length}
              </div>

              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">

                <div
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{
                    width:
                      `${progress}%`
                  }}
                />

              </div>

            </div>

          </div>

        </div>

        {/* MOBILE NAV */}
        <div className="lg:hidden px-5 pt-5">

          <button
            onClick={() =>
              setNavOpen(!navOpen)
            }
            className="bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg text-sm"
          >
            ☰ Navigasi Soal
          </button>

        </div>

        {/* MAIN */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-5 items-start">

          {/* NAVIGASI */}
          <div className={`
            ${navOpen
              ? "block"
              : "hidden"}
            lg:block
            w-full
            lg:w-80
            lg:min-w-[320px]
          `}>

            <div className="bg-white rounded-[30px] shadow-xl p-6 sticky top-28">

              <h2 className="font-black text-xl text-gray-800 mb-5">
                Navigasi
              </h2>

              <div className="grid grid-cols-5 lg:grid-cols-4 gap-3">

                {soal.map((
                  item,
                  index
                ) => (

                  <button
                    key={index}
                    onClick={() => {

                      setCurrentSoal(index)

                      setNavOpen(false)
                    }}
                    className={`
                      h-12
                      rounded-2xl
                      font-black
                      text-sm
                      transition-all
                      ${
                        currentSoal === index
                          ? "bg-blue-700 text-white shadow-lg scale-105"
                          : jawabanUser[item.id]
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }
                    `}
                  >
                    {index + 1}
                  </button>

                ))}

              </div>

            </div>

          </div>

          {/* SOAL */}
          <div className="flex-1 w-full">

            <div className="bg-white rounded-[30px] shadow-xl p-5 md:p-8">

        <div className="mb-4" />

       {/* PENGANTAR */}
{soalAktif.pengantar
  ?.replace(/<[^>]*>/g, "")
  ?.trim() && (

  <div
    className="
      mb-6
      bg-gradient-to-br
      from-yellow-50
      to-amber-50
      border
      border-yellow-200
      p-5
      rounded-[24px]
      text-gray-700
      leading-8
      text-[15px]
      shadow-sm
    "
  >

    <div className="flex items-center gap-2 mb-3">

      <div className="w-2 h-2 rounded-full bg-yellow-500" />

      <h3 className="font-bold text-yellow-800 text-sm uppercase tracking-wide">
        Pengantar
      </h3>

    </div>

    <div
      dangerouslySetInnerHTML={{
        __html: formatSoal(
          soalAktif.pengantar
        ),
      }}
    />

  </div>

)}

 {/* BACAAN */}
{soalAktif.bacaan
  ?.replace(/<[^>]*>/g, "")
  ?.trim() && (

  <div
    className="
      mb-7
      bg-slate-50
      border
      border-slate-200
      p-5
      rounded-[24px]
      leading-8
      overflow-auto
      text-gray-700
      text-[15px]
      shadow-sm
    "
  >

    <div className="flex items-center gap-2 mb-3">

      <div className="w-2 h-2 rounded-full bg-slate-500" />

      <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
        Bacaan
      </h3>

    </div>

    <div
      dangerouslySetInnerHTML={{
        __html: formatSoal(
          soalAktif.bacaan
        ),
      }}
    />

  </div>

)}

              {/* GAMBAR */}
              {soalAktif.gambar && (

                <div className="mb-7 flex justify-center">

                  <img
                    src={
                      soalAktif.gambar
                    }
                    alt="gambar soal"
                    className="rounded-3xl border max-h-[350px] object-contain shadow-md"
                  />

                </div>

              )}

              {/* PERTANYAAN */}
              <div className="
                text-[18px]
                md:text-[22px]
                font-bold
                leading-[2.3rem]
                text-gray-800
                mb-8
                overflow-x-auto
              ">

                <MathJax dynamic hideUntilTypeset="first">

                  <div
                    className="
                      soal-math
                      break-words
                    "
                    dangerouslySetInnerHTML={{
                      __html:
                        formatSoal(
                          soalAktif.pertanyaan
                        ),
                    }}
                  />

                </MathJax>

              </div>

              {/* OPSI */}
              <div className="space-y-4">

                {opsiList.map((opsi) => {

                  const selected =
                    jawabanUser[
                      soalAktif.id
                    ] === opsi.key

                  return (

                    <div
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
                        cursor-pointer
                        flex
                        items-start
                        gap-4
                        px-4
                        py-5
                        transition-all
                        duration-200
                        ${
                          selected
                            ? `
                              bg-blue-700
                              border-blue-700
                              text-white
                              shadow-lg
                            `
                            : `
                              bg-white
                              border-gray-300
                              hover:border-blue-400
                              hover:bg-blue-50
                              text-gray-800
                            `
                        }
                      `}
                    >

                      {/* HURUF */}
                      <div
                        className={`
                          w-12
                          h-12
                          min-w-[48px]
                          rounded-xl
                          flex
                          items-center
                          justify-center
                          text-lg
                          font-bold
                          mt-1
                          ${
                            selected
                              ? "bg-white text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        `}
                      >
                        {opsi.key.toUpperCase()}
                      </div>

                      {/* ISI */}
                      <div
                        className={`
                          flex-1
                          text-[15px]
                          md:text-[16px]
                          leading-8
                          font-medium
                          overflow-x-auto
                          ${
                            selected
                              ? "text-white"
                              : "text-gray-800"
                          }
                        `}
                      >

                        <MathJax dynamic hideUntilTypeset="first">

                          <div
                            className="break-words"
                            dangerouslySetInnerHTML={{
                              __html:
                                formatSoal(
                                  opsi.value
                                ),
                            }}
                          />

                        </MathJax>

                      </div>

                    </div>

                  )
                })}

              </div>

            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-2xl p-4 z-50">

          <div className="max-w-7xl mx-auto flex gap-3">

            <button
              onClick={() =>
                setCurrentSoal(
                  (prev) =>
                    Math.max(prev - 1, 0)
                )
              }
              className="
                flex-1
                bg-gray-800
                hover:bg-black
                text-white
                py-3
                rounded-2xl
                font-black
                text-sm
              "
            >
              ← Sebelumnya
            </button>

            <button
              onClick={submitUjian}
              disabled={submitting}
              className="
                flex-1
                bg-blue-700
                hover:bg-blue-800
                text-white
                py-3
                rounded-2xl
                font-black
                text-sm
                shadow-lg
              "
            >
              {submitting
                ? "Loading..."
                : "Submit"}
            </button>

            <button
              onClick={() =>
                setCurrentSoal(
                  (prev) =>
                    Math.min(
                      prev + 1,
                      soal.length - 1
                    )
                )
              }
              className="
                flex-1
                bg-green-600
                hover:bg-green-700
                text-white
                py-3
                rounded-2xl
                font-black
                text-sm
              "
            >
              Berikutnya →
            </button>

          </div>

        </div>

      </div>

    </MathJaxContext>
  )
}
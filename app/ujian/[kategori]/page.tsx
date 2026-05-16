"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, useParams } from "next/navigation"

import { MathJax, MathJaxContext } from "better-react-mathjax"

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

  const [navOpen,
    setNavOpen] =
    useState(false)

  useEffect(() => {
    init()
  }, [])

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

          if (newTime <= 0) {

            clearInterval(interval)

            alert(
              "Waktu habis!"
            )

            submitUjian()

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

    setStorageKey(key)

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

    await getSoal()

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

    setLoading(false)
  }

  async function getSoal() {

    const {
      data,
      error
    } = await supabase
      .from("soal")
      .select("*")
      .eq("kategori", kategori)
      .order("id", {
        ascending: true,
      })

    if (error) {

      console.log(error)
      return
    }

    setSoal(
      (data || []) as Soal[]
    )
  }

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

  async function submitUjian() {

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

    await supabase
      .from("token_used")
      .insert([
        {
          user_id: userId,
          kategori,
        },
      ])

    localStorage.removeItem(
      storageKey
    )

    alert(
      "Ujian selesai!"
    )

    router.push("/review")
  }

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white px-8 py-5 rounded-3xl shadow-xl font-bold text-blue-700">
          Loading...
        </div>
      </div>
    )
  }

  if (!allowed) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 p-6">

        <div className="bg-white w-full max-w-md p-8 rounded-[35px] shadow-2xl">

          <h1 className="text-4xl font-black text-center text-blue-700 mb-3">
            Token Ujian
          </h1>

          <p className="text-center text-gray-500 mb-8">
            Masukkan token ujian dari admin
          </p>

          <input
            value={tokenInput}
            onChange={(e) =>
              setTokenInput(
                e.target.value
              )
            }
            placeholder="Masukkan token"
            className="w-full border-2 border-gray-200 p-4 rounded-2xl mb-5 outline-none focus:border-blue-500"
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

              setAllowed(true)
            }}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-black text-lg transition-all"
          >
            Mulai Ujian
          </button>

        </div>

      </div>
    )
  }

  if (!soal.length) {

    return (
      <div className="p-10">
        Tidak ada soal
      </div>
    )
  }

  const soalAktif =
    soal[currentSoal]

  const progress =
    ((currentSoal + 1)
      / soal.length) * 100

  return (

    <MathJaxContext>

      <div className="min-h-screen bg-[#f3f6fb] pb-32">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white px-5 py-6 shadow-xl">

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>

              <p className="uppercase tracking-[5px] text-xs text-blue-200 mb-2">
                Sedang Berlangsung
              </p>

              <h1 className="text-3xl md:text-5xl font-black">
                Ujian {kategori}
              </h1>

            </div>

            <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-3xl px-6 py-4 text-center min-w-[150px]">

              <p className="text-xs tracking-widest text-blue-100">
                TIMER
              </p>

              <h2 className="text-3xl font-black mt-1">
                {formatWaktu()}
              </h2>

            </div>

          </div>

        </div>

        {/* PROGRESS */}
        <div className="bg-white shadow-sm sticky top-0 z-30">

          <div className="max-w-7xl mx-auto px-5 py-4">

            <div className="flex items-center gap-4">

              <div className="font-bold text-gray-700 whitespace-nowrap">
                Soal {currentSoal + 1} / {soal.length}
              </div>

              <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">

                <div
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-300"
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
            className="bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg"
          >
            ☰ Navigasi Soal
          </button>

        </div>

        {/* MAIN */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-5">

          {/* SIDEBAR */}
          <div className={`
            ${navOpen
              ? "block"
              : "hidden"}
            lg:block
            w-full lg:w-80
          `}>

            <div className="bg-white rounded-[30px] shadow-xl p-6 sticky top-28">

              <h2 className="font-black text-2xl text-gray-800 mb-6">
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
                      h-14 rounded-2xl font-black text-lg transition-all
                      ${
                        currentSoal === index
                          ? "bg-blue-700 text-white shadow-lg scale-105"
                          : jawabanUser[item.id]
                          ? "bg-green-400 text-white"
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
          <div className="flex-1">

            <div className="bg-white rounded-[35px] shadow-xl p-5 md:p-8">

              <div className="mb-6">

                <span className="bg-blue-100 text-blue-700 px-5 py-3 rounded-full font-black text-lg">
                  Soal {currentSoal + 1}
                </span>

              </div>

              {/* PENGANTAR */}
              {soalAktif.pengantar && (

                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-5 rounded-3xl text-gray-700 leading-8">

                  <MathJax dynamic>
                    {soalAktif.pengantar}
                  </MathJax>

                </div>

              )}

              {/* BACAAN */}
              {soalAktif.bacaan && (

                <div className="mb-7 bg-gray-50 border border-gray-200 p-6 rounded-3xl leading-8 overflow-auto text-gray-700">

                  <MathJax dynamic>
                    {soalAktif.bacaan}
                  </MathJax>

                </div>

              )}

              {/* GAMBAR */}
              {soalAktif.gambar && (

                <div className="mb-8 flex justify-center">

                  <img
                    src={
                      soalAktif.gambar
                    }
                    className="rounded-3xl border max-h-[450px] object-contain shadow-md"
                  />

                </div>

              )}

              {/* PERTANYAAN */}
              <div className="text-lg md:text-2xl font-bold leading-[45px] text-gray-800 mb-8">

                <MathJax dynamic>
                  {soalAktif.pertanyaan}
                </MathJax>

              </div>

              {/* OPSI */}
              <div className="space-y-5">

                {[
                  "a",
                  "b",
                  "c",
                  "d",
                ].map((opsi) => {

                  const value =
                    soalAktif[
                      `opsi_${opsi}` as keyof Soal
                    ] as string

                  return (

                    <div
                      key={opsi}
                      onClick={() =>
                        pilihJawaban(
                          soalAktif.id,
                          opsi
                        )
                      }
                      className={`
                        p-5 md:p-6
                        rounded-[30px]
                        border-2
                        cursor-pointer
                        flex gap-5
                        transition-all
                        duration-200
                        ${
                          jawabanUser[
                            soalAktif.id
                          ] === opsi

                            ? `
                              bg-blue-700
                              border-blue-700
                              text-white
                              shadow-xl
                              scale-[1.01]
                            `

                            : `
                              bg-white
                              border-gray-200
                              hover:border-blue-400
                              hover:bg-blue-50
                            `
                        }
                      `}
                    >

                      {/* HURUF */}
                      <div className={`
                        min-w-[60px]
                        h-[60px]
                        rounded-2xl
                        flex items-center justify-center
                        text-2xl
                        font-black
                        ${
                          jawabanUser[
                            soalAktif.id
                          ] === opsi
                            ? "bg-white text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      `}>
                        {opsi.toUpperCase()}
                      </div>

                      {/* TEXT */}
                      <div className="flex-1 text-[16px] md:text-lg leading-8 font-semibold break-words">

                        <MathJax dynamic>
                          {value}
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
              className="flex-1 bg-gray-800 hover:bg-black text-white py-4 rounded-2xl font-black transition-all"
            >
              ← Sebelumnya
            </button>

            <button
              onClick={submitUjian}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-black transition-all shadow-lg"
            >
              Submit
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
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black transition-all"
            >
              Berikutnya →
            </button>

          </div>

        </div>

      </div>

    </MathJaxContext>
  )
}
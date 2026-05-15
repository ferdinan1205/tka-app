"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter, useParams } from "next/navigation"

import Latex from "react-latex-next"
import "katex/dist/katex.min.css"

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

  const kategori =
    decodeURIComponent(
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

  /* INIT */
  useEffect(() => {
    init()
  }, [])

  /* TIMER */
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

  /* INIT */
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

  /* GET SOAL */
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

  /* PILIH JAWABAN */
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

  /* FORMAT TIMER */
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

  /* SUBMIT */
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

  /* LOADING */
  if (loading) {

    return (
      <div className="p-10">
        Loading...
      </div>
    )
  }

  /* TOKEN */
  if (!allowed) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">

        <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl">

          <h1 className="text-3xl font-black text-center mb-2">
            Token Ujian
          </h1>

          <p className="text-gray-500 text-center mb-6">
            Masukkan token dari admin
          </p>

          <input
            value={tokenInput}
            onChange={(e) =>
              setTokenInput(
                e.target.value
              )
            }
            placeholder="Masukkan token"
            className="w-full border p-4 rounded-2xl mb-4"
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
            className="w-full bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-2xl font-bold"
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

    <div className="min-h-screen bg-gray-100 pb-28">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-4 py-4 md:px-6 md:py-5">

        <div className="flex items-center justify-between gap-4">

          <div>

            <p className="text-[10px] md:text-sm opacity-80 tracking-wider">
              SEDANG BERLANGSUNG
            </p>

            <h1 className="text-2xl md:text-4xl font-black leading-tight">
              Ujian: {kategori}
            </h1>

          </div>

          {/* TIMER */}
          <div className="border border-red-300 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md">

            <div className="text-center text-[10px] md:text-xs opacity-80">
              ⏱ TIMER
            </div>

            <div className="text-lg md:text-2xl font-black">
              {formatWaktu()}
            </div>

          </div>

        </div>

      </div>

      {/* PROGRESS */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm">

        <p className="text-sm md:text-base font-semibold whitespace-nowrap text-gray-700">
          Soal {currentSoal + 1}
          dari {soal.length}
        </p>

        <div className="flex-1 bg-gray-200 h-2 md:h-3 rounded-full overflow-hidden">

          <div
            className="bg-green-500 h-2 md:h-3 transition-all"
            style={{
              width:
                `${progress}%`
            }}
          />

        </div>

      </div>

      {/* MOBILE NAV BUTTON */}
      <div className="lg:hidden px-4 pt-4">

        <button
          onClick={() =>
            setNavOpen(!navOpen)
          }
          className="bg-blue-700 text-white px-4 py-2 rounded-2xl font-bold shadow-lg text-sm"
        >
          ☰ Navigasi Soal
        </button>

      </div>

      {/* MAIN */}
      <div className="flex flex-col lg:flex-row gap-5 p-4">

        {/* NAV */}
        <div className={`
          ${navOpen
            ? "block"
            : "hidden"}
          lg:block
          w-full lg:w-64
        `}>

          <div className="bg-white p-5 rounded-3xl shadow sticky top-5">

            <p className="font-black text-lg mb-5">
              Navigasi Soal
            </p>

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
                  className={`h-11 rounded-2xl font-bold transition ${
                    currentSoal === index
                      ? "bg-blue-600 text-white"
                      : jawabanUser[item.id]
                      ? "bg-green-300"
                      : "bg-gray-100"
                  }`}
                >
                  {index + 1}
                </button>

              ))}

            </div>

          </div>

        </div>

        {/* SOAL */}
        <div className="flex-1 w-full bg-white p-4 md:p-6 rounded-3xl shadow overflow-hidden">

          <div className="mb-5">

            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-black text-base">
              Soal {currentSoal + 1}
            </span>

          </div>

          {/* PENGANTAR */}
          {soalAktif.pengantar && (

            <div className="mb-5 bg-yellow-50 border p-4 rounded-3xl leading-7 text-sm md:text-base">

              <Latex>
                {soalAktif.pengantar}
              </Latex>

            </div>

          )}

          {/* BACAAN */}
          {soalAktif.bacaan && (

            <div className="mb-6 bg-gray-50 border p-4 md:p-5 rounded-3xl whitespace-pre-line leading-7 md:leading-8 text-sm md:text-base overflow-auto">

              <Latex>
                {soalAktif.bacaan}
              </Latex>

            </div>

          )}

          {/* GAMBAR */}
          {soalAktif.gambar && (

            <div className="mb-6 flex justify-center">

              <img
                src={
                  soalAktif.gambar
                }
                className="rounded-3xl border max-h-[300px] md:max-h-[450px] object-contain"
              />

            </div>

          )}

          {/* PERTANYAAN */}
          <div className="font-bold mb-7 text-base md:text-2xl leading-8 md:leading-[50px] text-gray-800 break-words">

            <Latex>
              {soalAktif.pertanyaan}
            </Latex>

          </div>

{/* OPSI */}
<div className="space-y-4">

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

          p-4 md:p-5
          rounded-3xl
          border-2
          cursor-pointer
          flex gap-4
          transition-all
          shadow-sm

          ${
            jawabanUser[
              soalAktif.id
            ] === opsi

              ? `
                bg-blue-700
                text-white
                border-blue-700
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
        <div className={`

          min-w-[45px]
          h-[45px]

          md:min-w-[55px]
          md:h-[55px]

          flex items-center justify-center

          rounded-2xl
          font-black
          text-base md:text-lg

          ${
            jawabanUser[
              soalAktif.id
            ] === opsi

              ? `
                bg-white
                text-blue-700
              `

              : `
                bg-gray-100
                text-gray-700
              `
          }

        `}>
          {opsi.toUpperCase()}
        </div>

        {/* TEXT OPSI */}
        <div className="

          flex-1
          leading-7 md:leading-8

          text-[15px]
          md:text-lg

          font-semibold
          break-words

        ">

          <Latex>
            {value}
          </Latex>

        </div>

      </div>

    )
  })}

</div>

        </div>

      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 shadow-2xl z-50">

        <div className="flex gap-3">

          {/* SEBELUMNYA */}
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
              hover:bg-gray-900
              text-white
              px-3 py-3
              rounded-2xl
              text-sm md:text-base
              font-bold
              transition-all
              duration-200
              shadow-md
            "
          >
            ← Sebelumnya
          </button>

          {/* SUBMIT */}
          <button
            onClick={submitUjian}
            className="
              flex-1
              bg-blue-700
              hover:bg-blue-800
              text-white
              px-3 py-3
              rounded-2xl
              text-sm md:text-base
              font-black
              transition-all
              duration-200
              shadow-lg
            "
          >
            Submit
          </button>

          {/* BERIKUTNYA */}
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
              px-3 py-3
              rounded-2xl
              text-sm md:text-base
              font-bold
              transition-all
              duration-200
              shadow-md
            "
          >
            Berikutnya →
          </button>

        </div>

      </div>

    </div>
  )
}
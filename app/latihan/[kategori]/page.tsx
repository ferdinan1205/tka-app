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
  jawaban_benar: string
  kategori: string
  pembahasan?: string
  pengantar?: string
  bacaan?: string
  gambar?: string
}

export default function LatihanPage() {

  const [soal, setSoal] =
    useState<Soal[]>([])

  const [current, setCurrent] =
    useState(0)

  const [jawabanUser, setJawabanUser] =
    useState<any>({})

  const [showHasil, setShowHasil] =
    useState(false)

  const [navOpen, setNavOpen] =
    useState(false)

  const router = useRouter()

  const params = useParams()

  const kategori =
    decodeURIComponent(
      params.kategori as string
    )

  useEffect(() => {
    init()
  }, [])

  async function init() {

    const { data } =
      await supabase.auth.getUser()

    if (!data.user) {

      router.push("/login")
      return
    }

    const { data: soalData } =
      await supabase
        .from("soal")
        .select("*")
        .eq("kategori", kategori)
        .order("id", {
          ascending: true,
        })

    setSoal(
      (soalData as Soal[]) || []
    )
  }

  function pilihJawaban(
    id: number,
    jawaban: string
  ) {

    setJawabanUser({
      ...jawabanUser,
      [id]: jawaban,
    })
  }

  function nextSoal() {

    setCurrent((prev) =>
      Math.min(
        prev + 1,
        soal.length - 1
      )
    )
  }

  function prevSoal() {

    setCurrent((prev) =>
      Math.max(prev - 1, 0)
    )
  }

  function selesaiLatihan() {
    setShowHasil(true)
  }

  if (!soal.length) {

    return (

      <div className="min-h-screen bg-slate-100 flex items-center justify-center">

        <div className="bg-white px-8 py-5 rounded-3xl shadow-lg">

          <p className="font-semibold text-slate-700">
            Loading latihan...
          </p>

        </div>

      </div>

    )
  }

  const soalAktif =
    soal[current]

  const progress =
    ((current + 1) /
      soal.length) *
    100

  const totalBenar =
    soal.filter(
      (item) =>
        jawabanUser[item.id] ===
        item.jawaban_benar
    ).length

  return (

    <div className="min-h-screen bg-slate-100 pb-36">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white shadow-xl">

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="uppercase tracking-[4px] text-xs opacity-80">
                Mode Latihan
              </p>

              <h1 className="text-3xl md:text-5xl font-black mt-2">

                {kategori}

              </h1>

              <p className="text-blue-100 mt-3 text-sm md:text-base">

                Latihan soal interaktif siswa

              </p>

            </div>

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="
                bg-white/10
                border border-white/20
                backdrop-blur-md
                hover:bg-white
                hover:text-blue-800
                transition-all
                px-5 py-3
                rounded-2xl
                font-bold
                w-full md:w-fit
              "
            >
              ← Dashboard
            </button>

          </div>

        </div>

      </div>

      {/* PROGRESS */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">

          <div className="flex items-center gap-3">

            <p className="text-sm font-bold text-slate-700 whitespace-nowrap">

              Soal {current + 1}/{soal.length}

            </p>

            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">

              <div
                className="
                  h-3
                  rounded-full
                  bg-gradient-to-r
                  from-blue-600
                  to-cyan-400
                  transition-all
                  duration-300
                "
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

            <p className="text-sm font-bold text-blue-700">

              {Math.round(progress)}%

            </p>

          </div>

        </div>

      </div>

      {/* MOBILE BUTTON */}
      <div className="lg:hidden px-4 pt-5">

        <button
          onClick={() =>
            setNavOpen(!navOpen)
          }
          className="
            w-full
            bg-blue-700
            text-white
            py-4
            rounded-2xl
            font-bold
            shadow-lg
          "
        >
          ☰ Navigasi Soal
        </button>

      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 px-4 md:px-8 py-6">

        {/* SIDEBAR */}
        <div className={`
          ${navOpen ? "block" : "hidden"}
          lg:block
          w-full lg:w-[280px]
        `}>

          <div className="bg-white rounded-[28px] shadow-lg p-5 sticky top-24">

            <div className="mb-5">

              <h2 className="text-xl font-black text-slate-800">
                Navigasi
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Pilih soal
              </p>

            </div>

            <div className="grid grid-cols-5 lg:grid-cols-4 gap-3">

              {soal.map(
                (item, index) => (

                  <button
                    key={index}
                    onClick={() => {

                      setCurrent(index)
                      setNavOpen(false)
                    }}
                    className={`

                      h-12 rounded-2xl
                      font-bold
                      text-sm
                      transition-all

                      ${
                        current === index

                          ? `
                            bg-blue-700
                            text-white
                            shadow-lg
                          `

                          : jawabanUser[item.id]

                          ? `
                            bg-green-100
                            text-green-700
                            border border-green-300
                          `

                          : `
                            bg-slate-100
                            text-slate-700
                            hover:bg-slate-200
                          `
                      }

                    `}
                  >
                    {index + 1}
                  </button>

                )
              )}

            </div>

          </div>

        </div>

        {/* SOAL */}
        <div className="flex-1 min-w-0">

          <div className="bg-white rounded-[30px] shadow-xl overflow-hidden">

            {/* TOP */}
            <div className="border-b bg-slate-50 px-5 md:px-8 py-5">

              <div className="flex flex-wrap gap-3 items-center">

                <span className="
                  bg-blue-100
                  text-blue-700
                  px-4 py-2
                  rounded-full
                  font-bold
                  text-sm
                ">
                  Soal {current + 1}
                </span>

                <span className="
                  bg-slate-200
                  text-slate-700
                  px-4 py-2
                  rounded-full
                  text-sm
                  font-semibold
                ">
                  {kategori}
                </span>

              </div>

            </div>

            {/* BODY */}
            <div className="p-5 md:p-8">

              {/* PENGANTAR */}
              {soalAktif.pengantar && (

                <div className="
                  mb-6
                  bg-yellow-50
                  border border-yellow-200
                  rounded-3xl
                  p-5
                  leading-8
                  text-[15px]
                  md:text-lg
                  overflow-auto
                ">

                  <Latex>
                    {soalAktif.pengantar}
                  </Latex>

                </div>

              )}

              {/* BACAAN */}
              {soalAktif.bacaan && (

                <div className="
                  mb-6
                  bg-slate-50
                  border border-slate-200
                  rounded-3xl
                  p-5 md:p-6
                  leading-8 md:leading-9
                  text-[15px] md:text-lg
                  text-slate-700
                  whitespace-pre-line
                  overflow-auto
                ">

                  <Latex>
                    {soalAktif.bacaan}
                  </Latex>

                </div>

              )}

              {/* GAMBAR */}
              {soalAktif.gambar && (

                <div className="mb-7 flex justify-center">

                  <img
                    src={soalAktif.gambar}
                    alt="gambar soal"
                    className="
                      w-full
                      max-w-3xl
                      max-h-[400px]
                      object-contain
                      rounded-3xl
                      border
                      bg-white
                    "
                  />

                </div>

              )}

              {/* PERTANYAAN */}
              <div className="mb-8">

                <h2 className="
                  text-lg md:text-2xl
                  font-bold
                  text-slate-800
                  leading-9 md:leading-[48px]
                  break-words
                ">

                  <Latex>
                    {soalAktif.pertanyaan}
                  </Latex>

                </h2>

              </div>

              {/* OPSI */}
              <div className="space-y-4">

                {["a", "b", "c", "d"].map((opsi) => {

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

                        rounded-3xl
                        border-2
                        p-4 md:p-5
                        cursor-pointer
                        transition-all
                        duration-200

                        flex items-start gap-4

                        ${
                          jawabanUser[
                            soalAktif.id
                          ] === opsi

                            ? `
                              bg-blue-700
                              border-blue-700
                              text-white
                              shadow-xl
                            `

                            : `
                              bg-white
                              border-slate-200
                              hover:border-blue-300
                              hover:bg-blue-50
                              text-slate-800
                            `
                        }

                      `}
                    >

                      {/* HURUF */}
                      <div className={`

                        min-w-[50px]
                        h-[50px]

                        rounded-2xl
                        flex items-center justify-center
                        font-black
                        text-base

                        ${
                          jawabanUser[
                            soalAktif.id
                          ] === opsi

                            ? `
                              bg-white
                              text-blue-700
                            `

                            : `
                              bg-slate-100
                              text-slate-700
                            `
                        }

                      `}>

                        {opsi.toUpperCase()}

                      </div>

                      {/* TEXT */}
                      <div className="
                        flex-1
                        text-[15px]
                        md:text-lg
                        leading-8
                        md:leading-9
                        font-medium
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

          {/* HASIL */}
          {showHasil && (

            <div className="mt-6 bg-white rounded-[30px] shadow-xl p-5 md:p-8">

              <div className="mb-6">

                <h2 className="text-3xl font-black text-slate-800">
                  Hasil Latihan
                </h2>

                <p className="text-slate-500 mt-2">
                  Ringkasan latihan kamu
                </p>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 text-center">

                  <h3 className="text-5xl font-black text-blue-700">

                    {soal.length}

                  </h3>

                  <p className="mt-3 text-slate-600">
                    Total Soal
                  </p>

                </div>

                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 text-center">

                  <h3 className="text-5xl font-black text-green-700">

                    {totalBenar}

                  </h3>

                  <p className="mt-3 text-slate-600">
                    Jawaban Benar
                  </p>

                </div>

                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-center">

                  <h3 className="text-5xl font-black text-red-700">

                    {soal.length - totalBenar}

                  </h3>

                  <p className="mt-3 text-slate-600">
                    Jawaban Salah
                  </p>

                </div>

              </div>

            </div>

          )}

        </div>

      </div>

      {/* FOOTER */}
      <div className="
        fixed bottom-0 left-0 w-full
        bg-white/95
        backdrop-blur-xl
        border-t
        shadow-2xl
        z-50
      ">

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">

          <div className="
            grid
            grid-cols-3
            gap-3
          ">

            {/* PREV */}
            <button
              onClick={prevSoal}
              className="
                bg-slate-800
                hover:bg-slate-900
                text-white
                py-3
                rounded-2xl
                font-bold
                transition-all
                text-sm md:text-base
              "
            >
              ← Sebelumnya
            </button>

            {/* CENTER */}
            {!showHasil ? (

              <button
                onClick={selesaiLatihan}
                className="
                  bg-blue-700
                  hover:bg-blue-800
                  text-white
                  py-3
                  rounded-2xl
                  font-black
                  transition-all
                  shadow-lg
                  text-sm md:text-base
                "
              >
                Selesai
              </button>

            ) : (

              <button
                onClick={() =>
                  window.location.reload()
                }
                className="
                  bg-green-600
                  hover:bg-green-700
                  text-white
                  py-3
                  rounded-2xl
                  font-black
                  transition-all
                  text-sm md:text-base
                "
              >
                Ulangi
              </button>

            )}

            {/* NEXT */}
            <button
              onClick={nextSoal}
              className="
                bg-blue-600
                hover:bg-blue-700
                text-white
                py-3
                rounded-2xl
                font-bold
                transition-all
                text-sm md:text-base
              "
            >
              Berikut →
            </button>

          </div>

        </div>

      </div>

    </div>
  )
}
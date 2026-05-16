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
    useState<Record<number, string>>({})

  const [showHasil, setShowHasil] =
    useState(false)

  const [navOpen, setNavOpen] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const router = useRouter()

  const params = useParams()

  const kategori =
    decodeURIComponent(
      params.kategori as string
    )

  useEffect(() => {
    init()
  }, [kategori])

  async function init() {

    setLoading(true)

    const { data } =
      await supabase.auth.getUser()

    if (!data.user) {

      router.push("/login")
      return
    }

    const { data: soalData, error } =
      await supabase
        .from("soal")
        .select("*")
        .eq("kategori", kategori)
        .order("id", {
          ascending: true,
        })

    if (error) {
      console.log(error)
    }

    setSoal(
      (soalData as Soal[]) || []
    )

    setLoading(false)
  }

  function pilihJawaban(
    id: number,
    jawaban: string
  ) {

    setJawabanUser((prev) => ({
      ...prev,
      [id]: jawaban,
    }))
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

  if (loading) {

    return (

      <div className="min-h-screen bg-[#eef4ff] flex items-center justify-center">

        <div className="bg-white px-8 py-5 rounded-3xl shadow-lg">

          <p className="font-semibold text-slate-700">
            Loading latihan...
          </p>

        </div>

      </div>

    )
  }

  if (!soal.length) {

    return (

      <div className="min-h-screen bg-[#eef4ff] flex items-center justify-center">

        <div className="bg-white px-8 py-5 rounded-3xl shadow-lg">

          <p className="font-semibold text-slate-700">
            Soal tidak ditemukan
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

    <MathJaxContext>

      <div className="min-h-screen bg-[#eef4ff] pb-36">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white shadow-xl">

          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="uppercase tracking-[4px] text-xs opacity-90">
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
                  bg-white
                  text-blue-700
                  hover:bg-blue-50
                  transition-all
                  px-5 py-3
                  rounded-2xl
                  font-bold
                  shadow-lg
                  w-full md:w-fit
                "
              >
                ← Dashboard
              </button>

            </div>

          </div>

        </div>

        {/* PROGRESS */}
        <div className="bg-white sticky top-0 z-30 shadow-md">

          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">

            <div className="flex items-center gap-4">

              <div className="font-bold text-slate-700 whitespace-nowrap">
                Soal {current + 1} / {soal.length}
              </div>

              <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">

                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-300"
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
        <div className="lg:hidden px-4 pt-5">

          <button
            onClick={() =>
              setNavOpen(!navOpen)
            }
            className="bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg"
          >
            ☰ Navigasi Soal
          </button>

        </div>

        {/* CONTENT */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 px-4 md:px-8 py-6 items-start">

          {/* SIDEBAR */}
          <div className={`
            ${navOpen
              ? "block"
              : "hidden"}
            lg:block
            w-full
            lg:w-80
            lg:min-w-[320px]
            lg:max-w-[320px]
            self-start
          `}>

            <div className="bg-white rounded-[30px] shadow-xl p-6 max-h-[85vh] overflow-y-auto">

              <h2 className="font-black text-2xl text-slate-800 mb-6">
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

                      setCurrent(index)

                      setNavOpen(false)
                    }}
                    className={`
                      h-14
                      rounded-2xl
                      font-black
                      text-lg
                      transition-all
                      ${
                        current === index
                          ? "bg-blue-700 text-white shadow-lg scale-105"
                          : jawabanUser[item.id]
                          ? "bg-green-500 text-white"
                          : "bg-slate-100 text-slate-700"
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

            <div className="bg-white rounded-[30px] shadow-xl overflow-hidden">

              <div className="p-5 md:p-8">

                {/* PENGANTAR */}
                {soalAktif?.pengantar && (

                  <div className="
                    mb-6
                    bg-yellow-50
                    border border-yellow-200
                    rounded-3xl
                    p-5
                    leading-8
                    text-slate-700
                  ">

                    <MathJax dynamic>
                      {soalAktif.pengantar}
                    </MathJax>

                  </div>

                )}

                {/* BACAAN */}
                {soalAktif?.bacaan && (

                  <div className="
                    mb-6
                    bg-slate-50
                    border border-slate-200
                    rounded-3xl
                    p-5
                    leading-8
                    text-slate-700
                  ">

                    <MathJax dynamic>
                      {soalAktif.bacaan}
                    </MathJax>

                  </div>

                )}

                {/* GAMBAR */}
                {soalAktif?.gambar && (

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
                    leading-9
                  ">

                    <MathJax dynamic>
                      {soalAktif?.pertanyaan}
                    </MathJax>

                  </h2>

                </div>

                {/* OPSI */}
                <div className="space-y-4">

                  {["a", "b", "c", "d"].map((opsi) => {

                    const value =
                      soalAktif[
                        `opsi_${opsi}` as keyof Soal
                      ] as string

                    const selected =
                      jawabanUser[
                        soalAktif.id
                      ] === opsi

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
                          w-full
                          rounded-2xl
                          border
                          cursor-pointer
                          flex
                          items-center
                          gap-4
                          px-4
                          py-4
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
                                border-slate-300
                                hover:border-blue-400
                                hover:bg-blue-50
                                text-slate-800
                              `
                          }
                        `}
                      >

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
                            ${
                              selected
                                ? "bg-white text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }
                          `}
                        >
                          {opsi.toUpperCase()}
                        </div>

                        <div
                          className={`
                            flex-1
                            flex
                            items-center
                            text-[15px]
                            md:text-[16px]
                            leading-7
                            font-medium
                            break-words
                            ${
                              selected
                                ? "text-white"
                                : "text-slate-800"
                            }
                          `}
                        >

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

            {/* HASIL */}
            {showHasil && (

              <div className="mt-6 bg-white rounded-[30px] shadow-xl p-5 md:p-8">

                <h2 className="text-3xl font-black text-slate-800 mb-6">
                  Hasil Latihan
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  <div className="bg-blue-50 rounded-3xl p-6 text-center">

                    <h3 className="text-5xl font-black text-blue-700">
                      {soal.length}
                    </h3>

                    <p className="mt-3 text-slate-600">
                      Total Soal
                    </p>

                  </div>

                  <div className="bg-green-50 rounded-3xl p-6 text-center">

                    <h3 className="text-5xl font-black text-green-700">
                      {totalBenar}
                    </h3>

                    <p className="mt-3 text-slate-600">
                      Jawaban Benar
                    </p>

                  </div>

                  <div className="bg-red-50 rounded-3xl p-6 text-center">

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
        <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-2xl p-4 z-50">

          <div className="max-w-7xl mx-auto flex gap-3">

            <button
              onClick={prevSoal}
              className="flex-1 bg-slate-800 hover:bg-black text-white py-4 rounded-2xl font-black transition-all"
            >
              ← Sebelumnya
            </button>

            <button
              onClick={selesaiLatihan}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-black transition-all shadow-lg"
            >
              Submit
            </button>

            <button
              onClick={nextSoal}
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
"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

import {
  MathJax,
  MathJaxContext,
} from "better-react-mathjax"

export default function Review() {

  const [data, setData] =
    useState<any>(null)

  const [loading, setLoading] =
    useState(true)

  const [aiLoading,
    setAiLoading] =
    useState<number | null>(null)

  const router =
    useRouter()

  useEffect(() => {
    getLastResult()
  }, [])

  async function getLastResult() {

    const {
      data: userData
    } =
      await supabase.auth.getUser()

    if (!userData.user) {

      router.push("/login")
      return
    }

    const { data } =
      await supabase
        .from("hasil")
        .select("*")
        .eq(
          "user_id",
          userData.user.id
        )
        .order("id", {
          ascending: false
        })
        .limit(1)

    setData(data?.[0] || null)

    setLoading(false)
  }

  async function generateAI(
    index: number,
    item: any
  ) {

    try {

      setAiLoading(index)

      const res =
        await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            soal: item.soal,
            jawaban_benar:
              item.jawaban_benar,
          }),
        })

      const result =
        await res.json()

      const updated =
        [...data.detail]

      updated[index]
        .pembahasan =
        result.text

      setData({
        ...data,
        detail: updated,
      })

    } catch {

      alert(
        "Gagal generate AI"
      )

    } finally {

      setAiLoading(null)
    }
  }

  function getEmbedUrl(
    url: string
  ) {

    if (!url) return ""

    if (
      url.includes("youtu.be")
    ) {

      const id =
        url
          .split(
            "youtu.be/"
          )[1]
          .split("?")[0]

      return `https://www.youtube.com/embed/${id}`
    }

    if (
      url.includes(
        "watch?v="
      )
    ) {

      const id =
        url
          .split("v=")[1]
          .split("&")[0]

      return `https://www.youtube.com/embed/${id}`
    }

    return url
  }

  if (loading) {

    return (
      <div className="p-10">
        Loading...
      </div>
    )
  }

  if (!data) {

    return (
      <div className="p-10">
        Tidak ada data
      </div>
    )
  }

  const benar =
    data.detail.filter(
      (d: any) =>
        d.benar
    ).length

  const salah =
    data.detail.length -
    benar

  const akurasi =
    Math.round(
      (benar /
        data.detail.length) *
      100
    )

  return (

    <MathJaxContext>
      <div className="min-h-screen bg-gray-100">

        {/* HEADER */}
        <div className="bg-blue-800 text-white p-6 flex justify-between items-center">

          <div>
            <p className="text-sm opacity-80">
              UJIAN{" "}
              {data.kategori?.toUpperCase()}
            </p>

            <h1 className="text-3xl font-bold">
              Review Jawaban
            </h1>
          </div>

          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="border px-4 py-2 rounded-xl hover:bg-white hover:text-blue-800 transition"
          >
            ← Dashboard
          </button>

        </div>

        <div className="max-w-7xl mx-auto p-6">

          {/* SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

            <Card
              title="Total Skor"
              value={data.skor}
              color="text-blue-700"
            />

            <Card
              title="Benar"
              value={benar}
              color="text-green-600"
            />

            <Card
              title="Salah"
              value={salah}
              color="text-red-600"
            />

            <Card
              title="Akurasi"
              value={`${akurasi}%`}
              color="text-yellow-600"
            />

          </div>

          {/* SOAL */}
          {data.detail.map(
            (
              item: any,
              i: number
            ) => {

              const isEmpty =
                !item.pembahasan ||
                item.pembahasan.trim() === "" ||
                item.pembahasan === "-"

              return (

                <div
                  key={i}
                  className="bg-white p-6 rounded-3xl mb-6 shadow-lg"
                >

                  {/* HEADER */}
                  <div className="flex justify-between items-start mb-4 gap-4">

                    <div>

                      <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-bold">
                        Soal {i + 1}
                      </span>

                      <div className="mt-4 text-lg font-semibold text-gray-800 leading-8">

                        <MathJax dynamic>
                          {item.soal}
                        </MathJax>

                      </div>

                    </div>

                    <span
                      className={`px-4 py-2 rounded-full text-sm font-bold ${
                        item.benar
                          ? "bg-green-200 text-green-700"
                          : "bg-red-200 text-red-700"
                      }`}
                    >
                      {item.benar
                        ? "✔ Benar"
                        : "✖ Salah"}
                    </span>

                  </div>

                  {/* JAWABAN */}
                  <div className="flex flex-wrap gap-3 mb-5">

                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-medium">
                      Jawaban Kamu:
                      {" "}
                      {item.jawaban_user || "-"}
                    </div>

                    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-medium">
                      Jawaban Benar:
                      {" "}
                      {item.jawaban_benar}
                    </div>

                  </div>

                  {/* PEMBAHASAN */}
                  {isEmpty ? (

                    <button
                      onClick={() =>
                        generateAI(
                          i,
                          item
                        )
                      }
                      className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-2xl font-semibold transition"
                    >
                      {aiLoading === i
                        ? "Loading AI..."
                        : "✨ Generate AI Pembahasan"}
                    </button>

                  ) : (

                    <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">

                      <h3 className="font-bold text-blue-700 mb-3">
                        📘 Pembahasan AI
                      </h3>

                      <div className="leading-8 text-gray-700 overflow-x-auto">

                        <MathJax dynamic>
                          {item.pembahasan}
                        </MathJax>

                      </div>

                    </div>

                  )}

                  {/* VIDEO */}
                  {item.video_url && (

                    <div className="mt-5">

                      <iframe
                        width="100%"
                        height="350"
                        src={getEmbedUrl(
                          item.video_url
                        )}
                        className="rounded-2xl"
                        allowFullScreen
                      />

                    </div>

                  )}

                </div>
              )
            }
          )}

        </div>
      </div>
    </MathJaxContext>
  )
}

function Card({
  title,
  value,
  color,
}: any) {

  return (

    <div className="bg-white p-5 rounded-2xl shadow text-center">

      <p className={`text-3xl font-bold ${color}`}>
        {value}
      </p>

      <p className="text-gray-500 mt-1">
        {title}
      </p>

    </div>
  )
}
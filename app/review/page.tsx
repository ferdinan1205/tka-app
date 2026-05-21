"use client"

import {
  useEffect,
  useState,
  memo,
  useMemo,
} from "react"

import { supabase } from "../../lib/supabase"

import { useRouter } from "next/navigation"

import {
  MathJax,
  MathJaxContext,
} from "better-react-mathjax"

// =========================
// TYPES
// =========================
type DetailItem = {
  soal: string
  jawaban_user: string
  jawaban_benar: string
  benar: boolean
  pembahasan?: string
}

type HasilType = {
  id: number
  kategori: string
  skor: number
  detail: DetailItem[]
}

// =========================
// MATH CONFIG
// =========================
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

    packages: {
      "[+]": ["ams"],
    },
  },

  options: {
    enableMenu: false,

    renderActions: {
      addMenu: [],
    },
  },

  chtml: {
    scale: 1,
    minScale: 0.5,
    matchFontHeight: false,
    mtextInheritFont: true,
  },
}

// =========================
// FORMAT HTML
// =========================
function formatText(
  text: string
) {
  if (!text) return ""

  let result = text

  result = result.replace(
    /&nbsp;/g,
    " "
  )

  result = result.replace(
    /<p>/gi,
    "<div>"
  )

  result = result.replace(
    /<\/p>/gi,
    "</div>"
  )

  result = result.replace(
    /<br\s*\/?>/gi,
    "<br/>"
  )

  result = result.replace(
    /<table/gi,
    `<table class="w-full border-collapse my-3 text-sm overflow-auto block">`
  )

  result = result.replace(
    /<td/gi,
    `<td class="border border-slate-300 px-2 py-1 align-top break-words" `
  )

  result = result.replace(
    /<th/gi,
    `<th class="border border-slate-300 px-2 py-1 bg-slate-100 font-bold" `
  )

  result = result.replace(
    /<img/gi,
    `<img class="max-w-full h-auto rounded-2xl my-4 border border-slate-200 shadow-sm" `
  )

  return result
}

// =========================
// EXTRACT IMAGE URL
// =========================
function extractImages(
  html: string
) {
  if (!html) return []

  const regex =
    /<img[^>]+src="([^">]+)"/g

  const images: string[] = []

  let match

  while (
    (match = regex.exec(html)) !== null
  ) {
    images.push(match[1])
  }

  return images
}

// =========================
// MATH CONTENT
// =========================
const MathContent = memo(
  ({
    html,
    className = "",
  }: {
    html: string
    className?: string
  }) => {
    const formatted =
      useMemo(
        () => formatText(html),
        [html]
      )

    return (
      <div
        className={`
          overflow-x-auto
          break-words
          whitespace-normal
          ${className}
        `}
      >
        <MathJax dynamic>
          <div
            dangerouslySetInnerHTML={{
              __html: formatted,
            }}
          />
        </MathJax>
      </div>
    )
  }
)

MathContent.displayName =
  "MathContent"

// =========================
// MAIN PAGE
// =========================
export default function Review() {
  const router = useRouter()

  const [data, setData] =
    useState<HasilType | null>(
      null
    )

  const [loading, setLoading] =
    useState(true)

  const [aiLoading, setAiLoading] =
    useState<number | null>(null)

  const [expanded, setExpanded] =
    useState<number[]>([])

  useEffect(() => {
    getLastResult()
  }, [])

  // =========================
  // GET DATA
  // =========================
  async function getLastResult() {
    try {
      const {
        data: userData,
      } =
        await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/login")
        return
      }

      const { data, error } =
        await supabase
          .from("hasil")
          .select("*")
          .eq(
            "user_id",
            userData.user.id
          )
          .order(
            "id",
            {
              ascending: false,
            }
          )
          .limit(1)
          .single()

      if (error) {
        console.error(error)
        return
      }

      setData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // GENERATE AI
  // =========================
  async function generateAI(
    index: number,
    item: DetailItem
  ) {
    try {
      setAiLoading(index)

      const images =
        extractImages(item.soal)

      const res =
        await fetch(
          "/api/ai",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              soal: item.soal,
              jawaban_benar:
                item.jawaban_benar,
              images,
            }),
          }
        )

      const result =
        await res.json()

      if (!result?.text) {
        alert(
          "Pembahasan AI gagal dibuat"
        )
        return
      }

      if (!data) return

      const updated =
        [...data.detail]

      updated[index] = {
        ...updated[index],
        pembahasan:
          result.text,
      }

      setData({
        ...data,
        detail: updated,
      })

      setExpanded((prev) => [
        ...prev,
        index,
      ])
    } catch (err) {
      console.error(err)

      alert(
        "Gagal generate AI"
      )
    } finally {
      setAiLoading(null)
    }
  }

  // =========================
  // TOGGLE
  // =========================
  function toggleExpand(
    index: number
  ) {
    setExpanded((prev) =>
      prev.includes(index)
        ? prev.filter(
            (i) => i !== index
          )
        : [...prev, index]
    )
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // =========================
  // EMPTY
  // =========================
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-semibold">
        Tidak ada hasil ujian
      </div>
    )
  }

  // =========================
  // STATS
  // =========================
  const benar =
    data.detail.filter(
      (d) => d.benar
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

  // =========================
  // PAGE
  // =========================
  return (
    <MathJaxContext
      config={mathJaxConfig}
    >
      <div className="min-h-screen bg-slate-100 pb-10">

        {/* =========================
            HEADER
        ========================= */}
        <div className="sticky top-0 z-50 bg-blue-700 shadow-lg">

          <div className="max-w-5xl mx-auto px-4 py-3">

            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="text-[10px] uppercase tracking-widest text-blue-200">
                  Hasil Ujian
                </p>

                <h1 className="text-sm md:text-2xl font-black text-white truncate">
                  {data.kategori}
                </h1>

              </div>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="
                  h-10
                  px-4
                  rounded-xl
                  bg-white
                  text-blue-700
                  text-xs
                  md:text-sm
                  font-black
                  active:scale-95
                  transition-all
                "
              >
                Dashboard
              </button>

            </div>

          </div>

        </div>

        {/* =========================
            CONTENT
        ========================= */}
        <div className="max-w-5xl mx-auto px-3 md:px-5 py-4">

          {/* =========================
              STATS
          ========================= */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">

            <Card
              title="Skor"
              value={data.skor}
              bg="bg-blue-100"
              color="text-blue-700"
            />

            <Card
              title="Benar"
              value={benar}
              bg="bg-green-100"
              color="text-green-700"
            />

            <Card
              title="Salah"
              value={salah}
              bg="bg-red-100"
              color="text-red-700"
            />

            <Card
              title="Akurasi"
              value={`${akurasi}%`}
              bg="bg-yellow-100"
              color="text-yellow-700"
            />

          </div>

          {/* =========================
              REVIEW LIST
          ========================= */}
          <div className="space-y-4">

            {data.detail.map(
              (
                item,
                i
              ) => {

                const isExpanded =
                  expanded.includes(i)

                return (

                  <div
                    key={i}
                    className="
                      bg-white
                      rounded-3xl
                      border
                      border-slate-200
                      shadow-sm
                      overflow-hidden
                    "
                  >

                    {/* HEADER */}
                    <div className="
                      px-4
                      py-3
                      border-b
                      border-slate-100
                      flex
                      items-center
                      justify-between
                      gap-3
                    ">

                      <div className="flex items-center gap-3">

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
                          text-sm
                        ">
                          {i + 1}
                        </div>

                        <div>

                          <p className="
                            text-[10px]
                            uppercase
                            text-slate-400
                          ">
                            Soal
                          </p>

                          <h2 className="
                            text-sm
                            font-black
                            text-slate-700
                          ">
                            Review Jawaban
                          </h2>

                        </div>

                      </div>

                      {item.benar ? (

                        <div className="
                          px-3
                          py-1.5
                          rounded-full
                          bg-green-100
                          text-green-700
                          text-[11px]
                          font-bold
                        ">
                          ✔ Benar
                        </div>

                      ) : (

                        <div className="
                          px-3
                          py-1.5
                          rounded-full
                          bg-red-100
                          text-red-700
                          text-[11px]
                          font-bold
                        ">
                          ✖ Salah
                        </div>

                      )}

                    </div>

                    {/* BODY */}
                    <div className="p-4 md:p-6">

                      {/* SOAL */}
                      <div className="
                        bg-slate-50
                        border
                        border-slate-200
                        rounded-2xl
                        p-4
                        mb-4
                      ">

                        <MathContent
                          html={item.soal}
                          className="
                            text-[14px]
                            md:text-[16px]
                            leading-[1.9]
                            text-slate-800
                          "
                        />

                      </div>

                      {/* JAWABAN */}
                      <div className="
                        grid
                        grid-cols-1
                        md:grid-cols-2
                        gap-3
                        mb-4
                      ">

                        <div className="
                          bg-slate-100
                          rounded-2xl
                          p-4
                        ">

                          <p className="
                            text-[11px]
                            text-slate-500
                            mb-1
                          ">
                            Jawaban Kamu
                          </p>

                          <h2 className="
                            text-lg
                            font-black
                            text-slate-700
                          ">
                            {item.jawaban_user || "-"}
                          </h2>

                        </div>

                        <div className="
                          bg-green-100
                          rounded-2xl
                          p-4
                        ">

                          <p className="
                            text-[11px]
                            text-green-700
                            mb-1
                          ">
                            Jawaban Benar
                          </p>

                          <h2 className="
                            text-lg
                            font-black
                            text-green-700
                          ">
                            {item.jawaban_benar}
                          </h2>

                        </div>

                      </div>

                      {/* AI */}
                      {!item.pembahasan ? (

                        <button
                          onClick={() =>
                            generateAI(
                              i,
                              item
                            )
                          }
                          disabled={
                            aiLoading === i
                          }
                          className="
                            w-full
                            h-12
                            rounded-2xl
                            bg-blue-700
                            text-white
                            text-sm
                            font-black
                            disabled:opacity-60
                            active:scale-[0.98]
                            transition-all
                          "
                        >

                          {aiLoading === i

                            ? "⏳ AI sedang membuat pembahasan..."

                            : "✨ Generate Pembahasan AI"}

                        </button>

                      ) : (

                        <div className="
                          bg-blue-50
                          border
                          border-blue-200
                          rounded-2xl
                          overflow-hidden
                        ">

                          <button
                            onClick={() =>
                              toggleExpand(i)
                            }
                            className="
                              w-full
                              px-4
                              py-3
                              flex
                              items-center
                              justify-between
                              text-left
                            "
                          >

                            <div className="
                              flex
                              items-center
                              gap-3
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
                              ">
                                📘
                              </div>

                              <div>

                                <p className="
                                  text-[10px]
                                  uppercase
                                  text-blue-500
                                ">
                                  AI
                                </p>

                                <h2 className="
                                  text-sm
                                  font-black
                                  text-blue-900
                                ">
                                  Pembahasan
                                </h2>

                              </div>

                            </div>

                            <div className="
                              text-blue-700
                              text-xl
                              font-black
                            ">
                              {isExpanded
                                ? "−"
                                : "+"}
                            </div>

                          </button>

                          {isExpanded && (

                            <div className="
                              px-4
                              pb-4
                            ">

                              <MathContent
                                html={
                                  item.pembahasan
                                }
                                className="
                                  text-[14px]
                                  md:text-[15px]
                                  leading-[1.9]
                                  text-slate-700
                                "
                              />

                            </div>

                          )}

                        </div>

                      )}

                    </div>

                  </div>

                )
              }
            )}

          </div>

        </div>

      </div>
    </MathJaxContext>
  )
}

// =========================
// CARD COMPONENT
// =========================
function Card({
  title,
  value,
  bg,
  color,
}: {
  title: string
  value: string | number
  bg: string
  color: string
}) {
  return (
    <div
      className={`
        ${bg}
        rounded-3xl
        px-3
        py-4
        text-center
        border
        border-white/50
      `}
    >

      <h1
        className={`
          ${color}
          text-2xl
          md:text-4xl
          font-black
          leading-none
        `}
      >
        {value}
      </h1>

      <p className="
        mt-2
        text-[11px]
        md:text-sm
        font-bold
        text-slate-600
      ">
        {title}
      </p>

    </div>
  )
}
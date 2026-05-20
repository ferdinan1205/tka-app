"use client"

import {
  useEffect,
  useState,
  memo,
} from "react"

import { supabase } from "../../lib/supabase"

import { useRouter } from "next/navigation"

import {
  MathJax,
  MathJaxContext,
} from "better-react-mathjax"

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
    /<img/gi,
    `<img class="max-w-full h-auto rounded-xl my-3 border border-slate-200" `
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

  const images = []

  let match

  while (
    (match = regex.exec(html)) !== null
  ) {

    images.push(match[1])
  }

  return images
}

// =========================
// SAFE MATH COMPONENT
// =========================
const MathContent = memo(
  ({
    html,
    className = "",
  }: {
    html: string
    className?: string
  }) => {

    return (

      <div
        className={`
          overflow-x-auto
          break-words
          whitespace-normal
          ${className}
        `}
      >

        <MathJax>

          <div
            dangerouslySetInnerHTML={{
              __html:
                formatText(html),
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

  const [data, setData] =
    useState<any>(null)

  const [loading, setLoading] =
    useState(true)

  const [aiLoading, setAiLoading] =
    useState<number | null>(null)

  const router = useRouter()

  useEffect(() => {

    getLastResult()

  }, [])

  // =========================
  // GET DATA
  // =========================
  async function getLastResult() {

    const {
      data: userData,
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
        .order(
          "id",
          {
            ascending: false,
          }
        )
        .limit(1)

    setData(
      data?.[0] || null
    )

    setLoading(false)
  }

  // =========================
  // GENERATE AI
  // =========================
  async function generateAI(
    index: number,
    item: any
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

      const updated = [
        ...data.detail,
      ]

      updated[index] = {

        ...updated[index],

        pembahasan:
          result.text,
      }

      setData({

        ...data,

        detail: updated,
      })

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
  // LOADING
  // =========================
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
          border-blue-600
          border-t-transparent
          rounded-full
          animate-spin
        " />

      </div>

    )
  }

  // =========================
  // EMPTY
  // =========================
  if (!data) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-slate-100
        text-slate-500
      ">

        Tidak ada data

      </div>

    )
  }

  const benar =
    data.detail.filter(
      (d: any) => d.benar
    ).length

  const salah =
    data.detail.length -
    benar

  const akurasi =
    Math.round(
      (
        benar /
        data.detail.length
      ) * 100
    )

  return (

    <MathJaxContext
      config={mathJaxConfig}
    >

      <div className="
        min-h-screen
        bg-slate-100
        pb-10
      ">

        {/* =========================
            HEADER
        ========================= */}
        <div className="
          sticky
          top-0
          z-50
          bg-blue-700
          shadow-lg
        ">

          <div className="
            max-w-5xl
            mx-auto
            px-3
            py-3
          ">

            <div className="
              flex
              items-center
              justify-between
              gap-3
            ">

              <div className="min-w-0">

                <p className="
                  text-[10px]
                  uppercase
                  tracking-widest
                  text-blue-200
                ">
                  Hasil Ujian
                </p>

                <h1 className="
                  text-sm
                  md:text-2xl
                  font-black
                  text-white
                  truncate
                ">
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
                  h-9
                  px-3
                  rounded-xl
                  bg-white
                  text-blue-700
                  text-xs
                  font-bold
                  shrink-0
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
        <div className="
          max-w-5xl
          mx-auto
          px-2
          md:px-5
          py-3
        ">

          {/* =========================
              CARD STATS
          ========================= */}
          <div className="
            grid
            grid-cols-4
            gap-2
            mb-4
          ">

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
          {data.detail.map(
            (
              item: any,
              i: number
            ) => {

              const isEmpty =
                !item.pembahasan

              return (

                <div
                  key={i}
                  className="
                    bg-white
                    rounded-2xl
                    border
                    border-slate-200
                    shadow-sm
                    mb-3
                    overflow-hidden
                  "
                >

                  {/* TOP */}
                  <div className="
                    px-3
                    py-2.5
                    border-b
                    border-slate-100
                    flex
                    items-center
                    justify-between
                    gap-2
                  ">

                    <div className="
                      flex
                      items-center
                      gap-2
                    ">

                      <div className="
                        w-8
                        h-8
                        rounded-xl
                        bg-blue-700
                        text-white
                        text-xs
                        font-black
                        flex
                        items-center
                        justify-center
                      ">
                        {i + 1}
                      </div>

                      <div>

                        <p className="
                          text-[10px]
                          text-slate-400
                          uppercase
                        ">
                          Soal
                        </p>

                        <p className="
                          text-xs
                          font-bold
                          text-slate-700
                        ">
                          Review
                        </p>

                      </div>

                    </div>

                    {item.benar ? (

                      <div className="
                        px-2.5
                        py-1
                        rounded-full
                        bg-green-100
                        text-green-700
                        text-[10px]
                        font-bold
                      ">
                        ✔ Benar
                      </div>

                    ) : (

                      <div className="
                        px-2.5
                        py-1
                        rounded-full
                        bg-orange-100
                        text-orange-700
                        text-[10px]
                        font-bold
                      ">
                        ✖ Salah
                      </div>

                    )}

                  </div>

                  {/* CONTENT */}
                  <div className="
                    p-3
                    md:p-5
                  ">

                    {/* SOAL */}
                    <div className="
                      bg-slate-50
                      border
                      border-slate-200
                      rounded-2xl
                      p-3
                      md:p-5
                      mb-3
                    ">

                      <MathContent
                        html={item.soal}
                        className="
                          text-[13px]
                          md:text-[16px]
                          leading-[1.8]
                          text-slate-800
                          font-medium
                        "
                      />

                    </div>

                    {/* JAWABAN */}
                    <div className="
                      flex
                      flex-col
                      sm:flex-row
                      gap-2
                      mb-3
                    ">

                      <div className="
                        flex-1
                        bg-slate-100
                        rounded-xl
                        px-3
                        py-2
                      ">

                        <p className="
                          text-[10px]
                          text-slate-500
                          mb-1
                        ">
                          Jawaban Kamu
                        </p>

                        <p className="
                          text-sm
                          font-black
                          text-slate-700
                        ">
                          {item.jawaban_user || "-"}
                        </p>

                      </div>

                      <div className="
                        flex-1
                        bg-green-100
                        rounded-xl
                        px-3
                        py-2
                      ">

                        <p className="
                          text-[10px]
                          text-green-700
                          mb-1
                        ">
                          Jawaban Benar
                        </p>

                        <p className="
                          text-sm
                          font-black
                          text-green-700
                        ">
                          {item.jawaban_benar}
                        </p>

                      </div>

                    </div>

                    {/* AI */}
                    {isEmpty ? (

                      <button
                        onClick={() =>
                          generateAI(
                            i,
                            item
                          )
                        }
                        className="
                          w-full
                          h-11
                          rounded-2xl
                          bg-blue-700
                          text-white
                          text-sm
                          font-bold
                          active:scale-[0.98]
                          transition-all
                        "
                      >

                        {aiLoading === i

                          ?

                          "⏳ AI sedang berpikir..."

                          :

                          "✨ Generate Pembahasan AI"
                        }

                      </button>

                    ) : (

                      <div className="
                        bg-blue-50
                        border
                        border-blue-200
                        rounded-2xl
                        p-3
                        md:p-5
                      ">

                        <div className="
                          flex
                          items-center
                          gap-2
                          mb-3
                        ">

                          <div className="
                            w-8
                            h-8
                            rounded-xl
                            bg-blue-700
                            text-white
                            flex
                            items-center
                            justify-center
                            text-sm
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

                        <MathContent
                          html={
                            item.pembahasan
                          }
                          className="
                            text-[13px]
                            md:text-[15px]
                            leading-[1.9]
                            text-slate-700
                          "
                        />

                      </div>

                    )}

                  </div>

                </div>

              )
            })
          }

        </div>

      </div>

    </MathJaxContext>

  )
}

// =========================
// CARD
// =========================
function Card({
  title,
  value,
  bg,
  color,
}: any) {

  return (

    <div
      className={`
        ${bg}
        rounded-2xl
        px-2
        py-3
        text-center
        border
        border-white/40
      `}
    >

      <h1
        className={`
          ${color}
          text-lg
          md:text-3xl
          font-black
          leading-none
        `}
      >

        {value}

      </h1>

      <p className="
        mt-1
        text-[10px]
        md:text-sm
        font-semibold
        text-slate-600
        truncate
      ">

        {title}

      </p>

    </div>

  )
}
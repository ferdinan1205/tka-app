"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type Ranking = {
  user_id: string
  nama: string
  email: string
  skor: number
  kategori: string
  tanggal: string
  foto?: string
}

type Profile = {
  id: string
  nama: string
  email: string
  foto?: string
}

type Hasil = {
  id: number
  skor: number
  tanggal: string
  user_id: string
  kategori: string
}

export default function RankingPage() {

  const router = useRouter()

  const [ranking,
    setRanking] =
    useState<Ranking[]>([])

  const [kategori,
    setKategori] =
    useState("Matematika")

  const [loading,
    setLoading] =
    useState(true)

  const [userId,
    setUserId] =
    useState("")

  const listKategori = [
    "Matematika",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "TPS",
    "Literasi",
  ]

  useEffect(() => {
    init()
  }, [kategori])

  async function init() {

    const { data } =
      await supabase.auth.getUser()

    if (!data.user) {

      router.push("/login")
      return
    }

    setUserId(data.user.id)

    await getRanking()

    setLoading(false)
  }

  async function getRanking() {

    /* AMBIL HASIL */
    const {
      data: hasilData
    } = await supabase
      .from("hasil")
      .select("*")
      .eq("kategori", kategori)
      .order("skor", {
        ascending: false
      })

    /* AMBIL PROFILE */
    const {
      data: profileData
    } = await supabase
      .from("profiles")
      .select("*")

    const hasil =
      (hasilData as Hasil[]) || []

    const profiles =
      (profileData as Profile[]) || []

    /* DEBUG */
    console.log("PROFILE:", profiles)

    /* AMBIL SKOR TERBAIK */
    const bestScoreMap:
      { [key: string]: Hasil } = {}

    hasil.forEach((item) => {

      if (
        !bestScoreMap[item.user_id] ||
        item.skor >
        bestScoreMap[item.user_id].skor
      ) {

        bestScoreMap[item.user_id] = item
      }
    })

    /* GABUNGKAN PROFILE + HASIL */
    const finalRanking:
      Ranking[] =
      Object.values(bestScoreMap)

        .map((item) => {

          const profile =
            profiles.find(
              (p) =>
                p.id === item.user_id
            )

          return {

            user_id:
              item.user_id,

            skor:
              item.skor,

            kategori:
              item.kategori,

            tanggal:
              item.tanggal,

            nama:
              profile?.nama ||
              "Tanpa Nama",

            email:
              profile?.email || "-",

            foto:
              profile?.foto || ""
          }
        })

        .sort(
          (a, b) =>
            b.skor - a.skor
        )

    setRanking(
      finalRanking.slice(0, 10)
    )
  }

  if (loading) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#f4f7fb]
      ">

        <div className="
          text-2xl
          font-bold
          text-blue-700
        ">
          Loading...
        </div>

      </div>
    )
  }

  const juara1 = ranking[0]
  const juara2 = ranking[1]
  const juara3 = ranking[2]

  return (

    <div className="
      min-h-screen
      bg-[#f4f7fb]
    ">

      {/* HEADER */}
      <div className="
        bg-white
        border-b
        border-gray-200
        sticky top-0
        z-30
      ">

        <div className="
          max-w-7xl
          mx-auto
          px-5 py-5
          flex
          items-center
          justify-between
        ">

          <div>

            <p className="
              text-blue-600
              text-sm
              font-semibold
              tracking-wide
            ">
              LAMPUNG CERDAS
            </p>

            <h1 className="
              text-3xl
              font-black
              text-gray-800
              mt-1
            ">
              Ranking Akademik
            </h1>

          </div>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              px-5 py-3
              rounded-2xl
              font-semibold
              transition-all
            "
          >
            ← Dashboard
          </button>

        </div>

      </div>

      {/* CONTENT */}
      <div className="
        max-w-7xl
        mx-auto
        p-5
      ">

        {/* FILTER */}
        <div className="
          flex flex-wrap
          gap-3
          mb-6
        ">

          {listKategori.map((item) => (

            <button
              key={item}
              onClick={() =>
                setKategori(item)
              }
              className={`
                px-5 py-3
                rounded-2xl
                text-sm
                font-semibold
                transition-all

                ${kategori === item

                  ? `
                    bg-blue-600
                    text-white
                    shadow-md
                  `

                  : `
                    bg-white
                    border
                    text-gray-700
                    hover:border-blue-300
                  `
                }
              `}
            >
              {item}
            </button>

          ))}

        </div>

        {/* TOP 3 */}
        <div className="
          bg-white
          rounded-[35px]
          p-5 md:p-8
          shadow-sm
          mb-6
        ">

          <div className="
            flex flex-col
            md:flex-row
            items-end
            justify-center
            gap-5
          ">

            {juara2 && (
              <TopCard
                data={juara2}
                rank={2}
              />
            )}

            {juara1 && (
              <TopCard
                data={juara1}
                rank={1}
                big
              />
            )}

            {juara3 && (
              <TopCard
                data={juara3}
                rank={3}
              />
            )}

          </div>

        </div>

        {/* LIST RANK */}
        <div className="
          bg-white
          rounded-[35px]
          shadow-sm
          overflow-hidden
        ">

          <div className="
            px-6 py-5
            border-b
            border-gray-100
          ">

            <h2 className="
              text-2xl
              font-black
              text-gray-800
            ">
              Top 10 Siswa
            </h2>

          </div>

          <div className="
            p-4
            space-y-3
          ">

            {ranking.map((
              item,
              index
            ) => {

              const isMe =
                item.user_id === userId

              return (

                <div
                  key={index}
                  className={`
                    flex
                    items-center
                    justify-between
                    rounded-3xl
                    p-4
                    transition-all

                    ${isMe

                      ? `
                        bg-blue-50
                        border-2
                        border-blue-500
                      `

                      : `
                        bg-[#f8fafc]
                      `
                    }
                  `}
                >

                  {/* LEFT */}
                  <div className="
                    flex
                    items-center
                    gap-4
                    min-w-0
                  ">

                    {/* NOMOR */}
                    <div className={`
                      w-12 h-12
                      rounded-2xl
                      flex
                      items-center
                      justify-center
                      font-black
                      text-lg
                      shrink-0

                      ${index === 0

                        ? "bg-yellow-400 text-white"

                        : index === 1

                        ? "bg-blue-500 text-white"

                        : index === 2

                        ? "bg-gray-400 text-white"

                        : "bg-white border text-gray-700"}
                    `}>

                      {index + 1}

                    </div>

                    {/* FOTO */}
                    {item.foto ? (

                      <img
                        src={item.foto}
                        alt="foto"
                        className="
                          w-14 h-14
                          rounded-full
                          object-cover
                          border-2
                          border-white
                          shadow-sm
                          shrink-0
                        "
                      />

                    ) : (

                      <div className="
                        w-14 h-14
                        rounded-full
                        bg-blue-600
                        text-white
                        flex
                        items-center
                        justify-center
                        font-bold
                        text-lg
                        shrink-0
                      ">

                        {item.nama
                          .slice(0, 2)
                          .toUpperCase()}

                      </div>

                    )}

                    {/* INFO */}
                    <div className="
                      min-w-0
                    ">

                      <div className="
                        flex
                        items-center
                        gap-2
                        flex-wrap
                      ">

                        <p className="
                          font-bold
                          text-gray-800
                          truncate
                        ">
                          {item.nama}
                        </p>

                        {isMe && (

                          <span className="
                            bg-blue-600
                            text-white
                            text-xs
                            px-3 py-1
                            rounded-full
                            font-semibold
                          ">
                            Kamu
                          </span>

                        )}

                      </div>

                      <p className="
                        text-sm
                        text-gray-500
                        truncate
                      ">
                        {item.email}
                      </p>

                    </div>

                  </div>

                  {/* SCORE */}
                  <div className="
                    text-right
                    shrink-0
                  ">

                    <p className="
                      text-3xl
                      font-black
                      text-blue-700
                    ">
                      {item.skor}
                    </p>

                    <p className="
                      text-sm
                      text-gray-500
                    ">
                      Nilai
                    </p>

                  </div>

                </div>

              )
            })}

          </div>

        </div>

      </div>

    </div>
  )
}

/* TOP CARD */
function TopCard({
  data,
  rank,
  big
}: any) {

  const bg =
    rank === 1

      ? "from-yellow-400 to-yellow-500"

      : rank === 2

      ? "from-blue-500 to-blue-600"

      : "from-gray-400 to-gray-500"

  return (

    <div className={`
      relative
      rounded-[35px]
      bg-gradient-to-b
      ${bg}
      text-white
      text-center
      shadow-xl

      ${big

        ? `
          w-full
          md:w-[320px]
          py-10
        `

        : `
          w-full
          md:w-[270px]
          py-8
        `
      }
    `}>

      {/* RANK */}
      <div className="
        absolute
        top-4 right-4
        w-12 h-12
        rounded-2xl
        bg-white/20
        flex
        items-center
        justify-center
        font-black
        text-xl
      ">

        #{rank}

      </div>

      {/* FOTO */}
      {data.foto ? (

        <img
          src={data.foto}
          alt="foto"
          className={`
            mx-auto
            rounded-full
            object-cover
            border-4
            border-white
            shadow-lg

            ${big

              ? "w-32 h-32"

              : "w-28 h-28"}
          `}
        />

      ) : (

        <div className={`
          mx-auto
          rounded-full
          bg-white/20
          flex
          items-center
          justify-center
          font-black
          border-4
          border-white

          ${big

            ? `
              w-32 h-32
              text-4xl
            `

            : `
              w-28 h-28
              text-3xl
            `
          }
        `}>

          {data.nama
            .slice(0, 2)
            .toUpperCase()}

        </div>

      )}

      {/* NAMA */}
      <h2 className="
        mt-5
        text-2xl
        font-black
        truncate
        px-4
      ">
        {data.nama}
      </h2>

      <p className="
        text-white/80
        text-sm
        px-6
        truncate
      ">
        {data.email}
      </p>

      {/* SCORE */}
      <div className="
        mt-6
        bg-white/20
        mx-6
        rounded-3xl
        py-4
      ">

        <p className="
          text-sm
        ">
          Nilai
        </p>

        <h1 className="
          text-5xl
          font-black
          mt-1
        ">
          {data.skor}
        </h1>

      </div>

    </div>

  )
}
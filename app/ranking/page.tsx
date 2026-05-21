"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type Ranking = {
  id: number
  user_id: string
  total_skor: number
  jumlah_ujian: number
  selesai: boolean
  nama: string
  email: string
  foto?: string
  paket?: string
}

type Profile = {
  id: string
  nama: string
  email: string
  foto?: string
  paket?: string
}

export default function RankingPage() {

  const router = useRouter()

  const [ranking, setRanking] =
    useState<Ranking[]>([])

  const [loading, setLoading] =
    useState(true)

  const [userId, setUserId] =
    useState("")

  useEffect(() => {
    init()
  }, [])

  async function init() {

    setLoading(true)

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

    // =========================
    // AMBIL RANKING TKA
    // =========================
    const {
      data: rankingData,
      error: rankingError
    } = await supabase
      .from("ranking_tka")
      .select("*")
      .eq("selesai", true)
      .order("total_skor", {
        ascending: false
      })

    if (rankingError) {

      console.log(rankingError)
      return
    }

    // =========================
    // AMBIL PROFILE
    // =========================
    const {
      data: profileData,
      error: profileError
    } = await supabase
      .from("profiles")
      .select("*")

    if (profileError) {

      console.log(profileError)
      return
    }

    const profiles =
      (profileData as Profile[]) || []

    const finalRanking =
      (rankingData || []).map((item: any) => {

        const profile =
          profiles.find(
            (p) =>
              p.id === item.user_id
          )

        return {

          id: item.id,

          user_id: item.user_id,

          total_skor:
            item.total_skor || 0,

          jumlah_ujian:
            item.jumlah_ujian || 0,

          selesai:
            item.selesai,

          nama:
            profile?.nama ||
            "Tanpa Nama",

          email:
            profile?.email || "-",

          foto:
            profile?.foto || "",

          paket:
            profile?.paket || "-"
        }
      })

    setRanking(finalRanking)
  }

  if (loading) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#f3f7ff]
      ">

        <div className="
          flex
          flex-col
          items-center
          gap-4
        ">

          <div className="
            w-14
            h-14
            rounded-full
            border-[5px]
            border-blue-600
            border-t-transparent
            animate-spin
          " />

          <p className="
            text-blue-700
            font-bold
          ">
            Loading Ranking...
          </p>

        </div>

      </div>
    )
  }

  const top1 = ranking[0]
  const top2 = ranking[1]
  const top3 = ranking[2]

  return (

    <div className="
      min-h-screen
      bg-gradient-to-b
      from-[#eef4ff]
      to-[#f8fbff]
      pb-28
    ">

      {/* HEADER */}
      <div className="
        sticky
        top-0
        z-50
        backdrop-blur-xl
        bg-white/80
        border-b
      ">

        <div className="
          max-w-6xl
          mx-auto
          px-4
          py-4
          flex
          items-center
          justify-between
        ">

          <div>

            <p className="
              text-xs
              font-black
              tracking-[4px]
              text-blue-600
            ">
              LAMPUNG CERDAS
            </p>

            <h1 className="
              text-3xl
              md:text-4xl
              font-black
              text-slate-800
            ">
              Ranking TKA
            </h1>

          </div>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="
              h-11
              px-5
              rounded-2xl
              bg-blue-600
              text-white
              text-sm
              font-bold
            "
          >
            Dashboard
          </button>

        </div>

      </div>

      <div className="
        max-w-6xl
        mx-auto
        px-4
        pt-6
      ">

        {/* PODIUM */}
        <div className="
          grid
          grid-cols-3
          gap-4
          items-end
          mb-8
        ">

          {top2 && (
            <PodiumCard
              data={top2}
              rank={2}
            />
          )}

          {top1 && (
            <PodiumCard
              data={top1}
              rank={1}
              big
            />
          )}

          {top3 && (
            <PodiumCard
              data={top3}
              rank={3}
            />
          )}

        </div>

        {/* LIST */}
        <div className="space-y-4">

          {ranking.map((item, index) => {

            const isMe =
              item.user_id === userId

            return (

              <div
                key={item.id}
                className={`
                  bg-white
                  rounded-3xl
                  p-4
                  flex
                  items-center
                  justify-between
                  shadow-sm
                  border

                  ${isMe
                    ? "border-blue-500"
                    : "border-white"
                  }
                `}
              >

                <div className="
                  flex
                  items-center
                  gap-4
                ">

                  {/* RANK */}
                  <div className="
                    w-12
                    h-12
                    rounded-2xl
                    bg-blue-600
                    text-white
                    flex
                    items-center
                    justify-center
                    font-black
                  ">
                    #{index + 1}
                  </div>

                  {/* FOTO */}
                  {item.foto ? (

                    <img
                      src={item.foto}
                      alt="foto"
                      className="
                        w-14
                        h-14
                        rounded-full
                        object-cover
                      "
                    />

                  ) : (

                    <div className="
                      w-14
                      h-14
                      rounded-full
                      bg-blue-600
                      text-white
                      flex
                      items-center
                      justify-center
                      font-black
                    ">

                      {item.nama
                        .slice(0, 2)
                        .toUpperCase()}

                    </div>

                  )}

                  {/* INFO */}
                  <div>

                    <div className="
                      flex
                      items-center
                      gap-2
                    ">

                      <h1 className="
                        font-black
                        text-slate-800
                      ">
                        {item.nama}
                      </h1>

                      {isMe && (

                        <span className="
                          bg-blue-600
                          text-white
                          text-[10px]
                          px-2
                          py-1
                          rounded-full
                          font-bold
                        ">
                          Kamu
                        </span>

                      )}

                    </div>

                    <p className="
                      text-sm
                      text-slate-500
                    ">
                      {item.email}
                    </p>

                    <p className="
                      text-xs
                      text-blue-600
                      font-bold
                      mt-1
                    ">
                      Ujian selesai:
                      {" "}
                      {item.jumlah_ujian}/4
                    </p>

                  </div>

                </div>

                {/* SCORE */}
                <div className="text-right">

                  <h1 className="
                    text-4xl
                    font-black
                    text-blue-700
                  ">
                    {item.total_skor}
                  </h1>

                  <p className="
                    text-xs
                    text-slate-500
                  ">
                    total skor
                  </p>

                </div>

              </div>

            )
          })}

        </div>

      </div>

    </div>
  )
}

/* =========================
   PODIUM
========================= */
function PodiumCard({
  data,
  rank,
  big
}: any) {

  const bg =
    rank === 1
      ? "from-yellow-400 to-orange-500"
      : rank === 2
      ? "from-blue-500 to-indigo-600"
      : "from-slate-500 to-slate-700"

  return (

    <div className={`
      rounded-[32px]
      bg-gradient-to-b
      ${bg}
      text-white
      shadow-xl
      relative
      overflow-hidden

      ${big
        ? "pt-7 pb-8"
        : "pt-5 pb-6"
      }
    `}>

      <div className="
        absolute
        top-3
        right-3
        w-9
        h-9
        rounded-2xl
        bg-white/20
        flex
        items-center
        justify-center
        font-black
      ">
        #{rank}
      </div>

      <div className="
        flex
        justify-center
      ">

        {data.foto ? (

          <img
            src={data.foto}
            alt="foto"
            className={`
              rounded-full
              border-4
              border-white
              object-cover

              ${big
                ? "w-24 h-24"
                : "w-20 h-20"
              }
            `}
          />

        ) : (

          <div className={`
            rounded-full
            border-4
            border-white
            bg-white/20
            flex
            items-center
            justify-center
            font-black

            ${big
              ? "w-24 h-24 text-3xl"
              : "w-20 h-20 text-2xl"
            }
          `}>

            {data.nama
              .slice(0, 2)
              .toUpperCase()}

          </div>

        )}

      </div>

      <div className="
        text-center
        mt-4
        px-3
      ">

        <h1 className={`
          font-black
          truncate

          ${big
            ? "text-xl"
            : "text-base"
          }
        `}>
          {data.nama}
        </h1>

        <p className="
          text-white/80
          text-xs
          truncate
        ">
          {data.email}
        </p>

      </div>

      <div className="
        text-center
        mt-4
      ">

        <p className="
          text-xs
          text-white/80
        ">
          TOTAL SKOR
        </p>

        <h1 className={`
          font-black

          ${big
            ? "text-5xl"
            : "text-3xl"
          }
        `}>
          {data.total_skor}
        </h1>

      </div>

    </div>
  )
}
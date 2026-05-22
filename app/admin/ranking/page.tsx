"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type Ranking = {
  user_id: string
  email: string
  nama: string
  skor: number
  kategori: string
  foto?: string
}

export default function RankingAdmin() {

  const router = useRouter()

  const [ranking, setRanking] =
    useState<Ranking[]>([])

  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
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

    // =========================
    // CEK ADMIN
    // =========================
    const { data: profile } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()

    if (
      !profile ||
      profile.role !== "admin"
    ) {

      alert("Akses ditolak")

      router.push("/dashboard")

      return
    }

    await getRanking()

    setLoading(false)
  }

  // =========================
  // GET RANKING
  // =========================
  async function getRanking() {

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
      (profileData || []) as any[]

    const finalRanking =
      (rankingData || []).map(
        (item: any) => {

          const user =
            profiles.find(
              (p) =>
                p.id === item.user_id
            )

          return {

            user_id:
              item.user_id,

            skor:
              item.total_skor || 0,

            kategori:
              user?.paket || "Paket",

            email:
              user?.email || "-",

            nama:
              user?.nama ||
              "Siswa",

            foto:
              user?.foto || ""
          }
        }
      )

    setRanking(finalRanking)
  }

  // =========================
  // FILTER
  // =========================
  const filtered =
    ranking.filter(
      (item) =>

        item.nama
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||

        item.email
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    )

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
        bg-[#eef4ff]
      ">

        <div className="
          flex
          flex-col
          items-center
          gap-5
        ">

          <div className="
            relative
            w-20
            h-20
          ">

            <div className="
              absolute
              inset-0
              rounded-full
              border-[6px]
              border-indigo-600/20
            " />

            <div className="
              absolute
              inset-0
              rounded-full
              border-[6px]
              border-indigo-600
              border-t-transparent
              animate-spin
            " />

          </div>

          <div className="text-center">

            <h1 className="
              text-2xl
              font-black
              text-indigo-700
            ">
              Loading Ranking
            </h1>

            <p className="
              text-slate-500
              mt-1
            ">
              Mengambil data siswa...
            </p>

          </div>

        </div>

      </div>
    )
  }

  const top1 = filtered[0]
  const top2 = filtered[1]
  const top3 = filtered[2]

  return (

    <div className="
      min-h-screen
      bg-gradient-to-b
      from-[#eef4ff]
      via-[#f8fbff]
      to-[#ffffff]
      overflow-hidden
    ">

      {/* BACKGROUND */}
      <div className="
        fixed
        top-[-120px]
        left-[-120px]
        w-[320px]
        h-[320px]
        rounded-full
        bg-blue-400/20
        blur-3xl
      " />

      <div className="
        fixed
        bottom-[-120px]
        right-[-120px]
        w-[320px]
        h-[320px]
        rounded-full
        bg-purple-400/20
        blur-3xl
      " />

      {/* HEADER */}
      <div className="
        sticky
        top-0
        z-50
        backdrop-blur-xl
        bg-white/70
        border-b
        border-white/40
      ">

        <div className="
          max-w-7xl
          mx-auto
          px-4
          py-4
          flex
          items-center
          justify-between
          gap-4
        ">

          <div>

            <p className="
              text-xs
              font-black
              tracking-[5px]
              text-indigo-600
            ">
              ADMIN RANKING
            </p>

            <h1 className="
              text-3xl
              md:text-5xl
              font-black
              text-slate-800
              leading-tight
            ">
              🏆 Ranking Siswa
            </h1>

          </div>

          <button
            onClick={() =>
              router.push("/admin")
            }
            className="
              h-12
              px-6
              rounded-2xl
              bg-indigo-600
              hover:bg-indigo-700
              text-white
              font-black
              shadow-lg
              transition
              hover:scale-105
            "
          >
            Dashboard
          </button>

        </div>

      </div>

      <div className="
        max-w-7xl
        mx-auto
        px-4
        py-6
      ">

        {/* SEARCH */}
        <div className="
          mb-8
        ">

          <div className="
            relative
            max-w-xl
          ">

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Cari nama / email siswa..."
              className="
                w-full
                h-16
                rounded-3xl
                bg-white/90
                backdrop-blur-xl
                border
                border-white
                shadow-xl
                px-6
                text-lg
                font-semibold
                outline-none
                focus:ring-4
                focus:ring-indigo-200
              "
            />

            <div className="
              absolute
              right-5
              top-1/2
              -translate-y-1/2
              text-2xl
            ">
              🔍
            </div>

          </div>

        </div>

        {/* PODIUM */}
        {filtered.length >= 1 && (

          <div className="
            grid
            grid-cols-3
            gap-4
            items-end
            mb-10
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

        )}

        {/* LIST */}
        <div className="
          grid
          gap-4
        ">

          {filtered.map(
            (
              item,
              index
            ) => (

              <div
                key={
                  item.user_id
                }
                onClick={() =>
                  router.push(
                    `/admin/siswa/${item.user_id}`
                  )
                }
                className="
                  group
                  relative
                  overflow-hidden
                  bg-white/80
                  backdrop-blur-xl
                  rounded-[32px]
                  p-5
                  border
                  border-white
                  shadow-xl
                  hover:shadow-2xl
                  transition-all
                  duration-300
                  cursor-pointer
                  hover:-translate-y-1
                "
              >

                {/* glow */}
                <div className="
                  absolute
                  inset-0
                  bg-gradient-to-r
                  from-indigo-500/0
                  via-blue-500/0
                  to-purple-500/0
                  group-hover:from-indigo-500/5
                  group-hover:to-purple-500/5
                  transition
                " />

                <div className="
                  relative
                  flex
                  items-center
                  justify-between
                  gap-4
                ">

                  {/* LEFT */}
                  <div className="
                    flex
                    items-center
                    gap-4
                    min-w-0
                  ">

                    {/* RANK */}
                    <div className={`
                      w-16
                      h-16
                      rounded-3xl
                      flex
                      items-center
                      justify-center
                      font-black
                      text-lg
                      shrink-0
                      shadow-lg

                      ${index === 0
                        ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                        : index === 1
                        ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
                        : index === 2
                        ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white"
                        : "bg-gradient-to-br from-indigo-500 to-blue-600 text-white"
                      }
                    `}>

                      #{index + 1}

                    </div>

                    {/* FOTO */}
                    {item.foto ? (

                      <img
                        src={item.foto}
                        alt="foto"
                        className="
                          w-20
                          h-20
                          rounded-full
                          object-cover
                          border-4
                          border-white
                          shadow-lg
                          shrink-0
                        "
                      />

                    ) : (

                      <div className="
                        w-20
                        h-20
                        rounded-full
                        bg-gradient-to-br
                        from-indigo-500
                        to-blue-600
                        text-white
                        flex
                        items-center
                        justify-center
                        text-2xl
                        font-black
                        border-4
                        border-white
                        shadow-lg
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

                      <h1 className="
                        text-xl
                        md:text-2xl
                        font-black
                        text-slate-800
                        truncate
                      ">
                        {item.nama}
                      </h1>

                      <p className="
                        text-slate-500
                        truncate
                        mt-1
                      ">
                        {item.email}
                      </p>

                      <div className="
                        mt-3
                        flex
                        items-center
                        gap-2
                        flex-wrap
                      ">

                        <span className="
                          px-4
                          py-1.5
                          rounded-full
                          bg-indigo-100
                          text-indigo-700
                          text-xs
                          font-black
                        ">

                          {item.kategori}

                        </span>

                        {index === 0 && (

                          <span className="
                            px-4
                            py-1.5
                            rounded-full
                            bg-yellow-100
                            text-yellow-700
                            text-xs
                            font-black
                            animate-pulse
                          ">

                            TOP 1

                          </span>

                        )}

                      </div>

                    </div>

                  </div>

                  {/* RIGHT */}
                  <div className="
                    text-right
                    shrink-0
                  ">

                    <p className="
                      text-xs
                      text-slate-400
                      font-black
                      tracking-[2px]
                    ">
                      TOTAL SKOR
                    </p>

                    <h1 className="
                      text-4xl
                      md:text-5xl
                      font-black
                      bg-gradient-to-r
                      from-indigo-600
                      to-blue-600
                      bg-clip-text
                      text-transparent
                    ">
                      {item.skor}
                    </h1>

                  </div>

                </div>

              </div>

            )
          )}

          {/* EMPTY */}
          {filtered.length === 0 && (

            <div className="
              bg-white
              rounded-[32px]
              p-16
              text-center
              shadow-xl
            ">

              <div className="
                text-7xl
                mb-5
              ">
                🏆
              </div>

              <h1 className="
                text-3xl
                font-black
                text-slate-700
              ">
                Ranking Belum Ada
              </h1>

              <p className="
                text-slate-500
                mt-3
                text-lg
              ">
                Data ranking siswa belum tersedia
              </p>

            </div>

          )}

        </div>

      </div>

    </div>
  )
}

/* =========================
   PODIUM CARD
========================= */
function PodiumCard({
  data,
  rank,
  big
}: any) {

  const bg =
    rank === 1
      ? "from-yellow-400 via-orange-400 to-orange-500"
      : rank === 2
      ? "from-indigo-500 to-blue-600"
      : "from-slate-500 to-slate-700"

  return (

    <div className={`
      relative
      overflow-hidden
      rounded-[36px]
      bg-gradient-to-b
      ${bg}
      text-white
      shadow-2xl
      border
      border-white/20
      hover:scale-[1.03]
      transition-all
      duration-300

      ${big
        ? "pt-8 pb-10"
        : "pt-6 pb-7"
      }
    `}>

      {/* glow */}
      <div className="
        absolute
        -top-10
        -right-10
        w-40
        h-40
        rounded-full
        bg-white/10
      " />

      {/* rank */}
      <div className="
        absolute
        top-4
        right-4
        w-12
        h-12
        rounded-2xl
        bg-white/20
        backdrop-blur-xl
        flex
        items-center
        justify-center
        font-black
        text-lg
      ">

        #{rank}

      </div>

      {/* crown */}
      {rank === 1 && (

        <div className="
          absolute
          top-3
          left-1/2
          -translate-x-1/2
          text-4xl
          animate-bounce
        ">
          👑
        </div>

      )}

      {/* avatar */}
      <div className="
        flex
        justify-center
        mt-4
      ">

        {data.foto ? (

          <img
            src={data.foto}
            alt="foto"
            className={`
              rounded-full
              border-[5px]
              border-white
              object-cover
              shadow-2xl

              ${big
                ? "w-28 h-28"
                : "w-24 h-24"
              }
            `}
          />

        ) : (

          <div className={`
            rounded-full
            border-[5px]
            border-white
            bg-white/20
            backdrop-blur-xl
            flex
            items-center
            justify-center
            font-black
            shadow-2xl

            ${big
              ? "w-28 h-28 text-4xl"
              : "w-24 h-24 text-3xl"
            }
          `}>

            {data.nama
              .slice(0, 2)
              .toUpperCase()}

          </div>

        )}

      </div>

      {/* info */}
      <div className="
        text-center
        mt-5
        px-4
      ">

        <h1 className={`
          font-black
          truncate

          ${big
            ? "text-2xl"
            : "text-lg"
          }
        `}>
          {data.nama}
        </h1>

        <p className="
          text-white/80
          text-sm
          truncate
          mt-1
        ">
          {data.email}
        </p>

      </div>

      {/* score */}
      <div className="
        text-center
        mt-5
      ">

        <p className="
          text-xs
          tracking-[3px]
          text-white/80
          font-black
        ">
          TOTAL SKOR
        </p>

        <h1 className={`
          font-black
          drop-shadow-xl

          ${big
            ? "text-6xl"
            : "text-4xl"
          }
        `}>
          {data.skor}
        </h1>

      </div>

    </div>
  )
}
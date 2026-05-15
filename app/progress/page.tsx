"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

export default function Progress() {

  const router = useRouter()

  const [dataChart,
    setDataChart] =
    useState<any[]>([])

  const [loading,
    setLoading] =
    useState(true)

  const [nama,
    setNama] =
    useState("Siswa")

  const [foto,
    setFoto] =
    useState("")

  useEffect(() => {
    init()
  }, [])

  async function init() {

    const { data: user } =
      await supabase.auth.getUser()

    if (!user.user) {

      router.push("/login")
      return
    }

    await getProfile(
      user.user.id
    )

    await getData(
      user.user.id
    )
  }

  async function getProfile(
    userId: string
  ) {

    const { data } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

    if (data) {

      setNama(
        data.nama || "Siswa"
      )

      setFoto(
        data.foto || ""
      )
    }
  }

  async function getData(
    userId: string
  ) {

    const { data } =
      await supabase
        .from("hasil")
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .order("tanggal", {
          ascending: true,
        })

    const formatted =
      data?.map(
        (item: any) => ({

          tanggal:
            new Date(
              item.tanggal
            ).toLocaleDateString(),

          skor:
            item.skor,

          kategori:
            item.kategori
        })
      )

    setDataChart(
      formatted || []
    )

    setLoading(false)
  }

  const maxSkor =
    dataChart.length
      ? Math.max(
          ...dataChart.map(
            (d) => d.skor
          )
        )
      : 0

  const avgSkor =
    dataChart.length
      ? Math.round(
          dataChart.reduce(
            (acc, d) =>
              acc + d.skor,
            0
          ) / dataChart.length
        )
      : 0

  const latestSkor =
    dataChart.length
      ? dataChart[
          dataChart.length - 1
        ]?.skor
      : 0

  const stats = [

    {
      title: "Total Ujian",
      value:
        dataChart.length,
      icon: "📝",
      color:
        "from-blue-500 to-blue-600",
    },

    {
      title: "Nilai Tertinggi",
      value:
        maxSkor,
      icon: "🏆",
      color:
        "from-yellow-400 to-yellow-500",
    },

    {
      title: "Nilai Terakhir",
      value:
        latestSkor,
      icon: "📈",
      color:
        "from-red-400 to-red-500",
    },

    {
      title: "Rata-rata",
      value:
        avgSkor,
      icon: "⭐",
      color:
        "from-green-400 to-green-500",
    },
  ]

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: any) => {

    if (
      active &&
      payload &&
      payload.length
    ) {

      return (

        <div className="
          bg-white
          border
          border-gray-200
          shadow-xl
          rounded-3xl
          p-4
        ">

          <p className="
            text-sm
            text-gray-500
          ">
            {label}
          </p>

          <h2 className="
            text-3xl
            font-black
            text-blue-600
            mt-1
          ">
            {payload[0].value}
          </h2>

        </div>
      )
    }

    return null
  }

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
              Progress Akademik
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

        {/* PROFILE */}
        <div className="
          bg-white
          rounded-[35px]
          shadow-sm
          p-6 md:p-8
          mb-6
        ">

          <div className="
            flex flex-col
            md:flex-row
            items-start
            md:items-center
            justify-between
            gap-6
          ">

            {/* LEFT */}
            <div className="
              flex items-center
              gap-5
            ">

              {/* FOTO */}
              {foto ? (

                <img
                  src={foto}
                  alt="foto"
                  className="
                    w-24 h-24
                    rounded-full
                    object-cover
                    border-4
                    border-blue-100
                    shadow-md
                  "
                />

              ) : (

                <div className="
                  w-24 h-24
                  rounded-full
                  bg-blue-600
                  text-white
                  flex
                  items-center
                  justify-center
                  text-3xl
                  font-black
                ">

                  {nama
                    .slice(0, 2)
                    .toUpperCase()}

                </div>

              )}

              {/* INFO */}
              <div>

                <h2 className="
                  text-3xl
                  font-black
                  text-gray-800
                ">
                  {nama}
                </h2>

                <p className="
                  text-gray-500
                  mt-1
                ">
                  Statistik dan perkembangan
                  hasil belajar siswa.
                </p>

                <div className="
                  mt-4
                  inline-block
                  bg-blue-100
                  text-blue-700
                  px-4 py-2
                  rounded-full
                  text-sm
                  font-semibold
                ">
                  Akademik Aktif 📘
                </div>

              </div>

            </div>

            {/* RIGHT */}
            <div className="
              bg-[#f4f7fb]
              rounded-3xl
              px-8 py-5
              text-center
            ">

              <p className="
                text-gray-500
                text-sm
              ">
                Total Riwayat
              </p>

              <h2 className="
                text-5xl
                font-black
                text-blue-700
                mt-2
              ">
                {dataChart.length}
              </h2>

            </div>

          </div>

        </div>

        {/* STATS */}
        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-4
          gap-5
          mb-6
        ">

          {stats.map((
            item,
            i
          ) => (

            <div
              key={i}
              className="
                bg-white
                rounded-[30px]
                p-6
                shadow-sm
                hover:shadow-lg
                transition-all
              "
            >

              <div className="
                flex
                items-center
                justify-between
              ">

                <div>

                  <p className="
                    text-gray-500
                    text-sm
                  ">
                    {item.title}
                  </p>

                  <h2 className="
                    text-5xl
                    font-black
                    text-gray-800
                    mt-3
                  ">
                    {loading
                      ? "..."
                      : item.value}
                  </h2>

                </div>

                <div className={`
                  w-16 h-16
                  rounded-3xl
                  bg-gradient-to-br
                  ${item.color}
                  text-white
                  flex
                  items-center
                  justify-center
                  text-3xl
                  shadow-lg
                `}>

                  {item.icon}

                </div>

              </div>

            </div>

          ))}

        </div>

        {/* CHART */}
        <div className="
          bg-white
          rounded-[35px]
          shadow-sm
          p-6 md:p-8
          mb-6
        ">

          <div className="
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-4
            mb-8
          ">

            <div>

              <h2 className="
                text-3xl
                font-black
                text-gray-800
              ">
                Grafik Nilai
              </h2>

              <p className="
                text-gray-500
                mt-1
              ">
                Perkembangan hasil
                ujian siswa dari waktu
                ke waktu.
              </p>

            </div>

            <div className="
              bg-blue-100
              text-blue-700
              px-5 py-3
              rounded-2xl
              font-semibold
              text-sm
              w-fit
            ">
              Live Progress
            </div>

          </div>

          {loading ? (

            <div className="
              h-[400px]
              flex
              items-center
              justify-center
              text-gray-500
            ">
              Loading chart...
            </div>

          ) : (

            <div className="
              w-full
              h-[400px]
            ">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <AreaChart
                  data={dataChart}
                >

                  <defs>

                    <linearGradient
                      id="score"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >

                      <stop
                        offset="5%"
                        stopColor="#2563eb"
                        stopOpacity={0.4}
                      />

                      <stop
                        offset="95%"
                        stopColor="#2563eb"
                        stopOpacity={0}
                      />

                    </linearGradient>

                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="#e5e7eb"
                  />

                  <XAxis
                    dataKey="tanggal"
                    tick={{
                      fill: "#6b7280"
                    }}
                  />

                  <YAxis
                    tick={{
                      fill: "#6b7280"
                    }}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                  />

                  <Area
                    type="monotone"
                    dataKey="skor"
                    stroke="#2563eb"
                    strokeWidth={4}
                    fill="url(#score)"
                    dot={{
                      r: 5,
                      fill: "#2563eb",
                    }}
                    activeDot={{
                      r: 8,
                    }}
                  />

                </AreaChart>

              </ResponsiveContainer>

            </div>

          )}

        </div>

        {/* HISTORY */}
        <div className="
          bg-white
          rounded-[35px]
          shadow-sm
          p-6 md:p-8
        ">

          <div className="
            flex
            items-center
            justify-between
            mb-8
          ">

            <div>

              <h2 className="
                text-3xl
                font-black
                text-gray-800
              ">
                Riwayat Nilai
              </h2>

              <p className="
                text-gray-500
                mt-1
              ">
                Semua data hasil
                ujian siswa.
              </p>

            </div>

          </div>

          {dataChart.length === 0 ? (

            <div className="
              text-center
              py-14
            ">

              <div className="
                text-6xl
              ">
                📘
              </div>

              <h2 className="
                text-2xl
                font-black
                text-gray-800
                mt-4
              ">
                Belum Ada Data
              </h2>

              <p className="
                text-gray-500
                mt-2
              ">
                Kerjakan ujian terlebih
                dahulu untuk melihat
                progress.
              </p>

            </div>

          ) : (

            <div className="
              space-y-4
            ">

              {dataChart.map((
                item,
                i
              ) => (

                <div
                  key={i}
                  className="
                    bg-[#f8fafc]
                    rounded-3xl
                    p-5
                    flex
                    items-center
                    justify-between
                    hover:shadow-md
                    transition-all
                  "
                >

                  <div>

                    <p className="
                      text-sm
                      text-gray-500
                    ">
                      {item.tanggal}
                    </p>

                    <h2 className="
                      text-2xl
                      font-black
                      text-gray-800
                      mt-1
                    ">
                      {item.kategori}
                    </h2>

                  </div>

                  <div className="
                    text-right
                  ">

                    <p className="
                      text-sm
                      text-gray-500
                    ">
                      Nilai
                    </p>

                    <h2 className="
                      text-4xl
                      font-black
                      text-blue-700
                    ">
                      {item.skor}
                    </h2>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  )
}
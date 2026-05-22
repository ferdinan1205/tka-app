"use client"

import { useEffect, useMemo, useState } from "react"
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
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ======================
// TYPES
// ======================

type HasilType = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  package_id?: number | null
}

type PackageType = {
  id: number
  nama_paket: string
}

// ======================
// PAGE
// ======================

export default function ProgressPage() {

  const router = useRouter()

  // ======================
  // STATES
  // ======================

  const [loading,
    setLoading] =
    useState(true)

  const [nama,
    setNama] =
    useState("Siswa")

  const [foto,
    setFoto] =
    useState("")

  const [hasil,
    setHasil] =
    useState<HasilType[]>([])

  const [packages,
    setPackages] =
    useState<PackageType[]>([])

  const [selectedPaket,
    setSelectedPaket] =
    useState("Semua")

  // ======================
  // INIT
  // ======================

  useEffect(() => {
    init()
  }, [])

  async function init() {

    try {

      setLoading(true)

      // ======================
      // USER
      // ======================

      const {
        data: userData,
      } = await supabase
        .auth
        .getUser()

      const user =
        userData.user

      if (!user) {

        router.push("/login")
        return
      }

      // ======================
      // PROFILE
      // ======================

      const {
        data: profile,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setNama(
        profile?.nama ||
        "Siswa"
      )

      setFoto(
        profile?.foto || ""
      )

      // ======================
      // HASIL
      // ======================

      const {
        data: hasilData,
        error,
      } = await supabase
        .from("hasil")
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .order("tanggal", {
          ascending: true,
        })

      if (error) {

        console.log(error)

        setLoading(false)

        return
      }

      setHasil(
        hasilData || []
      )

      // ======================
      // PACKAGES
      // ======================

      const {
        data: packageData,
      } = await supabase
        .from("packages")
        .select("*")

      setPackages(
        packageData || []
      )

      setLoading(false)

    } catch (err) {

      console.log(err)

      setLoading(false)
    }
  }

  // ======================
  // GET PACKAGE NAME
  // ======================

  function getPackageName(
    packageId?: number | null
  ) {

    if (!packageId)
      return "Tanpa Paket"

    const found =
      packages.find(
        (x) =>
          x.id === packageId
      )

    return (
      found?.nama_paket ||
      "Tanpa Paket"
    )
  }

  // ======================
  // FILTERED DATA
  // ======================

  const filteredData =
    useMemo(() => {

      if (
        selectedPaket ===
        "Semua"
      ) {

        return hasil
      }

      return hasil.filter(
        (item) =>
          getPackageName(
            item.package_id
          ) ===
          selectedPaket
      )

    }, [
      hasil,
      selectedPaket,
      packages,
    ])

  // ======================
  // STATS
  // ======================

  const totalUjian =
    filteredData.length

  const nilaiTertinggi =
    filteredData.length > 0

      ? Math.max(
          ...filteredData.map(
            (x) => x.skor
          )
        )

      : 0

  const nilaiTerakhir =
    filteredData.length > 0

      ? filteredData[
          filteredData.length - 1
        ]?.skor

      : 0

  const rataRata =
    filteredData.length > 0

      ? Math.round(
          filteredData.reduce(
            (a, b) =>
              a + b.skor,
            0
          ) /
            filteredData.length
        )

      : 0

  // ======================
  // CHART DATA
  // ======================

  const chartData =
    filteredData.map(
      (item) => ({

        tanggal:
          new Date(
            item.tanggal
          ).toLocaleDateString(
            "id-ID",
            {
              day: "2-digit",
              month: "short",
            }
          ),

        skor:
          item.skor,

        kategori:
          item.kategori,

        paket:
          getPackageName(
            item.package_id
          ),
      })
    )

  // ======================
  // PIE DATA
  // ======================

  const pieData =
    filteredData.map(
      (item) => ({

        name:
          item.kategori,

        value:
          item.skor,
      })
    )

  const COLORS = [
    "#2563eb",
    "#06b6d4",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ]

  // ======================
  // TOOLTIP
  // ======================

  const CustomTooltip = ({
    active,
    payload,
  }: any) => {

    if (
      active &&
      payload &&
      payload.length
    ) {

      const data =
        payload[0].payload

      return (

        <div className="
          bg-white
          rounded-3xl
          shadow-2xl
          border
          border-gray-100
          p-4
        ">

          <p className="
            text-sm
            text-gray-500
          ">
            {data.tanggal}
          </p>

          <h2 className="
            text-3xl
            font-black
            text-blue-700
            mt-1
          ">
            {data.skor}
          </h2>

          <p className="
            text-sm
            text-gray-600
            mt-1
          ">
            {data.kategori}
          </p>

        </div>
      )
    }

    return null
  }

  // ======================
  // LOADING
  // ======================

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
          bg-white
          px-8
          py-6
          rounded-[30px]
          shadow-xl
          text-center
        ">

          <div className="
            w-12
            h-12
            border-4
            border-blue-600
            border-t-transparent
            rounded-full
            animate-spin
            mx-auto
            mb-4
          " />

          <p className="
            text-lg
            font-bold
            text-gray-700
          ">
            Loading progress...
          </p>

        </div>

      </div>
    )
  }

  return (

    <div className="
      min-h-screen
      bg-[#f4f7fb]
      pb-10
    ">

      {/* HEADER */}

      <div className="
        bg-white/90
        backdrop-blur-xl
        border-b
        border-gray-100
        sticky
        top-0
        z-30
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
              text-blue-600
              text-sm
              font-black
              tracking-[3px]
            ">
              LAMPUNG CERDAS
            </p>

            <h1 className="
              text-2xl
              md:text-4xl
              font-black
              text-gray-800
            ">
              Progress Akademik
            </h1>

          </div>

          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="
              h-12
              px-5
              rounded-2xl
              bg-blue-600
              hover:bg-blue-700
              text-white
              font-bold
              transition-all
            "
          >
            Dashboard
          </button>

        </div>

      </div>

      {/* CONTENT */}

      <div className="
        max-w-7xl
        mx-auto
        p-4
        md:p-6
      ">

        {/* PROFILE */}

        <div className="
          bg-white
          rounded-[35px]
          p-5
          md:p-8
          shadow-sm
          mb-6
        ">

          <div className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-6
          ">

            {/* LEFT */}

            <div className="
              flex
              items-center
              gap-4
            ">

              {foto ? (

                <img
                  src={foto}
                  alt="foto"
                  className="
                    w-20
                    h-20
                    md:w-24
                    md:h-24
                    rounded-full
                    object-cover
                    border-4
                    border-blue-100
                  "
                />

              ) : (

                <div className="
                  w-20
                  h-20
                  md:w-24
                  md:h-24
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

              <div>

                <h2 className="
                  text-2xl
                  md:text-4xl
                  font-black
                  text-gray-800
                ">
                  {nama}
                </h2>

                <p className="
                  text-gray-500
                  mt-1
                  text-sm
                  md:text-base
                ">
                  Statistik hasil belajar
                  siswa berdasarkan paket.
                </p>

              </div>

            </div>

            {/* FILTER */}

            <div className="
              w-full
              lg:w-auto
            ">

              <select
                value={
                  selectedPaket
                }
                onChange={(e) =>
                  setSelectedPaket(
                    e.target.value
                  )
                }
                className="
                  w-full
                  lg:w-[260px]
                  h-14
                  rounded-2xl
                  border
                  border-gray-200
                  px-5
                  outline-none
                  font-semibold
                  bg-[#f8fafc]
                "
              >

                <option>
                  Semua
                </option>

                {packages.map(
                  (item) => (

                  <option
                    key={item.id}
                    value={
                      item.nama_paket
                    }
                  >
                    {item.nama_paket}
                  </option>

                ))}

              </select>

            </div>

          </div>

        </div>

        {/* STATS */}

        <div className="
          grid
          grid-cols-2
          xl:grid-cols-4
          gap-4
          mb-6
        ">

          <StatCard
            title="Total"
            value={totalUjian}
            icon="📝"
            color="from-blue-600 to-cyan-500"
          />

          <StatCard
            title="Tertinggi"
            value={nilaiTertinggi}
            icon="🏆"
            color="from-yellow-500 to-orange-500"
          />

          <StatCard
            title="Terakhir"
            value={nilaiTerakhir}
            icon="📈"
            color="from-pink-500 to-rose-500"
          />

          <StatCard
            title="Rata-rata"
            value={rataRata}
            icon="⭐"
            color="from-emerald-500 to-green-600"
          />

        </div>

        {/* CHART */}

        <div className="
          grid
          grid-cols-1
          xl:grid-cols-3
          gap-6
          mb-6
        ">

          {/* AREA */}

          <div className="
            xl:col-span-2
            bg-white
            rounded-[35px]
            p-5
            md:p-8
            shadow-sm
          ">

            <div className="
              mb-6
            ">

              <h2 className="
                text-2xl
                md:text-3xl
                font-black
                text-gray-800
              ">
                Grafik Nilai
              </h2>

              <p className="
                text-gray-500
                mt-1
                text-sm
                md:text-base
              ">
                Progress perkembangan
                nilai ujian siswa.
              </p>

            </div>

            {chartData.length === 0 ? (

              <div className="
                h-[320px]
                flex
                items-center
                justify-center
                text-center
              ">

                <div>

                  <div className="
                    text-6xl
                    mb-3
                  ">
                    📉
                  </div>

                  <h2 className="
                    text-2xl
                    font-black
                    text-gray-700
                  ">
                    Grafik Belum Ada
                  </h2>

                  <p className="
                    text-gray-500
                    mt-2
                  ">
                    Kerjakan ujian dulu
                    agar grafik muncul.
                  </p>

                </div>

              </div>

            ) : (

              <div className="
                w-full
                h-[320px]
                md:h-[420px]
              ">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart
                    data={
                      chartData
                    }
                  >

                    <defs>

                      <linearGradient
                        id="colorScore"
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
                        fill:
                          "#6b7280",
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      tick={{
                        fill:
                          "#6b7280",
                        fontSize: 12,
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
                      fillOpacity={1}
                      fill="url(#colorScore)"
                      dot={{
                        r: 4,
                        fill:
                          "#2563eb",
                      }}
                    />

                  </AreaChart>

                </ResponsiveContainer>

              </div>

            )}

          </div>

          {/* PIE */}

          <div className="
            bg-white
            rounded-[35px]
            p-5
            md:p-8
            shadow-sm
          ">

            <div className="
              mb-6
            ">

              <h2 className="
                text-2xl
                font-black
                text-gray-800
              ">
                Distribusi Nilai
              </h2>

              <p className="
                text-gray-500
                mt-1
                text-sm
              ">
                Sebaran nilai berdasarkan
                mapel.
              </p>

            </div>

            {pieData.length === 0 ? (

              <div className="
                h-[320px]
                flex
                items-center
                justify-center
              ">

                <p className="
                  text-gray-500
                ">
                  Belum ada data
                </p>

              </div>

            ) : (

              <div className="
                w-full
                h-[320px]
              ">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        pieData
                      }
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label
                    >

                      {pieData.map(
                        (
                          entry,
                          index
                        ) => (

                        <Cell
                          key={index}
                          fill={
                            COLORS[
                              index %
                                COLORS.length
                            ]
                          }
                        />

                      ))}

                    </Pie>

                    <Tooltip />

                  </PieChart>

                </ResponsiveContainer>

              </div>

            )}

          </div>

        </div>

        {/* HISTORY */}

        <div className="
          bg-white
          rounded-[35px]
          p-5
          md:p-8
          shadow-sm
        ">

          <div className="
            mb-6
          ">

            <h2 className="
              text-2xl
              md:text-3xl
              font-black
              text-gray-800
            ">
              Riwayat Ujian
            </h2>

          </div>

          {filteredData.length === 0 ? (

            <div className="
              text-center
              py-16
            ">

              <div className="
                text-6xl
                mb-3
              ">
                📘
              </div>

              <h2 className="
                text-2xl
                font-black
                text-gray-800
              ">
                Belum Ada Riwayat
              </h2>

            </div>

          ) : (

            <div className="
              space-y-4
            ">

              {filteredData
                .slice()
                .reverse()
                .map(
                  (
                    item,
                    index
                  ) => (

                  <div
                    key={index}
                    className="
                      bg-[#f8fafc]
                      rounded-[30px]
                      p-5
                      flex
                      flex-col
                      md:flex-row
                      md:items-center
                      md:justify-between
                      gap-4
                    "
                  >

                    <div className="
                      flex
                      items-center
                      gap-4
                    ">

                      <div className="
                        w-16
                        h-16
                        rounded-3xl
                        bg-gradient-to-r
                        from-blue-600
                        to-cyan-500
                        text-white
                        flex
                        items-center
                        justify-center
                        text-2xl
                      ">
                        📘
                      </div>

                      <div>

                        <h2 className="
                          text-xl
                          md:text-2xl
                          font-black
                          text-gray-800
                        ">
                          {
                            item.kategori
                          }
                        </h2>

                        <p className="
                          text-sm
                          text-gray-500
                          mt-1
                        ">
                          {
                            getPackageName(
                              item.package_id
                            )
                          }
                        </p>

                        <p className="
                          text-sm
                          text-gray-400
                          mt-1
                        ">
                          {new Date(
                            item.tanggal
                          ).toLocaleDateString(
                            "id-ID"
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="
                      text-left
                      md:text-right
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
                        {
                          item.skor
                        }
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

// ======================
// CARD
// ======================

function StatCard({
  title,
  value,
  icon,
  color,
}: any) {

  return (

    <div className="
      bg-white
      rounded-[30px]
      p-4
      md:p-6
      shadow-sm
    ">

      <div className="
        flex
        items-center
        justify-between
        gap-4
      ">

        <div>

          <p className="
            text-gray-500
            text-sm
            font-medium
          ">
            {title}
          </p>

          <h2 className="
            text-3xl
            md:text-5xl
            font-black
            text-gray-800
            mt-2
          ">
            {value}
          </h2>

        </div>

        <div className={`
          w-14
          h-14
          md:w-16
          md:h-16
          rounded-3xl
          bg-gradient-to-r
          ${color}
          text-white
          flex
          items-center
          justify-center
          text-2xl
          md:text-3xl
          shadow-xl
        `}>

          {icon}

        </div>

      </div>

    </div>
  )
}
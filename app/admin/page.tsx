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
  CartesianGrid,
  Tooltip,
} from "recharts"

type TopUser = {
  skor: number
  user_id: string
  email: string
  nama: string
  foto?: string
}

export default function AdminDashboard() {

  const router = useRouter()

  const [totalSoal, setTotalSoal] =
    useState(0)

  const [totalUser, setTotalUser] =
    useState(0)

  const [totalHasil, setTotalHasil] =
    useState(0)

  const [chartData, setChartData] =
    useState<any[]>([])

  const [topUser, setTopUser] =
    useState<TopUser[]>([])

  const [adminName, setAdminName] =
    useState("Admin")

  const [search, setSearch] =
    useState("")

  const [mobileMenu,
    setMobileMenu] =
    useState(false)

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

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()

    if (
      !profile ||
      profile.role !== "admin"
    ) {

      alert("Akses ditolak!")

      router.push("/dashboard")

      return
    }

    setAdminName(
      profile.nama || "Admin"
    )

    await getStats()

    await getChart()

    await getTopUser()
  }

  async function getStats() {

    const { count: soal } =
      await supabase
        .from("soal")
        .select("*", {
          count: "exact",
          head: true,
        })

    const { count: user } =
      await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })

    const { count: hasil } =
      await supabase
        .from("hasil")
        .select("*", {
          count: "exact",
          head: true,
        })

    setTotalSoal(soal || 0)

    setTotalUser(user || 0)

    setTotalHasil(hasil || 0)
  }

  async function getChart() {

    const { data } =
      await supabase
        .from("hasil")
        .select("*")
        .order("tanggal", {
          ascending: true,
        })

    const map: any = {}

    data?.forEach((item: any) => {

      const tgl =
        new Date(
          item.tanggal
        ).toLocaleDateString()

      map[tgl] =
        (map[tgl] || 0) + 1
    })

    const result =
      Object.keys(map).map(
        (key) => ({
          tanggal: key,
          jumlah: map[key],
        })
      )

    setChartData(result)
  }

  async function getTopUser() {

    const {
      data: hasilData,
    } = await supabase
      .from("hasil")
      .select("*")
      .order("skor", {
        ascending: false,
      })

    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select("*")

    if (
      !hasilData ||
      !profiles
    ) return

    const bestMap: any = {}

    hasilData.forEach(
      (item: any) => {

        if (
          !bestMap[
            item.user_id
          ] ||
          item.skor >
            bestMap[
              item.user_id
            ].skor
        ) {

          bestMap[
            item.user_id
          ] = item
        }
      }
    )

    const final =
      Object.values(bestMap)
        .map((item: any) => {

          const user =
            profiles.find(
              (p: any) =>
                p.id ===
                item.user_id
            )

          return {

            user_id:
              item.user_id,

            skor:
              item.skor,

            email:
              user?.email ||
              "-",

            nama:
              user?.nama ||
              "Siswa",

            foto:
              user?.foto ||
              "",
          }
        })
        .sort(
          (a: any, b: any) =>
            b.skor - a.skor
        )
        .slice(0, 5)

    setTopUser(final)
  }

  async function logout() {

    await supabase.auth.signOut()

    router.push("/login")
  }

  return (

    <div className="min-h-screen bg-[#f4f7ff]">

      {/* MOBILE HEADER */}
      <div className="
        lg:hidden
        sticky
        top-0
        z-50
        bg-[#1e293b]
        text-white
        px-5
        py-4
        flex
        items-center
        justify-between
        shadow-lg
      ">

        <div>

          <h1 className="font-bold text-lg">
            Admin Dashboard
          </h1>

          <p className="text-xs text-slate-300">
            Academic System
          </p>

        </div>

        <button
          onClick={() =>
            setMobileMenu(
              !mobileMenu
            )
          }
          className="
            w-10
            h-10
            rounded-xl
            bg-white/10
          "
        >
          ☰
        </button>

      </div>

      <div className="flex">

        {/* SIDEBAR */}
        <aside
          className={`
            fixed
            top-0
            left-0
            z-40
            h-screen
            w-[270px]
            bg-[#111827]
            text-white
            transition-all
            duration-300

            ${
              mobileMenu
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }
          `}
        >

          <div className="h-full flex flex-col">

            {/* LOGO */}
            <div className="
              px-6
              py-7
              border-b
              border-white/10
            ">

              <div className="flex items-center gap-4">

                <div className="
                  w-12
                  h-12
                  rounded-2xl
                  bg-blue-600
                  flex
                  items-center
                  justify-center
                  text-xl
                  shadow-lg
                ">
                  🎓
                </div>

                <div>

                  <h1 className="font-black text-xl">
                    Lampung
                  </h1>

                  <p className="text-xs text-slate-300">
                    Smart Education
                  </p>

                </div>

              </div>

            </div>

            {/* MENU */}
            <div className="
              flex-1
              overflow-y-auto
              p-4
              space-y-2
            ">

              <SidebarBtn
                title="Dashboard"
                active
                onClick={() =>
                  router.push("/admin")
                }
              />

              <SidebarBtn
                title="Kelola Soal"
                onClick={() =>
                  router.push("/admin/soal")
                }
              />

              <SidebarBtn
                title="Materi"
                onClick={() =>
                  router.push("/admin/materi")
                }
              />

              <SidebarBtn
                title="Ranking"
                onClick={() =>
                  router.push("/admin/ranking")
                }
              />

              <SidebarBtn
                title="Rekap Nilai"
                onClick={() =>
                  router.push("/admin/rekap")
                }
              />

              <SidebarBtn
                title="Manajemen User"
                onClick={() =>
                  router.push("/admin/users")
                }
              />

              <SidebarBtn
                title="Token Ujian"
                onClick={() =>
                  router.push("/admin/token")
                }
              />

              <SidebarBtn
                title="Dashboard Siswa"
                onClick={() =>
                  router.push("/dashboard")
                }
              />

            </div>

            {/* FOOTER */}
            <div className="
              p-4
              border-t
              border-white/10
            ">

              <button
                onClick={logout}
                className="
                  w-full
                  py-3
                  rounded-2xl
                  bg-red-500
                  hover:bg-red-600
                  transition
                  font-semibold
                "
              >
                Logout
              </button>

            </div>

          </div>

        </aside>

        {/* CONTENT */}
        <main className="flex-1 lg:ml-[270px]">

          <div className="p-4 md:p-6">

            {/* HERO */}
            <div className="
              bg-gradient-to-r
              from-blue-700
              via-indigo-700
              to-slate-800
              rounded-[28px]
              p-6
              md:p-7
              text-white
              shadow-xl
              relative
              overflow-hidden
              mb-5
            ">

              <div className="
                absolute
                -right-10
                -top-10
                w-40
                h-40
                rounded-full
                bg-white/10
              " />

              <div className="
                relative
                flex
                flex-col
                lg:flex-row
                lg:items-center
                lg:justify-between
                gap-5
              ">

                <div>

                  <div className="
                    inline-flex
                    items-center
                    gap-2
                    bg-white/10
                    px-4
                    py-2
                    rounded-full
                    text-xs
                    mb-4
                  ">
                    ✨ Academic Management
                  </div>

                  <h1 className="
                    text-2xl
                    md:text-4xl
                    font-black
                    leading-tight
                  ">
                    Selamat Datang,
                    <br />
                    {adminName}
                  </h1>

                  <p className="
                    mt-3
                    text-slate-200
                    text-sm
                    md:text-base
                    max-w-2xl
                  ">
                    Kelola aktivitas pembelajaran,
                    ujian siswa, dan monitoring
                    akademik secara modern.
                  </p>

                </div>

                {/* SEARCH */}
                <div className="
                  bg-white/10
                  backdrop-blur-md
                  border
                  border-white/10
                  rounded-3xl
                  p-4
                  w-full
                  lg:w-[290px]
                ">

                  <div className="
                    flex
                    items-center
                    justify-between
                    mb-3
                  ">

                    <div>

                      <p className="
                        text-xs
                        text-slate-200
                      ">
                        Status Sistem
                      </p>

                      <h2 className="
                        font-bold
                        text-lg
                      ">
                        Online
                      </h2>

                    </div>

                    <div className="
                      w-3
                      h-3
                      rounded-full
                      bg-green-400
                      animate-pulse
                    " />

                  </div>

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Cari menu..."
                    className="
                      w-full
                      h-11
                      rounded-2xl
                      px-4
                      outline-none
                      text-black
                    "
                  />

                </div>

              </div>

            </div>

            {/* STAT */}
            <div className="
              grid
              grid-cols-1
              md:grid-cols-3
              gap-3
              mb-5
            ">

              <StatCard
                title="Total Soal"
                value={totalSoal}
                icon="📝"
                color="from-blue-600 to-cyan-500"
              />

              <StatCard
                title="Total Siswa"
                value={totalUser}
                icon="👨‍🎓"
                color="from-emerald-500 to-green-600"
              />

              <StatCard
                title="Total Ujian"
                value={totalHasil}
                icon="📊"
                color="from-orange-500 to-amber-500"
              />

            </div>

            {/* GRID */}
            <div className="
              grid
              grid-cols-1
              xl:grid-cols-3
              gap-5
            ">

              {/* CHART */}
              <div className="
                xl:col-span-2
                bg-white
                rounded-[28px]
                p-5
                shadow-sm
                border
                border-slate-200
              ">

                <div className="mb-5">

                  <p className="
                    text-sm
                    font-semibold
                    text-blue-600
                  ">
                    ANALYTICS
                  </p>

                  <h2 className="
                    text-xl
                    font-bold
                    text-slate-800
                    mt-1
                  ">
                    Aktivitas Ujian
                  </h2>

                </div>

                <div className="h-[290px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <AreaChart
                      data={chartData}
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
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                      />

                      <XAxis dataKey="tanggal" />

                      <YAxis />

                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="jumlah"
                        stroke="#2563eb"
                        strokeWidth={3}
                        fill="url(#score)"
                      />

                    </AreaChart>

                  </ResponsiveContainer>

                </div>

              </div>

              {/* TOP USER */}
              <div className="
                bg-white
                rounded-[28px]
                p-5
                shadow-sm
                border
                border-slate-200
              ">

                <div className="mb-5">

                  <p className="
                    text-sm
                    font-semibold
                    text-purple-600
                  ">
                    TOP STUDENT
                  </p>

                  <h2 className="
                    text-xl
                    font-bold
                    text-slate-800
                    mt-1
                  ">
                    Ranking Siswa
                  </h2>

                </div>

                <div className="space-y-3">

                  {topUser.map(
                    (u, i) => (

                      <div
                        key={i}
                        className="
                          flex
                          items-center
                          justify-between
                          p-3
                          rounded-2xl
                          bg-slate-50
                          hover:bg-slate-100
                          transition
                          cursor-pointer
                        "
                      >

                        <div className="
                          flex
                          items-center
                          gap-3
                        ">

                          {u.foto ? (

                            <img
                              src={u.foto}
                              alt="foto"
                              className="
                                w-12
                                h-12
                                rounded-xl
                                object-cover
                              "
                            />

                          ) : (

                            <div className="
                              w-12
                              h-12
                              rounded-xl
                              bg-gradient-to-r
                              from-blue-600
                              to-indigo-600
                              text-white
                              flex
                              items-center
                              justify-center
                              font-bold
                            ">

                              {u.nama
                                .charAt(0)
                                .toUpperCase()}

                            </div>

                          )}

                          <div>

                            <h2 className="
                              font-bold
                              text-slate-800
                              text-sm
                            ">
                              {u.nama}
                            </h2>

                            <p className="
                              text-xs
                              text-slate-500
                            ">
                              {u.email}
                            </p>

                          </div>

                        </div>

                        <div className="text-right">

                          <p className="
                            text-[11px]
                            text-slate-400
                          ">
                            Skor
                          </p>

                          <h2 className="
                            text-xl
                            font-black
                            text-indigo-700
                          ">
                            {u.skor}
                          </h2>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>

            </div>

            {/* MENU */}
            <div className="
              grid
              grid-cols-2
              md:grid-cols-3
              xl:grid-cols-6
              gap-3
              mt-5
            ">

              <MenuCard
                title="Kelola Soal"
                icon="📝"
                onClick={() =>
                  router.push("/admin/soal")
                }
              />

              <MenuCard
                title="Materi"
                icon="📚"
                onClick={() =>
                  router.push("/admin/materi")
                }
              />

              <MenuCard
                title="Ranking"
                icon="🏆"
                onClick={() =>
                  router.push("/admin/ranking")
                }
              />

              <MenuCard
                title="Rekap"
                icon="📊"
                onClick={() =>
                  router.push("/admin/rekap")
                }
              />

              <MenuCard
                title="Users"
                icon="👨‍🎓"
                onClick={() =>
                  router.push("/admin/users")
                }
              />

              <MenuCard
                title="Token"
                icon="🔑"
                onClick={() =>
                  router.push("/admin/token")
                }
              />

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

/* COMPONENT */

function SidebarBtn({
  title,
  onClick,
  active,
}: any) {

  return (

    <button
      onClick={onClick}
      className={`
        w-full
        text-left
        px-4
        py-3
        rounded-2xl
        font-medium
        transition-all

        ${
          active
            ? `
              bg-blue-600
              text-white
              shadow-lg
            `
            : `
              text-slate-300
              hover:bg-white/10
            `
        }
      `}
    >
      {title}
    </button>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: any) {

  return (

    <div className={`
      bg-gradient-to-r
      ${color}
      rounded-[22px]
      px-5
      py-4
      text-white
      shadow-lg
      relative
      overflow-hidden
      min-h-[115px]
    `}>

      <div className="
        absolute
        -right-5
        -top-5
        w-24
        h-24
        rounded-full
        bg-white/10
      " />

      <div className="
        relative
        flex
        items-center
        justify-between
      ">

        <div>

          <p className="
            text-sm
            text-white/80
          ">
            {title}
          </p>

          <h2 className="
            text-3xl
            font-black
            mt-2
          ">
            {value}
          </h2>

        </div>

        <div className="
          w-14
          h-14
          rounded-2xl
          bg-white/20
          flex
          items-center
          justify-center
          text-2xl
        ">

          {icon}

        </div>

      </div>

    </div>
  )
}

function MenuCard({
  title,
  icon,
  onClick,
}: any) {

  return (

    <div
      onClick={onClick}
      className="
        bg-white
        rounded-[24px]
        p-4
        border
        border-slate-200
        hover:shadow-lg
        transition-all
        cursor-pointer
        text-center
      "
    >

      <div className="
        w-14
        h-14
        mx-auto
        rounded-2xl
        bg-gradient-to-r
        from-blue-600
        to-indigo-600
        flex
        items-center
        justify-center
        text-2xl
        text-white
        mb-3
      ">

        {icon}

      </div>

      <h2 className="
        text-sm
        font-bold
        text-slate-800
      ">
        {title}
      </h2>

    </div>
  )
}
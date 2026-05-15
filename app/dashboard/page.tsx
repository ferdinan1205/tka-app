"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type Hasil = {
  id: number
  skor: number
  tanggal: string
  user_id: string
  kategori: string
}

export default function Dashboard() {

  const router = useRouter()

  const [hasil, setHasil] =
    useState<Hasil[]>([])

  const [nama, setNama] =
    useState("")

  const [email, setEmail] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const [sidebarOpen,
    setSidebarOpen] =
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

    const user = data.user

    setEmail(user.email || "")

    await getProfile(user.id)

    await getHasil(user.id)

    setLoading(false)
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

    if (data)
      setNama(data.nama || "")
  }

  async function getHasil(
    userId: string
  ) {

    const { data } =
      await supabase
        .from("hasil")
        .select("*")
        .eq("user_id", userId)

    setHasil(
      (data as Hasil[]) || []
    )
  }

  async function logout() {

    await supabase.auth.signOut()

    router.push("/login")
  }

  if (loading)
    return (
      <div className="
        min-h-screen
        flex items-center justify-center
        bg-gradient-to-br
        from-blue-100
        via-white
        to-cyan-100
      ">
        <div className="
          animate-pulse
          text-2xl
          font-bold
          text-blue-700
        ">
          Loading...
        </div>
      </div>
    )

  const mapelList = [
    "Matematika",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "TPS",
    "Literasi",
  ]

  return (

    <div className="
      min-h-screen
      bg-gradient-to-br
      from-slate-100
      via-blue-50
      to-cyan-50
    ">

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (

        <div
          onClick={() =>
            setSidebarOpen(false)
          }
          className="
            fixed inset-0
            bg-black/50
            z-40
            lg:hidden
          "
        />

      )}

      {/* SIDEBAR */}
      <div className={`
        fixed top-0 left-0 z-50
        w-72 h-screen
        overflow-y-auto
        bg-white/90
        backdrop-blur-xl
        border-r border-gray-200
        shadow-2xl
        p-6
        flex flex-col justify-between
        transition-all duration-300
        ${sidebarOpen
          ? "translate-x-0"
          : "-translate-x-full"}
        lg:translate-x-0
      `}>

        <div>

          {/* LOGO */}
          <div className="
            flex items-center
            justify-between
            mb-8
          ">

            {/* CLOSE MOBILE */}
            <button
              onClick={() =>
                setSidebarOpen(false)
              }
              className="
                lg:hidden
                text-3xl
                text-gray-600
              "
            >
              ✕
            </button>

          </div>

          {/* USER */}
          <div className="
            bg-gradient-to-r
            from-blue-600
            to-cyan-500
            p-5
            rounded-3xl
            text-white
            mb-8
            shadow-lg
          ">

            <div className="
              w-16 h-16
              rounded-full
              bg-white/20
              flex items-center
              justify-center
              text-3xl
              mb-4
            ">
              👨‍🎓
            </div>

            <p className="
              font-bold
              text-xl
            ">
              {nama}
            </p>

            <p className="
              text-sm
              text-blue-100
              break-all
            ">
              {email}
            </p>

          </div>

          {/* MENU */}
          <p className="
            text-xs
            text-gray-400
            mb-3
            font-semibold
          ">
            MENU UTAMA
          </p>

          <div className="space-y-3 mb-7">

            <SidebarBtn
              title="Dashboard"
              icon="🏠"
              active
            />

            <SidebarBtn
              title="Profile"
              icon="👤"
              onClick={() =>
                router.push("/profile")
              }
            />

          </div>

          {/* PEMBELAJARAN */}
          <p className="
            text-xs
            text-gray-400
            mb-3
            font-semibold
          ">
            PEMBELAJARAN
          </p>

          <div className="space-y-3 mb-7">

            <SidebarBtn
              title="Materi"
              icon="📚"
              onClick={() =>
                router.push("/materi")
              }
            />

            <SidebarBtn
              title="Ranking"
              icon="🏆"
              onClick={() =>
                router.push("/ranking")
              }
            />

            <SidebarBtn
              title="Progress"
              icon="📈"
              onClick={() =>
                router.push("/progress")
              }
            />

          </div>

          {/* DATA */}
          <p className="
            text-xs
            text-gray-400
            mb-3
            font-semibold
          ">
            DATA
          </p>

          <div className="space-y-3">

            <SidebarBtn
              title="Rekap Nilai"
              icon="📝"
              onClick={() =>
                router.push("/rekap")
              }
            />

          </div>

        </div>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="
            mt-10
            bg-gradient-to-r
            from-red-500
            to-pink-500
            hover:scale-105
            text-white
            py-4
            rounded-2xl
            transition-all
            font-bold
            shadow-lg
          "
        >
          Logout
        </button>

      </div>

      {/* CONTENT */}
      <div className="lg:ml-72">

        {/* TOPBAR MOBILE */}
        <div className="
          lg:hidden
          bg-white/90
          backdrop-blur-lg
          shadow-md
          p-4
          flex items-center
          gap-4
          sticky top-0
          z-30
        ">

          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="
              w-14 h-14
              rounded-2xl
              bg-gradient-to-r
              from-blue-600
              to-cyan-500
              text-white
              shadow-xl
              text-3xl
              flex
              items-center
              justify-center
              active:scale-95
              transition-all
            "
          >
            ☰
          </button>

          <h1 className="
            text-2xl
            font-extrabold
            text-gray-800
          ">
            Dashboard
          </h1>

        </div>

        {/* MAIN CONTENT */}
        <div className="p-4 md:p-8">

          {/* HERO */}
          <div className="
            relative
            overflow-hidden
            bg-gradient-to-r
            from-blue-700
            via-blue-600
            to-cyan-500
            text-white
            p-8 md:p-10
            rounded-[35px]
            mb-10
            shadow-2xl
          ">

            <div className="
              absolute
              top-0 right-0
              w-72 h-72
              bg-white/10
              rounded-full
              blur-3xl
            " />

            <div className="relative z-10">

              <h2 className="
                text-3xl
                md:text-5xl
                font-extrabold
                leading-tight
              ">
                Halo, {nama}! 👋
              </h2>

              <p className="
                mt-4
                text-blue-100
                text-lg
                md:text-xl
                max-w-2xl
              ">
                Selamat datang di platform belajar modern
                Lampung Cerdas 🚀
              </p>

            </div>

          </div>

          {/* TITLE */}
          <div className="mb-8">

            <h3 className="
              text-3xl
              font-extrabold
              text-gray-800
              mb-2
            ">
              Mata Pelajaran
            </h3>

            <p className="text-gray-500">
              Pilih mata pelajaran untuk mulai belajar
            </p>

          </div>

          {/* CARD MAPEL */}
          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-3
            gap-8
          ">

            {mapelList.map((item) => (

              <div
                key={item}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-[32px]
                  shadow-xl
                  hover:shadow-2xl
                  transition-all duration-500
                  hover:-translate-y-3
                "
              >

                {/* IMAGE */}
                <div className="h-[320px]">

                  <img
                    src={getImage(item)}
                    alt={item}
                    className="
                      w-full h-full
                      object-cover
                      group-hover:scale-110
                      transition duration-700
                    "
                  />

                </div>

                {/* OVERLAY */}
                <div className="
                  absolute inset-0
                  bg-gradient-to-t
                  from-black/90
                  via-black/30
                  to-transparent
                " />

                {/* CONTENT */}
                <div className="
                  absolute bottom-0
                  p-6
                  w-full
                ">

                  <div className="
                    flex items-center
                    gap-4 mb-4
                  ">

                    <div className="
                      w-16 h-16
                      rounded-2xl
                      bg-white/20
                      backdrop-blur-lg
                      flex items-center
                      justify-center
                      text-4xl
                      border border-white/20
                    ">
                      {getIcon(item)}
                    </div>

                    <div>

                      <h4 className="
                        text-2xl
                        font-extrabold
                        text-white
                      ">
                        {item}
                      </h4>

                      <p className="
                        text-gray-200
                        text-sm
                      ">
                        Belajar interaktif modern
                      </p>

                    </div>

                  </div>

                  <div className="flex gap-3">

                    {/* LATIHAN */}
                    <button
                      onClick={() =>
                        router.push(
                          `/latihan/${encodeURIComponent(item)}`
                        )
                      }
                      className="
                        bg-green-500
                        hover:bg-green-600
                        text-white
                        px-4 py-3
                        rounded-2xl
                        w-full
                        transition-all
                        font-bold
                        shadow-lg
                      "
                    >
                      Latihan
                    </button>

                    {/* UJIAN */}
                    <button
                      onClick={() =>
                        router.push(
                          `/ujian/${encodeURIComponent(item)}`
                        )
                      }
                      className="
                        bg-blue-500
                        hover:bg-blue-600
                        text-white
                        px-4 py-3
                        rounded-2xl
                        w-full
                        transition-all
                        font-bold
                        shadow-lg
                      "
                    >
                      Ujian
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>
  )
}

/* SIDEBAR BUTTON */
function SidebarBtn({
  title,
  onClick,
  active,
  icon
}: any) {

  return (

    <button
      onClick={onClick}
      className={`
        w-full text-left
        px-5 py-4
        rounded-2xl
        font-semibold
        transition-all duration-300
        flex items-center gap-3
        ${
          active
            ? `
              bg-gradient-to-r
              from-blue-600
              to-cyan-500
              text-white
              shadow-lg
            `
            : `
              bg-gray-50
              hover:bg-blue-50
              text-gray-700
            `
        }
      `}
    >

      <span className="text-xl">
        {icon}
      </span>

      {title}

    </button>

  )
}

/* ICON */
function getIcon(
  mapel: string
) {

  switch (mapel) {

    case "Matematika":
      return "📐"

    case "Bahasa Indonesia":
      return "📖"

    case "Bahasa Inggris":
      return "🌎"

    case "TPS":
      return "🧠"

    case "Literasi":
      return "📚"

    default:
      return "📘"
  }
}

/* IMAGE */
function getImage(
  mapel: string
) {

  switch (mapel) {

    case "Matematika":
      return "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=1200"

    case "Bahasa Indonesia":
      return "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200"

    case "Bahasa Inggris":
      return "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1200"

    case "TPS":
      return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200"

    case "Literasi":
      return "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1200"

    default:
      return "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200"
  }
}
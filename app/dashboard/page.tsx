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
        from-fuchsia-200
        via-sky-100
        to-cyan-200
      ">
        <div className="
          animate-pulse
          text-xl
          font-bold
          text-blue-700
        ">
          Loading...
        </div>
      </div>
    )

  const paketList = [
    {
      id: 1,
      nama: "Paket IPA",
      desc: "Kimia, Fisika, Biologi",
      image:
        "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1200",
      icon: "🧪",
      color: "from-cyan-500 to-blue-600"
    },

    {
      id: 2,
      nama: "Paket IPS",
      desc: "Ekonomi, Geografi, Sosiologi",
      image:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200",
      icon: "📊",
      color: "from-orange-400 to-pink-500"
    },

    {
      id: 3,
      nama: "Paket SMK",
      desc: "Produktif & Kejuruan",
      image:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200",
      icon: "🛠️",
      color: "from-emerald-400 to-green-600"
    },

    {
      id: 4,
      nama: "Paket Bahasa",
      desc: "Jerman, Jepang, Arab",
      image:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200",
      icon: "🌍",
      color: "from-violet-500 to-purple-700"
    },
  ]

  return (

    <div className="
      min-h-screen
      bg-gradient-to-br
      from-sky-100
      via-white
      to-fuchsia-100
    ">

      {/* OVERLAY */}
      {sidebarOpen && (

        <div
          onClick={() =>
            setSidebarOpen(false)
          }
          className="
            fixed inset-0
            bg-black/40
            backdrop-blur-sm
            z-40
            lg:hidden
          "
        />

      )}

      {/* SIDEBAR */}
      <div className={`
        fixed top-0 left-0 z-50
        w-56 h-screen
        overflow-y-auto
        bg-white/75
        backdrop-blur-2xl
        border-r border-white/30
        shadow-xl
        p-4
        flex flex-col justify-between
        transition-all duration-300
        ${sidebarOpen
          ? "translate-x-0"
          : "-translate-x-full"}
        lg:translate-x-0
      `}>

        <div>

          {/* CLOSE */}
          <div className="
            flex justify-end
            mb-4
          ">

            <button
              onClick={() =>
                setSidebarOpen(false)
              }
              className="
                lg:hidden
                text-xl
                text-gray-700
              "
            >
              ✕
            </button>

          </div>

          {/* PROFILE */}
          <div className="
            flex flex-col
            items-center
            mb-7
          ">

            <button
              onClick={() =>
                router.push("/profile")
              }
              className="
                relative
                w-16 h-16
                rounded-full
                bg-gradient-to-r
                from-fuchsia-500
                via-violet-500
                to-cyan-500
                flex items-center
                justify-center
                text-3xl
                shadow-lg
                hover:scale-105
                transition-all
                mb-2
              "
            >

              <div className="
                absolute inset-1
                rounded-full
                bg-white/20
              " />

              <span className="relative z-10">
                👨‍🎓
              </span>

            </button>

            <h2 className="
              text-sm
              font-bold
              bg-gradient-to-r
              from-violet-600
              to-cyan-600
              bg-clip-text
              text-transparent
              text-center
            ">
              {nama}
            </h2>

          </div>

          {/* MENU */}
          <p className="
            text-[10px]
            text-gray-500
            mb-2
            font-bold
            tracking-widest
          ">
            MENU
          </p>

          <div className="space-y-2 mb-5">

            <SidebarBtn
              title="Dashboard"
              icon="🏠"
              active
            />

          </div>

          {/* PEMBELAJARAN */}
          <p className="
            text-[10px]
            text-gray-500
            mb-2
            font-bold
            tracking-widest
          ">
            BELAJAR
          </p>

          <div className="space-y-2 mb-5">

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
            text-[10px]
            text-gray-500
            mb-2
            font-bold
            tracking-widest
          ">
            DATA
          </p>

          <div className="space-y-2">

            <SidebarBtn
              title="Rekap"
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
            mt-6
            bg-gradient-to-r
            from-rose-500
            to-pink-500
            hover:scale-105
            text-white
            py-2.5
            rounded-xl
            transition-all
            font-bold
            shadow-lg
            text-xs
          "
        >
          Logout
        </button>

      </div>

      {/* CONTENT */}
      <div className="lg:ml-56">

        {/* TOPBAR MOBILE */}
        <div className="
          lg:hidden
          bg-white/70
          backdrop-blur-xl
          border-b border-white/30
          shadow-md
          px-4 py-3
          flex items-center
          gap-3
          sticky top-0
          z-30
        ">

          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="
              w-10 h-10
              rounded-xl
              bg-gradient-to-r
              from-violet-500
              to-cyan-500
              text-white
              shadow-lg
              text-xl
              flex
              items-center
              justify-center
            "
          >
            ☰
          </button>

          <h1 className="
            text-lg
            font-bold
            bg-gradient-to-r
            from-violet-600
            to-cyan-600
            bg-clip-text
            text-transparent
          ">
            Dashboard
          </h1>

        </div>

        {/* MAIN */}
        <div className="p-4 md:p-6">

          {/* HERO */}
          <div className="
            relative
            overflow-hidden
            bg-gradient-to-r
            from-violet-600
            via-blue-600
            to-cyan-500
            text-white
            p-5 md:p-7
            rounded-[28px]
            mb-6
            shadow-xl
          ">

            <div className="
              absolute
              top-0 right-0
              w-52 h-52
              bg-white/10
              rounded-full
              blur-3xl
            " />

            <div className="relative z-10">

              <h2 className="
                text-2xl
                md:text-4xl
                font-extrabold
                leading-tight
              ">
                Halo, {nama}! 👋
              </h2>

              <p className="
                mt-2
                text-blue-100
                text-xs
                md:text-base
                max-w-xl
              ">
                Selamat datang di platform belajar modern
                Lampung Cerdas 🚀
              </p>

            </div>

          </div>

          {/* TITLE */}
          <div className="mb-5">

            <h3 className="
              text-2xl
              md:text-3xl
              font-extrabold
              bg-gradient-to-r
              from-violet-700
              to-cyan-600
              bg-clip-text
              text-transparent
              mb-1
            ">
              Paket Belajar
            </h3>

            <p className="
              text-gray-500
              text-xs md:text-sm
            ">
              Pilih paket favorit kamu ✨
            </p>

          </div>

          {/* CARD */}
          <div className="
            grid
            grid-cols-2
            md:grid-cols-2
            xl:grid-cols-3
            gap-3 md:gap-5
          ">

            {paketList.map((item) => (

              <div
                key={item.id}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-[24px]
                  shadow-lg
                  hover:shadow-2xl
                  transition-all duration-500
                  hover:-translate-y-2
                "
              >

                {/* IMAGE */}
                <div className="h-[170px] md:h-[260px]">

                  <img
                    src={item.image}
                    alt={item.nama}
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
                  p-3 md:p-5
                  w-full
                ">

                  <div className="
                    flex items-center
                    gap-2
                    mb-3
                  ">

                    <div className={`
                      w-10 h-10
                      md:w-12 md:h-12
                      rounded-xl
                      bg-gradient-to-r
                      ${item.color}
                      flex items-center
                      justify-center
                      text-lg
                      md:text-2xl
                      shadow-lg
                    `}>
                      {item.icon}
                    </div>

                    <div>

                      <h4 className="
                        text-xs
                        md:text-lg
                        font-extrabold
                        text-white
                      ">
                        {item.nama}
                      </h4>

                      <p className="
                        text-gray-200
                        text-[9px]
                        md:text-xs
                      ">
                        {item.desc}
                      </p>

                    </div>

                  </div>

                  {/* BUTTON */}
                  <button
                    onClick={() =>
                      router.push(
                        `/ujian/package/${item.id}`
                      )
                    }
                    className={`
                      bg-gradient-to-r
                      ${item.color}
                      hover:scale-105
                      text-white
                      px-3 py-2
                      rounded-xl
                      w-full
                      transition-all
                      font-bold
                      shadow-lg
                      text-[10px]
                      md:text-sm
                    `}
                  >
                    Masuk Paket
                  </button>

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
        px-3 py-2.5
        rounded-xl
        font-semibold
        transition-all duration-300
        flex items-center gap-2
        text-xs
        ${
          active
            ? `
              bg-gradient-to-r
              from-violet-500
              to-cyan-500
              text-white
              shadow-lg
            `
            : `
              bg-white/70
              hover:bg-gradient-to-r
              hover:from-violet-100
              hover:to-cyan-100
              text-gray-700
            `
        }
      `}
    >

      <span className="text-base">
        {icon}
      </span>

      {title}

    </button>

  )
}
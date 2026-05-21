"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type Materi = {
  id: number
  judul: string
  kategori: string
  tipe: string
  link: string
  gambar?: string
}

export default function MateriPage() {

  const [materi, setMateri] =
    useState<Materi[]>([])

  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
    useState("")

  const [kategoriAktif,
    setKategoriAktif] =
    useState("Semua")

  const router = useRouter()

  const kategoriList = [
    "Semua",
    "Matematika",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "TPS",
    "Literasi",
  ]

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

    await getMateri()

    setLoading(false)
  }

  async function getMateri() {

    const { data } =
      await supabase
        .from("materi")
        .select("*")
        .order("id", {
          ascending: false,
        })

    setMateri(data || [])
  }

  const filteredMateri =
    materi.filter((item) => {

      const cocokKategori =
        kategoriAktif === "Semua"
          ? true
          : item.kategori === kategoriAktif

      const cocokSearch =
        item.judul
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )

      return (
        cocokKategori &&
        cocokSearch
      )
    })

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
          flex
          flex-col
          items-center
          gap-4
        ">

          <div className="
            w-12
            h-12
            border-4
            border-blue-600
            border-t-transparent
            rounded-full
            animate-spin
          " />

          <p className="
            text-blue-700
            font-bold
          ">
            Loading...
          </p>

        </div>

      </div>
    )
  }

  return (

    <div className="
      min-h-screen
      bg-slate-100
      pb-10
    ">

      {/* HEADER */}
      <div className="
        sticky
        top-0
        z-40
        bg-white
        border-b
        border-slate-200
      ">

        <div className="
          max-w-6xl
          mx-auto
          px-3
          py-3
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
              text-blue-600
              font-black
            ">
              Lampung Cerdas
            </p>

            <h1 className="
              text-lg
              md:text-3xl
              font-black
              text-slate-800
              truncate
            ">
              Materi Pembelajaran
            </h1>

          </div>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="
              h-10
              px-4
              rounded-xl
              bg-blue-600
              hover:bg-blue-700
              text-white
              text-sm
              font-bold
              transition
              shrink-0
            "
          >
            Dashboard
          </button>

        </div>

      </div>

      {/* CONTENT */}
      <div className="
        max-w-6xl
        mx-auto
        px-3
        pt-3
      ">

        {/* SEARCH */}
        <div className="
          bg-white
          rounded-3xl
          border
          border-slate-200
          p-3
          mb-4
          shadow-sm
        ">

          {/* TITLE */}
          <div className="mb-3">

         
       

          </div>

          {/* INPUT */}
          <div className="relative">

            <input
              type="text"
              placeholder="Cari materi matematika, TPS, bahasa..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="
                w-full
                h-12
                rounded-2xl
                border-2
                border-slate-200
                bg-slate-50
                px-4
                text-sm
                text-slate-700
                outline-none
                focus:border-blue-500
                focus:bg-white
                transition-all
              "
            />

          </div>

          {/* FILTER */}
          <div className="
            mt-4
            overflow-x-auto
            scrollbar-hide
          ">

            <div className="
              flex
              gap-2
              min-w-max
              pb-1
            ">

              {kategoriList.map((item) => (

                <button
                  key={item}
                  onClick={() =>
                    setKategoriAktif(item)
                  }
                  className={`
                    whitespace-nowrap
                    px-4
                    h-10
                    rounded-2xl
                    text-xs
                    font-black
                    transition-all
                    active:scale-95

                    ${kategoriAktif === item
                      ? `
                        bg-blue-600
                        text-white
                        shadow-lg
                      `
                      : `
                        bg-slate-100
                        text-slate-700
                        hover:bg-blue-100
                      `
                    }
                  `}
                >
                  {item}
                </button>

              ))}

            </div>

          </div>

        </div>

        {/* EMPTY */}
        {filteredMateri.length === 0 ? (

          <div className="
            bg-white
            rounded-3xl
            border
            border-slate-200
            p-10
            text-center
          ">

            <div className="text-5xl">
              📚
            </div>

            <h2 className="
              text-xl
              font-black
              mt-4
              text-slate-800
            ">
              Materi Tidak Ditemukan
            </h2>

            <p className="
              text-sm
              text-slate-500
              mt-2
            ">
              Coba gunakan kata
              kunci lain
            </p>

          </div>

        ) : (

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-4
          ">

            {filteredMateri.map((item) => (

              <div
                key={item.id}
                className="
                  bg-white
                  rounded-3xl
                  overflow-hidden
                  border
                  border-slate-200
                  shadow-sm
                  hover:shadow-xl
                  hover:-translate-y-1
                  transition-all
                  duration-300
                "
              >

                {/* IMAGE */}
                <div className="
                  relative
                  overflow-hidden
                ">

                  <img
                    src={
                      item.gambar &&
                      item.gambar !== ""
                        ? item.gambar
                        : "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1200"
                    }
                    alt={item.judul}
                    className="
                      w-full
                      h-44
                      object-cover
                      hover:scale-105
                      transition-all
                      duration-500
                    "
                  />

                  {/* OVERLAY */}
                  <div className="
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black/70
                    to-transparent
                  " />

                  {/* BADGE */}
                  <div className="
                    absolute
                    top-3
                    left-3
                  ">

                    <span className="
                      px-3
                      py-1.5
                      rounded-full
                      bg-blue-600
                      text-white
                      text-[10px]
                      font-black
                    ">

                      {item.tipe.toUpperCase()}

                    </span>

                  </div>

                  {/* KATEGORI */}
                  <div className="
                    absolute
                    bottom-3
                    left-3
                  ">

                    <p className="
                      text-white
                      text-xs
                      font-bold
                    ">
                      {item.kategori}
                    </p>

                  </div>

                </div>

                {/* CONTENT */}
                <div className="p-4">

                  <h2 className="
                    text-base
                    md:text-lg
                    font-black
                    text-slate-800
                    line-clamp-2
                    leading-snug
                  ">
                    {item.judul}
                  </h2>

                  <p className="
                    text-xs
                    text-slate-500
                    leading-relaxed
                    mt-2
                    line-clamp-2
                  ">
                    Materi pembelajaran untuk
                    membantu siswa belajar
                    lebih mudah dan cepat.
                  </p>

                  {/* BUTTON */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      mt-4
                      h-11
                      rounded-2xl
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      text-sm
                      font-black
                      flex
                      items-center
                      justify-center
                      transition-all
                      active:scale-95
                    "
                  >

                    📚 Buka Materi

                  </a>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  )
}
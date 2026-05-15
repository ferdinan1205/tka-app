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

  const [materi,
    setMateri] =
    useState<Materi[]>([])

  const [loading,
    setLoading] =
    useState(true)

  const [search,
    setSearch] =
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
          ascending: false
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

      return cocokKategori &&
        cocokSearch
    })

  if (loading)

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
          gap-4
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
              Materi Pembelajaran
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
              shrink-0
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

        {/* SEARCH */}
        <div className="
          bg-white
          rounded-[30px]
          p-5
          shadow-sm
          mb-6
        ">

          <input
            type="text"
            placeholder="Cari materi pembelajaran..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="
              w-full
              border
              border-gray-200
              rounded-2xl
              px-5 py-4
              outline-none
              focus:border-blue-500
              text-gray-700
            "
          />

          {/* FILTER */}
          <div className="
            flex flex-wrap
            gap-3
            mt-5
          ">

            {kategoriList.map((item) => (

              <button
                key={item}
                onClick={() =>
                  setKategoriAktif(item)
                }
                className={`
                  px-5 py-3
                  rounded-2xl
                  text-sm
                  font-semibold
                  transition-all

                  ${kategoriAktif === item

                    ? `
                      bg-blue-600
                      text-white
                      shadow-md
                    `

                    : `
                      bg-[#f4f7fb]
                      text-gray-700
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

        {/* EMPTY */}
        {filteredMateri.length === 0 ? (

          <div className="
            bg-white
            rounded-[35px]
            p-10
            text-center
            shadow-sm
          ">

            <div className="text-6xl">
              📚
            </div>

            <h2 className="
              text-2xl
              font-black
              text-gray-800
              mt-4
            ">
              Materi Tidak Ditemukan
            </h2>

            <p className="
              text-gray-500
              mt-2
            ">
              Coba gunakan kata
              kunci lain.
            </p>

          </div>

        ) : (

          <div className="
            grid
            md:grid-cols-2
            xl:grid-cols-3
            gap-6
          ">

            {filteredMateri.map((item) => (

              <div
                key={item.id}
                className="
                  bg-white
                  rounded-[35px]
                  overflow-hidden
                  shadow-sm
                  hover:shadow-xl
                  transition-all
                  group
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
                    className="
                      w-full
                      h-56
                      object-cover
                      group-hover:scale-105
                      transition-all
                      duration-500
                    "
                  />

                  {/* OVERLAY */}
                  <div className="
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black/60
                    to-transparent
                  " />

                  {/* BADGE */}
                  <div className="
                    absolute
                    top-4 left-4
                  ">

                    <span className={`
                      px-4 py-2
                      rounded-full
                      text-xs
                      font-bold
                      backdrop-blur-md

                      ${item.tipe
                        .toLowerCase() === "video"

                        ? `
                          bg-red-500/90
                          text-white
                        `

                        : item.tipe
                            .toLowerCase() === "pdf"

                        ? `
                          bg-green-500/90
                          text-white
                        `

                        : `
                          bg-blue-500/90
                          text-white
                        `
                      }
                    `}>

                      {item.tipe.toUpperCase()}

                    </span>

                  </div>

                  {/* KATEGORI */}
                  <div className="
                    absolute
                    bottom-4 left-4
                  ">

                    <p className="
                      text-white
                      text-sm
                      font-semibold
                    ">
                      {item.kategori}
                    </p>

                  </div>

                </div>

                {/* CONTENT */}
                <div className="
                  p-6
                ">

                  <h2 className="
                    text-2xl
                    font-black
                    text-gray-800
                    leading-snug
                    line-clamp-2
                  ">
                    {item.judul}
                  </h2>

                  <p className="
                    text-gray-500
                    mt-3
                    text-sm
                    leading-relaxed
                  ">
                    Materi pembelajaran
                    untuk meningkatkan
                    pemahaman akademik
                    siswa.
                  </p>

                  {/* BUTTON */}
                  <a
                    href={item.link}
                    target="_blank"
                    className={`
                      mt-6
                      block
                      text-center
                      py-4
                      rounded-2xl
                      font-bold
                      transition-all

                      ${item.tipe
                        .toLowerCase() === "video"

                        ? `
                          bg-red-500
                          hover:bg-red-600
                          text-white
                        `

                        : item.tipe
                            .toLowerCase() === "pdf"

                        ? `
                          bg-green-500
                          hover:bg-green-600
                          text-white
                        `

                        : `
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                        `
                      }
                    `}
                  >

                    {item.tipe
                      .toLowerCase() === "video"

                      ? "▶ Tonton Video"

                      : item.tipe
                          .toLowerCase() === "pdf"

                      ? "📄 Buka PDF"

                      : "📚 Buka Materi"
                    }

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
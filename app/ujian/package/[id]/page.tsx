"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../../lib/supabase"
import {
  useParams,
  useRouter
} from "next/navigation"

type PackageType = {
  id: number
  nama_paket: string
  token: string
}

type SubjectType = {
  id: number
  package_id: number
  subject: string
}

export default function PackagePage() {

  const params = useParams()
  const router = useRouter()

  const packageId =
    Number(params.id)

  const [paket, setPaket] =
    useState<PackageType | null>(null)

  const [subjects, setSubjects] =
    useState<SubjectType[]>([])

  const [loading,
    setLoading] =
    useState(true)

  const [allowed,
    setAllowed] =
    useState(false)

  const [token,
    setToken] =
    useState("")

  const [selectedSubject,
    setSelectedSubject] =
    useState("")

  useEffect(() => {

    if (!packageId) return

    getData()

  }, [packageId])

  async function getData() {

    try {

      setLoading(true)

      const {
        data: packageData,
        error: packageError
      } = await supabase
        .from("packages")
        .select("*")
        .eq("id", packageId)
        .single()

      if (packageError) {

        console.log(packageError)

        setLoading(false)

        return
      }

      setPaket(packageData)

      const {
        data: subjectData,
        error: subjectError
      } = await supabase
        .from("package_subjects")
        .select("*")
        .eq(
          "package_id",
          packageId
        )

      if (subjectError) {

        console.log(subjectError)
      }

      setSubjects(
        subjectData || []
      )

      setLoading(false)

    } catch (err) {

      console.log(err)

      setLoading(false)
    }
  }

  function handleToken() {

    if (!paket) return

    if (
      token.trim() !==
      paket.token
    ) {

      alert("Token salah")

      return
    }

    setAllowed(true)
  }

  async function handleStartExam(
    kategori: string
  ) {

    try {

      const {
        data,
        error
      } = await supabase
        .from("soal")
        .select("id")
        .eq("kategori", kategori)
        .limit(1)

      if (error) {

        console.log(error)

        alert("Terjadi kesalahan")

        return
      }

      if (!data || data.length === 0) {

        alert(
          `Soal ${kategori} belum tersedia`
        )

        return
      }

      router.push(
        `/ujian/${encodeURIComponent(kategori)}`
      )

    } catch (err) {

      console.log(err)

      alert("Terjadi kesalahan")
    }
  }

  // LOADING
  if (loading) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-gradient-to-br
        from-violet-100
        via-white
        to-cyan-100
      ">

        <div className="
          bg-white
          px-6 py-4
          rounded-3xl
          shadow-2xl
          text-lg md:text-2xl
          font-black
          text-violet-700
          animate-pulse
        ">

          Loading...

        </div>

      </div>
    )
  }

  // NOT FOUND
  if (!paket) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-slate-100
        p-4
      ">

        <div className="
          bg-white
          p-8
          rounded-3xl
          shadow-xl
          text-center
          max-w-sm
          w-full
        ">

          <h1 className="
            text-2xl
            font-black
            text-red-600
            mb-3
          ">

            Paket tidak ditemukan

          </h1>

        </div>

      </div>
    )
  }

  // TOKEN PAGE
  if (!allowed) {

    return (

      <div className="
        min-h-screen
        bg-gradient-to-br
        from-violet-100
        via-white
        to-cyan-100
        flex
        items-center
        justify-center
        p-4
      ">

        <div className="
          relative
          overflow-hidden
          bg-white/95
          backdrop-blur-xl
          max-w-md
          w-full
          p-6 md:p-10
          rounded-[32px]
          shadow-[0_20px_60px_rgba(0,0,0,0.12)]
          border border-white
        ">

          {/* GLOW */}
          <div className="
            absolute
            -top-16
            -right-16
            w-40
            h-40
            bg-violet-300/30
            rounded-full
            blur-3xl
          " />

          <div className="
            absolute
            -bottom-16
            -left-16
            w-40
            h-40
            bg-cyan-300/30
            rounded-full
            blur-3xl
          " />

          {/* ICON */}
          <div className="
            relative z-10
            w-20 h-20
            md:w-24 md:h-24
            rounded-full
            bg-gradient-to-r
            from-violet-600
            to-cyan-500
            flex
            items-center
            justify-center
            text-4xl
            md:text-5xl
            mx-auto
            mb-5
            shadow-xl
          ">
            🔐
          </div>

          {/* TITLE */}
          <h1 className="
            relative z-10
            text-2xl md:text-4xl
            font-black
            text-center
            mb-2
            bg-gradient-to-r
            from-violet-700
            to-cyan-600
            bg-clip-text
            text-transparent
          ">

            Masukkan Token

          </h1>

          <p className="
            relative z-10
            text-center
            text-gray-700
            text-sm md:text-base
            mb-6
            leading-relaxed
          ">

            Untuk membuka paket
            {" "}

            <span className="
              font-bold
              text-violet-700
            ">
              {paket.nama_paket}
            </span>

          </p>

          {/* INPUT */}
          <div className="relative z-10">

            <input
              value={token}
              onChange={(e) =>
                setToken(
                  e.target.value
                )
              }
              placeholder="Masukkan token paket..."
              className="
                w-full
                bg-white
                border-2
                border-violet-200
                text-gray-800
                placeholder:text-gray-400
                p-4
                rounded-2xl
                mb-4
                outline-none
                text-sm md:text-base
                font-semibold
                focus:border-violet-500
                focus:ring-4
                focus:ring-violet-200
                transition-all
                shadow-sm
              "
            />

            <button
              onClick={handleToken}
              className="
                w-full
                bg-gradient-to-r
                from-violet-600
                to-cyan-500
                hover:from-violet-700
                hover:to-cyan-600
                text-white
                py-3.5
                rounded-2xl
                font-black
                text-sm md:text-base
                shadow-xl
                hover:scale-[1.02]
                active:scale-95
                transition-all
              "
            >
              Masuk Paket
            </button>

          </div>

        </div>

      </div>
    )
  }

  // SUBJECT SELECT
  if (!selectedSubject) {

    return (

      <div className="
        min-h-screen
        bg-gradient-to-br
        from-slate-100
        via-violet-50
        to-cyan-50
        p-4 md:p-6
      ">

        <div className="max-w-7xl mx-auto">

          {/* HERO */}
          <div className="
            relative
            overflow-hidden
            rounded-[28px]
            md:rounded-[40px]
            bg-gradient-to-r
            from-violet-700
            via-blue-600
            to-cyan-500
            p-5 md:p-10
            mb-6 md:mb-10
            shadow-2xl
          ">

            <div className="
              absolute
              top-0
              right-0
              w-52 md:w-72
              h-52 md:h-72
              bg-white/10
              rounded-full
              blur-3xl
            " />

            <div className="relative z-10">

              <p className="
                text-cyan-100
                font-bold
                text-xs md:text-sm
                mb-2
                tracking-widest
              ">
                PAKET PEMBELAJARAN
              </p>

              <h1 className="
                text-2xl
                md:text-5xl
                font-black
                text-white
                mb-3
                leading-tight
              ">

                {paket.nama_paket}

              </h1>

              <p className="
                text-cyan-100
                text-sm md:text-lg
              ">

                Pilih mata pelajaran 🚀

              </p>

            </div>

          </div>

          {/* SUBJECT */}
          <div className="
            grid
            grid-cols-2
            md:grid-cols-2
            lg:grid-cols-3
            gap-4 md:gap-7
          ">

            {subjects.map((item, index) => (

              <button
                key={item.id}
                onClick={() =>
                  setSelectedSubject(
                    item.subject
                  )
                }
                className="
                  group
                  relative
                  overflow-hidden
                  bg-white/90
                  backdrop-blur-xl
                  rounded-[24px]
                  md:rounded-[35px]
                  p-4 md:p-7
                  shadow-lg
                  hover:shadow-2xl
                  hover:-translate-y-2
                  transition-all duration-500
                  text-left
                "
              >

                <div className="
                  absolute
                  top-3
                  right-3
                  text-4xl md:text-6xl
                  font-black
                  text-gray-100
                ">
                  0{index + 1}
                </div>

                <div className="
                  w-12 h-12
                  md:w-20 md:h-20
                  rounded-2xl
                  bg-gradient-to-r
                  from-violet-600
                  to-cyan-500
                  flex items-center
                  justify-center
                  text-2xl md:text-4xl
                  shadow-lg
                  mb-4
                ">
                  📘
                </div>

                <p className="
                  text-[10px]
                  md:text-sm
                  font-bold
                  text-violet-600
                  mb-1
                ">
                  Pendamping
                </p>

                <h2 className="
                  text-sm
                  md:text-3xl
                  font-black
                  text-gray-800
                  mb-2
                  leading-tight
                ">

                  {item.subject}

                </h2>

                <p className="
                  text-gray-500
                  text-[11px]
                  md:text-sm
                  mb-4
                ">
                  Mulai latihan soal ✨
                </p>

                <div className="
                  inline-flex
                  items-center
                  gap-2
                  text-violet-600
                  text-xs md:text-base
                  font-bold
                ">
                  Pilih →
                </div>

              </button>

            ))}

          </div>

        </div>

      </div>
    )
  }

  // MAPEL
  const mapel = [
    {
      nama: "Matematika",
      kategori: "Matematika",
      icon: "📐",
      color: "from-blue-600 to-cyan-500"
    },
    {
      nama: "Bahasa Indonesia",
      kategori: "Bahasa Indonesia",
      icon: "📖",
      color: "from-orange-500 to-pink-500"
    },
    {
      nama: "Bahasa Inggris",
      kategori: "Bahasa Inggris",
      icon: "🌍",
      color: "from-emerald-500 to-green-600"
    },
    {
      nama: selectedSubject,
      kategori: selectedSubject,
      icon: "🎯",
      color: "from-violet-600 to-fuchsia-500"
    }
  ]

  return (

    <div className="
      min-h-screen
      bg-gradient-to-br
      from-slate-100
      via-violet-50
      to-cyan-50
      p-4 md:p-6
    ">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="
          relative
          overflow-hidden
          rounded-[28px]
          md:rounded-[40px]
          bg-gradient-to-r
          from-violet-700
          via-blue-600
          to-cyan-500
          p-5 md:p-10
          mb-6 md:mb-10
          shadow-2xl
        ">

          <div className="
            absolute
            -top-10
            -right-10
            w-56 md:w-72
            h-56 md:h-72
            bg-white/10
            rounded-full
            blur-3xl
          " />

          <div className="relative z-10">

            <p className="
              text-cyan-100
              font-semibold
              text-xs md:text-sm
              mb-2
              tracking-widest
            ">
              PAKET PEMBELAJARAN
            </p>

            <h1 className="
              text-2xl
              md:text-5xl
              font-black
              text-white
              mb-3
              leading-tight
            ">

              {paket.nama_paket}

            </h1>

            <p className="
              text-sm
              md:text-lg
              text-cyan-100
            ">

              Pendamping:
              {" "}

              <span className="
                font-black
                text-white
              ">
                {selectedSubject}
              </span>

            </p>

          </div>

        </div>

        {/* MAPEL */}
        <div className="
          grid
          grid-cols-2
          md:grid-cols-2
          xl:grid-cols-4
          gap-4 md:gap-7
        ">

          {mapel.map((item, index) => (

            <div
              key={item.nama}
              className="
                group
                relative
                overflow-hidden
                bg-white/90
                backdrop-blur-xl
                rounded-[24px]
                md:rounded-[35px]
                p-4 md:p-7
                shadow-lg
                border border-white
                hover:shadow-2xl
                hover:-translate-y-2
                transition-all duration-500
              "
            >

              <div className="
                absolute
                top-3
                right-3
                text-4xl md:text-6xl
                font-black
                text-gray-100
              ">
                0{index + 1}
              </div>

              {/* ICON */}
              <div className={`
                relative
                z-10
                w-12 h-12
                md:w-20 md:h-20
                rounded-2xl
                bg-gradient-to-r
                ${item.color}
                flex
                items-center
                justify-center
                text-2xl md:text-4xl
                shadow-xl
                mb-4
              `}>

                {item.icon}

              </div>

              {/* CONTENT */}
              <div className="relative z-10">

                <p className="
                  text-[10px]
                  md:text-sm
                  font-bold
                  text-violet-600
                  mb-1
                  uppercase
                  tracking-wider
                ">

                  Mata Pelajaran

                </p>

                <h2 className="
                  text-sm
                  md:text-3xl
                  font-black
                  text-gray-800
                  leading-tight
                  mb-3
                ">

                  {item.nama}

                </h2>

                <p className="
                  text-gray-500
                  text-[11px]
                  md:text-sm
                  mb-5
                ">
                  Kerjakan soal terbaik 🚀
                </p>

                <button
                  onClick={() =>
                    handleStartExam(
                      item.kategori
                    )
                  }
                  className={`
                    w-full
                    bg-gradient-to-r
                    ${item.color}
                    text-white
                    py-3
                    rounded-2xl
                    font-black
                    text-xs md:text-base
                    shadow-lg
                    hover:scale-105
                    active:scale-95
                    transition-all
                  `}
                >
                  Mulai Ujian
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  )
}
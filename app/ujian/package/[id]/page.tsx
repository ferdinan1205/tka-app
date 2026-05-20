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

  // ======================
  // LOAD DATA
  // ======================
  useEffect(() => {

    if (!packageId) return

    getData()

  }, [packageId])

  async function getData() {

    try {

      setLoading(true)

      // ======================
      // GET PACKAGE
      // ======================
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

      // ======================
      // GET SUBJECTS
      // ======================
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

  // ======================
  // TOKEN VALIDATION
  // ======================
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

  // ======================
  // START EXAM
  // ======================
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
        bg-gradient-to-br
        from-blue-100
        via-white
        to-cyan-100
      ">

        <div className="
          bg-white
          px-10
          py-5
          rounded-[30px]
          shadow-2xl
          text-2xl
          font-black
          text-blue-700
          animate-pulse
        ">

          Loading...

        </div>

      </div>
    )
  }

  // ======================
  // PACKAGE NOT FOUND
  // ======================
  if (!paket) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#f3f6fb]
      ">

        <div className="
          bg-white
          p-10
          rounded-[35px]
          shadow-2xl
          text-center
        ">

          <h1 className="
            text-3xl
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

  // ======================
  // TOKEN PAGE
  // ======================
  if (!allowed) {

    return (

      <div className="
        min-h-screen
        bg-gradient-to-br
        from-blue-100
        via-white
        to-cyan-100
        flex
        items-center
        justify-center
        p-6
      ">

        <div className="
          bg-white/90
          backdrop-blur-xl
          max-w-md
          w-full
          p-10
          rounded-[40px]
          shadow-2xl
          border
          border-white
        ">

          <div className="
            w-24
            h-24
            rounded-full
            bg-gradient-to-r
            from-blue-600
            to-cyan-500
            flex
            items-center
            justify-center
            text-5xl
            mx-auto
            mb-6
            shadow-xl
          ">
            🔐
          </div>

          <h1 className="
            text-4xl
            font-black
            text-blue-700
            text-center
            mb-3
          ">

            Token Paket

          </h1>

          <p className="
            text-center
            text-gray-500
            mb-8
          ">

            Paket {paket.nama_paket}

          </p>

          <input
            value={token}
            onChange={(e) =>
              setToken(
                e.target.value
              )
            }
            placeholder="Masukkan token"
            className="
              w-full
              border-2
              border-gray-200
              p-4
              rounded-2xl
              mb-5
              outline-none
              focus:border-blue-500
            "
          />

          <button
            onClick={handleToken}
            className="
              w-full
              bg-gradient-to-r
              from-blue-600
              to-cyan-500
              hover:from-blue-700
              hover:to-cyan-600
              text-white
              py-4
              rounded-2xl
              font-black
              shadow-xl
              hover:scale-105
              transition-all
            "
          >
            Masuk Paket
          </button>

        </div>

      </div>
    )
  }

  // ======================
  // SELECT SUBJECT
  // ======================
  if (!selectedSubject) {

    return (

      <div className="
        min-h-screen
        bg-gradient-to-br
        from-slate-100
        via-blue-50
        to-cyan-50
        p-6
      ">

        <div className="max-w-7xl mx-auto">

          {/* HERO */}
          <div className="
            relative
            overflow-hidden
            rounded-[40px]
            bg-gradient-to-r
            from-blue-700
            via-blue-600
            to-cyan-500
            p-10
            mb-10
            shadow-2xl
          ">

            <div className="
              absolute
              top-0
              right-0
              w-72
              h-72
              bg-white/10
              rounded-full
              blur-3xl
            " />

            <div className="relative z-10">

              <p className="
                text-blue-100
                font-bold
                mb-3
              ">
                PAKET PEMBELAJARAN
              </p>

              <h1 className="
                text-5xl
                font-black
                text-white
                mb-4
              ">

                {paket.nama_paket}

              </h1>

              <p className="
                text-blue-100
                text-lg
              ">

                Pilih mata pelajaran pendamping 🚀

              </p>

            </div>

          </div>

          {/* SUBJECT CARD */}
          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            lg:grid-cols-3
            gap-8
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
                  bg-white
                  rounded-[35px]
                  p-8
                  shadow-xl
                  hover:shadow-2xl
                  hover:-translate-y-3
                  transition-all duration-500
                  text-left
                "
              >

                <div className="
                  absolute
                  top-5
                  right-5
                  text-7xl
                  font-black
                  text-gray-100
                ">
                  0{index + 1}
                </div>

                <div className="
                  w-20
                  h-20
                  rounded-3xl
                  bg-gradient-to-r
                  from-blue-600
                  to-cyan-500
                  flex
                  items-center
                  justify-center
                  text-4xl
                  shadow-xl
                  mb-6
                ">
                  📘
                </div>

                <p className="
                  text-sm
                  font-bold
                  text-blue-500
                  mb-2
                ">
                  Pendamping
                </p>

                <h2 className="
                  text-3xl
                  font-black
                  text-gray-800
                  mb-4
                ">

                  {item.subject}

                </h2>

                <p className="
                  text-gray-500
                  mb-6
                ">

                  Kerjakan latihan soal terbaik 🚀

                </p>

                <div className="
                  inline-flex
                  items-center
                  gap-2
                  text-blue-600
                  font-bold
                ">
                  Pilih Mapel →
                </div>

              </button>

            ))}

          </div>

        </div>

      </div>
    )
  }

  // ======================
  // SUBJECT LIST
  // ======================
  const mapel = [
    {
      nama: "Matematika",
      kategori: "Matematika"
    },
    {
      nama: "Bahasa Indonesia",
      kategori: "Bahasa Indonesia"
    },
    {
      nama: "Bahasa Inggris",
      kategori: "Bahasa Inggris"
    },
    {
      nama: selectedSubject,
      kategori: selectedSubject
    }
  ]

  return (

    <div className="
      min-h-screen
      bg-gradient-to-br
      from-slate-100
      via-blue-50
      to-cyan-50
      p-6
    ">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="
          relative
          overflow-hidden
          rounded-[40px]
          bg-gradient-to-r
          from-blue-700
          via-blue-600
          to-cyan-500
          p-10
          mb-10
          shadow-2xl
        ">

          <div className="
            absolute
            -top-10
            -right-10
            w-72
            h-72
            bg-white/10
            rounded-full
            blur-3xl
          " />

          <div className="relative z-10">

            <p className="
              text-blue-100
              font-semibold
              mb-3
              tracking-wide
            ">
              PAKET PEMBELAJARAN
            </p>

            <h1 className="
              text-4xl
              md:text-5xl
              font-black
              text-white
              mb-4
            ">

              {paket.nama_paket}

            </h1>

            <p className="
              text-lg
              text-blue-100
            ">

              Pendamping:
              {" "}

              <span className="font-black text-white">

                {selectedSubject}

              </span>

            </p>

          </div>

        </div>

        {/* CARD */}
        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-4
          gap-8
        ">

          {mapel.map((item, index) => (

            <div
              key={item.nama}
              className="
                group
                relative
                overflow-hidden
                bg-white/80
                backdrop-blur-xl
                rounded-[35px]
                p-7
                shadow-xl
                border border-white
                hover:shadow-2xl
                hover:-translate-y-3
                transition-all duration-500
              "
            >

              {/* GLOW */}
              <div className="
                absolute
                inset-0
                bg-gradient-to-br
                from-blue-500/0
                to-cyan-500/0
                group-hover:from-blue-500/10
                group-hover:to-cyan-500/10
                transition-all
              " />

              {/* NUMBER */}
              <div className="
                absolute
                top-5
                right-5
                text-6xl
                font-black
                text-gray-100
              ">
                0{index + 1}
              </div>

              {/* ICON */}
              <div className="
                relative
                z-10
                w-20
                h-20
                rounded-3xl
                bg-gradient-to-r
                from-blue-600
                to-cyan-500
                flex
                items-center
                justify-center
                text-4xl
                shadow-xl
                mb-6
              ">

                {item.nama === "Matematika" && "📐"}
                {item.nama === "Bahasa Indonesia" && "📖"}
                {item.nama === "Bahasa Inggris" && "🌍"}
                {item.nama !== "Matematika" &&
                 item.nama !== "Bahasa Indonesia" &&
                 item.nama !== "Bahasa Inggris" && "🎯"}

              </div>

              {/* CONTENT */}
              <div className="relative z-10">

                <p className="
                  text-sm
                  font-bold
                  text-blue-500
                  mb-2
                  uppercase
                  tracking-wider
                ">

                  Mata Pelajaran

                </p>

                <h2 className="
                  text-3xl
                  font-black
                  text-gray-800
                  leading-tight
                  mb-4
                ">

                  {item.nama}

                </h2>

                <p className="
                  text-gray-500
                  mb-8
                ">
                  Kerjakan soal dan tingkatkan kemampuanmu 🚀
                </p>

                <button
                  onClick={() =>
                    handleStartExam(
                      item.kategori
                    )
                  }
                  className="
                    w-full
                    bg-gradient-to-r
                    from-blue-600
                    to-cyan-500
                    hover:from-blue-700
                    hover:to-cyan-600
                    text-white
                    py-4
                    rounded-2xl
                    font-black
                    shadow-lg
                    hover:scale-105
                    transition-all
                  "
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
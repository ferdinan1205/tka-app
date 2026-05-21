"use client"

import { useEffect, useState } from "react"

import { supabase } from "../../../../lib/supabase"

import {
  useParams,
  useRouter,
} from "next/navigation"

// ======================
// TYPES
// ======================

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

// ======================
// MAIN PAGE
// ======================

export default function PackagePage() {

  const params = useParams()

  const router = useRouter()

  const packageId =
    Number(params.id)

  // ======================
  // STATES
  // ======================

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

  const [savedPendamping,
    setSavedPendamping] =
    useState("")

  // ======================
  // INIT
  // ======================

  useEffect(() => {

    if (!packageId) return

    getData()

  }, [packageId])

  // ======================
  // GET DATA
  // ======================

  async function getData() {

    try {

      setLoading(true)

      // ======================
      // USER
      // ======================

      const {
        data: userData,
      } = await supabase.auth.getUser()

      const user =
        userData.user

      // ======================
      // PACKAGE
      // ======================

      const {
        data: packageData,
        error: packageError,
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
      // SUBJECTS
      // ======================

      const {
        data: subjectData,
        error: subjectError,
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

      // ======================
      // CHECK PENDAMPING
      // ======================

      if (user) {

        const {
          data: pilihanData,
        } = await supabase
          .from(
            "pilihan_pendamping"
          )
          .select("*")
          .eq("user_id", user.id)
          .eq(
            "package_id",
            String(packageId)
          )
          .maybeSingle()

        if (pilihanData) {

          setSavedPendamping(
            pilihanData.pilihan
          )

          // ======================
          // JANGAN AUTO MASUK
          // ======================

          // setSelectedSubject(
          //   pilihanData.pilihan
          // )
        }
      }

      setLoading(false)

    } catch (err) {

      console.log(err)

      setLoading(false)
    }
  }

  // ======================
  // TOKEN
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
  // PILIH PENDAMPING
  // ======================

  async function pilihPendamping(
    subject: string
  ) {

    try {

      // ======================
      // USER
      // ======================

      const {
        data: userData,
      } = await supabase.auth.getUser()

      const user =
        userData.user

      if (!user) {

        alert("Harus login")

        return
      }

      // ======================
      // SUDAH PILIH
      // ======================

      if (
        savedPendamping &&
        savedPendamping !== subject
      ) {

        alert(
          `Kamu sudah memilih ${savedPendamping}`
        )

        return
      }

      // ======================
      // SIMPAN PERTAMA KALI
      // ======================

      if (!savedPendamping) {

        const {
          error,
        } = await supabase
          .from(
            "pilihan_pendamping"
          )
          .insert([
            {
              user_id: user.id,
              package_id:
                String(packageId),
              pilihan: subject,
            },
          ])

        if (error) {

          console.log(error)

          alert(
            "Gagal memilih pendamping"
          )

          return
        }

        setSavedPendamping(
          subject
        )
      }

      setSelectedSubject(subject)

    } catch (err) {

      console.log(err)

      alert("Terjadi kesalahan")
    }
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
        error,
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

      if (
        !data ||
        data.length === 0
      ) {

        alert(
          `Soal ${kategori} belum tersedia`
        )

        return
      }

      router.push(
        `/ujian/${encodeURIComponent(
          kategori
        )}?paket=${encodeURIComponent(
          paket?.nama_paket || ""
        )}&package_id=${packageId}`
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
        from-violet-100
        via-white
        to-cyan-100
      ">

        <div className="
          bg-white
          px-8 py-6
          rounded-[32px]
          shadow-2xl
          border
          border-white
        ">

          <div className="
            w-12
            h-12
            border-4
            border-violet-500
            border-t-transparent
            rounded-full
            animate-spin
            mx-auto
            mb-4
          " />

          <p className="
            text-xl
            font-black
            text-violet-700
          ">
            Loading...
          </p>

        </div>

      </div>
    )
  }

  // ======================
  // NOT FOUND
  // ======================

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
          rounded-[32px]
          shadow-xl
          text-center
          max-w-md
          w-full
        ">

          <div className="text-6xl mb-4">
            😢
          </div>

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
          p-7 md:p-10
          rounded-[36px]
          shadow-[0_25px_80px_rgba(0,0,0,0.12)]
        ">

          <div className="
            absolute
            -top-24
            -right-24
            w-52
            h-52
            bg-violet-300/30
            rounded-full
            blur-3xl
          " />

          <div className="
            absolute
            -bottom-24
            -left-24
            w-52
            h-52
            bg-cyan-300/30
            rounded-full
            blur-3xl
          " />

          <div className="relative z-10">

            <div className="
              w-24
              h-24
              rounded-full
              bg-gradient-to-r
              from-violet-600
              to-cyan-500
              flex
              items-center
              justify-center
              text-5xl
              mx-auto
              shadow-2xl
              mb-6
            ">
              🔐
            </div>

            <h1 className="
              text-3xl
              md:text-4xl
              font-black
              text-center
              leading-tight
              mb-3
              bg-gradient-to-r
              from-violet-700
              to-cyan-600
              bg-clip-text
              text-transparent
            ">

              Masukkan Token

            </h1>

            <p className="
              text-center
              text-gray-600
              text-base
              leading-relaxed
              mb-7
            ">

              Gunakan token untuk membuka paket

              <span className="
                block
                mt-2
                text-violet-700
                font-black
                text-xl
              ">
                {paket.nama_paket}
              </span>

            </p>

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
                h-14
                rounded-2xl
                border-2
                border-violet-200
                px-5
                text-gray-800
                font-bold
                text-base
                outline-none
                focus:border-violet-500
                focus:ring-4
                focus:ring-violet-200
                transition-all
                mb-5
              "
            />

            <button
              onClick={handleToken}
              className="
                w-full
                h-14
                rounded-2xl
                bg-gradient-to-r
                from-violet-600
                to-cyan-500
                text-white
                font-black
                text-lg
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

  // ======================
  // SUBJECT PAGE
  // ======================

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
            rounded-[40px]
            bg-gradient-to-r
            from-violet-700
            via-blue-600
            to-cyan-500
            p-7 md:p-12
            mb-8
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
                text-cyan-100
                font-bold
                text-sm
                tracking-[4px]
                mb-3
              ">
                PAKET PEMBELAJARAN
              </p>

              <h1 className="
                text-3xl
                md:text-6xl
                font-black
                text-white
                leading-tight
                mb-4
              ">

                {paket.nama_paket}

              </h1>

              <p className="
                text-cyan-100
                text-base
                md:text-xl
                leading-relaxed
                max-w-2xl
              ">

                Pilih 1 mata pelajaran pendamping.
                Setelah dipilih, pilihan lain akan otomatis terkunci.

              </p>

            </div>

          </div>

          {/* SUBJECTS */}

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-5 md:gap-7
          ">

            {subjects.map((item, index) => {

              const locked =
                savedPendamping &&
                savedPendamping !== item.subject

              const selected =
                savedPendamping === item.subject

              return (

                <button
                  key={item.id}
                  disabled={!!locked}
                  onClick={() =>
                    pilihPendamping(
                      item.subject
                    )
                  }
                  className={`
                    relative
                    overflow-hidden
                    rounded-[32px]
                    p-6
                    text-left
                    transition-all
                    duration-300
                    border
                    ${
                      locked
                        ? `
                          bg-slate-200
                          border-slate-300
                          opacity-70
                          cursor-not-allowed
                        `
                        : selected
                        ? `
                          bg-gradient-to-br
                          from-violet-600
                          to-cyan-500
                          border-transparent
                          shadow-2xl
                          scale-[1.02]
                        `
                        : `
                          bg-white
                          border-white
                          shadow-lg
                          hover:-translate-y-2
                          hover:shadow-2xl
                        `
                    }
                  `}
                >

                  <div className="
                    absolute
                    top-4
                    right-4
                    text-6xl
                    font-black
                    text-white/10
                  ">
                    0{index + 1}
                  </div>

                  <div className={`
                    w-20
                    h-20
                    rounded-3xl
                    flex
                    items-center
                    justify-center
                    text-4xl
                    mb-6
                    shadow-xl
                    ${
                      selected
                        ? "bg-white text-violet-700"
                        : locked
                        ? "bg-slate-400 text-white"
                        : "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                    }
                  `}>

                    {locked
                      ? "🔒"
                      : selected
                      ? "✅"
                      : "📘"}

                  </div>

                  <p className={`
                    text-sm
                    font-black
                    tracking-wide
                    mb-2
                    ${
                      selected
                        ? "text-cyan-100"
                        : "text-violet-600"
                    }
                  `}>
                    PENDAMPING
                  </p>

                  <h2 className={`
                    text-2xl
                    md:text-3xl
                    font-black
                    leading-tight
                    ${
                      selected
                        ? "text-white"
                        : "text-gray-800"
                    }
                  `}>

                    {item.subject}

                  </h2>

                  {selected && (

                    <div className="
                      mt-5
                      inline-flex
                      items-center
                      gap-2
                      bg-white/20
                      text-white
                      px-4
                      py-2
                      rounded-2xl
                      text-sm
                      font-black
                    ">

                      ✅ Pendamping dipilih

                    </div>
                  )}

                  {locked && (

                    <div className="
                      mt-5
                      inline-flex
                      items-center
                      gap-2
                      bg-red-100
                      text-red-600
                      px-4
                      py-2
                      rounded-2xl
                      text-sm
                      font-black
                    ">

                      🔒 Terkunci

                    </div>
                  )}

                </button>
              )
            })}

          </div>

        </div>

      </div>
    )
  }

  // ======================
  // MAPEL
  // ======================

  const mapel = [
    {
      nama: "Matematika",
      kategori: "Matematika",
      icon: "📐",
      color:
        "from-blue-600 to-cyan-500",
    },
    {
      nama: "Bahasa Indonesia",
      kategori:
        "Bahasa Indonesia",
      icon: "📖",
      color:
        "from-orange-500 to-pink-500",
    },
    {
      nama: "Bahasa Inggris",
      kategori:
        "Bahasa Inggris",
      icon: "🌍",
      color:
        "from-emerald-500 to-green-600",
    },
    {
      nama: selectedSubject,
      kategori: selectedSubject,
      icon: "🎯",
      color:
        "from-violet-600 to-fuchsia-500",
    },
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
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
          gap-5
          mb-8
        ">

          <div>

            <p className="
              text-violet-600
              font-black
              tracking-[3px]
              text-sm
              mb-2
            ">
              UJIAN TKA
            </p>

            <h1 className="
              text-3xl
              md:text-5xl
              font-black
              text-gray-800
              leading-tight
            ">

              {paket.nama_paket}

            </h1>

          </div>

          <div className="
            bg-white
            rounded-3xl
            px-6
            py-4
            shadow-lg
          ">

            <p className="
              text-sm
              text-gray-500
              font-bold
              mb-1
            ">
              Pendamping Dipilih
            </p>

            <p className="
              text-2xl
              font-black
              text-violet-700
            ">

              {selectedSubject}

            </p>

          </div>

        </div>

        {/* MAPEL */}

        <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-5 md:gap-7
        ">

          {mapel.map((item, index) => (

            <div
              key={item.nama}
              className="
                relative
                overflow-hidden
                bg-white/90
                backdrop-blur-xl
                rounded-[32px]
                p-6
                shadow-lg
                border
                border-white
                hover:-translate-y-2
                hover:shadow-2xl
                transition-all
                duration-300
              "
            >

              <div className="
                absolute
                top-4
                right-4
                text-6xl
                font-black
                text-gray-100
              ">
                0{index + 1}
              </div>

              <div className={`
                w-20
                h-20
                rounded-3xl
                bg-gradient-to-r
                ${item.color}
                flex
                items-center
                justify-center
                text-4xl
                shadow-2xl
                mb-6
              `}>

                {item.icon}

              </div>

              <h2 className="
                text-2xl
                font-black
                text-gray-800
                leading-tight
                mb-5
              ">

                {item.nama}

              </h2>

              <button
                onClick={() =>
                  handleStartExam(
                    item.kategori
                  )
                }
                className={`
                  w-full
                  h-14
                  rounded-2xl
                  bg-gradient-to-r
                  ${item.color}
                  text-white
                  font-black
                  text-base
                  shadow-lg
                  hover:scale-[1.03]
                  active:scale-95
                  transition-all
                `}
              >

                Mulai Ujian

              </button>

            </div>

          ))}

        </div>

      </div>

    </div>
  )
}
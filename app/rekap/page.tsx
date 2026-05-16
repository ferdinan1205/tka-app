"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

type Hasil = {
  id: number
  skor: number
  kategori: string
  tanggal: string
}

export default function RekapPage() {

  const router = useRouter()

  const printRef =
    useRef<HTMLDivElement>(null)

  const [loading,
    setLoading] =
    useState(true)

  const [pdfLoading,
    setPdfLoading] =
    useState(false)

  const [nama,
    setNama] =
    useState("Siswa")

  const [email,
    setEmail] =
    useState("")

  const [foto,
    setFoto] =
    useState("")

  const [hasil,
    setHasil] =
    useState<Hasil[]>([])

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

    const user =
      data.user

    const userId =
      user.id

    setEmail(
      user.email || ""
    )

    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    setNama(
      profile?.nama ||
      "Siswa"
    )

    setFoto(
      profile?.foto || ""
    )

    const {
      data: hasilData,
    } = await supabase
      .from("hasil")
      .select("*")
      .eq("user_id", userId)
      .order("tanggal", {
        ascending: false,
      })

    setHasil(
      (hasilData as Hasil[]) ||
      []
    )

    setLoading(false)
  }

  function rataRata() {

    if (
      hasil.length === 0
    )
      return 0

    const total =
      hasil.reduce(
        (a, b) =>
          a + b.skor,
        0
      )

    return Math.round(
      total /
      hasil.length
    )
  }

  function nilaiTertinggi() {

    if (
      hasil.length === 0
    )
      return 0

    return Math.max(
      ...hasil.map(
        (x) => x.skor
      )
    )
  }

  function nilaiTerendah() {

    if (
      hasil.length === 0
    )
      return 0

    return Math.min(
      ...hasil.map(
        (x) => x.skor
      )
    )
  }

  function grade(
    nilai: number
  ) {

    if (nilai >= 90)
      return "A"

    if (nilai >= 80)
      return "B"

    if (nilai >= 70)
      return "C"

    if (nilai >= 60)
      return "D"

    return "E"
  }

  // =========================
  // DOWNLOAD PDF FIX MOBILE
  // =========================

async function downloadPDF() {

  if (!printRef.current)
    return

  try {

    setPdfLoading(true)

    const canvas =
      await html2canvas(
        printRef.current,
        {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor:
            "#ffffff",
        }
      )

    const imgData =
      canvas.toDataURL(
        "image/jpeg",
        1.0
      )

    const pdf =
      new jsPDF(
        "p",
        "mm",
        "a4"
      )

    const pdfWidth = 210

    const pageHeight = 297

    const imgWidth = pdfWidth

    const imgHeight =
      (canvas.height *
        imgWidth) /
      canvas.width

    let heightLeft =
      imgHeight

    let position = 0

    // HALAMAN PERTAMA
    pdf.addImage(
      imgData,
      "JPEG",
      0,
      position,
      imgWidth,
      imgHeight
    )

    heightLeft -=
      pageHeight

    // MULTI PAGE
    while (
      heightLeft > 0
    ) {

      position =
        heightLeft -
        imgHeight

      pdf.addPage()

      pdf.addImage(
        imgData,
        "JPEG",
        0,
        position,
        imgWidth,
        imgHeight
      )

      heightLeft -=
        pageHeight
    }

    pdf.save(
      `rapor_${nama}.pdf`
    )

  } catch (error) {

    console.log(error)

    alert(
      "Gagal membuat PDF"
    )

  } finally {

    setPdfLoading(false)

  }

}

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
        px-8 py-6
        rounded-3xl
        shadow-sm
        text-gray-700
        font-semibold
        ">

          Loading rekap...

        </div>

      </div>
    )
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
        flex-col
        md:flex-row
        md:items-center
        md:justify-between
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
              Rekap Akademik
            </h1>

            <p className="
            text-gray-500
            mt-1
            ">
              Rapor digital dan
              hasil evaluasi siswa.
            </p>

          </div>

          <div className="
          flex
          flex-col
          sm:flex-row
          gap-3
          w-full
          md:w-auto
          ">

            {/* DASHBOARD */}

            <button
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="
              bg-white
              text-gray-800
              border
              border-gray-300
              hover:bg-gray-100
              px-5 py-3
              rounded-2xl
              font-bold
              transition-all
              shadow-sm
              w-full
              sm:w-auto
              "
            >

              Dashboard

            </button>

            {/* PDF */}

            <button
              onClick={
                downloadPDF
              }
              disabled={
                pdfLoading
              }
              className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              px-6 py-3
              rounded-2xl
              font-bold
              transition-all
              shadow-lg
              w-full
              sm:w-auto
              disabled:opacity-60
              "
            >

              {
                pdfLoading
                  ?

                  "Membuat PDF..."

                  :

                  "Download PDF"
              }

            </button>

          </div>

        </div>

      </div>

      {/* CONTENT */}

      <div className="
      max-w-7xl
      mx-auto
      p-4 md:p-5
      ">

        <div
          ref={printRef}
          className="
          bg-white
          rounded-[35px]
          shadow-sm
          p-5 md:p-10
          overflow-hidden
          "
        >

          {/* TOP */}

          <div className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-6
          border-b
          border-gray-200
          pb-8
          mb-8
          ">

            {/* LEFT */}

            <div className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
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

                <p className="
                text-blue-600
                font-semibold
                text-sm
                tracking-wide
                ">
                  RAPOR DIGITAL
                </p>

                <h2 className="
                text-3xl md:text-4xl
                font-black
                text-gray-800
                mt-1
                break-words
                ">
                  {nama}
                </h2>

                <p className="
                text-gray-500
                mt-1
                break-all
                ">
                  {email}
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
                  Grade {grade(
                    rataRata()
                  )}
                </div>

              </div>

            </div>

            {/* RIGHT */}

            <div className="
            bg-[#f4f7fb]
            rounded-3xl
            px-8 py-6
            text-center
            w-full
            lg:w-auto
            ">

              <p className="
              text-gray-500
              text-sm
              ">
                Total Ujian
              </p>

              <h2 className="
              text-5xl
              font-black
              text-blue-700
              mt-2
              ">
                {hasil.length}
              </h2>

            </div>

          </div>

          {/* STAT */}

          <div className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          mb-8
          ">

            <StatCard
              title="Rata-rata"
              value={rataRata()}
              icon="📊"
              color="from-blue-500 to-blue-600"
            />

            <StatCard
              title="Nilai Tertinggi"
              value={nilaiTertinggi()}
              icon="🏆"
              color="from-yellow-400 to-yellow-500"
            />

            <StatCard
              title="Nilai Terendah"
              value={nilaiTerendah()}
              icon="📘"
              color="from-red-400 to-red-500"
            />

          </div>

          {/* TABLE */}

          <div className="
          overflow-x-auto
          rounded-3xl
          border
          border-gray-200
          ">

            <table className="
            w-full
            min-w-[700px]
            border-collapse
            ">

              <thead>

                <tr className="
                bg-[#f8fafc]
                text-gray-700
                ">

                  <th className="
                  p-4
                  text-left
                  font-bold
                  ">
                    No
                  </th>

                  <th className="
                  p-4
                  text-left
                  font-bold
                  ">
                    Mata Pelajaran
                  </th>

                  <th className="
                  p-4
                  text-left
                  font-bold
                  ">
                    Nilai
                  </th>

                  <th className="
                  p-4
                  text-left
                  font-bold
                  ">
                    Grade
                  </th>

                  <th className="
                  p-4
                  text-left
                  font-bold
                  ">
                    Tanggal
                  </th>

                </tr>

              </thead>

              <tbody>

                {hasil.map(
                  (
                    item,
                    i
                  ) => (

                    <tr
                      key={
                        item.id
                      }
                      className="
                      border-t
                      border-gray-100
                      hover:bg-[#f8fafc]
                      transition-all
                      "
                    >

                      <td className="
                      p-4
                      font-semibold
                      text-gray-700
                      ">
                        {i + 1}
                      </td>

                      <td className="
                      p-4
                      ">

                        <div className="
                        flex items-center
                        gap-3
                        ">

                          <div className="
                          w-10 h-10
                          rounded-2xl
                          bg-blue-100
                          flex
                          items-center
                          justify-center
                          text-lg
                          ">
                            📘
                          </div>

                          <div>

                            <p className="
                            font-bold
                            text-gray-800
                            ">
                              {
                                item.kategori
                              }
                            </p>

                          </div>

                        </div>

                      </td>

                      <td className="
                      p-4
                      ">

                        <div className="
                        text-2xl
                        font-black
                        text-blue-700
                        ">
                          {
                            item.skor
                          }
                        </div>

                      </td>

                      <td className="
                      p-4
                      ">

                        <span className="
                        bg-green-100
                        text-green-700
                        px-4 py-2
                        rounded-full
                        font-semibold
                        text-sm
                        ">
                          {grade(
                            item.skor
                          )}
                        </span>

                      </td>

                      <td className="
                      p-4
                      text-gray-500
                      font-medium
                      ">
                        {new Date(
                          item.tanggal
                        ).toLocaleDateString()}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

          {/* EMPTY */}

          {hasil.length ===
            0 && (

              <div className="
              text-center
              py-16
              ">

                <div className="
                text-6xl
                ">
                  📚
                </div>

                <h2 className="
                text-2xl
                font-black
                text-gray-800
                mt-4
                ">
                  Belum Ada Nilai
                </h2>

                <p className="
                text-gray-500
                mt-2
                ">
                  Kerjakan ujian untuk
                  melihat rekap akademik.
                </p>

              </div>

            )}

          {/* FOOTER */}

          <div className="
          mt-10
          pt-6
          border-t
          border-gray-200
          text-center
          ">

            <p className="
            text-sm
            text-gray-400
            ">
              Dicetak otomatis dari
              sistem akademik
            </p>

            <h2 className="
            text-lg
            font-bold
            text-blue-700
            mt-1
            ">
              Lampung Cerdas
            </h2>

          </div>

        </div>

      </div>

    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: any) {

  return (

    <div className="
    bg-[#f8fafc]
    rounded-3xl
    p-6
    border
    border-gray-100
    ">

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
            {title}
          </p>

          <h2 className="
          text-5xl
          font-black
          text-gray-800
          mt-3
          ">
            {value}
          </h2>

        </div>

        <div className={`
        w-16 h-16
        rounded-3xl
        bg-gradient-to-br
        ${color}
        text-white
        flex
        items-center
        justify-center
        text-3xl
        shadow-lg
        `}>

          {icon}

        </div>

      </div>

    </div>
  )
}
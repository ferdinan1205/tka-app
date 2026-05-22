"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import { toPng } from "html-to-image"

type Hasil = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  paket?: string | null
  package_id?: number | null
}

type PaketSummary = {
  package_id: number | null
  paket: string
  total_ujian: number
  total_nilai: number
  rata_rata: number
  tertinggi: number
  terendah: number
  data: Hasil[]
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

  const [paketSummary,
    setPaketSummary] =
    useState<PaketSummary[]>([])

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

    // ======================
    // PROFILE
    // ======================

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

    // ======================
    // HASIL
    // ======================

    const {
      data: hasilData,
    } = await supabase
      .from("hasil")
      .select("*")
      .eq("user_id", userId)
      .order("tanggal", {
        ascending: false,
      })

    const finalHasil =
      (hasilData as Hasil[]) ||
      []

    setHasil(finalHasil)

    // ======================
    // GROUP PACKAGE
    // ======================

    const grouped:
      Record<string, PaketSummary> = {}

    finalHasil.forEach((item) => {

      const key =
        item.package_id
          ? String(item.package_id)
          : "umum"

      if (!grouped[key]) {

        grouped[key] = {

          package_id:
            item.package_id || null,

          paket:
            item.paket ||
            "Ujian Umum",

          total_ujian: 0,

          total_nilai: 0,

          rata_rata: 0,

          tertinggi: 0,

          terendah: 0,

          data: [],
        }
      }

      grouped[key].data.push(item)

      grouped[key].total_ujian += 1

      grouped[key].total_nilai +=
        item.skor
    })

    // ======================
    // HITUNG SUMMARY
    // ======================

    Object.values(grouped)
      .forEach((group) => {

        const nilai =
          group.data.map(
            (x) => x.skor
          )

        group.rata_rata =
          Math.round(
            group.total_nilai /
            group.total_ujian
          )

        group.tertinggi =
          Math.max(...nilai)

        group.terendah =
          Math.min(...nilai)
      })

    setPaketSummary(
      Object.values(grouped)
    )

    setLoading(false)
  }

  // ======================
  // GLOBAL STATS
  // ======================

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

  // ======================
  // PDF
  // ======================

  async function downloadPDF() {

    if (!printRef.current)
      return

    try {

      setPdfLoading(true)

      const element =
        printRef.current

      const dataUrl =
        await toPng(
          element,
          {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor:
              "#ffffff",
          }
        )

      const pdf =
        new jsPDF(
          "p",
          "mm",
          "a4"
        )

      const pdfWidth =
        210

      const pdfHeight =
        297

      const imgProps =
        pdf.getImageProperties(
          dataUrl
        )

      const imgWidth =
        pdfWidth

      const imgHeight =
        (imgProps.height *
          imgWidth) /
        imgProps.width

      let heightLeft =
        imgHeight

      let position = 0

      pdf.addImage(
        dataUrl,
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      )

      heightLeft -=
        pdfHeight

      while (
        heightLeft > 0
      ) {

        position =
          heightLeft -
          imgHeight

        pdf.addPage()

        pdf.addImage(
          dataUrl,
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight
        )

        heightLeft -=
          pdfHeight
      }

      pdf.save(
        `rapor_${nama}.pdf`
      )

    } catch (err) {

      console.log(err)

      alert(
        "Gagal download PDF"
      )

    } finally {

      setPdfLoading(false)
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
      bg-[#f4f7fb]
      ">

        <div className="
        bg-white
        px-8
        py-6
        rounded-3xl
        shadow-sm
        ">

          Loading...

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
        px-5
        py-5
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

          </div>

          <div className="
          flex
          gap-3
          ">

            <button
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="
              bg-white
              border
              border-gray-300
              px-5 py-3
              rounded-2xl
              font-bold
              "
            >
              Dashboard
            </button>

            <button
              onClick={
                downloadPDF
              }
              disabled={
                pdfLoading
              }
              className="
              bg-blue-600
              text-white
              px-6 py-3
              rounded-2xl
              font-bold
              "
            >

              {
                pdfLoading
                  ? "Membuat PDF..."
                  : "Download PDF"
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
          "
        >

          {/* PROFILE */}

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

            <div className="
            flex
            items-center
            gap-5
            ">

              {foto ? (

                <img
                  src={foto}
                  alt="foto"
                  className="
                  w-24 h-24
                  rounded-full
                  object-cover
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

              <div>

                <h2 className="
                text-4xl
                font-black
                text-gray-800
                ">
                  {nama}
                </h2>

                <p className="
                text-gray-500
                mt-1
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

            <div className="
            bg-[#f4f7fb]
            rounded-3xl
            px-8 py-6
            text-center
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

          {/* GLOBAL STAT */}

          <div className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          mb-10
          ">

            <StatCard
              title="Rata-rata"
              value={rataRata()}
              icon="📊"
            />

            <StatCard
              title="Nilai Tertinggi"
              value={nilaiTertinggi()}
              icon="🏆"
            />

            <StatCard
              title="Nilai Terendah"
              value={nilaiTerendah()}
              icon="📘"
            />

          </div>

          {/* PACKAGE SUMMARY */}

          <div className="
          space-y-8
          ">

            {paketSummary.map(
              (paketItem, index) => (

              <div
                key={index}
                className="
                border
                border-gray-200
                rounded-[30px]
                overflow-hidden
                "
              >

                {/* HEADER */}

                <div className="
                bg-gradient-to-r
                from-violet-600
                to-blue-600
                p-6
                text-white
                ">

                  <div className="
                  flex
                  flex-col
                  md:flex-row
                  md:items-center
                  md:justify-between
                  gap-4
                  ">

                    <div>

                      <p className="
                      text-violet-100
                      text-sm
                      font-semibold
                      ">
                        PAKET
                      </p>

                      <h2 className="
                      text-3xl
                      font-black
                      ">
                        {paketItem.paket}
                      </h2>

                    </div>

                    <div className="
                    flex
                    gap-3
                    flex-wrap
                    ">

                      <MiniStat
                        label="Ujian"
                        value={
                          paketItem.total_ujian
                        }
                      />

                      <MiniStat
                        label="Rata-rata"
                        value={
                          paketItem.rata_rata
                        }
                      />

                      <MiniStat
                        label="Tertinggi"
                        value={
                          paketItem.tertinggi
                        }
                      />

                    </div>

                  </div>

                </div>

                {/* TABLE */}

                <div className="
                overflow-x-auto
                ">

                  <table className="
                  w-full
                  ">

                    <thead className="
                    bg-[#f8fafc]
                    ">

                      <tr>

                        <th className="
                        p-4
                        text-left
                        ">
                          No
                        </th>

                        <th className="
                        p-4
                        text-left
                        ">
                          Mata Pelajaran
                        </th>

                        <th className="
                        p-4
                        text-left
                        ">
                          Nilai
                        </th>

                        <th className="
                        p-4
                        text-left
                        ">
                          Grade
                        </th>

                        <th className="
                        p-4
                        text-left
                        ">
                          Tanggal
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {paketItem.data.map(
                        (
                          item,
                          i
                        ) => (

                        <tr
                          key={item.id}
                          className="
                          border-t
                          border-gray-100
                          "
                        >

                          <td className="
                          p-4
                          font-semibold
                          ">
                            {i + 1}
                          </td>

                          <td className="
                          p-4
                          font-bold
                          text-gray-800
                          ">
                            {
                              item.kategori
                            }
                          </td>

                          <td className="
                          p-4
                          text-2xl
                          font-black
                          text-blue-700
                          ">
                            {
                              item.skor
                            }
                          </td>

                          <td className="
                          p-4
                          ">

                            <span className="
                            bg-green-100
                            text-green-700
                            px-4 py-2
                            rounded-full
                            text-sm
                            font-bold
                            ">

                              {grade(
                                item.skor
                              )}

                            </span>

                          </td>

                          <td className="
                          p-4
                          text-gray-500
                          ">

                            {new Date(
                              item.tanggal
                            ).toLocaleDateString()}

                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

              </div>
            ))}

          </div>

          {/* EMPTY */}

          {hasil.length ===
            0 && (

            <div className="
            text-center
            py-20
            ">

              <div className="
              text-6xl
              ">
                📚
              </div>

              <h2 className="
              text-3xl
              font-black
              text-gray-800
              mt-4
              ">
                Belum Ada Nilai
              </h2>

            </div>
          )}

        </div>

      </div>

    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
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

        <div className="
        w-16 h-16
        rounded-3xl
        bg-blue-500
        text-white
        flex
        items-center
        justify-center
        text-3xl
        ">

          {icon}

        </div>

      </div>

    </div>
  )
}

function MiniStat({
  label,
  value,
}: any) {

  return (

    <div className="
    bg-white/20
    px-5
    py-3
    rounded-2xl
    backdrop-blur-xl
    ">

      <p className="
      text-xs
      text-white/80
      ">
        {label}
      </p>

      <h2 className="
      text-2xl
      font-black
      text-white
      ">
        {value}
      </h2>

    </div>
  )
}
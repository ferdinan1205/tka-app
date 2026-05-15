"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

type Rekap = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  user_id: string
  profiles: {
    nama: string
    email: string
  }
}

export default function AdminRekapPage() {

  const router = useRouter()

  const printRef =
    useRef<HTMLDivElement>(null)

  const [data, setData] =
    useState<Rekap[]>([])

  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
    useState("")

  const [filterMapel,
    setFilterMapel] =
    useState("Semua")

  useEffect(() => {
    init()
  }, [])

  // ==========================
  // INIT
  // ==========================
  async function init() {

    const { data } =
      await supabase.auth.getUser()

    if (!data.user) {

      router.push("/login")

      return
    }

    // 🔥 CEK ADMIN
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

    await getData()
  }

  // ==========================
  // AMBIL DATA
  // ==========================
  async function getData() {

    setLoading(true)

    const { data: hasilData } =
      await supabase
        .from("hasil")
        .select("*")
        .order("id", {
          ascending: false,
        })

    const { data: profiles } =
      await supabase
        .from("profiles")
        .select("*")

    if (
      !hasilData ||
      !profiles
    ) {

      setLoading(false)

      return
    }

    const gabung =
      hasilData.map(
        (item: any) => {

          const user =
            profiles.find(
              (p: any) =>
                p.id ===
                item.user_id
            )

          return {

            ...item,

            profiles: {

              nama:
                user?.nama ||
                "Tanpa Nama",

              email:
                user?.email ||
                "-",
            },
          }
        }
      )

    setData(gabung)

    setLoading(false)
  }

  // ==========================
  // FILTER MAPEL
  // ==========================
  const mapelList =
    useMemo(() => {

      const arr =
        data.map(
          (x) =>
            x.kategori
        )

      return [

        "Semua",

        ...Array.from(
          new Set(arr)
        ),
      ]
    }, [data])

  // ==========================
  // FILTER DATA
  // ==========================
  const filtered =
    useMemo(() => {

      return data.filter(
        (item) => {

          const nama =
            item.profiles.nama
              .toLowerCase()

          const email =
            item.profiles.email
              .toLowerCase()

          const key =
            search.toLowerCase()

          const cocokSearch =

            nama.includes(key) ||

            email.includes(key)

          const cocokMapel =

            filterMapel ===
              "Semua" ||

            item.kategori ===
              filterMapel

          return (

            cocokSearch &&

            cocokMapel
          )
        }
      )
    }, [
      data,
      search,
      filterMapel,
    ])

  // ==========================
  // STATISTIK
  // ==========================
  const totalUjian =
    filtered.length

  const totalSiswa =
    new Set(
      filtered.map(
        (x) =>
          x.user_id
      )
    ).size

  const rataNilai =

    filtered.length === 0

      ? 0

      : Math.round(

          filtered.reduce(
            (a, b) =>
              a + b.skor,
            0
          ) /

            filtered.length
        )

  // ==========================
  // EXPORT EXCEL
  // ==========================
  function exportExcel() {

    const rows =
      filtered.map(
        (item, i) => ({

          No: i + 1,

          Nama:
            item.profiles.nama,

          Email:
            item.profiles.email,

          Mapel:
            item.kategori,

          Nilai:
            item.skor,

          Tanggal:
            new Date(
              item.tanggal
            ).toLocaleString(),
        })
      )

    const ws =
      XLSX.utils.json_to_sheet(
        rows
      )

    const wb =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Rekap Nilai"
    )

    XLSX.writeFile(
      wb,
      "rekap_nilai_admin.xlsx"
    )
  }

  // ==========================
  // EXPORT PDF
  // ==========================
  async function exportPDF() {

    if (!printRef.current)
      return

    const canvas =
      await html2canvas(
        printRef.current,
        {
          scale: 2,
          backgroundColor:
            "#ffffff",
        }
      )

    const imgData =
      canvas.toDataURL(
        "image/png"
      )

    const pdf =
      new jsPDF(
        "p",
        "mm",
        "a4"
      )

    const width =
      pdf.internal
        .pageSize
        .getWidth()

    const height =
      (canvas.height *
        width) /
      canvas.width

    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      width,
      height
    )

    pdf.save(
      "rekap_nilai_admin.pdf"
    )
  }

  if (loading) {

    return (

      <div className="p-10">
        Loading...
      </div>
    )
  }

  return (

    <div className="min-h-screen bg-gray-100 p-4 md:p-8">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">

        <div>

          <h1 className="text-2xl md:text-4xl font-bold">
            📊 Rekap Nilai Admin
          </h1>

          <p className="text-gray-500 mt-1">
            Semua nilai siswa
          </p>

        </div>

        <div className="flex gap-3 flex-wrap">

          <button
            onClick={() =>
              router.push("/admin")
            }
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-2xl font-semibold transition"
          >
            Dashboard
          </button>

          <button
            onClick={
              exportExcel
            }
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-2xl font-semibold transition"
          >
            📥 Excel
          </button>

          <button
            onClick={
              exportPDF
            }
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-2xl font-semibold transition"
          >
            📄 PDF
          </button>

        </div>

      </div>

      {/* CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        <Card
          title="Total Ujian"
          value={
            totalUjian
          }
        />

        <Card
          title="Total Siswa"
          value={
            totalSiswa
          }
        />

        <Card
          title="Rata-rata Nilai"
          value={
            rataNilai
          }
        />

      </div>

      {/* FILTER */}
      <div className="bg-white p-5 rounded-3xl shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">

        <input
          placeholder="Cari nama / email"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          className="border p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <select
          value={
            filterMapel
          }
          onChange={(e) =>
            setFilterMapel(
              e.target.value
            )
          }
          className="border p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
        >

          {mapelList.map(
            (x) => (

              <option
                key={x}
              >
                {x}
              </option>
            )
          )}

        </select>

        <button
          onClick={
            getData
          }
          className="bg-gray-700 hover:bg-gray-800 text-white rounded-2xl font-semibold transition"
        >
          Refresh
        </button>

      </div>

      {/* TABLE */}
      <div
        ref={printRef}
        className="bg-white rounded-3xl shadow overflow-x-auto"
      >

        <table className="w-full min-w-[900px]">

          <thead className="bg-indigo-600 text-white">

            <tr>

              <th className="p-4 text-left">
                No
              </th>

              <th className="p-4 text-left">
                Nama
              </th>

              <th className="p-4 text-left">
                Email
              </th>

              <th className="p-4 text-left">
                Mapel
              </th>

              <th className="p-4 text-left">
                Nilai
              </th>

              <th className="p-4 text-left">
                Tanggal
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map(
              (
                item,
                i
              ) => (

                <tr
                  key={
                    item.id
                  }
                  className="border-b hover:bg-gray-50 transition"
                >

                  <td className="p-4">
                    {i + 1}
                  </td>

                  <td className="p-4 font-semibold">
                    {
                      item
                        .profiles
                        .nama
                    }
                  </td>

                  <td className="p-4">
                    {
                      item
                        .profiles
                        .email
                    }
                  </td>

                  <td className="p-4">
                    {
                      item.kategori
                    }
                  </td>

                  <td className="p-4 font-bold text-green-600">
                    {
                      item.skor
                    }
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    {new Date(
                      item.tanggal
                    ).toLocaleString()}
                  </td>

                </tr>
              )
            )}

          </tbody>

        </table>

        {filtered.length ===
          0 && (

          <div className="p-8 text-center text-gray-500">
            Tidak ada data
          </div>
        )}

      </div>

    </div>
  )
}

function Card({
  title,
  value,
}: any) {

  return (

    <div className="bg-white p-6 rounded-3xl shadow">

      <p className="text-gray-500">
        {title}
      </p>

      <h2 className="text-3xl md:text-4xl font-bold mt-2">
        {value}
      </h2>

    </div>
  )
}
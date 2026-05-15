"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type Ranking = {
  user_id: string
  email: string
  nama: string
  skor: number
  kategori: string
}

export default function RankingAdmin() {

  const router = useRouter()

  const [ranking, setRanking] =
    useState<Ranking[]>([])

  const [kategori, setKategori] =
    useState("Semua")

  const [search, setSearch] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const listKategori = [
    "Semua",
    "Matematika",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "TPS",
    "Literasi",
  ]

  useEffect(() => {
    init()
  }, [kategori])

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
        .select("role")
        .eq("id", data.user.id)
        .single()

    if (
      !profile ||
      profile.role !== "admin"
    ) {

      alert("Akses ditolak")

      router.push("/dashboard")

      return
    }

    await getRanking()
  }

  async function getRanking() {

    setLoading(true)

    let query =
      supabase
        .from("hasil")
        .select("*")

    if (
      kategori !== "Semua"
    ) {

      query = query.eq(
        "kategori",
        kategori
      )
    }

    const {
      data: hasilData,
    } = await query.order(
      "skor",
      {
        ascending: false,
      }
    )

    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select("*")

    if (
      !hasilData ||
      !profiles
    ) {

      setLoading(false)

      return
    }

    const bestMap: any = {}

    hasilData.forEach(
      (item: any) => {

        if (
          !bestMap[
            item.user_id
          ] ||
          item.skor >
            bestMap[
              item.user_id
            ].skor
        ) {

          bestMap[
            item.user_id
          ] = item
        }
      }
    )

    const finalRanking: Ranking[] =
      Object.values(bestMap)
        .map((item: any) => {

          const user =
            profiles.find(
              (p: any) =>
                p.id ===
                item.user_id
            )

          return {

            user_id:
              item.user_id,

            skor:
              item.skor,

            kategori:
              item.kategori,

            email:
              user?.email ||
              "-",

            nama:
              user?.nama ||
              "Siswa",
          }
        })
        .sort(
          (a, b) =>
            b.skor - a.skor
        )

    setRanking(finalRanking)

    setLoading(false)
  }

  function getMedal(
    i: number
  ) {

    if (i === 0)
      return "🥇"

    if (i === 1)
      return "🥈"

    if (i === 2)
      return "🥉"

    return `#${i + 1}`
  }

  const filtered =
    ranking.filter(
      (item) =>

        item.nama
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||

        item.email
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    )

  return (

    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 p-4 md:p-8 lg:p-10">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5 mb-8">

        <div>

          <h1 className="text-3xl md:text-4xl font-black text-gray-800">
            🏆 Ranking Siswa
          </h1>

          <p className="text-gray-500 mt-2">
            Ranking skor terbaik siswa
          </p>

        </div>

        <button
          onClick={() =>
            router.push(
              "/admin"
            )
          }
          className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-3 rounded-2xl font-semibold transition w-full md:w-auto"
        >
          ← Dashboard
        </button>

      </div>

      {/* SEARCH */}
      <div className="mb-6">

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Cari nama / email siswa..."
          className="w-full md:w-[420px] px-5 py-3 rounded-2xl border shadow-sm"
        />

      </div>

      {/* FILTER */}
      <div className="flex gap-3 mb-8 flex-wrap">

        {listKategori.map(
          (k) => (

            <button
              key={k}
              onClick={() =>
                setKategori(k)
              }
              className={`px-5 py-3 rounded-2xl font-semibold transition ${
                kategori === k
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-white hover:bg-indigo-50"
              }`}
            >
              {k}
            </button>
          )
        )}

      </div>

      {/* CONTENT */}
      {loading ? (

        <div className="bg-white p-8 rounded-3xl shadow-lg">

          Loading...

        </div>

      ) : filtered.length === 0 ? (

        <div className="bg-white p-8 rounded-3xl shadow-lg">

          Tidak ada data

        </div>

      ) : (

        <div className="space-y-5">

          {filtered.map(
            (
              item,
              i
            ) => (

              <div
                key={
                  item.user_id
                }
                onClick={() =>
                  router.push(
                    `/admin/siswa/${item.user_id}`
                  )
                }
                className={`rounded-3xl shadow-lg cursor-pointer transition hover:scale-[1.01] overflow-hidden ${
                  i === 0
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white"
                    : i === 1
                    ? "bg-gradient-to-r from-gray-300 to-gray-400 text-black"
                    : i === 2
                    ? "bg-gradient-to-r from-orange-300 to-orange-400 text-black"
                    : "bg-white"
                }`}
              >

                <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                  {/* LEFT */}
                  <div className="flex items-center gap-5 min-w-0">

                    {/* RANK */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg ${
                      i <= 2
                        ? "bg-white/20 backdrop-blur-md"
                        : "bg-indigo-100 text-indigo-700"
                    }`}>

                      {getMedal(i)}

                    </div>

                    {/* AVATAR */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-black shadow-lg ${
                      i <= 2
                        ? "bg-white/20 backdrop-blur-md"
                        : "bg-indigo-600 text-white"
                    }`}>

                      {item.nama
                        .slice(0, 2)
                        .toUpperCase()}

                    </div>

                    {/* INFO */}
                    <div className="min-w-0">

                      <h2 className="text-xl font-black truncate">

                        {item.nama}

                      </h2>

                      <p className={`text-sm truncate ${
                        i <= 2
                          ? "text-white/90"
                          : "text-gray-500"
                      }`}>

                        {item.email}

                      </p>

                      <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                        i <= 2
                          ? "bg-white/20 text-white"
                          : "bg-indigo-100 text-indigo-700"
                      }`}>

                        {item.kategori}

                      </div>

                    </div>

                  </div>

                  {/* RIGHT */}
                  <div className="text-left md:text-right">

                    <p className={`text-sm ${
                      i <= 2
                        ? "text-white/80"
                        : "text-gray-400"
                    }`}>

                      Skor

                    </p>

                    <div className={`text-4xl font-black ${
                      i === 0
                        ? "text-white"
                        : i <= 2
                        ? "text-black"
                        : "text-indigo-600"
                    }`}>

                      {item.skor}

                    </div>

                  </div>

                </div>

              </div>
            )
          )}

        </div>
      )}

    </div>
  )
}
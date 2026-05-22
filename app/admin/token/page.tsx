"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type Jadwal = {
  id: number
  kategori: string
  token: string
  durasi: number
  status: boolean
}

type PackageType = {
  id: number
  nama_paket: string
  token: string
  is_custom: boolean
  pendamping_subject?: string
}

export default function AdminToken() {

  const router = useRouter()

  // =========================
  // MAPEL
  // =========================
  const kategoriList = [
    "Matematika",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "Fisika",
    "Kimia",
    "Biologi",
    "Ekonomi",
    "Geografi",
    "Sosiologi",
    "Sejarah",
    "Antropologi",
    "Bahasa Arab",
    "Bahasa Mandarin",
    "Bahasa Jepang",
    "Bahasa Korea",
    "Bahasa Jerman",
    "Bahasa Prancis",
    "PPKN",
    "PKK",
    "TPS",
    "Literasi",
  ]

  // =========================
  // STATE MAPEL
  // =========================
  const [kategori, setKategori] =
    useState("Matematika")

  const [token, setToken] =
    useState("")

  const [durasi, setDurasi] =
    useState(90)

  const [data, setData] =
    useState<Jadwal[]>([])

  // =========================
  // STATE PACKAGE
  // =========================
  const [packages, setPackages] =
    useState<PackageType[]>([])

  const [selectedPackageId,
    setSelectedPackageId] =
    useState<number | null>(null)

  const [packageToken,
    setPackageToken] =
    useState("")

  // =========================
  // GLOBAL
  // =========================
  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
    useState("")

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    init()
  }, [])

  async function init() {

    const {
      data: authData
    } = await supabase.auth.getUser()

    if (!authData.user) {

      router.push("/login")
      return
    }

    const {
      data: profile
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single()

    if (
      !profile ||
      profile.role !== "admin"
    ) {

      alert("Akses ditolak")

      router.push("/dashboard")

      return
    }

    await getData()

    setLoading(false)
  }

  // =========================
  // GET DATA
  // =========================
  async function getData() {

    // TOKEN MAPEL
    const {
      data: jadwalData
    } = await supabase
      .from("jadwal_ujian")
      .select("*")
      .order("id", {
        ascending: false
      })

    setData(
      (jadwalData || []) as Jadwal[]
    )

    // TOKEN PACKAGE
    const {
      data: packageData
    } = await supabase
      .from("packages")
      .select("*")
      .order("id")

    const finalPackage =
      (packageData || []) as PackageType[]

    setPackages(finalPackage)
  }

  // =========================
  // GENERATE TOKEN
  // =========================
  function generateToken() {

    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"

    let result = ""

    for (
      let i = 0;
      i < 6;
      i++
    ) {

      result += chars.charAt(
        Math.floor(
          Math.random() *
          chars.length
        )
      )
    }

    return result
  }

  // =========================
  // SIMPAN TOKEN MAPEL
  // =========================
  async function simpanToken() {

    if (!token) {

      alert("Token wajib diisi")
      return
    }

    await supabase
      .from("jadwal_ujian")
      .update({
        status: false
      })
      .eq(
        "kategori",
        kategori
      )

    const { error } =
      await supabase
        .from("jadwal_ujian")
        .insert([
          {
            kategori,
            token:
              token.trim(),
            durasi:
              Number(durasi),
            status: true,
          },
        ])

    if (error) {

      alert(error.message)
      return
    }

    alert(
      "Token mapel berhasil dibuat"
    )

    setToken("")
    setDurasi(90)

    await getData()
  }

  // =========================
  // EDIT PACKAGE
  // =========================
  function editPackage(
    item: PackageType
  ) {

    setSelectedPackageId(item.id)

    setPackageToken(
      item.token || ""
    )

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
  }

  // =========================
  // SIMPAN TOKEN PACKAGE
  // =========================
  async function simpanTokenPackage() {

    if (!selectedPackageId) {

      alert(
        "Pilih package dulu"
      )

      return
    }

    const { error } =
      await supabase
        .from("packages")
        .update({
          token:
            packageToken.trim()
        })
        .eq(
          "id",
          selectedPackageId
        )

    if (error) {

      alert(
        "Gagal update token"
      )

      return
    }

    alert(
      "Token package berhasil disimpan"
    )

    setPackageToken("")
    setSelectedPackageId(null)

    await getData()
  }

  // =========================
  // HAPUS TOKEN PACKAGE
  // =========================
  async function hapusPackage(
    id: number
  ) {

    const confirmDelete =
      confirm(
        "Hapus token package?"
      )

    if (!confirmDelete)
      return

    const { error } =
      await supabase
        .from("packages")
        .update({
          token: null
        })
        .eq("id", id)

    if (error) {

      alert(
        "Gagal hapus token"
      )

      return
    }

    await getData()
  }

  // =========================
  // HAPUS TOKEN MAPEL
  // =========================
  async function hapusToken(
    id: number
  ) {

    const confirmDelete =
      confirm(
        "Hapus token?"
      )

    if (!confirmDelete)
      return

    await supabase
      .from("jadwal_ujian")
      .delete()
      .eq("id", id)

    await getData()
  }

  // =========================
  // TOGGLE STATUS
  // =========================
  async function toggleStatus(
    item: Jadwal
  ) {

    if (!item.status) {

      await supabase
        .from("jadwal_ujian")
        .update({
          status: false
        })
        .eq(
          "kategori",
          item.kategori
        )
    }

    await supabase
      .from("jadwal_ujian")
      .update({
        status:
          !item.status
      })
      .eq("id", item.id)

    await getData()
  }

  // =========================
  // FILTER
  // =========================
  const filteredData =
    data.filter((item) => {

      return (
        item.kategori
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||

        item.token
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
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
        text-xl
        font-black
      ">
        Loading...
      </div>
    )
  }

  return (

    <div className="
      min-h-screen
      bg-slate-100
    ">

      {/* HEADER */}
      <div className="
        bg-gradient-to-r
        from-blue-700
        to-blue-900
        text-white
        px-5
        py-5
        flex
        items-center
        justify-between
      ">

        <div>

          <h1 className="
            text-2xl
            md:text-3xl
            font-black
          ">
            Admin Token
          </h1>

          <p className="
            text-sm
            text-blue-100
            mt-1
          ">
            Kelola token ujian
          </p>

        </div>

        <button
          onClick={() =>
            router.push("/admin")
          }
          className="
            bg-white
            text-blue-800
            px-4
            py-2
            rounded-xl
            font-black
          "
        >
          Admin
        </button>

      </div>

      {/* CONTENT */}
      <div className="
        p-4
        grid
        lg:grid-cols-2
        gap-4
      ">

        {/* TOKEN MAPEL */}
        <div className="
          bg-white
          rounded-3xl
          p-5
          shadow-sm
        ">

          <h2 className="
            text-xl
            font-black
            mb-4
          ">
            Token Mapel
          </h2>

          <div className="
            space-y-3
          ">

            <select
              value={kategori}
              onChange={(e) =>
                setKategori(
                  e.target.value
                )
              }
              className="
                w-full
                h-12
                border
                rounded-2xl
                px-4
                font-semibold
              "
            >

              {kategoriList.map(
                (item) => (

                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>

                )
              )}

            </select>

            <div className="
              flex
              gap-2
            ">

              <input
                value={token}
                onChange={(e) =>
                  setToken(
                    e.target.value
                  )
                }
                placeholder="Token"
                className="
                  flex-1
                  h-12
                  border
                  rounded-2xl
                  px-4
                  font-black
                "
              />

              <button
                onClick={() =>
                  setToken(
                    generateToken()
                  )
                }
                className="
                  bg-slate-200
                  px-4
                  rounded-2xl
                  font-black
                "
              >
                Random
              </button>

            </div>

            <input
              type="number"
              value={durasi}
              onChange={(e) =>
                setDurasi(
                  Number(
                    e.target.value
                  )
                )
              }
              placeholder="Durasi"
              className="
                w-full
                h-12
                border
                rounded-2xl
                px-4
                font-black
              "
            />

            <button
              onClick={simpanToken}
              className="
                w-full
                h-12
                bg-blue-700
                text-white
                rounded-2xl
                font-black
              "
            >
              Simpan Token
            </button>

          </div>

        </div>

        {/* TOKEN PACKAGE */}
        <div className="
          bg-white
          rounded-3xl
          p-5
          shadow-sm
        ">

          <div className="
            flex
            items-center
            justify-between
            mb-4
          ">

            <h2 className="
              text-xl
              font-black
            ">
              Token Package
            </h2>

            {selectedPackageId && (

              <div className="
                text-xs
                bg-yellow-100
                text-yellow-700
                px-3
                py-1
                rounded-full
                font-black
              ">
                MODE EDIT
              </div>

            )}

          </div>

          <div className="
            flex
            gap-2
            mb-4
          ">

            <input
              value={packageToken}
              onChange={(e) =>
                setPackageToken(
                  e.target.value
                )
              }
              placeholder="Isi token package"
              className="
                flex-1
                h-12
                border
                rounded-2xl
                px-4
                font-black
              "
            />

            <button
              onClick={() =>
                setPackageToken(
                  generateToken()
                )
              }
              className="
                bg-slate-200
                px-4
                rounded-2xl
                font-black
              "
            >
              Random
            </button>

          </div>

          <button
            onClick={
              simpanTokenPackage
            }
            className="
              w-full
              h-12
              bg-green-600
              text-white
              rounded-2xl
              font-black
              mb-5
            "
          >
            Simpan Token Package
          </button>

          {/* LIST PACKAGE */}
          <div className="
            space-y-3
            max-h-[500px]
            overflow-auto
            pr-1
          ">

            {packages.map((item) => (

              <div
                key={item.id}
                className="
                  border
                  rounded-2xl
                  p-4
                  hover:border-blue-400
                  transition
                "
              >

                <div className="
                  flex
                  items-center
                  justify-between
                  gap-3
                ">

                  <div className="
                    flex-1
                  ">

                    <div className="
                      flex
                      items-center
                      gap-2
                      flex-wrap
                    ">

                      <h1 className="
                        font-black
                        text-slate-800
                      ">
                        {item.nama_paket}
                      </h1>

                      <span className={`
                        text-[10px]
                        px-2
                        py-1
                        rounded-full
                        font-black

                        ${item.is_custom
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                        }
                      `}>
                        {item.is_custom
                          ? "CUSTOM"
                          : "DEFAULT"}
                      </span>

                    </div>

                    <p className="
                      mt-2
                      text-lg
                      font-black
                      text-blue-700
                      tracking-wider
                    ">
                      {item.token || "-"}
                    </p>

                    {item.pendamping_subject && (

                      <p className="
                        text-xs
                        text-slate-500
                        mt-1
                        font-semibold
                      ">
                        {item.pendamping_subject}
                      </p>

                    )}

                  </div>

                  <div className="
                    flex
                    flex-col
                    gap-2
                  ">

                    <button
                      onClick={() =>
                        editPackage(
                          item
                        )
                      }
                      className="
                        bg-yellow-400
                        hover:bg-yellow-500
                        text-black
                        text-xs
                        font-black
                        px-4
                        py-2
                        rounded-xl
                      "
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        hapusPackage(
                          item.id
                        )
                      }
                      className="
                        bg-red-500
                        hover:bg-red-600
                        text-white
                        text-xs
                        font-black
                        px-4
                        py-2
                        rounded-xl
                      "
                    >
                      Hapus
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* SEARCH */}
      <div className="
        px-4
      ">

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Cari token mapel..."
          className="
            w-full
            h-12
            bg-white
            border
            rounded-2xl
            px-4
            font-semibold
          "
        />

      </div>

      {/* LIST TOKEN */}
      <div className="
        p-4
        space-y-3
      ">

        {filteredData.map(
          (item) => (

            <div
              key={item.id}
              className="
                bg-white
                rounded-2xl
                p-4
                shadow-sm
              "
            >

              <div className="
                flex
                items-center
                justify-between
                gap-4
              ">

                <div>

                  <h1 className="
                    text-lg
                    font-black
                    text-slate-800
                  ">
                    {item.kategori}
                  </h1>

                  <div className="
                    flex
                    gap-2
                    flex-wrap
                    mt-2
                  ">

                    <span className="
                      bg-blue-100
                      text-blue-700
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      font-black
                    ">
                      {item.token}
                    </span>

                    <span className="
                      bg-yellow-100
                      text-yellow-700
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      font-black
                    ">
                      {item.durasi} menit
                    </span>

                    <span className={`
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      font-black

                      ${item.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                      }
                    `}>
                      {item.status
                        ? "Aktif"
                        : "Nonaktif"}
                    </span>

                  </div>

                </div>

                <div className="
                  flex
                  flex-col
                  gap-2
                ">

                  <button
                    onClick={() =>
                      toggleStatus(
                        item
                      )
                    }
                    className={`
                      px-4
                      py-2
                      rounded-xl
                      text-xs
                      font-black
                      text-white

                      ${item.status
                        ? "bg-red-500"
                        : "bg-green-600"
                      }
                    `}
                  >
                    {item.status
                      ? "OFF"
                      : "ON"}
                  </button>

                  <button
                    onClick={() =>
                      hapusToken(
                        item.id
                      )
                    }
                    className="
                      bg-slate-200
                      px-4
                      py-2
                      rounded-xl
                      text-xs
                      font-black
                    "
                  >
                    Hapus
                  </button>

                </div>

              </div>

            </div>

          )
        )}

        {filteredData.length === 0 && (

          <div className="
            bg-white
            rounded-2xl
            p-10
            text-center
            text-slate-500
            font-bold
          ">
            Belum ada token
          </div>

        )}

      </div>

    </div>
  )
}
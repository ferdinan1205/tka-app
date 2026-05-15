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

export default function AdminToken() {

  const router = useRouter()

  const [kategori,
    setKategori] =
    useState("Matematika")

  const [token,
    setToken] =
    useState("")

  const [durasi,
    setDurasi] =
    useState(90)

  const [data,
    setData] =
    useState<Jadwal[]>([])

  const [loading,
    setLoading] =
    useState(true)

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

    // 🔥 CEK ROLE ADMIN
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

    setLoading(false)
  }

  // 🔥 AMBIL DATA
  async function getData() {

    const { data } =
      await supabase
        .from("jadwal_ujian")
        .select("*")
        .order("id", {
          ascending: false,
        })

    setData(
      (data || []) as Jadwal[]
    )
  }

  // 🔥 GENERATE TOKEN
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

    setToken(result)
  }

  // 🔥 SIMPAN TOKEN
async function simpanToken() {

  if (!token) {
    alert("Token wajib diisi")
    return
  }

  // nonaktifkan token lama
  const { error: updateError } =
    await supabase
      .from("jadwal_ujian")
      .update({
        status: false,
      })
      .eq("kategori", kategori)

  if (updateError) {
    console.log(updateError)
  }

  // insert token baru
  const { data, error } =
    await supabase
      .from("jadwal_ujian")
      .insert([
        {
          kategori,
          token,
          durasi,
          status: true,
        },
      ])
      .select()

  console.log(data)
  console.log(error)

  if (error) {

    alert(error.message)

    return
  }

  alert("Token berhasil dibuat")

  setToken("")

  getData()
}

  // 🔥 HAPUS TOKEN
  async function hapusToken(
    id: number
  ) {

    const confirmDelete =
      confirm(
        "Hapus token ini?"
      )

    if (!confirmDelete)
      return

    await supabase
      .from("jadwal_ujian")
      .delete()
      .eq("id", id)

    getData()
  }

  // 🔥 TOGGLE STATUS
  async function toggleStatus(
    item: Jadwal
  ) {

    await supabase
      .from("jadwal_ujian")
      .update({
        status:
          !item.status,
      })
      .eq("id", item.id)

    getData()
  }

  if (loading) {

    return (
      <div className="p-10">
        Loading...
      </div>
    )
  }

  return (

    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <div className="bg-blue-800 text-white p-6 flex justify-between items-center">

        <div>

          <h1 className="text-3xl font-bold">
            Admin Token Ujian
          </h1>

          <p className="text-sm opacity-80">
            Kelola token ujian
          </p>

        </div>

        <button
          onClick={() =>
            router.push("/admin")
          }
          className="border px-4 py-2 rounded-xl hover:bg-white hover:text-blue-800"
        >
          ← Admin
        </button>

      </div>

      <div className="p-6">

        {/* FORM */}
        <div className="bg-white p-6 rounded-3xl shadow mb-6">

          <h2 className="text-xl font-bold mb-5">
            Buat Token Baru
          </h2>

          <div className="grid md:grid-cols-3 gap-4">

            {/* KATEGORI */}
            <select
              value={kategori}
              onChange={(e) =>
                setKategori(
                  e.target.value
                )
              }
              className="border p-4 rounded-2xl"
            >
              <option>
                Matematika
              </option>

              <option>
                Bahasa Indonesia
              </option>

              <option>
                Bahasa Inggris
              </option>

              <option>
                TPS
              </option>

              <option>
                Literasi
              </option>
            </select>

            {/* TOKEN */}
            <div className="flex gap-2">

              <input
                value={token}
                onChange={(e) =>
                  setToken(
                    e.target.value
                  )
                }
                placeholder="Masukkan token"
                className="flex-1 border p-4 rounded-2xl"
              />

              <button
                onClick={
                  generateToken
                }
                className="bg-gray-200 px-4 rounded-2xl"
              >
                Random
              </button>

            </div>

            {/* DURASI */}
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
              placeholder="Durasi menit"
              className="border p-4 rounded-2xl"
            />

          </div>

          <button
            onClick={
              simpanToken
            }
            className="mt-5 bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-2xl"
          >
            Simpan Token
          </button>

        </div>

        {/* LIST TOKEN */}
        <div className="space-y-4">

          {data.map(
            (item) => (

              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl shadow flex justify-between items-center"
              >

                <div>

                  <p className="font-bold text-lg">
                    {
                      item.kategori
                    }
                  </p>

                  <div className="flex gap-3 mt-2 flex-wrap">

                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                      Token:{" "}
                      {
                        item.token
                      }
                    </span>

                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                      {
                        item.durasi
                      }{" "}
                      menit
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        item.status
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status
                        ? "Aktif"
                        : "Nonaktif"}
                    </span>

                  </div>

                </div>

                <div className="flex gap-2">

                  {/* TOGGLE */}
                  <button
                    onClick={() =>
                      toggleStatus(
                        item
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-white ${
                      item.status
                        ? "bg-red-500"
                        : "bg-green-600"
                    }`}
                  >
                    {item.status
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                  </button>

                  {/* HAPUS */}
                  <button
                    onClick={() =>
                      hapusToken(
                        item.id
                      )
                    }
                    className="border px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white"
                  >
                    Hapus
                  </button>

                </div>

              </div>

            )
          )}

          {data.length ===
            0 && (

            <div className="bg-white p-10 rounded-2xl text-center text-gray-500">
              Belum ada token
            </div>

          )}

        </div>

      </div>

    </div>
  )
}
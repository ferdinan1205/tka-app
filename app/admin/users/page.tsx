"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type UserType = {
  id: string
  nama: string
  email: string
  role: string
}

type HasilType = {
  user_id: string
  skor: number
}

export default function AdminUsersPage() {

  const router = useRouter()

  const [users, setUsers] =
    useState<UserType[]>([])

  const [hasil, setHasil] =
    useState<HasilType[]>([])

  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
    useState("")

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

    // 🔥 cek admin
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

      alert("Akses ditolak")

      router.push("/dashboard")

      return
    }

    await getUsers()

    await getHasil()

    setLoading(false)
  }

  async function getUsers() {

    const { data, error } =
      await supabase
        .from("profiles")
        .select("*")
        .order("nama", {
          ascending: true,
        })

    if (error) {
      console.log(error)
      return
    }

    setUsers(data || [])
  }

  async function getHasil() {

    const { data, error } =
      await supabase
        .from("hasil")
        .select("*")

    if (error) {
      console.log(error)
      return
    }

    setHasil(data || [])
  }

  async function hapusUser(
    id: string
  ) {

    const confirmDelete =
      confirm(
        "Yakin ingin menghapus user?"
      )

    if (!confirmDelete)
      return

    // 🔥 hapus hasil ujian
    await supabase
      .from("hasil")
      .delete()
      .eq("user_id", id)

    // 🔥 hapus profile
    await supabase
      .from("profiles")
      .delete()
      .eq("id", id)

    alert("User berhasil dihapus")

    getUsers()
    getHasil()
  }

  const filteredUsers =
    useMemo(() => {

      return users.filter(
        (u) => {

          const nama =
            u.nama
              ?.toLowerCase()

          const email =
            u.email
              ?.toLowerCase()

          const key =
            search.toLowerCase()

          return (
            nama?.includes(key) ||
            email?.includes(key)
          )
        }
      )

    }, [users, search])

  function getTotalUjian(
    userId: string
  ) {

    return hasil.filter(
      (h) =>
        h.user_id === userId
    ).length
  }

  function getRataNilai(
    userId: string
  ) {

    const dataUser =
      hasil.filter(
        (h) =>
          h.user_id === userId
      )

    if (
      dataUser.length === 0
    ) return 0

    const total =
      dataUser.reduce(
        (a, b) =>
          a + b.skor,
        0
      )

    return Math.round(
      total /
        dataUser.length
    )
  }

  return (

    <div className="min-h-screen bg-gray-100 p-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">

        <div>

          <h1 className="text-3xl font-bold text-gray-800">
            👨‍🎓 Manajemen User
          </h1>

          <p className="text-gray-500 mt-1">
            Kelola semua akun siswa
          </p>

        </div>

        <button
          onClick={() =>
            router.push("/admin")
          }
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl"
        >
          ← Dashboard
        </button>

      </div>

      {/* CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        <StatCard
          title="Total User"
          value={users.length}
          color="from-blue-500 to-indigo-500"
        />

        <StatCard
          title="Total Siswa"
          value={
            users.filter(
              (u) =>
                u.role !==
                "admin"
            ).length
          }
          color="from-green-500 to-emerald-500"
        />

        <StatCard
          title="Total Admin"
          value={
            users.filter(
              (u) =>
                u.role ===
                "admin"
            ).length
          }
          color="from-purple-500 to-pink-500"
        />

      </div>

      {/* SEARCH */}
      <div className="bg-white p-5 rounded-3xl shadow mb-6">

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Cari nama atau email..."
          className="w-full border p-4 rounded-2xl"
        />

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl shadow overflow-x-auto">

        <table className="w-full min-w-[900px]">

          <thead className="bg-indigo-600 text-white">

            <tr>

              <th className="p-4 text-left">
                Nama
              </th>

              <th className="p-4 text-left">
                Email
              </th>

              <th className="p-4 text-left">
                Role
              </th>

              <th className="p-4 text-left">
                Total Ujian
              </th>

              <th className="p-4 text-left">
                Rata-rata
              </th>

              <th className="p-4 text-left">
                Aksi
              </th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center"
                >
                  Loading...
                </td>
              </tr>

            ) : filteredUsers.length === 0 ? (

              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center text-gray-500"
                >
                  Tidak ada user
                </td>
              </tr>

            ) : (

              filteredUsers.map(
                (user) => (

                  <tr
                    key={user.id}
                    className="border-b hover:bg-gray-50 transition"
                  >

                    <td className="p-4 font-semibold">
                      {user.nama || "-"}
                    </td>

                    <td className="p-4">
                      {user.email}
                    </td>

                    <td className="p-4">

                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          user.role ===
                          "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role}
                      </span>

                    </td>

                    <td className="p-4">
                      {getTotalUjian(
                        user.id
                      )}
                    </td>

                    <td className="p-4 font-bold text-green-600">
                      {getRataNilai(
                        user.id
                      )}
                    </td>

                    <td className="p-4">

                      <div className="flex gap-2 flex-wrap">

                        {/* 🔥 DETAIL */}
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/siswa/${user.id}`
                            )
                          }
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm"
                        >
                          Detail
                        </button>

                        {/* 🔥 HAPUS */}
                        {user.role !==
                          "admin" && (

                          <button
                            onClick={() =>
                              hapusUser(
                                user.id
                              )
                            }
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm"
                          >
                            Hapus
                          </button>

                        )}

                      </div>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>

    </div>
  )
}

function StatCard({
  title,
  value,
  color,
}: any) {

  return (

    <div className={`bg-gradient-to-r ${color} text-white p-6 rounded-3xl shadow-lg`}>

      <p className="opacity-80 text-sm">
        {title}
      </p>

      <h2 className="text-4xl font-bold mt-2">
        {value}
      </h2>

    </div>
  )
}
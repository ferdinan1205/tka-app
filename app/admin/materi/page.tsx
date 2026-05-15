"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type Materi = {
  id?: number
  judul: string
  kategori: string
  tipe: string
  link: string
  gambar?: string | null
}

export default function AdminMateri() {

  const [materi, setMateri] =
    useState<Materi[]>([])

  const [loading, setLoading] =
    useState(true)

  const [showModal, setShowModal] =
    useState(false)

  const [editingId, setEditingId] =
    useState<number | null>(null)

  const [file, setFile] =
    useState<File | null>(null)

  const [form, setForm] =
    useState<Materi>({
      judul: "",
      kategori: "Matematika",
      tipe: "video",
      link: "",
      gambar: null,
    })

  const router = useRouter()

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

    await getMateri()

    setLoading(false)
  }

  async function getMateri() {

    const { data } =
      await supabase
        .from("materi")
        .select("*")
        .order("id", {
          ascending: false,
        })

    setMateri(data || [])
  }

  function handleChange(e: any) {

    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    })
  }

  function openTambah() {

    setEditingId(null)

    setForm({
      judul: "",
      kategori: "Matematika",
      tipe: "video",
      link: "",
      gambar: null,
    })

    setFile(null)

    setShowModal(true)
  }

  function openEdit(item: Materi) {

    setEditingId(
      item.id || null
    )

    setForm(item)

    setShowModal(true)
  }

  async function uploadGambar() {

    if (!file) return null

    const fileExt =
      file.name
        .split(".")
        .pop()

    const fileName =
      `${Date.now()}.${fileExt}`

    const { error } =
      await supabase.storage
        .from("materi")
        .upload(
          fileName,
          file
        )

    if (error) {

      alert(
        "Upload gagal: " +
        error.message
      )

      return null
    }

    const { data } =
      supabase.storage
        .from("materi")
        .getPublicUrl(
          fileName
        )

    return data.publicUrl
  }

  async function handleSubmit() {

    if (
      !form.judul ||
      !form.link
    ) {

      alert(
        "Judul & link wajib diisi"
      )

      return
    }

    if (
      !editingId &&
      !file
    ) {

      alert(
        "Gambar wajib diisi!"
      )

      return
    }

    let gambarUrl =
      form.gambar || null

    if (file) {

      const uploaded =
        await uploadGambar()

      if (!uploaded) {

        alert(
          "Upload gagal"
        )

        return
      }

      gambarUrl = uploaded
    }

    const payload = {
      ...form,
      gambar: gambarUrl,
    }

    let error

    if (editingId) {

      const res =
        await supabase
          .from("materi")
          .update(payload)
          .eq(
            "id",
            editingId
          )

      error = res.error

    } else {

      const res =
        await supabase
          .from("materi")
          .insert([
            payload,
          ])

      error = res.error
    }

    if (error) {

      alert(
        "Gagal simpan: " +
        error.message
      )

      return
    }

    alert(
      "Berhasil disimpan"
    )

    setShowModal(false)

    getMateri()
  }

  async function handleDelete(
    id: number
  ) {

    if (
      !confirm(
        "Hapus materi?"
      )
    ) return

    await supabase
      .from("materi")
      .delete()
      .eq("id", id)

    getMateri()
  }

  if (loading) {

    return (
      <p className="p-10">
        Loading...
      </p>
    )
  }

  return (

    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

        <div>

          <h1 className="text-3xl md:text-4xl font-black text-gray-800">
            📚 Admin Materi
          </h1>

          <p className="text-gray-500 mt-1">
            Kelola materi pembelajaran
          </p>

        </div>

        <div className="flex flex-wrap gap-3">

          <button
            onClick={() =>
              router.push("/admin")
            }
            className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-3 rounded-2xl font-semibold transition"
          >
            Dashboard
          </button>

          <button
            onClick={openTambah}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-2xl font-semibold transition"
          >
            + Tambah Materi
          </button>

        </div>

      </div>

      {/* LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {materi.map((item) => (

          <div
            key={item.id}
            className="bg-white rounded-3xl shadow-lg overflow-hidden"
          >

            <img
              src={
                item.gambar
                  ? item.gambar
                  : "https://via.placeholder.com/400x200"
              }
              className="w-full h-52 object-cover"
            />

            <div className="p-5">

              <h2 className="font-bold text-lg text-gray-800 line-clamp-2">
                {item.judul}
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                {item.kategori}
              </p>

              <div className="mt-3 inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">

                {item.tipe.toUpperCase()}

              </div>

              <div className="flex gap-3 mt-5">

                <button
                  onClick={() =>
                    openEdit(item)
                  }
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-2xl font-semibold transition"
                >
                  Edit
                </button>

                <button
                  onClick={() =>
                    handleDelete(
                      item.id!
                    )
                  }
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-2xl font-semibold transition"
                >
                  Hapus
                </button>

              </div>

            </div>

          </div>
        ))}

      </div>

      {/* MODAL */}
      {showModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">

            <h2 className="text-2xl font-bold mb-5">

              {editingId
                ? "Edit Materi"
                : "Tambah Materi"}

            </h2>

            <input
              name="judul"
              placeholder="Judul Materi"
              className="border p-3 rounded-2xl mb-3 w-full"
              value={form.judul}
              onChange={handleChange}
            />

            <select
              name="kategori"
              className="border p-3 rounded-2xl mb-3 w-full"
              value={form.kategori}
              onChange={handleChange}
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

            <select
              name="tipe"
              className="border p-3 rounded-2xl mb-3 w-full"
              value={form.tipe}
              onChange={handleChange}
            >

              <option value="video">
                Video
              </option>

              <option value="pdf">
                PDF
              </option>

              <option value="artikel">
                Artikel
              </option>

            </select>

            <input
              name="link"
              placeholder="Link Materi"
              className="border p-3 rounded-2xl mb-3 w-full"
              value={form.link}
              onChange={handleChange}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFile(
                  e.target
                    .files?.[0] ||
                  null
                )
              }
              className="mb-5 w-full"
            />

            <div className="flex gap-3">

              <button
                onClick={
                  handleSubmit
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold transition"
              >
                Simpan
              </button>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-3 rounded-2xl font-bold transition"
              >
                Batal
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}
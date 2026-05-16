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

      <div className="
      min-h-screen
      flex
      items-center
      justify-center
      bg-gray-100
      ">

        <div className="
        bg-white
        px-8 py-5
        rounded-3xl
        shadow-lg
        text-lg
        font-bold
        text-gray-700
        ">

          Loading...

        </div>

      </div>
    )
  }

  return (

    <div className="
    min-h-screen
    bg-gradient-to-br
    from-gray-100
    to-gray-200
    p-4 md:p-8 lg:p-10
    ">

      {/* HEADER */}
      <div className="
      flex
      flex-col
      md:flex-row
      md:items-center
      md:justify-between
      gap-5
      mb-10
      ">

        <div>

          <h1 className="
          text-3xl
          md:text-5xl
          font-black
          text-gray-800
          ">

            📚 Admin Materi

          </h1>

          <p className="
          text-gray-600
          mt-2
          text-base
          md:text-lg
          ">

            Kelola materi pembelajaran siswa

          </p>

        </div>

        <div className="
        flex
        flex-wrap
        gap-3
        ">

          <button
            onClick={() =>
              router.push("/admin")
            }
            className="
            bg-gray-700
            hover:bg-gray-800
            text-white
            px-6 py-3
            rounded-2xl
            font-bold
            shadow-lg
            transition-all
            "
          >

            Dashboard

          </button>

          <button
            onClick={openTambah}
            className="
            bg-green-600
            hover:bg-green-700
            text-white
            px-6 py-3
            rounded-2xl
            font-bold
            shadow-lg
            transition-all
            "
          >

            + Tambah Materi

          </button>

        </div>

      </div>

      {/* CARD LIST */}
      <div className="
      grid
      grid-cols-1
      sm:grid-cols-2
      xl:grid-cols-3
      gap-7
      ">

        {materi.map((item) => (

          <div
            key={item.id}
            className="
            bg-white
            rounded-[30px]
            overflow-hidden
            shadow-xl
            border
            border-gray-200
            hover:-translate-y-2
            hover:shadow-2xl
            transition-all
            duration-300
            "
          >

            {/* IMAGE */}
            <div className="relative">

              <img
                src={
                  item.gambar
                    ? item.gambar
                    : "https://via.placeholder.com/400x200"
                }
                className="
                w-full
                h-56
                object-cover
                "
              />

              {/* OVERLAY */}
              <div className="
              absolute
              inset-0
              bg-gradient-to-t
              from-black/70
              via-black/20
              to-transparent
              " />

              {/* BADGE */}
              <div className="
              absolute
              top-4
              right-4
              bg-white
              text-blue-700
              px-4 py-2
              rounded-full
              text-xs
              font-black
              shadow-lg
              uppercase
              ">

                {item.tipe}

              </div>

              {/* TITLE DI GAMBAR */}
              <div className="
              absolute
              bottom-4
              left-4
              right-4
              ">

                <h2 className="
                text-white
                text-xl
                font-black
                leading-snug
                drop-shadow-lg
                ">

                  {item.judul}

                </h2>

              </div>

            </div>

            {/* CONTENT */}
            <div className="p-5">

              <div className="
              inline-flex
              items-center
              gap-2
              bg-blue-100
              text-blue-700
              px-4 py-2
              rounded-full
              text-sm
              font-bold
              mb-5
              ">

                📘 {item.kategori}

              </div>

              <div className="
              flex
              gap-3
              ">

                <button
                  onClick={() =>
                    openEdit(item)
                  }
                  className="
                  flex-1
                  bg-yellow-500
                  hover:bg-yellow-600
                  text-white
                  py-3
                  rounded-2xl
                  font-bold
                  transition-all
                  shadow-md
                  "
                >

                  Edit

                </button>

                <button
                  onClick={() =>
                    handleDelete(
                      item.id!
                    )
                  }
                  className="
                  flex-1
                  bg-red-500
                  hover:bg-red-600
                  text-white
                  py-3
                  rounded-2xl
                  font-bold
                  transition-all
                  shadow-md
                  "
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

        <div className="
        fixed
        inset-0
        bg-black/60
        backdrop-blur-sm
        flex
        items-center
        justify-center
        z-50
        p-4
        ">

          <div className="
          bg-white
          rounded-[35px]
          p-7
          w-full
          max-w-xl
          shadow-2xl
          animate-in
          fade-in
          zoom-in-95
          ">

            <h2 className="
            text-3xl
            font-black
            text-gray-800
            mb-6
            ">

              {editingId
                ? "✏️ Edit Materi"
                : "📚 Tambah Materi"}

            </h2>

            <div className="space-y-4">

              <input
                name="judul"
                placeholder="Judul Materi"
                className="
                w-full
                border-2
                border-gray-200
                focus:border-blue-500
                outline-none
                p-4
                rounded-2xl
                font-medium
                text-gray-700
                "
                value={form.judul}
                onChange={handleChange}
              />

              <select
                name="kategori"
                className="
                w-full
                border-2
                border-gray-200
                focus:border-blue-500
                outline-none
                p-4
                rounded-2xl
                font-medium
                text-gray-700
                "
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
                className="
                w-full
                border-2
                border-gray-200
                focus:border-blue-500
                outline-none
                p-4
                rounded-2xl
                font-medium
                text-gray-700
                "
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
                className="
                w-full
                border-2
                border-gray-200
                focus:border-blue-500
                outline-none
                p-4
                rounded-2xl
                font-medium
                text-gray-700
                "
                value={form.link}
                onChange={handleChange}
              />

              <div className="
              border-2
              border-dashed
              border-gray-300
              rounded-2xl
              p-5
              bg-gray-50
              ">

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
                  className="w-full"
                />

              </div>

            </div>

            <div className="
            flex
            gap-4
            mt-7
            ">

              <button
                onClick={
                  handleSubmit
                }
                className="
                flex-1
                bg-blue-600
                hover:bg-blue-700
                text-white
                py-4
                rounded-2xl
                font-black
                shadow-lg
                transition-all
                "
              >

                Simpan

              </button>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="
                flex-1
                bg-gray-300
                hover:bg-gray-400
                text-gray-800
                py-4
                rounded-2xl
                font-black
                transition-all
                "
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
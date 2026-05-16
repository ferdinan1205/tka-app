"use client"

import {
  useEffect,
  useState,
  ChangeEvent,
} from "react"

import { useRouter } from "next/navigation"

import { supabase } from "../../../lib/supabase"

import * as XLSX from "xlsx"

import {
  MathJax,
  MathJaxContext,
} from "better-react-mathjax"

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd"

import type {
  DropResult,
} from "@hello-pangea/dnd"

type Soal = {
  id?: number
  pertanyaan: string
  opsi_a: string
  opsi_b: string
  opsi_c: string
  opsi_d: string
  jawaban_benar: string
  kategori: string
  pembahasan?: string
  video_url?: string
  gambar?: string
  pengantar?: string
  bacaan?: string
}

const initialForm: Soal = {
  pertanyaan: "",
  opsi_a: "",
  opsi_b: "",
  opsi_c: "",
  opsi_d: "",
  jawaban_benar: "a",
  kategori: "Matematika",
  pembahasan: "",
  video_url: "",
  gambar: "",
  pengantar: "",
  bacaan: "",
}

export default function AdminSoal() {

  const router = useRouter()

  const [soal, setSoal] =
    useState<Soal[]>([])

  const [selectedKategori,
    setSelectedKategori] =
    useState("Matematika")

  const [showModal,
    setShowModal] =
    useState(false)

  const [search,
    setSearch] =
    useState("")

  const [loading,
    setLoading] =
    useState(false)

  const [saving,
    setSaving] =
    useState(false)

  const [form, setForm] =
    useState<Soal>(initialForm)

  useEffect(() => {
    init()
  }, [selectedKategori])

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

    getSoal()
  }

  async function getSoal() {

    setLoading(true)

    const { data, error } =
      await supabase
        .from("soal")
        .select("*")
        .eq(
          "kategori",
          selectedKategori
        )
        .order("id", {
          ascending: true,
        })

    if (error) {

      console.log(error)

      alert("Gagal mengambil data")

      setLoading(false)

      return
    }

    setSoal(
      (data || []) as Soal[]
    )

    setLoading(false)
  }

  function handleChange(
    e: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) {

    const {
      name,
      value,
    } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function generatePembahasan() {

    return `Jawaban benar adalah ${form.jawaban_benar.toUpperCase()}`
  }

  async function uploadGambar(
    file: File
  ) {

    try {

      const fileExt =
        file.name.split(".").pop()

      const fileName =
        `${Date.now()}.${fileExt}`

      const { error } =
        await supabase
          .storage
          .from("soal")
          .upload(
            fileName,
            file
          )

      if (error) {

        console.log(error)

        alert("Upload gagal")

        return ""
      }

      const { data } =
        supabase
          .storage
          .from("soal")
          .getPublicUrl(fileName)

      return data.publicUrl

    } catch (err) {

      console.log(err)

      return ""
    }
  }

  async function handleSubmit() {

    try {

      setSaving(true)

      const payload = {

        ...form,

        kategori:
          form.kategori.trim(),

        jawaban_benar:
          form.jawaban_benar
            .toLowerCase()
            .trim(),

        pembahasan:
          form.pembahasan ||
          generatePembahasan(),
      }

      if (form.id) {

        const { error } =
          await supabase
            .from("soal")
            .update(payload)
            .eq("id", form.id)

        if (error)
          throw error

      } else {

        const { error } =
          await supabase
            .from("soal")
            .insert([payload])

        if (error)
          throw error
      }

      alert("Berhasil disimpan")

      setShowModal(false)

      resetForm()

      getSoal()

    } catch (err) {

      console.log(err)

      alert("Gagal menyimpan")

    } finally {

      setSaving(false)
    }
  }

  function handleEdit(
    item: Soal
  ) {

    setForm({
      ...initialForm,
      ...item,
    })

    setShowModal(true)
  }

  async function handleDelete(
    id: number
  ) {

    const confirmDelete =
      confirm(
        "Hapus soal ini?"
      )

    if (!confirmDelete)
      return

    try {

      const { error } =
        await supabase
          .from("soal")
          .delete()
          .eq("id", id)

      if (error)
        throw error

      getSoal()

    } catch (err) {

      console.log(err)

      alert("Gagal menghapus")
    }
  }

  function resetForm() {

    setForm({
      ...initialForm,
      kategori:
        selectedKategori,
    })
  }

  function onDragEnd(
    result: DropResult
  ) {

    if (!result.destination)
      return

    const items =
      Array.from(soal)

    const [moved] =
      items.splice(
        result.source.index,
        1
      )

    items.splice(
      result.destination.index,
      0,
      moved
    )

    setSoal(items)
  }

  function handleExcelUpload(
    e: ChangeEvent<HTMLInputElement>
  ) {

    const file =
      e.target.files?.[0]

    if (!file)
      return

    const reader =
      new FileReader()

    reader.onload =
      async (evt) => {

      try {

        const data =
          new Uint8Array(
            evt.target
              ?.result as ArrayBuffer
          )

        const workbook =
          XLSX.read(data, {
            type: "array",
          })

        const sheet =
          workbook.Sheets[
            workbook
              .SheetNames[0]
          ]

        const json =
          XLSX.utils.sheet_to_json(
            sheet,
            {
              defval: "",
            }
          )

        for (
          const row of json as any[]
        ) {

          const payload = {

            pengantar:
              String(
                row.pengantar || ""
              ),

            bacaan:
              String(
                row.bacaan || ""
              ),

            pertanyaan:
              String(
                row.pertanyaan || ""
              ),

            opsi_a:
              String(
                row.opsi_a || ""
              ),

            opsi_b:
              String(
                row.opsi_b || ""
              ),

            opsi_c:
              String(
                row.opsi_c || ""
              ),

            opsi_d:
              String(
                row.opsi_d || ""
              ),

            jawaban_benar:
              String(
                row.jawaban_benar || ""
              )
                .toLowerCase()
                .trim(),

            kategori:
              String(
                row.kategori ||
                selectedKategori
              ).trim(),

            pembahasan:
              String(
                row.pembahasan || ""
              ),

            video_url:
              String(
                row.video_url || ""
              ),
          }

          await supabase
            .from("soal")
            .insert([payload])
        }

        alert(
          "Upload berhasil 🚀"
        )

        getSoal()

      } catch (err) {

        console.log(err)

        alert(
          "Upload excel gagal"
        )
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const filteredSoal =
    soal.filter((s) =>
      s.pertanyaan
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
    )

  return (

    <MathJaxContext>

      <div className="bg-gray-100 min-h-screen">

        {/* HEADER */}
        <div className="bg-blue-800 text-white p-6 flex justify-between items-center">

          <div>

            <h1 className="text-3xl font-bold">
              Admin Soal
            </h1>

            <p className="text-sm opacity-80">
              Kelola bank soal
            </p>

          </div>

          <div className="flex gap-3">

            <button
              onClick={() =>
                router.push("/admin")
              }
              className="border px-4 py-2 rounded-lg hover:bg-white hover:text-blue-800"
            >
              ← Admin
            </button>

            <button
              onClick={() => {

                resetForm()

                setShowModal(true)
              }}
              className="border px-4 py-2 rounded-lg hover:bg-white hover:text-blue-800"
            >
              + Tambah Soal
            </button>

          </div>

        </div>

        <div className="p-6">

          {/* SEARCH */}
          <div className="flex gap-4 mb-6 flex-wrap">

            <input
              placeholder="Cari soal..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="flex-1 border p-3 rounded-xl"
            />

            <input
              type="file"
              accept=".xlsx"
              onChange={
                handleExcelUpload
              }
              className="border px-4 py-2 rounded-xl bg-white"
            />

          </div>

          {/* LIST */}
          {loading ? (

            <div className="bg-white p-10 rounded-2xl text-center">
              Loading...
            </div>

          ) : (

            <DragDropContext
              onDragEnd={onDragEnd}
            >

              <Droppable droppableId="soal-list">

                {(provided) => (

                  <div
                    ref={
                      provided.innerRef
                    }
                    {...provided.droppableProps}
                  >

                    {filteredSoal.map(
                      (
                        item,
                        index
                      ) => (

                        <Draggable
                          key={
                            item.id?.toString() ||
                            index.toString()
                          }
                          draggableId={
                            item.id?.toString() ||
                            `item-${index}`
                          }
                          index={index}
                        >

                          {(provided) => (

                            <div
                              ref={
                                provided.innerRef
                              }

                              {...provided.draggableProps}

                              className="bg-white p-5 mb-4 rounded-2xl shadow-sm"
                            >

                              <div className="flex justify-between gap-4">

                                <div className="flex gap-4 flex-1">

                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab text-2xl"
                                  >
                                    ☰
                                  </div>

                                  <div className="flex-1">

                                    <div className="font-semibold leading-8 text-lg">

                                      <MathJax dynamic>
                                        {item.pertanyaan || ""}
                                      </MathJax>

                                    </div>

                                  </div>

                                </div>

                                <div className="flex gap-2">

                                  <button
                                    onClick={() =>
                                      handleEdit(item)
                                    }
                                    className="bg-yellow-400 text-white px-4 py-2 rounded-xl"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        item.id!
                                      )
                                    }
                                    className="bg-red-500 text-white px-4 py-2 rounded-xl"
                                  >
                                    Hapus
                                  </button>

                                </div>

                              </div>

                            </div>

                          )}

                        </Draggable>

                      )
                    )}

                    {provided.placeholder}

                  </div>

                )}

              </Droppable>

            </DragDropContext>

          )}

        </div>

      </div>

    </MathJaxContext>
  )
}
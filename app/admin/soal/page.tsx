"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import * as XLSX from "xlsx"

import Latex from "react-latex-next"
import "katex/dist/katex.min.css"

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd"

import type { DropResult } from "@hello-pangea/dnd"

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

  const [form, setForm] =
    useState<Soal>({
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
    })

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

    getSoal()
  }

  async function getSoal() {

    setLoading(true)

    const { data, error } =
      await supabase
        .from("soal")
        .select("*")
        .eq("kategori", selectedKategori)
        .order("id", {
          ascending: true,
        })

    if (error) {

      console.log(error)

      setLoading(false)

      return
    }

    setSoal(
      (data || []) as Soal[]
    )

    setLoading(false)
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) {

    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    })
  }

  function generatePembahasan() {

    return `Jawaban benar adalah ${form.jawaban_benar.toUpperCase()}`
  }

  async function uploadGambar(
    file: File
  ) {

    const fileName =
      Date.now() + "_" + file.name

    const { error } =
      await supabase
        .storage
        .from("soal")
        .upload(fileName, file)

    if (error) {

      alert("Upload gagal")

      return ""
    }

    const { data } =
      supabase
        .storage
        .from("soal")
        .getPublicUrl(fileName)

    return data.publicUrl
  }

  async function handleSubmit() {

    const payload = {

      ...form,

      kategori:
        form.kategori.trim(),

      jawaban_benar:
        form.jawaban_benar
          .toLowerCase(),

      pembahasan:
        form.pembahasan ||
        generatePembahasan(),
    }

    try {

      if (form.id) {

        await supabase
          .from("soal")
          .update(payload)
          .eq("id", form.id)

      } else {

        await supabase
          .from("soal")
          .insert([payload])
      }

      alert("Berhasil disimpan")

      setShowModal(false)

      resetForm()

      getSoal()

    } catch (err) {

      console.log(err)

      alert("Gagal menyimpan")
    }
  }

  function handleEdit(
    item: Soal
  ) {

    setForm({
      ...item
    })

    setShowModal(true)
  }

  async function handleDelete(
    id: number
  ) {

    const confirmDelete =
      confirm("Hapus soal ini?")

    if (!confirmDelete)
      return

    await supabase
      .from("soal")
      .delete()
      .eq("id", id)

    getSoal()
  }

  function resetForm() {

    setForm({
      pertanyaan: "",
      opsi_a: "",
      opsi_b: "",
      opsi_c: "",
      opsi_d: "",
      jawaban_benar: "a",
      kategori: selectedKategori,
      pembahasan: "",
      video_url: "",
      gambar: "",
      pengantar: "",
      bacaan: "",
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
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      e.target.files?.[0]

    if (!file)
      return

    const reader =
      new FileReader()

    reader.onload =
      async (
        evt: ProgressEvent<FileReader>
      ) => {

      const data =
        new Uint8Array(
          evt.target?.result as ArrayBuffer
        )

      const workbook =
        XLSX.read(data, {
          type: "array",
        })

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ]

      const json =
        XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        })

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

      alert("Upload berhasil 🚀")

      getSoal()
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

    <div className="bg-gray-100 min-h-screen">

      {/* HEADER */}
      <div className="bg-blue-800 text-white p-6 flex justify-between items-center">

        <div>

          <h1 className="text-3xl font-bold">
            Admin Soal
          </h1>

          <p className="text-sm opacity-80">
            Kelola bank soal ujian
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

        {/* FILTER */}
        <div className="flex gap-3 mb-6 flex-wrap">

          {[
            "Matematika",
            "Bahasa Indonesia",
            "Bahasa Inggris",
            "TPS",
            "Literasi",
          ].map((k) => (

            <button
              key={k}
              onClick={() =>
                setSelectedKategori(k)
              }
              className={`px-4 py-2 rounded-xl border transition ${
                selectedKategori === k
                  ? "bg-white shadow font-semibold"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {k}
            </button>

          ))}

        </div>

        {/* SEARCH */}
        <div className="flex gap-4 mb-6 flex-wrap">

          <input
            placeholder="Cari soal..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
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
                        key={String(item.id)}
                        draggableId={String(item.id)}
                        index={index}
                      >

                        {(provided) => (

                          <div
                            ref={
                              provided.innerRef
                            }

                            {...provided.draggableProps}

                            className="bg-white p-5 mb-4 rounded-2xl flex justify-between items-center shadow-sm"
                          >

                            {/* LEFT */}
                            <div className="flex items-center gap-4 flex-1">

                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing text-2xl px-2"
                              >
                                ☰
                              </div>

                              <div className="bg-blue-100 text-blue-700 w-10 h-10 flex items-center justify-center rounded-lg font-bold">
                                {index + 1}
                              </div>

                              <div className="flex-1">

                                <div className="font-semibold leading-7 text-lg">
                                  <Latex>
                                    {item.pertanyaan || ""}
                                  </Latex>
                                </div>

                                <div className="flex gap-2 mt-2 flex-wrap">

                                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                                    {item.kategori}
                                  </span>

                                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                                    Pilihan Ganda
                                  </span>

                                </div>

                              </div>

                            </div>

                            {/* BUTTON */}
                            <div className="flex gap-2 ml-4">

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(item)
                                }}
                                className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded-xl font-semibold"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(
                                    item.id!
                                  )
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold"
                              >
                                Hapus
                              </button>

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

      {/* MODAL */}
      {showModal && (

        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 overflow-y-auto">

          <div className="bg-white w-full max-w-4xl rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">
              {form.id
                ? "Edit Soal"
                : "Tambah Soal"}
            </h2>

            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">

              <textarea
                name="pengantar"
                value={form.pengantar}
                onChange={handleChange}
                placeholder="Pengantar"
                className="w-full border p-4 rounded-xl"
                rows={3}
              />

              <textarea
                name="bacaan"
                value={form.bacaan}
                onChange={handleChange}
                placeholder="Bacaan"
                className="w-full border p-4 rounded-xl"
                rows={5}
              />

              <textarea
                name="pertanyaan"
                value={form.pertanyaan}
                onChange={handleChange}
                placeholder="Pertanyaan"
                className="w-full border p-4 rounded-xl"
                rows={4}
              />

              <input
                name="opsi_a"
                value={form.opsi_a}
                onChange={handleChange}
                placeholder="Opsi A"
                className="w-full border p-4 rounded-xl"
              />

              <input
                name="opsi_b"
                value={form.opsi_b}
                onChange={handleChange}
                placeholder="Opsi B"
                className="w-full border p-4 rounded-xl"
              />

              <input
                name="opsi_c"
                value={form.opsi_c}
                onChange={handleChange}
                placeholder="Opsi C"
                className="w-full border p-4 rounded-xl"
              />

              <input
                name="opsi_d"
                value={form.opsi_d}
                onChange={handleChange}
                placeholder="Opsi D"
                className="w-full border p-4 rounded-xl"
              />

              <select
                name="jawaban_benar"
                value={form.jawaban_benar}
                onChange={handleChange}
                className="w-full border p-4 rounded-xl"
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>

              <textarea
                name="pembahasan"
                value={form.pembahasan}
                onChange={handleChange}
                placeholder="Pembahasan"
                className="w-full border p-4 rounded-xl"
                rows={5}
              />

              <input
                name="video_url"
                value={form.video_url}
                onChange={handleChange}
                placeholder="Video URL"
                className="w-full border p-4 rounded-xl"
              />

              <input
                type="file"
                accept="image/*"
                className="w-full border p-4 rounded-xl"
                onChange={async (e) => {

                  const file =
                    e.target.files?.[0]

                  if (!file)
                    return

                  const url =
                    await uploadGambar(file)

                  if (url) {

                    setForm({
                      ...form,
                      gambar: url,
                    })
                  }
                }}
              />

              {form.gambar && (

                <img
                  src={form.gambar}
                  alt="preview"
                  className="max-h-64 rounded-xl border"
                />

              )}

            </div>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="border px-6 py-3 rounded-xl"
              >
                Batal
              </button>

              <button
                onClick={handleSubmit}
                className="bg-blue-700 text-white px-6 py-3 rounded-xl"
              >
                Simpan
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}
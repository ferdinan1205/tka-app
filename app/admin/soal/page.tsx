"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import dynamic from "next/dynamic"

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

import "react-quill-new/dist/quill.snow.css"

import "katex/dist/katex.min.css"

import katex from "katex"

if (typeof window !== "undefined") {
  ;(window as any).katex = katex
}

const ReactQuill = dynamic(
  () => import("react-quill-new"),
  {
    ssr: false,
  }
)

type Soal = {
  id?: number

  pertanyaan: string

  opsi_a: string
  opsi_b: string
  opsi_c: string
  opsi_d: string
  opsi_e: string

  jawaban_benar: string

  kategori: string
  paket?: string

  pembahasan?: string
  video_url?: string

  gambar?: string

  pengantar?: string
  bacaan?: string
}

const mathJaxConfig = {
  loader: {
    load: [
      "input/tex",
      "output/chtml",
    ],
  },

  tex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],

    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
  },
}

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

const paketList = [
  "sma",
  "smk",
  "ipa",
  "ips",
  "bahasa",
]

export default function AdminSoal() {

  const router = useRouter()

  const quillModules =
  useMemo(
    () => ({
      toolbar: [

        // HEADER
        [
          {
            header: [
              1,
              2,
              3,
              false,
            ],
          },
        ],

        // TEXT STYLE
        [
          "bold",
          "italic",
          "underline",
          "strike",
        ],

        // SUBSCRIPT & SUPERSCRIPT
        [
          {
            script: "sub",
          },
          {
            script: "super",
          },
        ],

        // LIST
        [
          {
            list: "ordered",
          },
          {
            list: "bullet",
          },
        ],

        // ALIGN
        [
          {
            align: [],
          },
        ],

        // BLOCKQUOTE
        ["blockquote"],

        // LINK IMAGE FORMULA
        [
          "link",
          "image",
          "formula",
        ],

        // TABLE BUTTON
        ["table"],

        // CLEAN
        ["clean"],
      ],
    }),
    []
  )

  const [soal, setSoal] =
    useState<Soal[]>([])

  const [
    filteredPaketSoal,
    setFilteredPaketSoal,
  ] =
    useState<Soal[]>([])

  const [
    selectedKategori,
    setSelectedKategori,
  ] =
    useState("Semua")

  const [
    selectedPaket,
    setSelectedPaket,
  ] =
    useState("")

  const [
    showModal,
    setShowModal,
  ] =
    useState(false)

  const [search, setSearch] =
    useState("")

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    uploading,
    setUploading,
  ] =
    useState(false)

  const [form, setForm] =
    useState<Soal>({
      pertanyaan: "",

      opsi_a: "",
      opsi_b: "",
      opsi_c: "",
      opsi_d: "",
      opsi_e: "",

      jawaban_benar: "a",

      kategori: "Matematika",

      paket: "",

      pembahasan: "",
      video_url: "",

      gambar: "",

      pengantar: "",
      bacaan: "",
    })

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

    const {
      data: profile,
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          data.user.id
        )
        .single()

    if (
      !profile ||
      profile.role !==
        "admin"
    ) {

      alert(
        "Akses ditolak!"
      )

      router.push(
        "/dashboard"
      )

      return
    }

    getSoal()
  }

  async function getSoal() {

    setLoading(true)

    const {
      data,
      error,
    } =
      await supabase
        .from("soal")
        .select("*")
        .order("id", {
          ascending: true,
        })

    if (error) {

      console.log(error)

      setLoading(false)

      return
    }

    setSoal(
      (data ||
        []) as Soal[]
    )

    setLoading(false)
  }

  useEffect(() => {

    if (!selectedPaket) {

      setFilteredPaketSoal(
        []
      )

      return
    }

    const hasil =
      soal
        .filter((s) => {

          const paketMatch =
            s.paket?.toLowerCase() ===
            selectedPaket.toLowerCase()

          const kategoriMatch =
            selectedKategori ===
            "Semua"
              ? true
              : s.kategori ===
                selectedKategori

          return (
            paketMatch &&
            kategoriMatch
          )
        })
        .slice(0, 25)

    setFilteredPaketSoal(
      hasil
    )

  }, [
    selectedPaket,
    selectedKategori,
    soal,
  ])

  function acakSoal() {

    if (!selectedPaket)
      return

    const hasil =
      soal
        .filter((s) => {

          const paketMatch =
            s.paket?.toLowerCase() ===
            selectedPaket.toLowerCase()

          const kategoriMatch =
            selectedKategori ===
            "Semua"
              ? true
              : s.kategori ===
                selectedKategori

          return (
            paketMatch &&
            kategoriMatch
          )
        })

        .sort(
          () =>
            Math.random() - 0.5
        )

        .slice(0, 25)

    setFilteredPaketSoal(
      hasil
    )
  }

  function generatePembahasan() {

    return `Jawaban benar adalah ${form.jawaban_benar.toUpperCase()}`
  }

  async function uploadGambar(
    file: File
  ) {

    try {

      setUploading(true)

      const fileName =
        `${Date.now()}-${file.name}`

      const { error } =
        await supabase
          .storage
          .from("soal")
          .upload(
            fileName,
            file
          )

      if (error) {

        alert(
          "Upload gagal"
        )

        return
      }

      const { data } =
        supabase
          .storage
          .from("soal")
          .getPublicUrl(
            fileName
          )

      setForm((prev) => ({
        ...prev,
        gambar:
          data.publicUrl,
      }))

      alert(
        "Upload berhasil"
      )

    } catch (err) {

      console.log(err)

    } finally {

      setUploading(false)
    }
  }

  async function handleSubmit() {

    const payload = {
      ...form,

      kategori:
        form.kategori.trim(),

      paket:
        form.paket?.trim() ||
        "",

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
          .eq(
            "id",
            form.id
          )

      } else {

        await supabase
          .from("soal")
          .insert([
            payload,
          ])
      }

      alert(
        "Berhasil disimpan"
      )

      setShowModal(false)

      resetForm()

      getSoal()

    } catch (err) {

      console.log(err)

      alert(
        "Gagal menyimpan"
      )
    }
  }

  function handleEdit(
    item: Soal
  ) {

    setForm({
      ...item,

      opsi_e:
        item.opsi_e || "",

      paket:
        item.paket || "",
    })

    setShowModal(true)
  }

  async function handleDelete(
    id: number
  ) {

    const confirmDelete =
      confirm(
        "Hapus soal?"
      )

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
      opsi_e: "",

      jawaban_benar: "a",

      kategori: "Matematika",

      paket: "",

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

    if (
      !result.destination
    )
      return

    const items =
      Array.from(soal)

    const [moved] =
      items.splice(
        result.source.index,
        1
      )

    items.splice(
      result.destination
        .index,
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
              row.pengantar ||
                ""
            ),

          bacaan:
            String(
              row.bacaan ||
                ""
            ),

          pertanyaan:
            String(
              row.pertanyaan ||
                ""
            ),

          opsi_a:
            String(
              row.opsi_a ||
                ""
            ),

          opsi_b:
            String(
              row.opsi_b ||
                ""
            ),

          opsi_c:
            String(
              row.opsi_c ||
                ""
            ),

          opsi_d:
            String(
              row.opsi_d ||
                ""
            ),

          opsi_e:
            String(
              row.opsi_e ||
                ""
            ),

          jawaban_benar:
            String(
              row.jawaban_benar ||
                ""
            )
              .toLowerCase()
              .trim(),

          kategori:
            String(
              row.kategori ||
                ""
            ).trim(),

          paket:
            String(
              row.paket ||
                ""
            ).trim(),

          pembahasan:
            String(
              row.pembahasan ||
                ""
            ),

          video_url:
            String(
              row.video_url ||
                ""
            ),

          gambar:
            String(
              row.gambar ||
                ""
            ),
        }

        await supabase
          .from("soal")
          .insert([
            payload,
          ])
      }

      alert(
        "Upload berhasil 🚀"
      )

      getSoal()
    }

    reader.readAsArrayBuffer(
      file
    )
  }

  const displayedSoal =
    selectedPaket
      ? filteredPaketSoal
      : soal

  const filteredSoal =
    displayedSoal

      .filter((s) => {

        const kategoriMatch =
          selectedKategori ===
          "Semua"
            ? true
            : s.kategori ===
              selectedKategori

        return kategoriMatch
      })

      .filter((s) =>
        s.pertanyaan
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )
      )

  return (

    <MathJaxContext
      config={mathJaxConfig}
    >

      <div className="bg-gray-100 min-h-screen text-black">

        <div className="bg-blue-800 text-white p-6 flex justify-between items-center">

          <h1 className="text-3xl font-bold">
            Admin Soal
          </h1>

          <div className="flex gap-3">

            <button
              onClick={() =>
                router.push(
                  "/admin"
                )
              }
              className="border border-white px-4 py-2 rounded-lg"
            >
              ← Admin
            </button>

            <button
              onClick={() => {

                resetForm()

                setShowModal(
                  true
                )
              }}
              className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold"
            >
              + Tambah Soal
            </button>

          </div>

        </div>

        <div className="p-6">

          <div className="flex gap-3 mb-6 flex-wrap">

            <button
              onClick={() =>
                setSelectedKategori(
                  "Semua"
                )
              }
              className={`px-4 py-2 rounded-xl border ${
                selectedKategori ===
                "Semua"
                  ? "bg-blue-700 text-white"
                  : "bg-white"
              }`}
            >
              Semua
            </button>

            {kategoriList.map(
              (k) => (

                <button
                  key={k}
                  onClick={() =>
                    setSelectedKategori(
                      k
                    )
                  }
                  className={`px-4 py-2 rounded-xl border ${
                    selectedKategori ===
                    k
                      ? "bg-blue-700 text-white"
                      : "bg-white"
                  }`}
                >
                  {k}
                </button>

              )
            )}

          </div>

          <div className="flex gap-3 mb-6 flex-wrap">

            <button
              onClick={() =>
                setSelectedPaket(
                  ""
                )
              }
              className={`px-4 py-2 rounded-xl border ${
                selectedPaket ===
                ""
                  ? "bg-blue-700 text-white"
                  : "bg-white"
              }`}
            >
              Semua Soal
            </button>

            {paketList.map(
              (p) => (

                <button
                  key={p}
                  onClick={() =>
                    setSelectedPaket(
                      p
                    )
                  }
                  className={`px-4 py-2 rounded-xl border ${
                    selectedPaket ===
                    p
                      ? "bg-green-600 text-white"
                      : "bg-white"
                  }`}
                >
                  {p.toUpperCase()}
                </button>

              )
            )}

            {selectedPaket && (

              <button
                onClick={
                  acakSoal
                }
                className="px-4 py-2 rounded-xl bg-orange-500 text-white"
              >
                🎲 Acak 25
                Soal
              </button>

            )}

          </div>

          <div className="flex gap-4 mb-6 flex-wrap">

            <input
              placeholder="Cari soal..."
              value={search}
              onChange={(
                e
              ) =>
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
              className="border p-3 rounded-xl"
            />

          </div>

          {loading ? (

            <div className="bg-white p-10 rounded-2xl text-center">
              Loading...
            </div>

          ) : (

            <DragDropContext
              onDragEnd={
                onDragEnd
              }
            >

              <Droppable droppableId="soal-list">

                {(
                  provided
                ) => (

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
                          key={String(
                            item.id
                          )}
                          draggableId={String(
                            item.id
                          )}
                          index={
                            index
                          }
                        >

                          {(
                            provided
                          ) => (

                            <div
                              ref={
                                provided.innerRef
                              }
                              {...provided.draggableProps}
                              style={{
                                ...provided
                                  .draggableProps
                                  .style,
                              }}
                              className="bg-white p-5 mb-4 rounded-2xl shadow border"
                            >

                              <div className="flex justify-between gap-4">

                                <div className="flex gap-4 flex-1">

                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab text-2xl"
                                  >
                                    ☰
                                  </div>

                                  <div className="flex-1 [&_img]:max-w-full [&_img]:h-auto">

                                    <MathJax dynamic>

                                      <div
                                        className="prose max-w-none"
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            item.pertanyaan,
                                        }}
                                      />

                                    </MathJax>

                                   <div className="mt-4 space-y-4">

  {/* OPSI A */}
  <MathJax dynamic>
    <div className="flex gap-2 items-start">
      <div className="font-bold">
        A.
      </div>

      <div
        className="flex-1 [&_img]:max-w-[250px] [&_img]:rounded-xl [&_img]:border [&_img]:mt-2"
        dangerouslySetInnerHTML={{
          __html: item.opsi_a || "",
        }}
      />
    </div>
  </MathJax>

  {/* OPSI B */}
  <MathJax dynamic>
    <div className="flex gap-2 items-start">
      <div className="font-bold">
        B.
      </div>

      <div
        className="flex-1 [&_img]:max-w-[250px] [&_img]:rounded-xl [&_img]:border [&_img]:mt-2"
        dangerouslySetInnerHTML={{
          __html: item.opsi_b || "",
        }}
      />
    </div>
  </MathJax>

  {/* OPSI C */}
  <MathJax dynamic>
    <div className="flex gap-2 items-start">
      <div className="font-bold">
        C.
      </div>

      <div
        className="flex-1 [&_img]:max-w-[250px] [&_img]:rounded-xl [&_img]:border [&_img]:mt-2"
        dangerouslySetInnerHTML={{
          __html: item.opsi_c || "",
        }}
      />
    </div>
  </MathJax>

  {/* OPSI D */}
  <MathJax dynamic>
    <div className="flex gap-2 items-start">
      <div className="font-bold">
        D.
      </div>

      <div
        className="flex-1 [&_img]:max-w-[250px] [&_img]:rounded-xl [&_img]:border [&_img]:mt-2"
        dangerouslySetInnerHTML={{
          __html: item.opsi_d || "",
        }}
      />
    </div>
  </MathJax>

  {/* OPSI E */}
  {item.opsi_e && (
    <MathJax dynamic>
      <div className="flex gap-2 items-start">
        <div className="font-bold">
          E.
        </div>

        <div
          className="flex-1 [&_img]:max-w-[250px] [&_img]:rounded-xl [&_img]:border [&_img]:mt-2"
          dangerouslySetInnerHTML={{
            __html: item.opsi_e || "",
          }}
        />
      </div>
    </MathJax>
  )}

</div>

                                    {item.gambar && (

                                      <img
                                        src={
                                          item.gambar
                                        }
                                        alt="gambar"
                                        className="mt-4 rounded-xl w-48 border"
                                      />

                                    )}

                                    <div className="flex gap-2 mt-3 flex-wrap">

                                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                                        {
                                          item.kategori
                                        }
                                      </span>

                                      {item.paket && (

                                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                                          {
                                            item.paket
                                          }
                                        </span>

                                      )}

                                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                                        Jawaban:
                                        {" "}
                                        {
                                          item.jawaban_benar.toUpperCase()
                                        }
                                      </span>

                                    </div>

                                  </div>

                                </div>

                                <div className="flex gap-2">

                                  <button
                                    onClick={() =>
                                      handleEdit(
                                        item
                                      )
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

                    {
                      provided.placeholder
                    }

                  </div>

                )}

              </Droppable>

            </DragDropContext>

          )}

        </div>

        {showModal && (

          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-6 overflow-y-auto">

            <div className="bg-white w-full max-w-5xl rounded-3xl p-8">

              <h2 className="text-2xl font-bold mb-6">

                {form.id
                  ? "Edit Soal"
                  : "Tambah Soal"}

              </h2>

              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">

                <div>

                  <label className="font-semibold block mb-2">
                    Upload
                    Gambar
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (
                      e
                    ) => {

                      const file =
                        e.target
                          .files?.[0]

                      if (
                        file
                      ) {
                        await uploadGambar(
                          file
                        )
                      }
                    }}
                    className="w-full border p-3 rounded-xl"
                  />

                  {uploading && (

                    <p className="mt-2 text-blue-600">
                      Uploading...
                    </p>

                  )}

                  {form.gambar && (

                    <img
                      src={
                        form.gambar
                      }
                      alt="preview"
                      className="w-48 mt-4 rounded-xl border"
                    />

                  )}

                </div>

                <select
                  value={
                    form.kategori
                  }
                  onChange={(
                    e
                  ) =>
                    setForm(
                      (
                        prev
                      ) => ({
                        ...prev,
                        kategori:
                          e
                            .target
                            .value,
                      })
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                >

                  {kategoriList.map(
                    (
                      k
                    ) => (

                      <option
                        key={
                          k
                        }
                        value={
                          k
                        }
                      >
                        {k}
                      </option>

                    )
                  )}

                </select>

                <select
                  value={
                    form.paket
                  }
                  onChange={(
                    e
                  ) =>
                    setForm(
                      (
                        prev
                      ) => ({
                        ...prev,
                        paket:
                          e
                            .target
                            .value,
                      })
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                >

                  <option value="">
                    Pilih
                    Paket
                  </option>

                  {paketList.map(
                    (
                      p
                    ) => (

                      <option
                        key={
                          p
                        }
                        value={
                          p
                        }
                      >
                        {p.toUpperCase()}
                      </option>

                    )
                  )}

                </select>

                <div>

                  <label className="font-semibold block mb-2">
                    Pengantar
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.pengantar ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          pengantar:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <div>

                  <label className="font-semibold block mb-2">
                    Bacaan
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.bacaan ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          bacaan:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <div>

                  <label className="font-semibold block mb-2">
                    Pertanyaan
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.pertanyaan ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          pertanyaan:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <div>

                  <label className="font-semibold block mb-2">
                    Opsi A
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.opsi_a ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          opsi_a:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <div>

                  <label className="font-semibold block mb-2">
                    Opsi B
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.opsi_b ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          opsi_b:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <div>

                  <label className="font-semibold block mb-2">
                    Opsi C
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.opsi_c ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          opsi_c:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <div>

                  <label className="font-semibold block mb-2">
                    Opsi D
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.opsi_d ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          opsi_d:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <div>

                  <label className="font-semibold block mb-2">
                    Opsi E
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.opsi_e ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          opsi_e:
                            value,
                        })
                      )
                    }
                  />

                </div>

                <select
                  value={
                    form.jawaban_benar
                  }
                  onChange={(
                    e
                  ) =>
                    setForm(
                      (
                        prev
                      ) => ({
                        ...prev,
                        jawaban_benar:
                          e
                            .target
                            .value,
                      })
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                >

                  <option value="a">
                    A
                  </option>

                  <option value="b">
                    B
                  </option>

                  <option value="c">
                    C
                  </option>

                  <option value="d">
                    D
                  </option>

                  <option value="e">
                    E
                  </option>

                </select>

                <div>

                  <label className="font-semibold block mb-2">
                    Pembahasan
                  </label>

                  <ReactQuill
                    theme="snow"
                    modules={
                      quillModules
                    }
                    value={
                      form.pembahasan ||
                      ""
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          prev
                        ) => ({
                          ...prev,
                          pembahasan:
                            value,
                        })
                      )
                    }
                  />

                </div>

              </div>

              <div className="flex justify-end gap-3 mt-8">

                <button
                  onClick={() =>
                    setShowModal(
                      false
                    )
                  }
                  className="border px-6 py-3 rounded-xl"
                >
                  Batal
                </button>

                <button
                  onClick={
                    handleSubmit
                  }
                  className="bg-blue-700 text-white px-6 py-3 rounded-xl"
                >
                  Simpan
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </MathJaxContext>
  )
}
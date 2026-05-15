"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type Hasil = {
  id: number
  skor: number
  tanggal: string
  user_id: string
  kategori: string
}

export default function ProfilePage() {

  const router = useRouter()

  const [loading, setLoading] =
    useState(true)

  const [uploading, setUploading] =
    useState(false)

  const [userId, setUserId] =
    useState("")

  const [nama, setNama] =
    useState("")

  const [email, setEmail] =
    useState("")

  const [foto, setFoto] =
    useState("")

  const [editNama, setEditNama] =
    useState("")

  const [hasil, setHasil] =
    useState<Hasil[]>([])

  const [totalUjian,
    setTotalUjian] =
    useState(0)

  const [skorTerbaik,
    setSkorTerbaik] =
    useState(0)

  const [skorTerakhir,
    setSkorTerakhir] =
    useState(0)

  const [rataRata,
    setRataRata] =
    useState(0)

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

    const user = data.user

    setUserId(user.id)

    setEmail(user.email || "")

    await getProfile(user.id)

    await getHasil(user.id)

    setLoading(false)
  }

  async function getProfile(
    id: string
  ) {

    const { data, error } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle()

    console.log("PROFILE:", data)

    console.log("PROFILE ERROR:", error)

    if (data) {

      setNama(data.nama || "")

      setEditNama(data.nama || "")

      setFoto(data.foto || "")
    }
  }

  async function saveNama() {

    if (!editNama) {

      alert("Nama wajib diisi")
      return
    }

    const { error } =
      await supabase
        .from("profiles")
        .update({
          nama: editNama
        })
        .eq("id", userId)

    if (error) {

      console.log(error)

      alert("Gagal update nama")
      return
    }

    setNama(editNama)

    alert("Nama berhasil diupdate")
  }

  async function uploadFoto(
    e: any
  ) {

    try {

      console.log("UPLOAD DIMULAI")

      setUploading(true)

      const file =
        e.target.files[0]

      console.log("FILE:", file)

      if (!file) {

        alert("File tidak ada")
        return
      }

      // VALIDASI
      if (
        file.size >
        2 * 1024 * 1024
      ) {

        alert("Ukuran max 2MB")
        return
      }

      const fileExt =
        file.name
          .split(".")
          .pop()

      const fileName =
        `${Date.now()}.${fileExt}`

      console.log("FILE NAME:", fileName)

      // UPLOAD STORAGE
      const {
        data: uploadData,
        error: uploadError
      } =
        await supabase.storage
          .from("foto-profile")
          .upload(
            fileName,
            file,
            {
              upsert: true
            }
          )

      console.log(
        "UPLOAD DATA:",
        uploadData
      )

      console.log(
        "UPLOAD ERROR:",
        uploadError
      )

      if (uploadError) {

        alert(
          uploadError.message
        )

        return
      }

      // GET URL
      const {
        data: urlData
      } =
        supabase.storage
          .from("foto-profile")
          .getPublicUrl(
            fileName
          )

      console.log(
        "URL DATA:",
        urlData
      )

      const imageUrl =
        urlData.publicUrl

      console.log(
        "IMAGE URL:",
        imageUrl
      )

      // SAVE DATABASE
      const {
        error: dbError
      } =
        await supabase
          .from("profiles")
          .update({
            foto: imageUrl
          })
          .eq("id", userId)

      console.log(
        "DB ERROR:",
        dbError
      )

      if (dbError) {

        alert(
          dbError.message
        )

        return
      }

      setFoto(imageUrl)

      await getProfile(userId)

      alert("Upload berhasil")

    } catch (err) {

      console.log(
        "CATCH ERROR:",
        err
      )

      alert("Terjadi error")

    } finally {

      setUploading(false)
    }
  }

  async function getHasil(
    id: string
  ) {

    const { data } =
      await supabase
        .from("hasil")
        .select("*")
        .eq("user_id", id)
        .order("tanggal", {
          ascending: false
        })

    const hasilData =
      (data || []) as Hasil[]

    setHasil(hasilData)

    const total =
      hasilData.length

    const terbaik =
      total > 0
        ? Math.max(
            ...hasilData.map(
              x => x.skor
            )
          )
        : 0

    const terakhir =
      total > 0
        ? hasilData[0].skor
        : 0

    const avg =
      total > 0
        ? Math.round(
            hasilData.reduce(
              (a, b) =>
                a + b.skor,
              0
            ) / total
          )
        : 0

    setTotalUjian(total)

    setSkorTerbaik(terbaik)

    setSkorTerakhir(terakhir)

    setRataRata(avg)
  }

  function getProgress() {

    if (rataRata >= 90)
      return "Sangat Baik 🔥"

    if (rataRata >= 75)
      return "Baik 👍"

    if (rataRata >= 60)
      return "Cukup 🙂"

    return "Perlu Latihan 📘"
  }

  if (loading) {

    return (

      <div className="
        min-h-screen
        flex items-center
        justify-center
        bg-[#f4f7fb]
      ">

        <div className="
          text-2xl
          font-bold
          text-blue-600
        ">
          Loading...
        </div>

      </div>
    )
  }

  return (

    <div className="
      min-h-screen
      bg-[#f4f7fb]
    ">

      {/* HEADER */}
      <div className="
        bg-[#1e3a8a]
        text-white
        px-6 py-5
        flex justify-between
        items-center
        shadow-md
      ">

        <div>

          <p className="
            text-sm
            text-blue-200
          ">
            LAMPUNG CERDAS
          </p>

          <h1 className="
            text-3xl
            font-bold
          ">
            Profile Akademik
          </h1>

        </div>

        <button
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
          className="
            bg-white
            text-blue-700
            px-5 py-2
            rounded-xl
            font-semibold
            hover:bg-blue-100
            transition
          "
        >
          ← Dashboard
        </button>

      </div>

      {/* CONTENT */}
      <div className="
        max-w-7xl
        mx-auto
        p-5 md:p-8
      ">

        {/* PROFILE CARD */}
        <div className="
          bg-white
          rounded-3xl
          shadow-sm
          p-6
          mb-6
        ">

          <div className="
            flex flex-col
            md:flex-row
            justify-between
            gap-6
          ">

            {/* LEFT */}
            <div className="
              flex items-center
              gap-5
            ">

              {/* FOTO */}
              <div className="
                relative
              ">

                {foto ? (

                  <img
                    src={foto}
                    alt="Foto"
                    className="
                      w-28 h-28
                      rounded-full
                      object-cover
                      border-4
                      border-blue-100
                    "
                  />

                ) : (

                  <div className="
                    w-28 h-28
                    rounded-full
                    bg-blue-600
                    text-white
                    flex items-center
                    justify-center
                    text-4xl
                    font-bold
                  ">
                    {nama
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                )}

                {/* UPLOAD */}
                <label
                  className="
                    absolute
                    bottom-0 right-0
                    w-10 h-10
                    rounded-full
                    bg-blue-600
                    text-white
                    flex items-center
                    justify-center
                    cursor-pointer
                    shadow-lg
                  "
                >

                  {uploading
                    ? "..."
                    : "📷"}

                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={
                      uploadFoto
                    }
                  />

                </label>

              </div>

              {/* INFO */}
              <div>

                <h2 className="
                  text-3xl
                  font-bold
                  text-gray-800
                ">
                  {nama}
                </h2>

                <p className="
                  text-gray-500
                  mt-1
                ">
                  {email}
                </p>

                <div className="
                  inline-block
                  mt-3
                  bg-blue-100
                  text-blue-700
                  px-4 py-2
                  rounded-full
                  text-sm
                  font-semibold
                ">
                  {getProgress()}
                </div>

              </div>

            </div>

            {/* RIGHT */}
            <div className="
              bg-[#f4f7fb]
              rounded-2xl
              p-5
              min-w-[220px]
            ">

              <p className="
                text-gray-500
                text-sm
              ">
                Status Akademik
              </p>

              <h3 className="
                text-2xl
                font-bold
                text-blue-700
                mt-2
              ">
                Aktif
              </h3>

              <p className="
                text-sm
                text-gray-500
                mt-3
              ">
                Bergabung sejak Mei 2026
              </p>

            </div>

          </div>

        </div>

        {/* STAT */}
        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-4
          gap-4
          mb-6
        ">

          <StatCard
            title="Total Ujian"
            value={totalUjian}
            icon="📝"
          />

          <StatCard
            title="Skor Terbaik"
            value={skorTerbaik}
            icon="🏆"
          />

          <StatCard
            title="Skor Terakhir"
            value={skorTerakhir}
            icon="📈"
          />

          <StatCard
            title="Rata-rata"
            value={rataRata}
            icon="🎯"
          />

        </div>

        {/* INFORMASI */}
        <div className="
          bg-white
          rounded-3xl
          shadow-sm
          p-6
          mb-6
        ">

          <h2 className="
            text-2xl
            font-bold
            text-gray-800
            mb-6
          ">
            Informasi Akun
          </h2>

          <div className="
            grid
            md:grid-cols-2
            gap-6
          ">

            {/* INPUT */}
            <div>

              <label className="
                text-sm
                text-gray-500
              ">
                Nama Lengkap
              </label>

              <input
                value={editNama}
                onChange={(e) =>
                  setEditNama(
                    e.target.value
                  )
                }
                className="
                  w-full
                  border
                  border-gray-200
                  rounded-2xl
                  p-4
                  mt-2
                  outline-none
                  focus:border-blue-500
                "
              />

              <button
                onClick={saveNama}
                className="
                  mt-4
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  px-5 py-3
                  rounded-2xl
                  font-semibold
                "
              >
                Simpan Perubahan
              </button>

            </div>

            {/* EMAIL */}
            <div>

              <label className="
                text-sm
                text-gray-500
              ">
                Email
              </label>

              <div className="
                bg-[#f4f7fb]
                rounded-2xl
                p-4
                mt-2
              ">
                {email}
              </div>

              <label className="
                text-sm
                text-gray-500
                mt-5
                block
              ">
                Status Belajar
              </label>

              <div className="
                bg-[#f4f7fb]
                rounded-2xl
                p-4
                mt-2
                text-blue-700
                font-semibold
              ">
                {getProgress()}
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

/* CARD */
function StatCard({
  title,
  value,
  icon
}: any) {

  return (

    <div className="
      bg-white
      rounded-3xl
      p-5
      shadow-sm
    ">

      <div className="
        flex justify-between
        items-center
      ">

        <div>

          <p className="
            text-gray-500
            text-sm
          ">
            {title}
          </p>

          <h2 className="
            text-4xl
            font-bold
            text-gray-800
            mt-2
          ">
            {value}
          </h2>

        </div>

        <div className="
          w-14 h-14
          rounded-2xl
          bg-blue-100
          flex items-center
          justify-center
          text-2xl
        ">
          {icon}
        </div>

      </div>

    </div>
  )
}
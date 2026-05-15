"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../../lib/supabase"
import { useParams, useRouter } from "next/navigation"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

export default function DetailSiswa() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [profile, setProfile] = useState<any>(null)
  const [hasil, setHasil] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  const [rata, setRata] = useState(0)
  const [tertinggi, setTertinggi] = useState(0)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    await getProfile()
    await getHasil()
  }

  // 🔥 ambil profile siswa
  async function getProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    setProfile(data)
  }

  // 🔥 ambil hasil ujian
  async function getHasil() {
    const { data } = await supabase
      .from("hasil")
      .select("*")
      .eq("user_id", userId)
      .order("tanggal", { ascending: true })

    if (!data) return

    setHasil(data)

    // 🔥 hitung statistik
    const total = data.reduce((sum, item) => sum + item.skor, 0)
    const avg = Math.round(total / data.length)

    const max = Math.max(...data.map((d) => d.skor))

    setRata(avg || 0)
    setTertinggi(max || 0)

    // 🔥 chart
    const chart = data.map((item) => ({
      tanggal: new Date(item.tanggal).toLocaleDateString(),
      skor: item.skor,
    }))

    setChartData(chart)
  }

  // 🔥 hitung nilai per mapel
  function nilaiPerMapel() {
    const map: any = {}

    hasil.forEach((item) => {
      if (!map[item.kategori]) {
        map[item.kategori] = []
      }
      map[item.kategori].push(item.skor)
    })

    return Object.keys(map).map((k) => ({
      kategori: k,
      rata: Math.round(
        map[k].reduce((a: number, b: number) => a + b, 0) /
          map[k].length
      ),
    }))
  }

  if (!profile) return <div className="p-10">Loading...</div>

  return (
    <div className="p-10">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">
          📊 Rapor Siswa
        </h1>

        <button
          onClick={() => router.back()}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Kembali
        </button>
      </div>

      {/* INFO SISWA */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">
        <h2 className="text-xl font-bold">
          {profile.email}
        </h2>

        <div className="grid md:grid-cols-3 gap-4 mt-4">

          <Stat title="Total Ujian" value={hasil.length} />
          <Stat title="Rata-rata" value={rata} />
          <Stat title="Tertinggi" value={tertinggi} />

        </div>
      </div>

      {/* CHART */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">
        <h2 className="font-bold mb-4">
          📈 Perkembangan Nilai
        </h2>

        <LineChart width={700} height={300} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tanggal" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="skor" stroke="#6366f1" />
        </LineChart>
      </div>

      {/* NILAI PER MAPEL */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">
        <h2 className="font-bold mb-4">
          📚 Nilai per Mapel
        </h2>

        {nilaiPerMapel().map((item, i) => (
          <div
            key={i}
            className="flex justify-between border-b py-2"
          >
            <p>{item.kategori}</p>
            <p className="font-bold">{item.rata}</p>
          </div>
        ))}
      </div>

      {/* RIWAYAT */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="font-bold mb-4">
          📝 Riwayat Ujian
        </h2>

        {hasil.map((item, i) => (
          <div
            key={i}
            className="border p-3 mb-2 rounded"
          >
            <p>
              <b>{item.kategori}</b> - {item.skor}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(item.tanggal).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ title, value }: any) {
  return (
    <div className="bg-indigo-500 text-white p-4 rounded-xl text-center">
      <p>{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  )
}
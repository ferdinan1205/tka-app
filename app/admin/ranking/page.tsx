"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

type Ranking = {
  user_id: string
  package_id: string
  email: string
  nama: string
  skor: number
  kategori: string
  foto?: string
}

type Package = {
  id: number
  nama_paket: string
}

// ── warna avatar berdasarkan inisial ──────────────────────────
const AVATAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-sky-100",    text: "text-sky-700"    },
  { bg: "bg-emerald-100",text: "text-emerald-700"},
  { bg: "bg-rose-100",   text: "text-rose-700"   },
  { bg: "bg-amber-100",  text: "text-amber-700"  },
  { bg: "bg-teal-100",   text: "text-teal-700"   },
  { bg: "bg-fuchsia-100",text: "text-fuchsia-700"},
  { bg: "bg-orange-100", text: "text-orange-700" },
]

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

export default function RankingAdmin() {

  const router = useRouter()

  const [ranking,         setRanking        ] = useState<Ranking[]>([])
  const [packages,        setPackages       ] = useState<Package[]>([])
  const [loading,         setLoading        ] = useState(true)
  const [search,          setSearch         ] = useState("")
  const [selectedPackage, setSelectedPackage] = useState<string>("all")

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", data.user.id).single()

    if (!profile || profile.role !== "admin") {
      alert("Akses ditolak")
      router.push("/dashboard")
      return
    }

    await getRanking()
    setLoading(false)
  }

  async function getRanking() {
    const { data: rankingData, error: rankingError } = await supabase
      .from("ranking_tka").select("*").eq("selesai", true)
      .order("total_skor", { ascending: false })

    if (rankingError) { console.log(rankingError); return }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles").select("*")

    if (profileError) { console.log(profileError); return }

    const { data: packagesData } = await supabase
      .from("packages").select("id, nama_paket").order("id", { ascending: true })

    const profiles    = (profileData  || []) as any[]
    const pkgs        = (packagesData || []) as Package[]
    setPackages(pkgs)

    const finalRanking = (rankingData || []).map((item: any) => {
      const user  = profiles.find((p) => p.id === item.user_id)
      const paket = pkgs.find((p) => String(p.id) === String(item.package_id))
      return {
        user_id:    item.user_id,
        package_id: String(item.package_id || ""),
        skor:       item.total_skor || 0,
        kategori:   paket?.nama_paket || user?.paket || "Paket",
        email:      user?.email || "-",
        nama:       user?.nama  || "Siswa",
        foto:       user?.foto  || "",
      }
    })

    setRanking(finalRanking)
  }

  const filtered = ranking
    .filter((item) =>
      selectedPackage === "all" ? true : item.package_id === selectedPackage
    )
    .filter((item) =>
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase())
    )

  const top1 = filtered[0]
  const top2 = filtered[1]
  const top3 = filtered[2]

  // ── loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memuat data ranking...</p>
        </div>
      </div>
    )
  }

  // ── main ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[3px] text-indigo-500 uppercase leading-none mb-0.5">
              Admin
            </p>
            <h1 className="text-[15px] font-semibold text-slate-800 leading-none">
              Ranking Siswa
            </h1>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="h-8 px-4 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* FILTER PAKET */}
        <div className="flex flex-wrap gap-2">
          <FilterBtn
            label="Semua paket"
            active={selectedPackage === "all"}
            onClick={() => setSelectedPackage("all")}
          />
          {packages.map((pkg) => (
            <FilterBtn
              key={pkg.id}
              label={pkg.nama_paket}
              active={selectedPackage === String(pkg.id)}
              onClick={() => setSelectedPackage(String(pkg.id))}
            />
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email siswa..."
            className="w-full h-10 rounded-xl bg-white border border-slate-200 px-4 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        </div>

        {/* SECTION LABEL */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-600">
            {selectedPackage === "all"
              ? "Semua paket — leaderboard gabungan"
              : packages.find((p) => String(p.id) === selectedPackage)?.nama_paket
            }
          </p>
          <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
            {filtered.length} siswa
          </span>
        </div>

        {/* PODIUM */}
        {filtered.length >= 1 && (
          <div className="grid grid-cols-3 gap-3 items-end">
            {top2 ? <PodiumCard data={top2} rank={2} /> : <div />}
            {top1 ? <PodiumCard data={top1} rank={1} /> : <div />}
            {top3 ? <PodiumCard data={top3} rank={3} /> : <div />}
          </div>
        )}

        {/* LIST */}
        <div className="flex flex-col gap-2">
          {filtered.map((item, index) => (
            <RankItem
              key={`${item.user_id}_${item.package_id}`}
              item={item}
              index={index}
              onClick={() => router.push(`/admin/siswa/${item.user_id}`)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-sm font-medium text-slate-700">Ranking belum tersedia</p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedPackage === "all"
                  ? "Data ranking siswa belum ada"
                  : "Belum ada siswa yang selesai di paket ini"}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── sub-components ────────────────────────────────────────────

function FilterBtn({
  label, active, onClick
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-4 rounded-full text-xs font-medium transition ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
      }`}
    >
      {label}
    </button>
  )
}

// ── PODIUM CARD ───────────────────────────────────────────────
const PODIUM_STYLE = {
  1: {
    wrap:   "border-amber-200 bg-white",
    badge:  "bg-amber-100 text-amber-700",
    score:  "text-amber-600",
    avatar: "border-amber-200",
  },
  2: {
    wrap:   "border-indigo-100 bg-white",
    badge:  "bg-indigo-100 text-indigo-600",
    score:  "text-indigo-600",
    avatar: "border-indigo-100",
  },
  3: {
    wrap:   "border-orange-100 bg-white",
    badge:  "bg-orange-100 text-orange-600",
    score:  "text-orange-600",
    avatar: "border-orange-100",
  },
} as const

function PodiumCard({ data, rank }: { data: Ranking; rank: 1 | 2 | 3 }) {
  const s       = PODIUM_STYLE[rank]
  const isFirst = rank === 1
  const color   = getAvatarColor(data.nama)

  return (
    <div className={`border rounded-2xl text-center transition ${s.wrap} ${isFirst ? "py-5 px-3" : "py-4 px-2"}`}>

      {isFirst && <div className="text-lg mb-2">👑</div>}

      {/* avatar */}
      {data.foto ? (
        <img
          src={data.foto}
          alt="foto"
          className={`rounded-full object-cover border-2 mx-auto mb-2 ${s.avatar} ${isFirst ? "w-14 h-14" : "w-11 h-11"}`}
        />
      ) : (
        <div className={`rounded-full flex items-center justify-center font-semibold mx-auto mb-2 border-2 ${s.avatar} ${color.bg} ${color.text} ${isFirst ? "w-14 h-14 text-sm" : "w-11 h-11 text-xs"}`}>
          {data.nama.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* rank badge */}
      <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full mb-1.5 ${s.badge}`}>
        #{rank}
      </span>

      {/* nama */}
      <p className={`font-semibold text-slate-800 truncate leading-tight ${isFirst ? "text-sm" : "text-xs"}`}>
        {data.nama}
      </p>
      {/* paket */}
      <p className="text-[10px] text-slate-400 truncate mt-0.5 mb-2 px-1">
        {data.kategori}
      </p>

      {/* skor */}
      <p className="text-[9px] text-slate-400 uppercase tracking-widest">Skor</p>
      <p className={`font-bold ${s.score} ${isFirst ? "text-2xl" : "text-lg"}`}>
        {data.skor}
      </p>
    </div>
  )
}

// ── RANK ITEM (list row) ──────────────────────────────────────
const RANK_NUM_STYLE: Record<number, string> = {
  0: "bg-amber-100  text-amber-700",
  1: "bg-indigo-100 text-indigo-600",
  2: "bg-orange-100 text-orange-600",
}

const RANK_SCORE_COLOR: Record<number, string> = {
  0: "text-amber-600",
  1: "text-indigo-600",
  2: "text-orange-600",
}

function RankItem({
  item, index, onClick
}: { item: Ranking; index: number; onClick: () => void }) {
  const color       = getAvatarColor(item.nama)
  const numStyle    = RANK_NUM_STYLE[index]    ?? "bg-slate-100 text-slate-500"
  const scoreColor  = RANK_SCORE_COLOR[index]  ?? "text-slate-700"

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition"
    >
      {/* rank number */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${numStyle}`}>
        #{index + 1}
      </div>

      {/* avatar */}
      {item.foto ? (
        <img
          src={item.foto}
          alt="foto"
          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
        />
      ) : (
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border border-slate-100 shrink-0 ${color.bg} ${color.text}`}>
          {item.nama.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{item.nama}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{item.email}</span>
          <span className="text-[10px] text-slate-500 bg-slate-100 rounded-full px-2 py-px shrink-0">
            {item.kategori}
          </span>
          {index === 0 && (
            <span className="text-[10px] text-amber-700 bg-amber-100 rounded-full px-2 py-px shrink-0">
              Top 1
            </span>
          )}
        </div>
      </div>

      {/* skor */}
      <div className="text-right shrink-0">
        <p className="text-[9px] font-medium tracking-widest text-slate-400 uppercase">Skor</p>
        <p className={`text-xl font-bold ${scoreColor}`}>{item.skor}</p>
      </div>
    </div>
  )
}
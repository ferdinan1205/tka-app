"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

/* ─────────────────────────────────────
   CSS ANIMATIONS — injected once
───────────────────────────────────── */
const GLOBAL_STYLES = `
  @keyframes lc-fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lc-pulseSlow {
    0%, 100% { opacity: .5; transform: scale(1); }
    50%       { opacity: .9; transform: scale(1.1); }
  }
  @keyframes lc-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes lc-spin {
    to { transform: rotate(360deg); }
  }
  .lc-fadeUp {
    animation: lc-fadeUp .5s cubic-bezier(.22,.61,.36,1) both;
  }
  .lc-pulseSlow {
    animation: lc-pulseSlow 7s ease-in-out infinite;
  }
  .lc-shimmer-gold {
    background: linear-gradient(90deg,#fbbf24,#f97316,#fbbf24);
    background-size: 200% auto;
    animation: lc-shimmer 3s linear infinite;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .lc-shimmer-silver {
    background: linear-gradient(90deg,#9ca3af,#e5e7eb,#9ca3af);
    background-size: 200% auto;
    animation: lc-shimmer 3s linear infinite;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .lc-shimmer-bronze {
    background: linear-gradient(90deg,#d97706,#f59e0b,#d97706);
    background-size: 200% auto;
    animation: lc-shimmer 3s linear infinite;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .lc-spin {
    animation: lc-spin 1s linear infinite;
  }
`

function GlobalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }}
    />
  )
}

/* ─────────────────────────────────────
   TYPES
───────────────────────────────────── */
type Ranking = {
  id: number
  user_id: string
  total_skor: number
  jumlah_ujian: number
  selesai: boolean
  nama: string
  email: string
  foto?: string
  paket?: string
}

type Profile = {
  id: string
  nama: string
  email: string
  foto?: string
  paket?: string
}

/* ─────────────────────────────────────
   HELPERS
───────────────────────────────────── */
function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

/* ─────────────────────────────────────
   AVATAR
───────────────────────────────────── */
type AvatarSize = "sm" | "md" | "lg" | "xl"

const avatarSize: Record<AvatarSize, { box: string; font: string }> = {
  sm:  { box: "w-9 h-9",   font: "text-xs" },
  md:  { box: "w-10 h-10", font: "text-sm" },
  lg:  { box: "w-16 h-16", font: "text-base" },
  xl:  { box: "w-20 h-20", font: "text-xl" },
}

function Avatar({
  foto, nama, size = "md", ring = false,
}: { foto?: string; nama: string; size?: AvatarSize; ring?: boolean }) {
  const { box, font } = avatarSize[size]
  const ringCls = ring ? "ring-[3px] ring-white/30 ring-offset-1 ring-offset-transparent" : ""

  if (foto) {
    return (
      <img
        src={foto}
        alt={nama}
        className={`${box} ${ringCls} rounded-full object-cover shrink-0`}
      />
    )
  }

  return (
    <div
      className={`
        ${box} ${font} ${ringCls}
        rounded-full shrink-0 flex items-center justify-center
        font-black bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white
      `}
    >
      {getInitials(nama)}
    </div>
  )
}

/* ─────────────────────────────────────
   FLOATING ORBS BACKGROUND
───────────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div
        className="lc-pulseSlow absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full"
        style={{ background: "rgba(109,40,217,.35)", filter: "blur(120px)" }}
      />
      <div
        className="lc-pulseSlow absolute top-1/3 -right-32 w-80 h-80 rounded-full"
        style={{
          background: "rgba(192,38,211,.2)",
          filter: "blur(100px)",
          animationDelay: "2s",
        }}
      />
      <div
        className="lc-pulseSlow absolute -bottom-32 left-1/3 w-72 h-72 rounded-full"
        style={{
          background: "rgba(67,56,202,.28)",
          filter: "blur(110px)",
          animationDelay: "4s",
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────
   PODIUM CARD
───────────────────────────────────── */
const PODIUM_CONFIG = {
  1: {
    badge: "linear-gradient(90deg,#fbbf24,#f59e0b,#f97316)",
    badgeText: "#1a1108",
    shimmerClass: "lc-shimmer-gold",
    label: "1st",
  },
  2: {
    badge: "linear-gradient(90deg,#9ca3af,#d1d5db,#6b7280)",
    badgeText: "#111827",
    shimmerClass: "lc-shimmer-silver",
    label: "2nd",
  },
  3: {
    badge: "linear-gradient(90deg,#b45309,#d97706,#92400e)",
    badgeText: "#1a0e00",
    shimmerClass: "lc-shimmer-bronze",
    label: "3rd",
  },
} as const

function PodiumCard({
  data,
  rank,
  isTop = false,
  delay,
}: {
  data: Ranking
  rank: 1 | 2 | 3
  isTop?: boolean
  delay: number
}) {
  const cfg = PODIUM_CONFIG[rank]

  return (
    <div
      className="lc-fadeUp flex flex-col items-center gap-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* rank badge */}
      <div
        className="text-[9px] font-black tracking-[3px] uppercase px-3 py-1 rounded-full shadow-lg"
        style={{ background: cfg.badge, color: cfg.badgeText }}
      >
        {cfg.label}
      </div>

      {/* card */}
      <div
        className={`
          relative w-full overflow-hidden rounded-3xl
          border border-white/20
          hover:scale-105 transition-transform duration-300
          ${isTop ? "py-7 px-3" : "py-5 px-2"}
        `}
        style={{
          background:
            "linear-gradient(180deg,rgba(255,255,255,.1) 0%,rgba(255,255,255,.04) 100%)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* shimmer overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,rgba(255,255,255,.12) 0%,transparent 55%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-2 text-center">
          <Avatar
            foto={data.foto}
            nama={data.nama}
            size={isTop ? "xl" : "lg"}
            ring
          />

          <div>
            <p
              className={`
                font-black text-white
                ${isTop ? "text-base" : "text-sm"}
                max-w-[100px] truncate
              `}
            >
              {data.nama}
            </p>
            <p className="text-[9px] text-white/40 max-w-[100px] truncate">
              {data.email}
            </p>
          </div>

          <p
            className={`font-black ${cfg.shimmerClass} ${isTop ? "text-5xl" : "text-3xl"}`}
          >
            {data.total_skor.toLocaleString()}
          </p>

          <p className="text-[8px] font-bold tracking-[3px] uppercase text-white/30">
            total skor
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   RANK ROW
───────────────────────────────────── */
const MEDAL = ["🥇", "🥈", "🥉"]

function RankRow({
  item,
  index,
  isMe,
  delay,
}: {
  item: Ranking
  index: number
  isMe: boolean
  delay: number
}) {
  const isTop = index < 3
  const pct = (item.jumlah_ujian / 4) * 100

  return (
    <div
      className="lc-fadeUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-2xl
          border backdrop-blur-sm
          transition-all duration-200 hover:bg-white/10
          ${isMe
            ? "border-violet-500/60 bg-violet-500/10"
            : "border-white/10 bg-white/5"
          }
        `}
      >
        {/* rank */}
        <div
          className={`
            w-8 h-8 shrink-0 rounded-xl flex items-center justify-center
            font-black text-[11px]
            ${isTop
              ? "bg-white/10 text-base"
              : "bg-white/5 text-white/35"
            }
          `}
        >
          {isTop ? MEDAL[index] : `#${index + 1}`}
        </div>

        {/* avatar */}
        <Avatar foto={item.foto} nama={item.nama} size="md" />

        {/* info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm truncate">
              {item.nama}
            </p>
            {isMe && (
              <span
                className="
                  shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold
                  bg-violet-500/25 text-violet-300 border border-violet-500/40
                "
              >
                Kamu
              </span>
            )}
          </div>

          {/* email — hidden on mobile */}
          <p className="hidden md:block text-[11px] text-white/35 truncate">
            {item.email}
          </p>

          {/* progress bar */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background:
                    "linear-gradient(90deg,#7c3aed,#d946ef)",
                }}
              />
            </div>
            <p className="text-[9px] font-semibold text-white/35">
              {item.jumlah_ujian}/4 ujian
            </p>
          </div>
        </div>

        {/* score */}
        <div className="text-right shrink-0">
          <p
            className={`
              font-black text-2xl md:text-3xl leading-none
              ${isMe ? "text-violet-300" : "text-white"}
            `}
          >
            {item.total_skor.toLocaleString()}
          </p>
          <p className="text-[8px] tracking-[2px] uppercase text-white/25 mt-0.5">
            skor
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   LOADING SCREEN
───────────────────────────────────── */
function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0e0b1a" }}
    >
      <GlobalStyles />
      <FloatingOrbs />
      <div className="flex flex-col items-center gap-4">
        <div
          className="lc-spin w-12 h-12 rounded-full"
          style={{
            border: "3px solid rgba(124,58,237,.3)",
            borderTopColor: "#7c3aed",
          }}
        />
        <p className="text-violet-400 font-bold text-xs tracking-[4px] uppercase">
          Memuat Ranking…
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   MAIN PAGE
───────────────────────────────────── */
export default function RankingPage() {
  const router = useRouter()
  const [ranking, setRanking] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")

  useEffect(() => {
    init()
  }, [])

  async function init() {
    setLoading(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push("/login")
      return
    }
    setUserId(data.user.id)
    await getRanking()
    setLoading(false)
  }

  async function getRanking() {
    const { data: rankingData, error: rankingError } = await supabase
      .from("ranking_tka")
      .select("*")
      .eq("selesai", true)
      .order("total_skor", { ascending: false })

    if (rankingError) {
      console.error(rankingError)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")

    if (profileError) {
      console.error(profileError)
      return
    }

    const profiles = (profileData as Profile[]) || []

    const finalRanking = (rankingData || []).map((item: any) => {
      const p = profiles.find((x) => x.id === item.user_id)
      return {
        id:           item.id,
        user_id:      item.user_id,
        total_skor:   item.total_skor   || 0,
        jumlah_ujian: item.jumlah_ujian || 0,
        selesai:      item.selesai,
        nama:         p?.nama  || "Tanpa Nama",
        email:        p?.email || "-",
        foto:         p?.foto  || "",
        paket:        p?.paket || "-",
      }
    })

    setRanking(finalRanking)
  }

  if (loading) return <LoadingScreen />

  /* podium: urutan tampil 2 | 1 | 3 */
  const top3 = ranking.slice(0, 3)
  const podiumSlots: Array<{
    data: Ranking; rank: 1 | 2 | 3; isTop?: boolean; delay: number
  }> = []
  if (top3[1]) podiumSlots.push({ data: top3[1], rank: 2, delay: 200 })
  if (top3[0]) podiumSlots.push({ data: top3[0], rank: 1, isTop: true, delay: 0 })
  if (top3[2]) podiumSlots.push({ data: top3[2], rank: 3, delay: 400 })

  return (
    <>
      <GlobalStyles />

      <div
        className="min-h-screen pb-24"
        style={{ background: "#0e0b1a", color: "#fff" }}
      >
        <FloatingOrbs />

        {/* ── HEADER ── */}
        <div
          className="sticky top-0 z-50 border-b border-white/10"
          style={{
            background: "rgba(14,11,26,.85)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black tracking-[5px] uppercase text-violet-400">
                Lampung Cerdas
              </p>
              <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
                Ranking TKA
              </h1>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="
                h-9 px-4 rounded-xl text-xs font-bold text-white
                transition-all duration-150 active:scale-95
              "
              style={{ background: "#7c3aed" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#6d28d9")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#7c3aed")
              }
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-3xl mx-auto px-4 pt-8 space-y-8">

          {/* peserta count */}
          <p
            className="lc-fadeUp text-center text-[10px] font-bold tracking-[4px] uppercase"
            style={{ color: "rgba(255,255,255,.25)" }}
          >
            {ranking.length} peserta terdaftar
          </p>

          {/* ── PODIUM ── */}
          {podiumSlots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
              {podiumSlots.map((p) => (
                <PodiumCard
                  key={p.rank}
                  data={p.data}
                  rank={p.rank}
                  isTop={p.isTop}
                  delay={p.delay}
                />
              ))}
            </div>
          )}

          {/* ── DIVIDER ── */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,.1)" }}
            />
            <span
              className="text-[9px] font-black tracking-[4px] uppercase"
              style={{ color: "rgba(255,255,255,.25)" }}
            >
              Semua Peserta
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,.1)" }}
            />
          </div>

          {/* ── FULL LIST ── */}
          <div className="space-y-2">
            {ranking.map((item, index) => (
              <RankRow
                key={item.id}
                item={item}
                index={index}
                isMe={item.user_id === userId}
                delay={index * 40}
              />
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
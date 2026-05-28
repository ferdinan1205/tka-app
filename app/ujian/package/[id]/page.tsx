"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../../lib/supabase"
import { useParams, useRouter } from "next/navigation"

/* ─────────────────────────────────────
   INJECTED ANIMATIONS
───────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');

  * { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes pk-fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pk-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pk-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pk-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes pk-pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(124,58,237,.35); }
    70%  { box-shadow: 0 0 0 12px rgba(124,58,237,0); }
    100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
  }
  @keyframes pk-slide-in {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes pk-badge-pop {
    0%   { transform: scale(0.8); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }

  .pk-fadeUp   { animation: pk-fadeUp  .45s cubic-bezier(.22,.61,.36,1) both; }
  .pk-fadeIn   { animation: pk-fadeIn  .35s ease both; }
  .pk-spin     { animation: pk-spin    .9s linear infinite; }
  .pk-float    { animation: pk-float   3s ease-in-out infinite; }
  .pk-slide-in { animation: pk-slide-in .4s cubic-bezier(.22,.61,.36,1) both; }
  .pk-badge-pop{ animation: pk-badge-pop .4s cubic-bezier(.34,1.56,.64,1) both; }

  .pk-card-hover {
    transition: transform .25s cubic-bezier(.22,.61,.36,1), box-shadow .25s ease;
  }
  .pk-card-hover:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(0,0,0,.12);
  }
  @media (max-width: 640px) {
    .pk-card-hover:hover { transform: none; box-shadow: none; }
    .pk-card-hover:active { transform: scale(.97); }
  }

  .pk-btn-press { transition: transform .15s ease, box-shadow .15s ease; }
  .pk-btn-press:hover  { transform: translateY(-2px); }
  .pk-btn-press:active { transform: scale(.96); }

  .pk-input-focus { transition: border-color .2s, box-shadow .2s; }
  .pk-input-focus:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 4px rgba(124,58,237,.15);
  }

  .pk-stagger > *:nth-child(1) { animation-delay:  0ms; }
  .pk-stagger > *:nth-child(2) { animation-delay: 60ms; }
  .pk-stagger > *:nth-child(3) { animation-delay:120ms; }
  .pk-stagger > *:nth-child(4) { animation-delay:180ms; }
  .pk-stagger > *:nth-child(5) { animation-delay:240ms; }
  .pk-stagger > *:nth-child(6) { animation-delay:300ms; }
  .pk-stagger > *:nth-child(7) { animation-delay:360ms; }
  .pk-stagger > *:nth-child(8) { animation-delay:420ms; }
`

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: STYLES }} />
}

/* ─────────────────────────────────────
   TYPES
───────────────────────────────────── */
type PackageType = {
  id: number
  nama_paket: string
  token: string
}
type SubjectType = {
  id: number
  package_id: number
  subject: string
}

/* ─────────────────────────────────────
   HELPER: deteksi kategori dasar paket
   "Paket ipa 2" → "Paket IPA"
───────────────────────────────────── */
function getBaseKategori(nama: string): string {
  const n = nama.toLowerCase()
  if (n.includes("ipa"))    return "Paket IPA"
  if (n.includes("ips"))    return "Paket IPS"
  if (n.includes("smk"))    return "Paket SMK"
  if (n.includes("bahasa")) return "Paket Bahasa"
  return nama
}

/* ─────────────────────────────────────
   DECORATIVE BLOBS
───────────────────────────────────── */
function Blobs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #ddd6fe, #a5f3fc)", filter: "blur(80px)" }} />
      <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #fde68a, #fbcfe8)", filter: "blur(90px)" }} />
      <div className="absolute -bottom-24 right-1/3 w-72 h-72 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, #bbf7d0, #a5f3fc)", filter: "blur(80px)" }} />
    </div>
  )
}

/* ─────────────────────────────────────
   LOADING
───────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      <GlobalStyles /><Blobs />
      <div className="pk-fadeIn flex flex-col items-center gap-5">
        <div className="pk-spin w-14 h-14 rounded-full"
          style={{ border: "3px solid #ede9fe", borderTopColor: "#7c3aed" }} />
        <div className="text-center">
          <p className="font-black text-violet-700 text-lg">Memuat Paket</p>
          <p className="text-sm text-slate-400 mt-1">Sebentar ya…</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   NOT FOUND
───────────────────────────────────── */
function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <GlobalStyles />
      <div className="pk-fadeUp bg-white rounded-[28px] shadow-xl p-8 text-center max-w-sm w-full border border-red-100">
        <div className="pk-float text-6xl mb-4">😢</div>
        <h1 className="text-2xl font-black text-red-600 mb-2">Paket Tidak Ditemukan</h1>
        <p className="text-slate-500 text-sm">Cek kembali link yang kamu gunakan</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   TOKEN PAGE
───────────────────────────────────── */
function TokenScreen({
  paket, token, setToken, onSubmit,
}: {
  paket: PackageType
  token: string
  setToken: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <GlobalStyles /><Blobs />
      <div className="pk-fadeUp w-full max-w-sm">
        <div className="bg-white rounded-[32px] shadow-2xl border border-violet-100 overflow-hidden">
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }} />
          <div className="p-7 md:p-8">
            <div className="pk-float w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>
              🔐
            </div>
            <div className="text-center mb-6">
              <p className="text-[10px] font-black tracking-[4px] text-violet-400 uppercase mb-1">Token Diperlukan</p>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">Masukkan Token</h1>
              <p className="text-sm text-slate-400 font-semibold">{paket.nama_paket}</p>
            </div>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Token paket ujian…"
              className="pk-input-focus w-full h-12 md:h-14 rounded-2xl border-2 border-slate-200 px-4 text-slate-800 font-bold text-sm bg-slate-50 mb-4"
            />
            <button onClick={onSubmit}
              className="pk-btn-press w-full h-12 md:h-14 rounded-2xl text-white font-black text-sm md:text-base shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>
              Masuk Paket →
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4 font-semibold">
          Token diberikan oleh pengawas ujian
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   SUBJECT CARD
───────────────────────────────────── */
const SUBJECT_COLORS = [
  { from: "#7c3aed", to: "#a855f7" },
  { from: "#0891b2", to: "#06b6d4" },
  { from: "#d97706", to: "#f59e0b" },
  { from: "#059669", to: "#10b981" },
  { from: "#db2777", to: "#ec4899" },
  { from: "#2563eb", to: "#60a5fa" },
]

function SubjectCard({
  item, index, locked, selected, loading, onClick,
}: {
  item: SubjectType
  index: number
  locked: boolean
  selected: boolean
  loading: boolean
  onClick: () => void
}) {
  const c = SUBJECT_COLORS[index % SUBJECT_COLORS.length]
  return (
    <button
      disabled={locked || loading}
      onClick={onClick}
      className={`
        pk-fadeUp pk-card-hover
        relative overflow-hidden w-full text-left rounded-3xl border-2
        transition-colors duration-200
        ${selected
          ? "border-transparent shadow-xl"
          : locked
          ? "border-slate-200 bg-slate-100 cursor-not-allowed opacity-60"
          : "border-white bg-white shadow-md hover:border-violet-200"
        }
      `}
      style={selected ? { background: `linear-gradient(135deg,${c.from},${c.to})` } : undefined}
    >
      <span className="absolute top-3 right-4 font-black text-5xl md:text-6xl select-none pointer-events-none"
        style={{ color: selected ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.05)" }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="p-4 md:p-6 flex items-center gap-4 md:block">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-3xl shrink-0 md:mb-4 shadow-md"
          style={
            selected ? { background: "rgba(255,255,255,.25)" }
            : locked  ? { background: "#e2e8f0" }
            : { background: `linear-gradient(135deg,${c.from},${c.to})` }
          }>
          {locked ? "🔒" : selected ? "✅" : "📘"}
        </div>
        <div className="flex-1 min-w-0 md:flex-none">
          <h2 className={`font-black text-base md:text-xl truncate ${selected ? "text-white" : "text-slate-800"}`}>
            {item.subject}
          </h2>
          {selected && (
            <span className="pk-badge-pop inline-block mt-1 md:mt-3 text-xs font-black px-3 py-1 rounded-full bg-white/25 text-white">
              ✅ Dipilih
            </span>
          )}
          {locked && (
            <span className="inline-block mt-1 md:mt-3 text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-600">
              🔒 Terkunci
            </span>
          )}
          {!selected && !locked && (
            <span className="hidden md:inline-block mt-3 text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: `${c.from}18`, color: c.from }}>
              Pilih →
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/* ─────────────────────────────────────
   SUBJECT SELECTION PAGE
───────────────────────────────────── */
function SubjectPage({
  paket, subjects, savedPendamping, selectedSubject, subjectLoading, onPilih,
}: {
  paket: PackageType
  subjects: SubjectType[]
  savedPendamping: string
  selectedSubject: string
  subjectLoading: boolean
  onPilih: (s: string) => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-cyan-50 p-3 md:p-6">
      <GlobalStyles /><Blobs />
      <div className="max-w-4xl mx-auto">
        <div className="pk-fadeUp relative overflow-hidden rounded-3xl p-5 md:p-10 mb-5 md:mb-8 shadow-xl"
          style={{ background: "linear-gradient(135deg,#4f46e5,#0891b2)" }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 bg-white" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full opacity-10 bg-white" />
          <div className="relative">
            <span className="inline-block text-[9px] md:text-[10px] font-black tracking-[5px] uppercase text-cyan-200 mb-2">
              Paket Pembelajaran
            </span>
            <h1 className="text-2xl md:text-5xl font-black text-white mb-1 md:mb-2 leading-tight">
              {paket.nama_paket}
            </h1>
            <p className="text-sm md:text-base text-white/70 font-semibold">
              Pilih 1 mata pelajaran pendamping untuk melanjutkan
            </p>
          </div>
        </div>

        <p className="pk-slide-in text-[10px] font-black tracking-[4px] uppercase text-slate-400 mb-3 md:mb-4 px-1">
          Mata Pelajaran Pendamping
        </p>

        <div className={`pk-stagger grid gap-3 md:gap-5 ${subjects.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {subjects.map((item, index) => {
            const locked   = !!(savedPendamping && savedPendamping !== item.subject)
            const selected = savedPendamping === item.subject || selectedSubject === item.subject
            return (
              <SubjectCard
                key={item.id} item={item} index={index}
                locked={locked} selected={selected}
                loading={subjectLoading} onClick={() => onPilih(item.subject)}
              />
            )
          })}
        </div>

        {subjectLoading && (
          <div className="pk-fadeIn flex items-center justify-center gap-2 mt-6 text-violet-600">
            <div className="pk-spin w-5 h-5 rounded-full border-2 border-violet-200 border-t-violet-600" />
            <span className="text-sm font-bold">Menyimpan pilihan…</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   EXAM CARD
───────────────────────────────────── */
const MAPEL_STYLE: Record<string, { from: string; to: string; icon: string }> = {
  Matematika:          { from: "#2563eb", to: "#06b6d4", icon: "📐" },
  "Bahasa Indonesia":  { from: "#ea580c", to: "#f59e0b", icon: "📖" },
  "Bahasa Inggris":    { from: "#059669", to: "#10b981", icon: "🌍" },
}
const DEFAULT_PENDAMPING = { from: "#7c3aed", to: "#d946ef", icon: "🎯" }

function ExamCard({
  nama, icon, colorFrom, colorTo, index, onStart, isCompleted, skor,
}: {
  nama: string; icon: string; colorFrom: string; colorTo: string; index: number; onStart: () => void; isCompleted: boolean; skor?: number
}) {
  return (
    <div
      className={`pk-fadeUp pk-card-hover relative overflow-hidden rounded-3xl border-2 shadow-md ${
        isCompleted ? "bg-slate-50 border-slate-200" : "bg-white border-white"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="absolute top-3 right-4 font-black text-6xl md:text-7xl select-none pointer-events-none"
        style={{ color: "rgba(0,0,0,.04)" }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl"
        style={{
          background: isCompleted
            ? "linear-gradient(180deg,#94a3b8,#cbd5e1)"
            : `linear-gradient(180deg,${colorFrom},${colorTo})`,
        }} />
      <div className="md:hidden h-1.5 w-full rounded-t-3xl"
        style={{
          background: isCompleted
            ? "linear-gradient(90deg,#94a3b8,#cbd5e1)"
            : `linear-gradient(90deg,${colorFrom},${colorTo})`,
        }} />
      <div className="p-4 md:p-6 md:pl-8 flex items-center gap-4 md:block">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-3xl shadow-lg shrink-0 md:mb-5"
          style={{
            background: isCompleted
              ? "linear-gradient(135deg,#94a3b8,#cbd5e1)"
              : `linear-gradient(135deg,${colorFrom},${colorTo})`,
          }}>
          {isCompleted ? "✅" : icon}
        </div>
        <div className="flex-1 min-w-0 md:flex-none md:mb-5">
          <p className="text-[9px] font-black tracking-[3px] uppercase text-slate-400 mb-0.5 hidden md:block">
            Mata Pelajaran
          </p>
          <h2 className="font-black text-slate-800 text-base md:text-xl truncate leading-tight">{nama}</h2>
          {isCompleted && (
            <span className="pk-badge-pop inline-block mt-1 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
              ✅ Selesai Dikerjakan
            </span>
          )}
        </div>
       {isCompleted ? (
          <div className="shrink-0 md:w-full flex flex-col gap-1.5">
            <div className="h-10 md:h-11 rounded-2xl bg-slate-200 text-slate-400 font-black text-xs md:text-sm flex items-center justify-center cursor-not-allowed select-none">
              <span className="hidden md:inline">Sudah Dikerjakan</span>
              <span className="md:hidden">Selesai</span>
            </div>
            {skor !== undefined && (
              <div className="h-9 md:h-10 rounded-2xl flex items-center justify-center gap-1.5 font-black text-xs md:text-sm"
                style={{ background: `${colorFrom}18`, color: colorFrom }}>
                🏆 Skor: {skor}
              </div>
            )}
          </div>
        ) : (
          <button onClick={onStart}
            className="pk-btn-press shrink-0 md:w-full h-10 md:h-12 px-4 md:px-0 rounded-2xl text-white font-black text-xs md:text-sm shadow-md"
            style={{ background: `linear-gradient(135deg,${colorFrom},${colorTo})` }}>
            <span className="hidden md:inline">Mulai Ujian →</span>
            <span className="md:hidden">Mulai →</span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   MAIN EXAM PAGE
───────────────────────────────────── */
function MainExamPage({
  paket, mapel, finalSelectedSubject, completedMapel, completedScores, onStart,
}: {
  paket: PackageType
  mapel: { nama: string; kategori: string; icon: string; color: { from: string; to: string } }[]
  finalSelectedSubject: string
  completedMapel: string[]
  completedScores: Record<string, number>
  onStart: (k: string) => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-cyan-50/50 p-3 md:p-6">
      <GlobalStyles /><Blobs />
      <div className="max-w-5xl mx-auto">
        <div className="pk-fadeUp flex items-start justify-between gap-3 mb-5 md:mb-8">
          <div>
            <span className="inline-block text-[9px] md:text-[10px] font-black tracking-[5px] uppercase text-violet-400 mb-1">
              Ujian TKA
            </span>
            <h1 className="text-2xl md:text-5xl font-black text-slate-800 leading-tight">
              {paket.nama_paket}
            </h1>
          </div>
          {finalSelectedSubject && (
            <div className="pk-badge-pop shrink-0 rounded-2xl px-4 py-2 md:px-6 md:py-4 text-right border border-violet-100 bg-white shadow-sm">
              <p className="text-[9px] font-black tracking-widest text-violet-400 uppercase mb-0.5">Pendamping</p>
              <p className="font-black text-violet-700 text-sm md:text-xl leading-tight">{finalSelectedSubject}</p>
            </div>
          )}
        </div>

        <div className="pk-slide-in flex items-center gap-2 mb-3 md:mb-5 px-1">
          <div className="flex items-center gap-1.5">
            {mapel.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all"
                style={{ width: i === 0 ? "28px" : "10px", background: i === 0 ? "linear-gradient(90deg,#7c3aed,#06b6d4)" : "#e2e8f0" }} />
            ))}
          </div>
          <p className="text-xs text-slate-400 font-bold">{mapel.length} ujian tersedia</p>
        </div>

        <p className="text-[10px] font-black tracking-[4px] uppercase text-slate-400 mb-3 md:mb-4 px-1">
          Pilih Ujian
        </p>

        <div className={`grid gap-3 md:gap-5 grid-cols-1 ${mapel.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
         {mapel.map((item, index) => (
            <ExamCard
              key={item.nama} nama={item.nama} icon={item.icon}
              colorFrom={item.color.from} colorTo={item.color.to}
              index={index} onStart={() => onStart(item.kategori)}
              isCompleted={completedMapel.includes(item.kategori)}
              skor={completedScores[item.kategori]}
            />
          ))}
        </div>

        <div className="pk-fadeIn mt-6 md:mt-8 flex items-center gap-2 bg-white/70 backdrop-blur rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
          <span className="text-base">💡</span>
          <p className="text-xs text-slate-500 font-semibold">
            Kerjakan satu per satu. Setiap ujian hanya dapat dikerjakan sekali.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   MAIN PAGE
───────────────────────────────────── */
export default function PackagePage() {
  const params    = useParams()
  const router    = useRouter()
  const packageId = parseInt(params.id as string)

  const [paket,           setPaket          ] = useState<PackageType | null>(null)
  const [subjects,        setSubjects       ] = useState<SubjectType[]>([])
  const [loading,         setLoading        ] = useState(true)
  const [allowed,         setAllowed        ] = useState(false)
  const [token,           setToken          ] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [savedPendamping, setSavedPendamping] = useState("")
  const [subjectLoading,  setSubjectLoading ] = useState(false)
    const [completedMapel,  setCompletedMapel ] = useState<string[]>([])
const [completedScores, setCompletedScores] = useState<Record<string, number>>({})

  // Pendamping berdasarkan kategori dasar paket
  const PENDAMPING_MAP: Record<string, string[]> = {
    "Paket IPA":    ["Fisika", "Kimia", "Biologi"],
    "Paket IPS":    ["Ekonomi", "Geografi", "Sosiologi"],
    "Paket SMK":    ["PPKN", "PKK"],
    "Paket Bahasa": ["Bahasa Jerman", "Bahasa Jepang", "Bahasa Arab"],
  }

  useEffect(() => {
    if (isNaN(packageId)) { setLoading(false); return }
    getData()
  }, [packageId])

  async function getData() {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      // Ambil data paket
      const { data: packageData, error: packageError } = await supabase
        .from("packages").select("*").eq("id", packageId).maybeSingle()
      if (packageError || !packageData) { setPaket(null); setLoading(false); return }
      setPaket(packageData)

      // ── Cek token tersimpan di localStorage per user per paket ──
      if (user) {
        const tokenKey = `pkg_token_${user.id}_${packageId}`
        const savedToken = localStorage.getItem(tokenKey)
        if (savedToken === "true") setAllowed(true)
      }

      // Ambil subjects dari DB
      const { data: subjectData } = await supabase
        .from("package_subjects").select("*").eq("package_id", packageId).order("id", { ascending: true })

      let loadedSubjects = subjectData || []

      // Fallback: kalau tidak ada di DB, pakai PENDAMPING_MAP berdasarkan kategori dasar
      if (loadedSubjects.length === 0) {
        const baseKategori = getBaseKategori(packageData.nama_paket)
        const matchedKey   = Object.keys(PENDAMPING_MAP).find(
          (k) => k.toLowerCase() === baseKategori.toLowerCase()
        )
        if (matchedKey) {
          loadedSubjects = PENDAMPING_MAP[matchedKey].map((s, i) => ({
            id: i + 1, package_id: packageId, subject: s,
          }))
        }
      }
      setSubjects(loadedSubjects)

      // Ambil pilihan pendamping user
      if (user) {
        const { data: pilihanData } = await supabase
          .from("pilihan_pendamping").select("*")
          .eq("user_id", user.id).eq("package_id", packageId).maybeSingle()
        if (pilihanData) setSavedPendamping(pilihanData.pilihan)

        // ← TAMBAH INI: fetch ujian yang sudah dikerjakan
        const { data: usedData } = await supabase
          .from("token_used")
          .select("kategori")
          .eq("user_id", user.id)
          .eq("package_id", packageId)
        if (usedData) setCompletedMapel(usedData.map((d: any) => d.kategori))
           const { data: hasilData } = await supabase
          .from("hasil")
          .select("kategori, skor")
          .eq("user_id", user.id)
          .eq("package_id", packageId)
        if (hasilData) {
          const scoresMap: Record<string, number> = {}
          hasilData.forEach((h: any) => { scoresMap[h.kategori] = h.skor })
          setCompletedScores(scoresMap)
        }
      }

      setLoading(false)
    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }

  // ── Simpan token ke localStorage setelah berhasil ──
  async function handleToken() {
    if (!paket) return
    if (token.trim() !== paket.token) { alert("Token salah"); return }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (user) {
      const tokenKey = `pkg_token_${user.id}_${packageId}`
      localStorage.setItem(tokenKey, "true")
    }

    setAllowed(true)
  }

  async function pilihPendamping(subject: string) {
    try {
      setSubjectLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) { alert("Harus login"); setSubjectLoading(false); return }
      if (savedPendamping && savedPendamping !== subject) {
        alert(`Kamu sudah memilih ${savedPendamping}`)
        setSubjectLoading(false)
        return
      }
      if (!savedPendamping) {
        const { error } = await supabase.from("pilihan_pendamping").insert([{
          user_id: user.id, package_id: packageId, pilihan: subject,
        }])
        if (error) { console.log(error); alert("Gagal memilih pendamping"); setSubjectLoading(false); return }
        setSavedPendamping(subject)
      }
      setSelectedSubject(subject)
      setSubjectLoading(false)
    } catch (err) {
      console.log(err)
      alert("Terjadi kesalahan")
      setSubjectLoading(false)
    }
  }

  // ── handleStartExam cek soal lewat package_soal, bukan langsung ke tabel soal ──
// ── handleStartExam cek soal lewat package_soal ──
async function handleStartExam(kategori: string) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) { alert("Harus login"); return }

    // Ambil soal_id dari package_soal dulu
    const { data: psData, error: psError } = await supabase
      .from("package_soal")
      .select("soal_id")
      .eq("package_id", packageId)

    console.log("PS DATA LENGTH:", psData?.length)

    if (psError || !psData || psData.length === 0) {
      alert("Belum ada soal pada paket ini")
      return
    }

    const soalIds = psData.map((x: any) => x.soal_id)

    // Filter soal berdasarkan kategori
    const { data: soalData, error: soalError } = await supabase
      .from("soal")
      .select("id, kategori")
      .in("id", soalIds)
      .eq("kategori", kategori)

    console.log("SOAL DATA LENGTH:", soalData?.length)
    console.log("SOAL ERROR:", soalError)

    if (soalError || !soalData || soalData.length === 0) {
      alert(`Soal ${kategori} belum ada di paket ini`)
      return
    }

    // Cek sudah dikerjakan
    const { data: usedData } = await supabase
      .from("token_used")
      .select("*")
      .eq("user_id", user.id)
      .eq("kategori", kategori)
      .eq("package_id", packageId)
      .maybeSingle()

    if (usedData) {
      alert(`${kategori} sudah dikerjakan`)
      return
    }

    router.push(
      `/ujian/${encodeURIComponent(kategori)}?paket=${encodeURIComponent(paket?.nama_paket || "")}&package_id=${packageId}`
    )
  } catch (err) {
    console.log(err)
    alert("Terjadi kesalahan")
  }
}
if (loading) return <LoadingScreen />
if (!paket) return <NotFoundScreen />

if (!allowed) {
  return (
    <TokenScreen
      paket={paket}
      token={token}
      setToken={setToken}
      onSubmit={handleToken}
    />
  )
}

const finalSelectedSubject =
  savedPendamping || selectedSubject

const mapelWajib = [
  {
    nama: "Matematika",
    kategori: "Matematika",
    icon: "📐",
    color: MAPEL_STYLE["Matematika"],
  },
  {
    nama: "Bahasa Indonesia",
    kategori: "Bahasa Indonesia",
    icon: "📖",
    color: MAPEL_STYLE["Bahasa Indonesia"],
  },
  {
    nama: "Bahasa Inggris",
    kategori: "Bahasa Inggris",
    icon: "🌍",
    color: MAPEL_STYLE["Bahasa Inggris"],
  },
]

const mapelPendamping =
  finalSelectedSubject
    ? [
        {
          nama: finalSelectedSubject,
          kategori: finalSelectedSubject,
          icon: DEFAULT_PENDAMPING.icon,
          color: {
            from: DEFAULT_PENDAMPING.from,
            to: DEFAULT_PENDAMPING.to,
          },
        },
      ]
    : []

const allMapel = [
  ...mapelWajib,
  ...mapelPendamping,
]

if (!finalSelectedSubject) {
  return (
    <SubjectPage
      paket={paket}
      subjects={subjects}
      savedPendamping={savedPendamping}
      selectedSubject={selectedSubject}
      subjectLoading={subjectLoading}
      onPilih={pilihPendamping}
    />
  )
}

return (
  <MainExamPage
    paket={paket}
    mapel={allMapel}
    finalSelectedSubject={finalSelectedSubject}
    completedMapel={completedMapel}
    completedScores={completedScores}
    onStart={handleStartExam}
  />
)
}
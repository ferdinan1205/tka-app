"use client"

import { Suspense, useEffect, useState, memo, useMemo } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { MathJax, MathJaxContext } from "better-react-mathjax"

/* ══════════════════════════════════════════════════════════
   Palet — konsisten dengan app/admin & app/guru
══════════════════════════════════════════════════════════ */
const palette = {
  navy: "#1B2A4A",
  navySoft: "#2C3F63",
  paper: "#F5F3EC",
  card: "#FFFFFF",
  border: "#E7E2D4",
  ink: "#242A38",
  inkSoft: "#6B7080",
  inkFaint: "#98A0B2",
  amber: "#D98C2B",
  amberSoft: "#FBEBD6",
  amberText: "#8A5412",
  teal: "#2F7A6D",
  tealSoft: "#E1F0EC",
  tealText: "#1F5548",
  danger: "#B3432E",
  dangerSoft: "#FBE7E2",
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.88); } 65% { transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes ringIn { from { stroke-dashoffset: var(--ring-full); } to { stroke-dashoffset: var(--ring-offset); } }

  .anim-slide-down { animation: slideDown 0.4s cubic-bezier(0.22,0.61,0.36,1) both; }
  .anim-fade-up    { animation: fadeUp 0.45s cubic-bezier(0.22,0.61,0.36,1) both; }
  .anim-pop-in     { animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
  .anim-spin       { animation: spin 0.9s linear infinite; }

  .stagger-1 { animation-delay: 0ms; }
  .stagger-2 { animation-delay: 60ms; }
  .stagger-3 { animation-delay: 120ms; }
  .stagger-4 { animation-delay: 180ms; }

  .card-item { animation: fadeUp 0.4s cubic-bezier(0.22,0.61,0.36,1) both; }

  .shimmer-text {
    background: linear-gradient(90deg, #fff 0%, #FBEBD6 40%, #fff 60%, #FBEBD6 100%);
    background-size: 200% auto;
    animation: shimmer 2.5s linear infinite;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .collapse-content { overflow: hidden; transition: max-height 0.38s cubic-bezier(0.22,0.61,0.36,1), opacity 0.3s ease; }
  .collapse-content.open   { max-height: 9999px; opacity: 1; }
  .collapse-content.closed { max-height: 0;      opacity: 0; }

  .prose-ai { line-height: 1.75; color: #242A38; }
  .prose-ai p  { margin: 0 0 0.55em; }
  .prose-ai h1 { font-size: 1em;    font-weight: 900; color: #1B2A4A; margin: 0.9em 0 0.35em; font-family: Georgia, serif; }
  .prose-ai h2 { font-size: 0.97em; font-weight: 900; color: #1B2A4A; margin: 0.9em 0 0.3em; font-family: Georgia, serif; }
  .prose-ai h3 { font-size: 0.93em; font-weight: 900; color: #2C3F63; margin: 0.8em 0 0.25em; }
  .prose-ai strong { font-weight: 900; color: #242A38; }
  .prose-ai em     { font-style: italic; color: #8A5412; }
  .prose-ai ul  { list-style: disc;    padding-left: 1.4em; margin: 0.3em 0 0.6em; }
  .prose-ai ol  { list-style: decimal; padding-left: 1.4em; margin: 0.3em 0 0.6em; }
  .prose-ai li  { margin: 0.15em 0; }
  .prose-ai code { background: #FBEBD6; color: #8A5412; padding: 1px 5px; border-radius: 5px; font-size: 0.88em; }
  .prose-ai blockquote { border-left: 3px solid #D98C2B; padding-left: 0.9em; color: #6B7080; margin: 0.5em 0; font-style: italic; }
  .prose-ai hr { border: none; border-top: 1px solid #E7E2D4; margin: 0.75em 0; }
  .prose-ai mjx-container { overflow-x: auto; max-width: 100%; }

  .prose-soal { line-height: 1.9; color: #242A38; }
  .prose-soal p, .prose-soal div { margin: 0 0 0.4em; }
  .prose-soal img { max-width: 100%; border-radius: 10px; margin: 0.5em 0; }
  .prose-soal mjx-container { overflow-x: auto; max-width: 100%; }

  .btn-press { transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease; }
  .btn-press:hover  { transform: translateY(-2px); }
  .btn-press:active { transform: scale(0.96); filter: brightness(0.96); }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }

  @media (max-width: 640px) {
    .btn-press:hover { transform: none; }
    .btn-press:active { transform: scale(0.96); }
  }
`

// =========================
// TYPES
// =========================
type DetailItem = {
  soal_id?: number | null
  soal: string
  gambar?: string | null
  jawaban_user: string
  jawaban_benar: string
  benar: boolean
  pembahasan?: string

  jawaban_user_text?: string
  jawaban_benar_text?: string
}
type HasilType = {
  id: number
  kategori: string
  skor: number
  detail: DetailItem[]
}

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    packages: { "[+]": ["ams"] },
  },
  options: { enableMenu: false, renderActions: { addMenu: [] } },
  chtml: { scale: 1, minScale: 0.5, matchFontHeight: false, mtextInheritFont: true },
}

function formatText(text: string) {
  if (!text) return ""
  let r = text
  r = r.replace(/&nbsp;/g, " ")
  r = r.replace(/<p>/gi, "<div>")
  r = r.replace(/<\/p>/gi, "</div>")
  r = r.replace(/<br\s*\/?>/gi, "<br/>")
  r = r.replace(/<table/gi, `<table class="w-full border-collapse my-2 text-sm overflow-auto block">`)
  r = r.replace(/<td/gi, `<td class="border border-slate-300 px-2 py-1 align-top break-words" `)
  r = r.replace(/<th/gi, `<th class="border border-slate-300 px-2 py-1 bg-slate-100 font-bold" `)
  r = r.replace(/<img/gi, `<img class="max-w-full h-auto rounded-xl my-3 border border-slate-200 shadow-sm" `)
  return r
}

// AI kadang balikin teks kayak "JAWABAN SISWA: A." lalu isinya "10°" di
// baris berikutnya, atau daftar opsi "A." / "10°" / "B." / "30°" per baris.
// Fungsi ini gabungin baris yang cuma berisi huruf opsi (atau label yang
// diakhiri huruf opsi) dengan baris konten setelahnya, biar jadi satu baris
// rapi: "JAWABAN SISWA: A. 10°" — bukan dua paragraf terpisah.
function mergeBareLetterLines(text: string): string {
  const lines = text.split("\n")
  const out: string[] = []
  const isBareLetter = (s: string) => /^[A-E]\.\*{0,2}$/.test(s)
  const isLabelEndingWithLetter = (s: string) => /:\s*\*{0,2}[A-E]\.\*{0,2}\s*$/.test(s)
  const isBlockedCandidate = (s: string) =>
    /^#{1,3}\s/.test(s) ||
    /^\d+\.\s/.test(s) ||
    stripBullet(s).bareOrLabel

  function stripBullet(s: string) {
    const m = s.match(/^([-*+]\s+)?(.*)$/)
    const prefix = m?.[1] || ""
    const rest = (m?.[2] || s).trim()
    const rest2 = rest.replace(/^\*{1,2}/, "").trim()
    return { prefix, rest: rest2, bareOrLabel: isBareLetter(rest2) || isLabelEndingWithLetter(rest2) }
  }

  let i = 0
  while (i < lines.length) {
    const { prefix, rest, bareOrLabel } = stripBullet(lines[i].trim())
    if (bareOrLabel) {
      // loncat lewatin baris kosong buat nyari baris isi berikutnya
      let j = i + 1
      while (j < lines.length && lines[j].trim() === "") j++
      const candidate = lines[j]?.trim() ?? ""
      if (candidate !== "" && !isBlockedCandidate(candidate)) {
        out.push(`${prefix}${rest} ${candidate}`)
        i = j + 1
        continue
      }
    }
    out.push(lines[i])
    i += 1
  }
  return out.join("\n")
}

function formatPembahasan(text: string): string {
  if (!text) return ""
  const blocks: string[] = []
  let safe = mergeBareLetterLines(text)
  for (const pat of [
    /\$\$[\s\S]+?\$\$/g,
    /\\\[[\s\S]+?\\\]/g,
    /\\\([\s\S]+?\\\)/g,
    /\$[^$\n]+?\$/g,
  ]) {
    safe = safe.replace(new RegExp(pat.source, pat.flags), (m) => {
      blocks.push(m)
      return `\x00M${blocks.length - 1}\x00`
    })
  }
  let html = safe
  html = html.replace(/^###\s+(.+)$/gm, `<h3>$1</h3>`)
  html = html.replace(/^##\s+(.+)$/gm,  `<h2>$1</h2>`)
  html = html.replace(/^#\s+(.+)$/gm,   `<h1>$1</h1>`)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, `<strong><em>$1</em></strong>`)
  html = html.replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`)
  html = html.replace(/\*(.+?)\*/g,     `<em>$1</em>`)
  html = html.replace(/`([^`]+)`/g,     `<code>$1</code>`)
  html = html.replace(/^---+$/gm,       `<hr/>`)
  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, `<li>$1</li>`)
  html = html.replace(/(<li[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, `<li>$1</li>`)
  html = html.replace(/^>\s*(.+)$/gm,   `<blockquote>$1</blockquote>`)
  html = html.replace(/^(?!<[a-zA-Z\/\x00]|$)(.+)$/gm, `<p>$1</p>`)
  html = html.replace(/\x00M(\d+)\x00/g, (_, i) => blocks[Number(i)])
  return html
}

function extractImages(html: string) {
  if (!html) return []
  const re = /<img[^>]+src="([^">]+)"/g
  const imgs: string[] = []
  let m
  while ((m = re.exec(html)) !== null) imgs.push(m[1])
  return imgs
}

// Bersihkan tag HTML & spasi berlebih dari sebuah teks, dipakai untuk
// mencocokkan soal hasil ujian dengan baris di tabel "soal" (dipakai
// hanya sebagai FALLBACK kalau soal_id tidak tersedia di data lama).
function cleanHtml(text?: string | null) {
  if (!text) return ""
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildOpsiMap(soalData: any): Record<string, string> {
  return {
    a: cleanHtml(soalData.opsi_a),
    b: cleanHtml(soalData.opsi_b),
    c: cleanHtml(soalData.opsi_c),
    d: cleanHtml(soalData.opsi_d),
    e: cleanHtml(soalData.opsi_e),
  }
}

function buildAnswerTexts(item: DetailItem, opsiMap: Record<string, string>) {
  const hurufUser = (item.jawaban_user || "").toLowerCase().trim()
  const hurufBenar = (item.jawaban_benar || "").toLowerCase().trim()
  const isValidHuruf = (h: string) => ["a", "b", "c", "d", "e"].includes(h)

  return {
    jawaban_user_text: isValidHuruf(hurufUser)
      ? `${hurufUser.toUpperCase()}. ${opsiMap[hurufUser] || item.jawaban_user}`
      : "Tidak dijawab",
    jawaban_benar_text: isValidHuruf(hurufBenar)
      ? `${hurufBenar.toUpperCase()}. ${opsiMap[hurufBenar] || item.jawaban_benar}`
      : item.jawaban_benar,
  }
}

// Ambil semua soal dari Supabase sekali, lalu tempelkan teks jawaban
// lengkap (huruf + isi opsi) ke setiap item detail hasil ujian.
//
// Prioritas pencocokan:
//   1) soal_id (akurat 100%, dipakai untuk data ujian baru setelah patch ini)
//   2) fallback cocokkan teks pertanyaan (dipakai HANYA untuk data lama yang
//      belum punya soal_id tersimpan)
async function enrichDetailWithAnswerText(hasil: HasilType): Promise<HasilType> {
  try {
    if (!hasil.detail || hasil.detail.length === 0) return hasil

    const { data: soalList, error: soalError } = await supabase
      .from("soal")
      .select(`id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, opsi_e`)

    if (!soalList || soalError) return hasil

    const soalById = new Map(soalList.map((s) => [s.id, s]))

    const updatedDetail = hasil.detail.map((item) => {
      // sudah ada teks lengkap, gak usah dicari ulang
      if (item.jawaban_user_text && item.jawaban_benar_text) return item

      // 1) Coba lewat soal_id dulu (akurat, tahan terhadap soal yang diedit ulang)
      let soalData: any = item.soal_id ? soalById.get(item.soal_id) : null

      // 2) Fallback ke pencocokan teks kalau soal_id belum ada (data lama)
      if (!soalData) {
        const soalBersih = cleanHtml(item.soal)
        soalData = soalList.find((s) => {
          const dbSoal = cleanHtml(s.pertanyaan)
          return dbSoal.slice(0, 150).toLowerCase() === soalBersih.slice(0, 150).toLowerCase()
        })
      }

      if (!soalData) return item

      const opsiMap = buildOpsiMap(soalData)
      return { ...item, ...buildAnswerTexts(item, opsiMap) }
    })

    return { ...hasil, detail: updatedDetail }
  } catch (err) {
    console.error("Error enriching answer texts:", err)
    return hasil
  }
}

const MathContent = memo(({ html, className = "" }: { html: string; className?: string }) => {
  const fmt = useMemo(() => formatText(html), [html])
  return (
    <div className={`overflow-x-auto break-words whitespace-normal ${className}`}>
      <MathJax dynamic>
        <div dangerouslySetInnerHTML={{ __html: fmt }} />
      </MathJax>
    </div>
  )
})
MathContent.displayName = "MathContent"

const PembahasanAI = memo(({ text }: { text: string }) => {
  const html = useMemo(() => formatPembahasan(text), [text])
  return (
    <div className="overflow-x-auto break-words">
      <MathJax dynamic>
        <div className="prose-ai text-[13px] md:text-[14px]" dangerouslySetInnerHTML={{ __html: html }} />
      </MathJax>
    </div>
  )
})
PembahasanAI.displayName = "PembahasanAI"

/* ── Signature element: ring progress akurasi ── */
function AccuracyRing({ value, color, size = 112, stroke = 10 }: { value: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(Math.max(value, 0), 100) / 100) * c
  return (
    <div className="relative anim-pop-in shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          style={{
            ["--ring-full" as any]: c,
            ["--ring-offset" as any]: offset,
            animation: "ringIn 1.1s cubic-bezier(0.22,0.61,0.36,1) both",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p style={{ fontFamily: "Georgia, serif", color }} className="text-2xl font-black leading-none">{value}%</p>
        <p style={{ color: palette.inkFaint }} className="text-[8px] font-bold uppercase tracking-widest mt-1">Akurasi</p>
      </div>
    </div>
  )
}

function StatChip({ icon, label, value, color, delay }: { icon: string; label: string; value: string | number; color: string; delay: string }) {
  return (
    <div
      className="anim-fade-up flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{ background: palette.paper, border: `1px solid ${palette.border}`, animationDelay: delay }}
    >
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0">
        <p style={{ color: palette.inkFaint }} className="text-[8px] font-bold uppercase tracking-widest leading-none">{label}</p>
        <p style={{ color, fontFamily: "Georgia, serif" }} className="text-base font-black leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function ReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data,      setData]      = useState<HasilType | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [aiLoading, setAiLoading] = useState<number | null>(null)
  const [expanded,  setExpanded]  = useState<number[]>([])

  // Ambil parameter dari URL dengan default value
  const kategoriParam = searchParams?.get('kategori') || null
  const packageIdParam = searchParams?.get('package_id') || null

  useEffect(() => { 
    getLastResult() 
  }, [kategoriParam, packageIdParam])

  async function getLastResult() {
    try {
      setLoading(true)
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData?.user) { 
        router.push("/login")
        return 
      }
      
      let query = supabase
        .from("hasil")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("id", { ascending: false })
      
      // Filter berdasarkan kategori jika ada
      if (kategoriParam && kategoriParam !== "") {
        query = query.eq("kategori", kategoriParam)
      }
      
      // Filter berdasarkan package_id jika ada
      if (packageIdParam && packageIdParam !== "") {
        query = query.eq("package_id", parseInt(packageIdParam))
      }
      
      const { data: resultData, error } = await query.limit(1).maybeSingle()
      
      if (error || !resultData) {
        // Fallback: ambil hasil terakhir tanpa filter
        const { data: fallbackData } = await supabase
          .from("hasil")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (fallbackData) {
          const enriched = await enrichDetailWithAnswerText(fallbackData)
          setData(enriched)
          return
        }
        
        setData(null)
        return
      }
      
      const enriched = await enrichDetailWithAnswerText(resultData)
      setData(enriched)
    } catch (err) {
      console.error("Error in getLastResult:", err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  async function generateAI(index: number, item: DetailItem) {
    try {
      setAiLoading(index)
      const images = extractImages(item.soal)
      const gambarUrl = item.gambar && item.gambar.trim() !== "" ? item.gambar : null

      // Bersihkan HTML dari soal untuk pencarian
      const soalBersih = cleanHtml(item.soal)

      const { data: soalList, error: soalError } = await supabase
        .from("soal")
        .select(`
          id,
          pertanyaan,
          opsi_a,
          opsi_b,
          opsi_c,
          opsi_d,
          opsi_e
        `)

      let soalData = null

      if (soalList && !soalError) {
        // Prioritas: cocokkan lewat soal_id (akurat), fallback ke teks
        soalData = item.soal_id
          ? soalList.find((s) => s.id === item.soal_id)
          : null

        if (!soalData) {
          soalData = soalList.find((s) => {
            const dbSoal = cleanHtml(s.pertanyaan)
            return dbSoal.slice(0, 150).toLowerCase() === soalBersih.slice(0, 150).toLowerCase()
          })
        }
      }
      
      // Format opsi untuk dikirim ke AI
      let opsiText = null
      if (soalData) {
        opsiText = `
A. ${soalData.opsi_a || ""}
B. ${soalData.opsi_b || ""}
C. ${soalData.opsi_c || ""}
D. ${soalData.opsi_d || ""}
E. ${soalData.opsi_e || ""}
        `.trim()
      }
      
      // Siapkan teks jawaban user dan jawaban benar yang lebih informatif
      let jawabanUserText = item.jawaban_user_text || item.jawaban_user
      let jawabanBenarText = item.jawaban_benar_text || item.jawaban_benar
      
      if (soalData && opsiText) {
        const opsiMap: Record<string, string> = {
          a: cleanHtml(soalData.opsi_a),
          b: cleanHtml(soalData.opsi_b),
          c: cleanHtml(soalData.opsi_c),
          d: cleanHtml(soalData.opsi_d),
          e: cleanHtml(soalData.opsi_e),
        }
        
        const hurufUser = (item.jawaban_user || "").toLowerCase().trim()
        const hurufBenar = (item.jawaban_benar || "").toLowerCase().trim()
        const isValidHuruf = (h: string) => ["a", "b", "c", "d", "e"].includes(h)

        jawabanUserText = isValidHuruf(hurufUser)
          ? `${hurufUser.toUpperCase()}. ${opsiMap[hurufUser] || item.jawaban_user}`
          : "Tidak dijawab"
        jawabanBenarText = isValidHuruf(hurufBenar)
          ? `${hurufBenar.toUpperCase()}. ${opsiMap[hurufBenar] || item.jawaban_benar}`
          : item.jawaban_benar
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soal: item.soal,
          jawaban_user_huruf: item.jawaban_user,
          jawaban_benar_huruf: item.jawaban_benar,
          jawaban_user: jawabanUserText,
          jawaban_benar: jawabanBenarText,
          images: gambarUrl ? [...images, gambarUrl] : images,
          opsi: opsiText,
          opsi_raw: soalData ? {
            a: soalData.opsi_a,
            b: soalData.opsi_b,
            c: soalData.opsi_c,
            d: soalData.opsi_d,
            e: soalData.opsi_e,
          } : null,
        }),
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const result = await res.json()
      if (!result?.text) { 
        alert("Pembahasan AI gagal dibuat")
        return 
      }
      
      if (!data) return
      const updated = [...data.detail]
      updated[index] = {
        ...updated[index],
        pembahasan: result.text,
        jawaban_user_text: jawabanUserText,
        jawaban_benar_text: jawabanBenarText,
      }
      setData({ ...data, detail: updated })
      setExpanded((prev) => [...prev, index])
    } catch (err) {
      console.error("Error in generateAI:", err)
      alert("Gagal generate AI: " + (err as Error).message)
    } finally {
      setAiLoading(null)
    }
  }

  function toggleExpand(index: number) {
    setExpanded((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: palette.navy }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="flex flex-col items-center gap-3">
          <div className="anim-spin w-10 h-10 rounded-full border-[3px] border-white/20" style={{ borderTopColor: palette.amber }} />
          <p className="text-white font-black text-xs tracking-widest uppercase opacity-70">Memuat…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: palette.paper }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="anim-pop-in bg-white rounded-3xl shadow-xl p-8 text-center max-w-xs w-full mx-4" style={{ border: `1px solid ${palette.border}` }}>
          <div className="text-4xl mb-3">📭</div>
          <p className="font-black" style={{ color: palette.ink }}>Belum ada hasil ujian</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-press mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: palette.navy }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!data.detail || data.detail.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: palette.paper }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="bg-white rounded-2xl p-8 text-center" style={{ border: `1px solid ${palette.border}` }}>
          <p style={{ color: palette.ink }}>Data detail soal tidak tersedia</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-press mt-4 px-4 py-2 rounded-xl text-white"
            style={{ background: palette.navy }}
          >
            Kembali
          </button>
        </div>
      </div>
    )
  }

  const benar = data.detail.filter((d) => d.benar).length
  const salah = data.detail.length - benar
  const akurasi = Math.round((benar / data.detail.length) * 100)
  const accColor = akurasi >= 75 ? palette.teal : akurasi >= 50 ? palette.amber : palette.danger

  return (
    <MathJaxContext config={mathJaxConfig}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="min-h-screen pb-10" style={{ background: palette.paper }}>

        {/* HEADER — tanpa sidebar, sticky di atas */}
        <div
          className="sticky top-0 z-50 anim-slide-down relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.navySoft} 100%)`, boxShadow: "0 4px 24px rgba(27,42,74,0.25)" }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: "linear-gradient(rgba(217,140,43,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(217,140,43,.08) 1px,transparent 1px)",
              backgroundSize: "28px 28px",
            }} />
          <div className="relative max-w-3xl mx-auto px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p style={{ color: "#AEB8CC", letterSpacing: "3px" }} className="text-[8px] md:text-[10px] font-black uppercase">Hasil Ujian</p>
              <h1 className="text-sm md:text-xl font-black text-white truncate leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                {data.kategori || "Ujian"}
              </h1>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-press shrink-0 h-8 md:h-9 px-3 md:px-4 rounded-xl text-[11px] md:text-xs font-black"
              style={{ background: palette.amber, color: "#40260A" }}
            >
              ← Dashboard
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-3 md:space-y-5">

          {/* HERO SKOR — ring akurasi + stat chip */}
          <div
            className="anim-fade-up bg-white rounded-3xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-4 md:gap-6"
            style={{ border: `1px solid ${palette.border}` }}
          >
            <AccuracyRing value={akurasi} color={accColor} />
            <div className="flex-1 w-full grid grid-cols-3 gap-2 md:gap-3">
              <StatChip icon="🏆" label="Skor" value={data.skor || 0} color={palette.navy} delay="0ms" />
              <StatChip icon="✓" label="Benar" value={benar} color={palette.tealText} delay="60ms" />
              <StatChip icon="✕" label="Salah" value={salah} color={palette.danger} delay="120ms" />
            </div>
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: palette.border }} />
            <p style={{ color: palette.inkFaint, letterSpacing: "3px" }} className="text-[8px] md:text-[9px] font-black uppercase whitespace-nowrap">
              {data.detail.length} Soal Dikerjakan
            </p>
            <div className="flex-1 h-px" style={{ background: palette.border }} />
          </div>

          {/* SOAL LIST */}
          <div className="space-y-2.5 md:space-y-3">
            {data.detail.map((item, i) => {
              const isExp = expanded.includes(i)
              return (
                <div
                  key={i}
                  className="card-item bg-white rounded-2xl overflow-hidden shadow-sm"
                  style={{ border: `1px solid ${palette.border}`, animationDelay: `${Math.min(i * 25, 300)}ms` }}
                >

                  {/* SOAL HEADER */}
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 md:px-4 md:py-3"
                    style={{ background: palette.paper, borderBottom: `1px solid ${palette.border}` }}
                  >
                    <div
                      className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center font-black text-[12px] md:text-xs text-white shrink-0"
                      style={{ background: palette.navy, fontFamily: "Georgia, serif" }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: palette.inkFaint }} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none">Soal</p>
                      <p style={{ color: palette.ink }} className="text-[11px] md:text-xs font-black">Review Jawaban</p>
                    </div>
                    <div
                      className="shrink-0 px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black"
                      style={item.benar ? { background: palette.tealSoft, color: palette.tealText } : { background: palette.dangerSoft, color: palette.danger }}
                    >
                      {item.benar ? "✔ Benar" : "✖ Salah"}
                    </div>
                  </div>

                  {/* SOAL BODY */}
                  <div className="p-3 md:p-4 space-y-2.5 md:space-y-3">

                    {/* PERTANYAAN */}
                    <div className="rounded-xl px-3 py-2.5 md:px-4 md:py-3" style={{ background: palette.paper, border: `1px solid ${palette.border}` }}>
                      <p style={{ color: palette.inkFaint }} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-1">Pertanyaan</p>
                      <MathContent
                        html={item.soal}
                        className="prose-soal text-[12px] md:text-[14px] leading-relaxed"
                      />
                    </div>

                    {/* GAMBAR SOAL */}
                    {item.gambar && item.gambar.trim() !== "" && (
                      <div className="rounded-xl px-3 py-2.5 md:px-4 md:py-3" style={{ background: palette.paper, border: `1px solid ${palette.border}` }}>
                        <p style={{ color: palette.inkFaint }} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-2">
                          Gambar Soal
                        </p>
                        <img
                          src={item.gambar}
                          alt="Gambar soal"
                          className="max-w-full h-auto rounded-xl shadow-sm max-h-[300px] object-contain"
                          style={{ border: `1px solid ${palette.border}` }}
                        />
                      </div>
                    )}

                    {/* JAWABAN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
                      <div className="rounded-xl p-3" style={{ background: palette.paper, border: `1px solid ${palette.border}` }}>
                        <p style={{ color: palette.inkFaint }} className="text-[9px] font-black uppercase tracking-wide mb-2">
                          Jawaban Kamu
                        </p>
                        <MathJax dynamic>
                          <div
                            className="text-base md:text-lg font-medium break-words"
                            style={{ color: palette.ink }}
                            dangerouslySetInnerHTML={{
                              __html: formatText(
                                item.jawaban_user_text ||
                                item.jawaban_user ||
                                "—"
                              ),
                            }}
                          />
                        </MathJax>
                      </div>

                      <div className="rounded-xl p-3" style={{ background: palette.tealSoft, border: `1px solid ${palette.teal}33` }}>
                        <p style={{ color: palette.tealText }} className="text-[9px] font-black uppercase tracking-wide mb-2">
                          Jawaban Benar
                        </p>
                        <MathJax dynamic>
                          <div
                            className="text-base md:text-lg font-medium break-words"
                            style={{ color: palette.tealText }}
                            dangerouslySetInnerHTML={{
                              __html: formatText(
                                item.jawaban_benar_text ||
                                item.jawaban_benar ||
                                "—"
                              ),
                            }}
                          />
                        </MathJax>
                      </div>
                    </div>

                    {/* AI */}
                    {!item.pembahasan ? (
                      <button
                        onClick={() => generateAI(i, item)}
                        disabled={aiLoading === i}
                        className="btn-press w-full h-9 md:h-11 rounded-xl text-white text-[11px] md:text-sm font-black disabled:opacity-60"
                        style={{
                          background: aiLoading === i ? "linear-gradient(135deg,#94a3b8,#64748b)" : `linear-gradient(135deg, ${palette.navy}, ${palette.amber})`,
                          boxShadow: aiLoading === i ? "none" : "0 4px 16px rgba(27,42,74,0.25)",
                        }}
                      >
                        {aiLoading === i ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="anim-spin inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white" />
                            <span>AI sedang membuat pembahasan…</span>
                          </span>
                        ) : (
                          <span className="shimmer-text font-black">✨ Generate Pembahasan AI</span>
                        )}
                      </button>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${palette.amber}55` }}>
                        {/* ACCORDION HEADER */}
                        <button
                          onClick={() => toggleExpand(i)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 md:px-4 md:py-3 text-left transition-colors"
                          style={{ background: palette.amberSoft }}
                        >
                          <div
                            className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-sm shrink-0 text-white"
                            style={{ background: palette.navy }}
                          >
                            📘
                          </div>
                          <div className="flex-1">
                            <p style={{ color: palette.amberText }} className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">Pembahasan AI</p>
                            <p style={{ color: palette.navy }} className="text-[11px] md:text-xs font-black">{isExp ? "Sembunyikan penjelasan" : "Lihat penjelasan lengkap"}</p>
                          </div>
                          <div
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-transform duration-300"
                            style={{ background: "rgba(27,42,74,0.1)", color: palette.navy, transform: isExp ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            ↓
                          </div>
                        </button>

                        {/* COLLAPSE */}
                        <div className={`collapse-content ${isExp ? "open" : "closed"}`}>
                          <div className="px-3 py-3 md:px-5 md:py-4 bg-white">
                            <PembahasanAI text={item.pembahasan!} />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </MathJaxContext>
  )
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: palette.navy }}>
          <style dangerouslySetInnerHTML={{ __html: STYLES }} />
          <div className="anim-spin w-10 h-10 rounded-full border-[3px] border-white/20" style={{ borderTopColor: palette.amber }} />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  )
}
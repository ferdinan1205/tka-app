"use client"

import { useEffect, useState, memo, useMemo } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import { MathJax, MathJaxContext } from "better-react-mathjax"

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.88); } 65% { transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes barGrow { from { width: 0; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }

  .anim-slide-down { animation: slideDown 0.4s cubic-bezier(0.22,0.61,0.36,1) both; }
  .anim-fade-up    { animation: fadeUp 0.45s cubic-bezier(0.22,0.61,0.36,1) both; }
  .anim-pop-in     { animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
  .anim-spin       { animation: spin 0.9s linear infinite; }
  .anim-pulse      { animation: pulse 1.8s ease infinite; }
  .anim-float      { animation: float 3s ease-in-out infinite; }

  .stagger-1 { animation-delay: 0ms; }
  .stagger-2 { animation-delay: 60ms; }
  .stagger-3 { animation-delay: 120ms; }
  .stagger-4 { animation-delay: 180ms; }

  .card-item { animation: fadeUp 0.4s cubic-bezier(0.22,0.61,0.36,1) both; }

  .shimmer-text {
    background: linear-gradient(90deg, #fff 0%, #bfdbfe 40%, #fff 60%, #bfdbfe 100%);
    background-size: 200% auto;
    animation: shimmer 2.5s linear infinite;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .collapse-content { overflow: hidden; transition: max-height 0.38s cubic-bezier(0.22,0.61,0.36,1), opacity 0.3s ease; }
  .collapse-content.open   { max-height: 9999px; opacity: 1; }
  .collapse-content.closed { max-height: 0;      opacity: 0; }

  .acc-bar { animation: barGrow 1s cubic-bezier(0.22,0.61,0.36,1) both; }

  .prose-ai { line-height: 1.9; color: #1e293b; }
  .prose-ai p  { margin: 0 0 0.7em; }
  .prose-ai h1 { font-size: 1em;    font-weight: 900; color: #1e40af; margin: 1em 0 0.4em; }
  .prose-ai h2 { font-size: 0.97em; font-weight: 900; color: #1e40af; margin: 1em 0 0.35em; }
  .prose-ai h3 { font-size: 0.93em; font-weight: 900; color: #1d4ed8; margin: 0.9em 0 0.3em; }
  .prose-ai strong { font-weight: 900; color: #1e293b; }
  .prose-ai em     { font-style: italic; color: #2563eb; }
  .prose-ai ul  { list-style: disc;    padding-left: 1.4em; margin: 0.4em 0 0.7em; }
  .prose-ai ol  { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0 0.7em; }
  .prose-ai li  { margin: 0.25em 0; }
  .prose-ai code { background: #eff6ff; color: #1d4ed8; padding: 1px 5px; border-radius: 5px; font-size: 0.88em; }
  .prose-ai blockquote { border-left: 3px solid #93c5fd; padding-left: 0.9em; color: #475569; margin: 0.5em 0; font-style: italic; }
  .prose-ai hr { border: none; border-top: 1px solid #e2e8f0; margin: 0.75em 0; }
  .prose-ai mjx-container { overflow-x: auto; max-width: 100%; }

  .prose-soal { line-height: 1.9; color: #0f172a; }
  .prose-soal p, .prose-soal div { margin: 0 0 0.4em; }
  .prose-soal img { max-width: 100%; border-radius: 10px; margin: 0.5em 0; }
  .prose-soal mjx-container { overflow-x: auto; max-width: 100%; }

  .btn-press { transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease; }
  .btn-press:hover  { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(29,78,216,0.25); }
  .btn-press:active { transform: scale(0.96); filter: brightness(0.95); }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }

  @media (max-width: 640px) {
    .btn-press:hover { transform: none; box-shadow: none; }
    .btn-press:active { transform: scale(0.96); }
  }
`

// =========================
// TYPES
// =========================
type DetailItem = {
  soal: string
  gambar?: string | null   // ← PATCH: field gambar dari submit ujian
  jawaban_user: string
  jawaban_benar: string
  benar: boolean
  pembahasan?: string
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

function formatPembahasan(text: string): string {
  if (!text) return ""
  const blocks: string[] = []
  let safe = text
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

function StatCard({ label, value, icon, gradient, textColor, delay }: { label: string; value: string | number; icon: string; gradient: string; textColor: string; delay: string }) {
  return (
    <div className="anim-pop-in rounded-2xl p-2.5 md:p-4 flex flex-col items-center gap-1 border border-white/60 shadow-sm" style={{ background: gradient, animationDelay: delay }}>
      <span className="text-base md:text-2xl anim-float" style={{ animationDelay: delay }}>{icon}</span>
      <p className={`font-black text-xl md:text-3xl leading-none ${textColor}`}>{value}</p>
      <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  )
}

export default function Review() {
  const router = useRouter()
  const [data,      setData]      = useState<HasilType | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [aiLoading, setAiLoading] = useState<number | null>(null)
  const [expanded,  setExpanded]  = useState<number[]>([])

  useEffect(() => { getLastResult() }, [])

  async function getLastResult() {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push("/login"); return }
      const { data, error } = await supabase
        .from("hasil").select("*")
        .eq("user_id", userData.user.id)
        .order("id", { ascending: false })
        .limit(1).single()
      if (error) { console.error(error); return }
      setData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

async function generateAI(index: number, item: DetailItem) {
  try {
    setAiLoading(index)
    const images = extractImages(item.soal)
    const gambarUrl = item.gambar && item.gambar.trim() !== "" ? item.gambar : null

    // Ambil opsi dari tabel soal berdasarkan konten pertanyaan
    // Cari soal yang cocok dari Supabase
    const soalBersih = item.soal.replace(/<[^>]*>/g, "").trim().slice(0, 100)
    const { data: soalData } = await supabase
      .from("soal")
      .select("opsi_a, opsi_b, opsi_c, opsi_d, opsi_e")
      .ilike("pertanyaan", `%${soalBersih.slice(0, 50)}%`)
      .limit(1)
      .maybeSingle()

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        soal: item.soal,
        jawaban_benar: item.jawaban_benar,
        images: gambarUrl ? [...images, gambarUrl] : images,
        opsi: soalData ? {
          a: soalData.opsi_a,
          b: soalData.opsi_b,
          c: soalData.opsi_c,
          d: soalData.opsi_d,
          e: soalData.opsi_e,
        } : null,
      }),
    })
    const result = await res.json()
    if (!result?.text) { alert("Pembahasan AI gagal dibuat"); return }
    if (!data) return
    const updated = [...data.detail]
    updated[index] = { ...updated[index], pembahasan: result.text }
    setData({ ...data, detail: updated })
    setExpanded((prev) => [...prev, index])
  } catch (err) {
    console.error(err)
    alert("Gagal generate AI")
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8,#0ea5e9)" }}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="flex flex-col items-center gap-3">
          <div className="anim-spin w-10 h-10 rounded-full border-[3px] border-white/30 border-t-white" />
          <p className="text-white font-black text-xs tracking-widest uppercase opacity-80">Memuat…</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        <div className="anim-pop-in bg-white rounded-3xl shadow-xl p-8 text-center max-w-xs w-full mx-4">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-black text-slate-700">Belum ada hasil ujian</p>
        </div>
      </div>
    )
  }

  const benar   = data.detail.filter((d) => d.benar).length
  const salah   = data.detail.length - benar
  const akurasi = Math.round((benar / data.detail.length) * 100)
  const accColor = akurasi >= 75 ? "#16a34a" : akurasi >= 50 ? "#d97706" : "#dc2626"

  return (
    <MathJaxContext config={mathJaxConfig}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="min-h-screen pb-10" style={{ background: "linear-gradient(160deg,#f0f4ff 0%,#e8f0fe 50%,#f0fdf4 100%)" }}>

        {/* HEADER */}
        <div
          className="sticky top-0 z-50 anim-slide-down border-b"
          style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#0ea5e9 100%)", borderColor: "rgba(255,255,255,0.15)", boxShadow: "0 4px 24px rgba(29,78,216,0.3)" }}
        >
          <div className="max-w-3xl mx-auto px-3 py-2 md:px-5 md:py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[3px] text-blue-200">Hasil Ujian</p>
              <h1 className="text-sm md:text-xl font-black text-white truncate leading-tight">{data.kategori}</h1>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-press shrink-0 h-8 md:h-9 px-3 md:px-4 rounded-xl text-blue-700 text-[11px] md:text-xs font-black"
              style={{ background: "rgba(255,255,255,0.95)" }}
            >
              ← Dashboard
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-2.5 md:px-5 py-3 md:py-5 space-y-2.5 md:space-y-4">

          {/* STATS */}
          <div className="grid grid-cols-4 gap-1.5 md:gap-3">
            <StatCard label="Skor"    value={data.skor}    icon="🏆" gradient="linear-gradient(135deg,#dbeafe,#eff6ff)" textColor="text-blue-700"   delay="0ms"   />
            <StatCard label="Benar"   value={benar}         icon="✅" gradient="linear-gradient(135deg,#dcfce7,#f0fdf4)" textColor="text-green-700"  delay="60ms"  />
            <StatCard label="Salah"   value={salah}         icon="❌" gradient="linear-gradient(135deg,#fee2e2,#fff1f2)" textColor="text-red-600"    delay="120ms" />
            <StatCard label="Akurasi" value={`${akurasi}%`} icon="📊" gradient="linear-gradient(135deg,#fef9c3,#fefce8)" textColor="text-yellow-600" delay="180ms" />
          </div>

          {/* ACCURACY BAR */}
          <div className="anim-fade-up bg-white rounded-2xl px-3 py-2.5 md:px-5 md:py-4 border border-slate-100 shadow-sm" style={{ animationDelay: "220ms" }}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Akurasi</p>
              <p className="font-black text-sm md:text-base" style={{ color: accColor }}>{akurasi}%</p>
            </div>
            <div className="h-1.5 md:h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="acc-bar h-full rounded-full" style={{ width: `${akurasi}%`, background: `linear-gradient(90deg,${accColor},${accColor}88)` }} />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-[9px] text-green-600 font-bold">{benar} benar</p>
              <p className="text-[9px] text-red-500 font-bold">{salah} salah</p>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200" />
            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[3px] text-slate-400">{data.detail.length} Soal</p>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* SOAL LIST */}
          <div className="space-y-2 md:space-y-3">
            {data.detail.map((item, i) => {
              const isExp = expanded.includes(i)
              return (
                <div key={i} className="card-item bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}>

                  {/* SOAL HEADER */}
                  <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 border-b border-slate-100" style={{ background: "linear-gradient(135deg,#f8faff,#f0f4ff)" }}>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center font-black text-[11px] md:text-xs text-white shrink-0" style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)" }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Soal</p>
                      <p className="text-[11px] md:text-xs font-black text-slate-700">Review Jawaban</p>
                    </div>
                    <div className={`shrink-0 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-black border ${item.benar ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                      {item.benar ? "✔ Benar" : "✖ Salah"}
                    </div>
                  </div>

                  {/* SOAL BODY */}
                  <div className="p-2.5 md:p-4 space-y-2 md:space-y-3">

                    {/* PERTANYAAN */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:px-4 md:py-3">
                      <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Pertanyaan</p>
                      <MathContent
                        html={item.soal}
                        className="prose-soal text-[12px] md:text-[14px] leading-relaxed"
                      />
                    </div>

                    {/* ← PATCH: GAMBAR SOAL */}
                    {item.gambar && item.gambar.trim() !== "" && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:px-4 md:py-3">
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Gambar Soal
                        </p>
                        <img
                          src={item.gambar}
                          alt="Gambar soal"
                          className="max-w-full h-auto rounded-xl border border-slate-100 shadow-sm max-h-[300px] object-contain"
                        />
                      </div>
                    )}

                    {/* JAWABAN */}
                    <div className="grid grid-cols-2 gap-1.5 md:gap-3">
                      <div className="rounded-xl p-2 md:p-3 border border-slate-200 bg-slate-50">
                        <p className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-wide mb-0.5">Jawaban Kamu</p>
                        <p className="font-black text-base md:text-xl text-slate-600">{item.jawaban_user || "—"}</p>
                      </div>
                      <div className="rounded-xl p-2 md:p-3 border border-green-200 bg-green-50">
                        <p className="text-[8px] md:text-[9px] text-green-600 font-black uppercase tracking-wide mb-0.5">Jawaban Benar</p>
                        <p className="font-black text-base md:text-xl text-green-700">{item.jawaban_benar}</p>
                      </div>
                    </div>

                    {/* AI */}
                    {!item.pembahasan ? (
                      <button
                        onClick={() => generateAI(i, item)}
                        disabled={aiLoading === i}
                        className="btn-press w-full h-9 md:h-11 rounded-xl text-white text-[11px] md:text-sm font-black disabled:opacity-60"
                        style={{
                          background: aiLoading === i ? "linear-gradient(135deg,#94a3b8,#64748b)" : "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                          boxShadow: aiLoading === i ? "none" : "0 4px 16px rgba(29,78,216,0.3)",
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
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#bfdbfe" }}>
                        {/* ACCORDION HEADER */}
                        <button
                          onClick={() => toggleExpand(i)}
                          className="w-full flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 text-left transition-colors"
                          style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)" }}
                        >
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)" }}>
                            📘
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-400">Pembahasan AI</p>
                            <p className="text-[11px] md:text-xs font-black text-blue-900">{isExp ? "Sembunyikan penjelasan" : "Lihat penjelasan lengkap"}</p>
                          </div>
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-transform duration-300" style={{ background: "rgba(29,78,216,0.1)", color: "#1d4ed8", transform: isExp ? "rotate(180deg)" : "rotate(0deg)" }}>
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
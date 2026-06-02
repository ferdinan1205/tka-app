  "use client"

  import { useEffect, useMemo, useRef, useState } from "react"
  import dynamic from "next/dynamic"
  import { useRouter } from "next/navigation"
  import { supabase } from "../../../lib/supabase"
  import * as XLSX from "xlsx"
  import { MathJaxContext } from "better-react-mathjax"
  import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
  import type { DropResult } from "@hello-pangea/dnd"
  import "react-quill-new/dist/quill.snow.css"

  const quillStyle = `
    .ql-container { min-height: 120px; font-size: 15px; }
    .ql-editor { min-height: 120px; max-height: 320px; overflow-y: auto; line-height: 1.8; color: #111110 !important; font-size: 15px; }
    .ql-editor p { color: #111110 !important; }
    .ql-editor.ql-blank::before { color: #999894; font-style: normal; font-size: 14px; }
    .ql-toolbar { border-bottom: 1px solid #D3D1C7 !important; background: #F5F4F0; }
    .ql-container.ql-snow { border: none !important; }
    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #D3D1C7 !important; }
    .ql-toolbar .ql-stroke { stroke: #444441 !important; }
    .ql-toolbar .ql-fill { fill: #444441 !important; }
    .ql-toolbar .ql-picker { color: #444441 !important; }
    .ql-toolbar button:hover .ql-stroke { stroke: #26215C !important; }
    .ql-toolbar button:hover .ql-fill { fill: #26215C !important; }
    .ql-toolbar .ql-active .ql-stroke { stroke: #534AB7 !important; }
    .ql-toolbar .ql-active .ql-fill { fill: #534AB7 !important; }
  `

  const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

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
    package_ids?: number[]
  }

  type Package = {
    id: number
    nama_paket: string
  }

  const mathJaxConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      processEscapes: true,
      processEnvironments: true,
    },
    chtml: { scale: 1, minScale: 0.5, matchFontHeight: false, adaptiveCSS: false },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      renderActions: { addMenu: [] },
    },
    startup: { typeset: false },
  }

  const kategoriList = [
    "Matematika", "Bahasa Indonesia", "Bahasa Inggris",
    "Fisika", "Kimia", "Biologi", "Ekonomi", "Geografi",
    "Sosiologi", "Sejarah", "Antropologi", "Bahasa Arab",
    "Bahasa Mandarin", "Bahasa Jepang", "Bahasa Korea",
    "Bahasa Jerman", "Bahasa Prancis", "PPKN", "PKK", "TPS", "Literasi",
  ]

  const CARD_ACCENTS = ["#7F77DD", "#1D9E75", "#D85A30", "#D4537E", "#BA7517", "#378ADD"]

  function hasMath(text = "") {
    return (
      text.includes("$") || text.includes("\\(") || text.includes("\\[") ||
      text.includes("\\frac") || text.includes("\\sqrt") || text.includes("\\times") ||
      text.includes("\\ce{") || text.includes("\\text{") ||
      text.includes("^{") || text.includes("_{") ||
      /\^\d/.test(text) || /\_\d/.test(text)
    )
  }

  function cleanHtml(html = "") {
    return html
      .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/<p><br\s*\/?><\/p>/gi, "<br/>")
      .replace(/<p>/gi, "").replace(/<\/p>/gi, "<br/>")
      .replace(/<span[^>]*><\/span>/gi, "")
      .trim().replace(/(<br\s*\/?>\s*)+$/gi, "")
  }

  function normalizeContent(content = "") {
    if (!content) return ""
    if (/<[a-z][\s\S]*>/i.test(content)) return cleanHtml(content)
    return content.split("\n").map((l) => l.trim()).join("<br/>")
  }

  function MathContent({ html, className = "" }: { html: string; className?: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const normalized = useMemo(() => normalizeContent(html), [html])
    const isMath = useMemo(() => hasMath(normalized), [normalized])

    useEffect(() => {
      if (!isMath || !ref.current) return
      ref.current.innerHTML = normalized
      const win = window as any
      if (win.MathJax?.typesetPromise) {
        win.MathJax.typesetPromise([ref.current]).catch(() => {})
      }
    }, [normalized, isMath])

    if (!isMath) {
      return <div className={`leading-7 text-[#2C2C2A] ${className}`} dangerouslySetInnerHTML={{ __html: normalized }} />
    }
    return <div ref={ref} className={`leading-7 text-[#2C2C2A] ${className}`} dangerouslySetInnerHTML={{ __html: normalized }} />
  }

  function MathPreview({ html }: { html: string }) {
    const [debouncedHtml, setDebouncedHtml] = useState(html)
    useEffect(() => {
      const id = setTimeout(() => setDebouncedHtml(html), 400)
      return () => clearTimeout(id)
    }, [html])
    const normalized = useMemo(() => normalizeContent(debouncedHtml), [debouncedHtml])
    if (!normalized) return null
    return (
      <div className="mt-2 p-3 bg-[#EEEDFE] border border-[#AFA9EC] rounded-xl text-sm">
        <div className="text-xs text-[#534AB7] mb-1 font-bold">Preview:</div>
        <MathContent html={debouncedHtml} />
      </div>
    )
  }

  function stripHtml(html = "") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .trim()
  }

  function paketBadgeClass(nama: string) {
    const n = nama.toLowerCase()
    if (n.includes("ipa"))    return "bg-[#EAF3DE] text-[#27500A]"
    if (n.includes("ips"))    return "bg-[#FAEEDA] text-[#633806]"
    if (n.includes("smk"))    return "bg-[#FAECE7] text-[#712B13]"
    if (n.includes("bahasa")) return "bg-[#FBEAF0] text-[#72243E]"
    return "bg-[#EEEDFE] text-[#3C3489]"
  }

  export default function AdminSoal() {
    const router = useRouter()

    const quillModules = useMemo(() => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ script: "sub" }, { script: "super" }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }], ["blockquote"], ["link", "image"], ["clean"],
      ],
    }), [])

    const [soal,             setSoal            ] = useState<Soal[]>([])
    const [packages,         setPackages        ] = useState<Package[]>([])
    const [soalPackageMap,   setSoalPackageMap  ] = useState<Record<number, string[]>>({})
    const [selectedKategori, setSelectedKategori] = useState("Semua")
    const [selectedPaketId,  setSelectedPaketId ] = useState<number | null>(null)
    const [showModal,        setShowModal       ] = useState(false)
    const [search,           setSearch          ] = useState("")
    const [loading,          setLoading         ] = useState(false)
    const [uploading,        setUploading       ] = useState(false)
    const [saving,           setSaving          ] = useState(false)
    const [showPreview,      setShowPreview     ] = useState<Record<string, boolean>>({})
    const [exportingPdf,     setExportingPdf    ] = useState(false)
    const [paketSoalIds,     setPaketSoalIds    ] = useState<number[]>([])

    const [form, setForm] = useState<Soal>({
      pertanyaan: "", opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
      jawaban_benar: "a", kategori: "Matematika", paket: "",
      pembahasan: "", video_url: "", gambar: "", pengantar: "", bacaan: "",
      package_ids: [],
    })

    useEffect(() => { init() }, [])

    async function init() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push("/login"); return }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()
      if (!profile || profile.role !== "admin") { alert("Akses ditolak!"); router.push("/dashboard"); return }
      await Promise.all([getSoal(), getPackages()])
    }

    async function getSoal() {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("soal").select("*").order("id", { ascending: true })
        if (error) { console.log(error); return }
        setSoal((data || []) as Soal[])

        // Load semua relasi package_soal + nama paket sekaligus
        const { data: pkgSoal } = await supabase
          .from("package_soal")
          .select("soal_id, package_id, packages(nama_paket)")

        const map: Record<number, string[]> = {}
        for (const row of pkgSoal || []) {
          const sid = row.soal_id as number
          const nama = (row.packages as any)?.nama_paket || ""
          if (!map[sid]) map[sid] = []
          if (nama && !map[sid].includes(nama)) map[sid].push(nama)
        }
        setSoalPackageMap(map)
      } finally { setLoading(false) }
    }

async function getPackages() {
  const { data } = await supabase
    .from("packages")
    .select("id, nama_paket")

  const sorted = (data || []).sort((a, b) =>
    a.nama_paket.localeCompare(b.nama_paket, "id", { numeric: true, sensitivity: "base" })
  )
  setPackages(sorted as Package[])
}

    async function getPackageIdsForSoal(soalId: number): Promise<number[]> {
      const { data } = await supabase
        .from("package_soal").select("package_id").eq("soal_id", soalId)
      return (data || []).map((d: any) => d.package_id)
    }

    // Gabungkan soal dari package_soal (relasi baru) + field paket lama
    useEffect(() => {
      if (!selectedPaketId) { setPaketSoalIds([]); return }

      const selectedPkg = packages.find(p => p.id === selectedPaketId)
      const pkgNameRaw = selectedPkg?.nama_paket?.toLowerCase() || ""
      const legacyKey = pkgNameRaw.startsWith("paket ")
        ? pkgNameRaw.replace("paket ", "").trim()
        : pkgNameRaw

      supabase
        .from("package_soal")
        .select("soal_id")
        .eq("package_id", selectedPaketId)
        .then(({ data }) => {
          const idsFromRelasi = (data || []).map((d: any) => d.soal_id as number)
          const idsFromLegacy = soal
            .filter(s => s.paket?.toLowerCase().trim() === legacyKey)
            .map(s => s.id!)
            .filter(Boolean)
          const merged = Array.from(new Set([...idsFromRelasi, ...idsFromLegacy]))
          setPaketSoalIds(merged)
        })
    }, [selectedPaketId, packages, soal])

    async function uploadGambar(file: File) {
      try {
        setUploading(true)
        const fileName = `${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from("soal").upload(fileName, file)
        if (error) { alert("Upload gagal"); return }
        const { data } = supabase.storage.from("soal").getPublicUrl(fileName)
        setForm((prev) => ({ ...prev, gambar: data.publicUrl }))
        alert("Upload berhasil")
      } finally { setUploading(false) }
    }

    async function handleSubmit() {
      const cleanText = (text?: string) =>
        text ? text.replace(/<p><br\s*\/?><\/p>/g, "").replace(/<[^>]*>/g, "").trim() : ""
      if (!cleanText(form.pertanyaan)) { alert("Pertanyaan wajib diisi"); return }
      if (!cleanText(form.opsi_a))     { alert("Opsi A wajib diisi"); return }
      if (!cleanText(form.opsi_b))     { alert("Opsi B wajib diisi"); return }
      if (!cleanText(form.opsi_c))     { alert("Opsi C wajib diisi"); return }
      if (!cleanText(form.opsi_d))     { alert("Opsi D wajib diisi"); return }

      const payload = {
        pertanyaan: form.pertanyaan, opsi_a: form.opsi_a, opsi_b: form.opsi_b,
        opsi_c: form.opsi_c, opsi_d: form.opsi_d, opsi_e: form.opsi_e || "",
        jawaban_benar: form.jawaban_benar.toLowerCase().trim(),
        kategori: form.kategori.trim(), paket: form.paket?.trim() || "",
        pembahasan: form.pembahasan || `Jawaban benar adalah ${form.jawaban_benar.toUpperCase()}`,
        video_url: form.video_url || "", gambar: form.gambar || "",
        pengantar: form.pengantar || "", bacaan: form.bacaan || "", is_active: true,
      }

      try {
        setSaving(true)
        let soalId = form.id

        if (form.id) {
          const { error } = await supabase.from("soal").update(payload).eq("id", form.id)
          if (error) { alert(error.message); return }
        } else {
          const { data, error } = await supabase.from("soal").insert([payload]).select("id").single()
          if (error) { alert(error.message); return }
          soalId = data.id
        }

        if (soalId) {
          let finalPackageIds: number[] = [...(form.package_ids || [])]

          // Tambahkan package yang cocok dengan field paket lama jika belum ada
          if (form.paket) {
            const legacyKey = form.paket.toLowerCase().trim()
            const matchingPkg = packages.find(p => {
              const name = p.nama_paket.toLowerCase().trim()
              return name === legacyKey || name === `paket ${legacyKey}` || name.replace("paket ", "") === legacyKey
            })
            if (matchingPkg && !finalPackageIds.includes(matchingPkg.id)) {
              finalPackageIds.push(matchingPkg.id)
            }
          }

          await supabase.from("package_soal").delete().eq("soal_id", soalId)
          if (finalPackageIds.length > 0) {
            const rows = finalPackageIds.map((pid) => ({ package_id: pid, soal_id: soalId }))
            const { error: insertError } = await supabase.from("package_soal").insert(rows)
            if (insertError) { alert("Gagal menyimpan relasi paket: " + insertError.message); return }
          }
        }

        alert("Berhasil disimpan")
        setShowModal(false)
        resetForm()
        await getSoal()
      } catch (err: any) {
        alert(err.message || "Gagal menyimpan")
      } finally { setSaving(false) }
    }

    async function handleEdit(item: Soal) {
      let packageIds = item.id ? await getPackageIdsForSoal(item.id) : []

      // Auto centang package yang cocok dengan field paket lama
      if (item.paket) {
        const matchingPkg = packages.find(p => {
          const name = p.nama_paket.toLowerCase().trim()
          const legacy = item.paket!.toLowerCase().trim()
          return name === legacy || name === `paket ${legacy}` || name.replace("paket ", "") === legacy
        })
        if (matchingPkg && !packageIds.includes(matchingPkg.id)) {
          packageIds = [...packageIds, matchingPkg.id]
        }
      }

      setForm({
        ...item,
        opsi_a: item.opsi_a || "", opsi_b: item.opsi_b || "",
        opsi_c: item.opsi_c || "", opsi_d: item.opsi_d || "", opsi_e: item.opsi_e || "",
        paket: item.paket || "", pengantar: item.pengantar || "", bacaan: item.bacaan || "",
        pembahasan: item.pembahasan || "", gambar: item.gambar || "",
        package_ids: packageIds,
      })
      setShowPreview({})
      setShowModal(true)
    }

    async function handleDelete(id: number) {
      if (!confirm("Hapus soal?")) return
      await supabase.from("package_soal").delete().eq("soal_id", id)
      await supabase.from("soal").delete().eq("id", id)
      getSoal()
    }

    function resetForm() {
      setForm({
        pertanyaan: "", opsi_a: "", opsi_b: "", opsi_c: "", opsi_d: "", opsi_e: "",
        jawaban_benar: "a", kategori: "Matematika", paket: "",
        pembahasan: "", video_url: "", gambar: "", pengantar: "", bacaan: "",
        package_ids: [],
      })
      setShowPreview({})
    }

    function togglePackageId(id: number) {
      setForm((prev) => {
        const ids = prev.package_ids || []
        return {
          ...prev,
          package_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
        }
      })
    }

    function onDragEnd(result: DropResult) {
      if (!result.destination) return
      const items = Array.from(soal)
      const [moved] = items.splice(result.source.index, 1)
      items.splice(result.destination.index, 0, moved)
      setSoal(items)
    }

    function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" })
        for (const row of json as any[]) {
          await supabase.from("soal").insert([{
            pengantar: String(row.pengantar || ""), bacaan: String(row.bacaan || ""),
            pertanyaan: String(row.pertanyaan || ""), opsi_a: String(row.opsi_a || ""),
            opsi_b: String(row.opsi_b || ""), opsi_c: String(row.opsi_c || ""),
            opsi_d: String(row.opsi_d || ""), opsi_e: String(row.opsi_e || ""),
            jawaban_benar: String(row.jawaban_benar || "").toLowerCase().trim(),
            kategori: String(row.kategori || "").trim(), paket: String(row.paket || "").trim(),
            pembahasan: String(row.pembahasan || ""), video_url: String(row.video_url || ""),
            gambar: String(row.gambar || ""),
          }])
        }
        alert("Upload Excel berhasil!")
        getSoal()
      }
      reader.readAsArrayBuffer(file)
    }

async function handleExportPdf() {
  console.log("Export PDF clicked, filteredSoal:", filteredSoal.length)
  if (filteredSoal.length === 0) { alert("Tidak ada soal untuk diexport"); return }
  try {
    setExportingPdf(true)
    const namaFilter = selectedPaketId
      ? packages.find(p => p.id === selectedPaketId)?.nama_paket || "Semua Paket"
      : "Semua Paket"

    const soalHtml = filteredSoal.map((s, i) => {
      const pertanyaan = stripHtml(s.pertanyaan)
      const opsi = [
        { l: "A", v: stripHtml(s.opsi_a) },
        { l: "B", v: stripHtml(s.opsi_b) },
        { l: "C", v: stripHtml(s.opsi_c) },
        { l: "D", v: stripHtml(s.opsi_d) },
        { l: "E", v: stripHtml(s.opsi_e) },
      ].filter(o => o.v)
      const pembahasan = stripHtml(s.pembahasan || "")
      return `
        <div style="margin-bottom:28px; page-break-inside:avoid;">
          <div style="font-weight:700; color:#26215C; margin-bottom:6px; font-size:13px;">
            ${i + 1}. <span style="color:#534AB7; font-size:10px; font-weight:600; background:#EEEDFE; padding:2px 8px; border-radius:20px; margin-left:4px;">${s.kategori}</span>
          </div>
          ${s.pengantar ? `<div style="color:#555; font-size:12px; margin-bottom:4px; padding:6px 10px; background:#F5F4F0; border-radius:6px; border-left:3px solid #AFA9EC;">${stripHtml(s.pengantar)}</div>` : ""}
          ${s.bacaan ? `<div style="color:#444; font-size:12px; margin-bottom:8px; padding:8px 10px; background:#F9F8F4; border-radius:6px; border-left:3px solid #D3D1C7; white-space:pre-line;">${stripHtml(s.bacaan)}</div>` : ""}
          <div style="color:#111; font-size:13px; margin-bottom:10px; line-height:1.6; white-space:pre-line;">${pertanyaan}</div>
          <div style="padding-left:16px;">
            ${opsi.map(o => `
              <div style="margin-bottom:4px; font-size:12px; color:${s.jawaban_benar.toLowerCase() === o.l.toLowerCase() ? "#0F6E56" : "#333"}; font-weight:${s.jawaban_benar.toLowerCase() === o.l.toLowerCase() ? "700" : "400"};">
                ${o.l}. ${o.v}${s.jawaban_benar.toLowerCase() === o.l.toLowerCase() ? " ✓" : ""}
              </div>`).join("")}
          </div>
          ${pembahasan ? `<div style="margin-top:8px; padding:8px 10px; background:#EAF3DE; border-radius:6px; border-left:3px solid #0F6E56; font-size:11px; color:#1A4A25;"><strong>Pembahasan:</strong> ${pembahasan}</div>` : ""}
        </div>
      `
    }).join("")

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Soal ${namaFilter}</title>
    <style>* { box-sizing:border-box; margin:0; padding:0; } body { font-family:Georgia,serif; color:#111; background:#fff; padding:40px; max-width:800px; margin:0 auto; } @media print { body { padding:20px; } }</style>
    </head><body>
    <div style="text-align:center; margin-bottom:32px; padding-bottom:16px; border-bottom:2px solid #26215C;">
      <div style="font-size:10px; letter-spacing:3px; color:#7F77DD; text-transform:uppercase; font-weight:700; margin-bottom:8px;">Bank Soal</div>
      <div style="font-size:22px; font-weight:700; color:#26215C;">${namaFilter}</div>
      <div style="font-size:12px; color:#888; margin-top:4px;">${selectedKategori === "Semua" ? "Semua Kategori" : selectedKategori} · ${filteredSoal.length} Soal</div>
    </div>
    ${soalHtml}
    <div style="margin-top:40px; padding-top:12px; border-top:1px solid #D3D1C7; text-align:center; font-size:10px; color:#aaa;">
      Dicetak pada ${new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}
    </div>
    </body></html>`

    // ── Download sebagai file HTML (bisa dibuka & print di browser) ──
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `soal_${namaFilter.replace(/\s+/g, "_").toLowerCase()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

  } catch (err) {
    console.error(err)
    alert("Gagal export")
  } finally { setExportingPdf(false) }
}

    const displayedSoal = useMemo(() => {
      if (!selectedPaketId) return soal
      return soal.filter(s => s.id && paketSoalIds.includes(s.id))
    }, [soal, selectedPaketId, paketSoalIds])

    const filteredSoal = useMemo(() =>
      displayedSoal
        .filter((s) => selectedKategori === "Semua" || s.kategori === selectedKategori)
        .filter((s) => s.pertanyaan?.toLowerCase().includes(search.toLowerCase())),
      [displayedSoal, selectedKategori, search]
    )

    const editorFields = [
      { label: "Pengantar", key: "pengantar" }, { label: "Bacaan", key: "bacaan" },
      { label: "Pertanyaan *", key: "pertanyaan" }, { label: "Opsi A *", key: "opsi_a" },
      { label: "Opsi B *", key: "opsi_b" }, { label: "Opsi C *", key: "opsi_c" },
      { label: "Opsi D *", key: "opsi_d" }, { label: "Opsi E", key: "opsi_e" },
      { label: "Pembahasan", key: "pembahasan" },
    ]

    function KategoriPill({ label, value }: { label: string; value: string }) {
      const active = selectedKategori === value
      return (
        <button type="button" onClick={() => setSelectedKategori(value)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            active ? "bg-[#534AB7] text-[#EEEDFE] border-[#534AB7]"
            : "bg-[#F1EFE8] text-[#5F5E5A] border-[#B4B2A9] hover:bg-[#D3D1C7]"
          }`}>
          {label}
        </button>
      )
    }

    function PaketPill({ label, pkgId }: { label: string; pkgId: number | null }) {
      const active = selectedPaketId === pkgId
      return (
        <button type="button" onClick={() => setSelectedPaketId(pkgId)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            active ? "bg-[#26215C] text-[#EEEDFE] border-[#26215C]"
            : "bg-[#F1EFE8] text-[#5F5E5A] border-[#B4B2A9] hover:bg-[#D3D1C7]"
          }`}>
          {label}
        </button>
      )
    }

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F1EFE8]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-2 border-[#AFA9EC] border-t-[#534AB7] rounded-full animate-spin" />
            <p className="text-sm text-[#888780]">Memuat data soal...</p>
          </div>
        </div>
      )
    }

    return (
      <MathJaxContext config={mathJaxConfig}>
        <style>{quillStyle}</style>
        <div className="min-h-screen bg-[#F1EFE8]">

          {/* HEADER */}
          <div className="sticky top-0 z-40 bg-[#26215C] border-b border-[#3C3489]">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold tracking-[3px] text-[#AFA9EC] uppercase leading-none mb-0.5">Admin Panel</p>
                <h1 className="text-[15px] font-semibold text-[#EEEDFE] leading-none">Manajemen Soal</h1>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => router.push("/admin")}
                  className="h-8 px-4 rounded-lg border border-[#534AB7] text-[12px] text-[#AFA9EC] hover:bg-[#3C3489] hover:text-[#CECBF6] transition">
                  ← Kembali
                </button>
                <button type="button" onClick={() => { resetForm(); setShowModal(true) }}
                  className="h-8 px-4 rounded-lg bg-[#AFA9EC] text-[#26215C] text-[12px] font-semibold hover:bg-[#CECBF6] transition">
                  + Tambah Soal
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">

            {/* STAT CARDS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#534AB7] p-4">
                <p className="text-[10px] font-semibold tracking-widest text-[#AFA9EC] uppercase mb-1">Total Soal</p>
                <p className="text-3xl font-bold text-[#EEEDFE]">{soal.length}</p>
              </div>
              <div className="rounded-xl bg-[#0F6E56] p-4">
                <p className="text-[10px] font-semibold tracking-widest text-[#5DCAA5] uppercase mb-1">Mata Pelajaran</p>
                <p className="text-3xl font-bold text-[#E1F5EE]">{new Set(soal.map(s => s.kategori)).size}</p>
              </div>
              <div className="rounded-xl bg-[#993C1D] p-4">
                <p className="text-[10px] font-semibold tracking-widest text-[#F0997B] uppercase mb-1">Total Paket</p>
                <p className="text-3xl font-bold text-[#FAECE7]">{packages.length}</p>
              </div>
            </div>

            {/* FILTER KATEGORI */}
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-[#5F5E5A] uppercase mb-2">Filter Kategori</p>
              <div className="flex gap-2 flex-wrap">
                <KategoriPill label="Semua" value="Semua" />
                {kategoriList.map((k) => <KategoriPill key={k} label={k} value={k} />)}
              </div>
            </div>

            {/* FILTER PAKET */}
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-[#5F5E5A] uppercase mb-2">Filter Paket</p>
              <div className="flex gap-2 flex-wrap">
                <PaketPill label="Semua Soal" pkgId={null} />
                {packages.map((pkg) => (
                  <PaketPill key={pkg.id} label={pkg.nama_paket} pkgId={pkg.id} />
                ))}
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="flex gap-3 items-center flex-wrap">
              <input
                placeholder="Cari soal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] h-10 border border-[#B4B2A9] rounded-xl bg-white px-4 text-sm text-[#2C2C2A] placeholder:text-[#888780] outline-none focus:border-[#7F77DD] transition"
              />
              <label className="h-10 px-4 rounded-xl border border-[#B4B2A9] bg-white text-sm text-[#444441] flex items-center gap-2 cursor-pointer hover:bg-[#F1EFE8] transition">
                📥 Import Excel
                <input type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
              </label>
              <button
                type="button" onClick={handleExportPdf}
                disabled={exportingPdf || filteredSoal.length === 0}
                className={`h-10 px-4 rounded-xl border text-sm flex items-center gap-2 transition ${
                  exportingPdf
                    ? "bg-[#EEEDFE] border-[#AFA9EC] text-[#534AB7] cursor-not-allowed"
                    : "border-[#AFA9EC] bg-[#EEEDFE] text-[#534AB7] hover:bg-[#D5D1F8] cursor-pointer"
                }`}
              >
                {exportingPdf ? "⏳ Menyiapkan..." : `📄 Export PDF (${filteredSoal.length} soal)`}
              </button>
            </div>

            {/* LIST */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#2C2C2A]">Daftar Soal</p>
              <span className="text-[11px] font-semibold bg-[#EEEDFE] text-[#3C3489] rounded-full px-2.5 py-0.5">
                {filteredSoal.length} soal
              </span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="soal-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {filteredSoal.length === 0 && (
                      <div className="bg-white border border-[#D3D1C7] rounded-2xl p-10 text-center">
                        <p className="text-sm text-[#888780]">Tidak ada soal ditemukan</p>
                      </div>
                    )}
                    {filteredSoal.map((item, index) => {
                      const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length]
                      const paketNames = soalPackageMap[item.id!] || []
                      return (
                        <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{ ...provided.draggableProps.style, borderLeft: `4px solid ${accentColor}` }}
                              className="bg-white border border-[#D3D1C7] rounded-2xl p-4 hover:border-[#888780] transition"
                            >
                              <div className="flex gap-3">
                                <div {...provided.dragHandleProps} className="cursor-grab text-[#B4B2A9] select-none mt-0.5 text-lg">☰</div>
                                <div className="flex-1 min-w-0">
                                  <MathContent html={item.pertanyaan} />
                                  {item.gambar && (
                                    <img src={item.gambar} alt="gambar soal" className="mt-3 rounded-xl w-40 border border-[#D3D1C7]" />
                                  )}
                                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                                    {([
                                      { label: "A", value: item.opsi_a },
                                      { label: "B", value: item.opsi_b },
                                      { label: "C", value: item.opsi_c },
                                      { label: "D", value: item.opsi_d },
                                      { label: "E", value: item.opsi_e },
                                    ] as { label: string; value: string }[])
                                      .filter((o) => o.value)
                                      .map((o) => {
                                        const isCorrect = item.jawaban_benar.toLowerCase() === o.label.toLowerCase()
                                        return (
                                          <div key={o.label} className="flex gap-1.5 items-start">
                                            <span className={`text-xs font-bold w-5 shrink-0 mt-0.5 ${isCorrect ? "text-[#0F6E56]" : "text-[#888780]"}`}>
                                              {o.label}.
                                            </span>
                                            <div className="text-xs text-[#444441] leading-5">
                                              <MathContent html={o.value} />
                                            </div>
                                          </div>
                                        )
                                      })}
                                  </div>
                                  <div className="flex gap-2 mt-3 flex-wrap">
                                    <span className="text-[10px] font-semibold bg-[#EEEDFE] text-[#3C3489] px-2.5 py-0.5 rounded-full">
                                      {item.kategori}
                                    </span>
                                    {/* Badge paket dari package_soal, fallback ke field paket lama */}
                                    {paketNames.length > 0
                                      ? paketNames.map((nama) => (
                                          <span key={nama} className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${paketBadgeClass(nama)}`}>
                                            {nama}
                                          </span>
                                        ))
                                      : item.paket && (
                                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${paketBadgeClass(item.paket)}`}>
                                            {item.paket.toUpperCase()}
                                          </span>
                                        )
                                    }
                                    <span className="text-[10px] font-semibold bg-[#EAF3DE] text-[#27500A] px-2.5 py-0.5 rounded-full">
                                      ✓ {item.jawaban_benar.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                  <button type="button" onClick={() => handleEdit(item)}
                                    className="h-8 px-3 rounded-lg bg-[#FAEEDA] text-[#854F0B] text-xs font-semibold hover:bg-[#FAC775] transition">
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => handleDelete(item.id!)}
                                    className="h-8 px-3 rounded-lg bg-[#FCEBEB] text-[#A32D2D] text-xs font-semibold hover:bg-[#F7C1C1] transition">
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* MODAL TAMBAH/EDIT SOAL */}
          {showModal && (
            <div className="fixed inset-0 bg-[#26215C]/60 z-[99999] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden max-h-[95vh] flex flex-col border border-[#D3D1C7]">
                <div className="flex items-center justify-between px-6 py-4 bg-[#26215C] shrink-0">
                  <h2 className="text-base font-semibold text-[#EEEDFE]">
                    {form.id ? "Edit Soal" : "Tambah Soal Baru"}
                  </h2>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="w-8 h-8 rounded-lg border border-[#534AB7] text-[#AFA9EC] hover:bg-[#3C3489] flex items-center justify-center text-xl leading-none transition">
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">

                  <div>
                    <label className="block text-sm font-bold text-[#1A1917] uppercase tracking-wider mb-2">Gambar Soal</label>
                    <input type="file" accept="image/*"
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) await uploadGambar(f) }}
                      className="w-full border-2 border-[#B4B2A9] p-2.5 rounded-xl text-sm bg-[#FAFAF9] text-[#111110] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EEEDFE] file:text-[#3C3489] hover:file:bg-[#D5D1F8] cursor-pointer"
                    />
                    {uploading && <p className="mt-1 text-xs text-[#534AB7] font-medium">Mengupload...</p>}
                    {form.gambar && <img src={form.gambar} alt="preview" className="w-36 mt-3 rounded-xl border border-[#D3D1C7]" />}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-[#1A1917] uppercase tracking-wider mb-2">Kategori</label>
                      <select value={form.kategori} onChange={(e) => setForm((p) => ({ ...p, kategori: e.target.value }))}
                        className="w-full border-2 border-[#B4B2A9] p-2.5 rounded-xl text-sm font-medium bg-[#FAFAF9] text-[#111110] outline-none focus:border-[#534AB7] transition">
                        {kategoriList.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#1A1917] uppercase tracking-wider mb-2">Paket</label>
                      <select value={form.paket} onChange={(e) => setForm((p) => ({ ...p, paket: e.target.value }))}
                        className="w-full border-2 border-[#B4B2A9] p-2.5 rounded-xl text-sm font-medium bg-[#FAFAF9] text-[#111110] outline-none focus:border-[#534AB7] transition">
                        <option value="">Pilih Paket</option>
                        {["ipa", "ips", "smk", "bahasa"].map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1A1917] uppercase tracking-wider mb-2">Assign ke Paket</label>
                    <p className="text-xs text-[#888780] mb-3">
                      Pilih paket mana saja yang boleh menggunakan soal ini. Soal bisa masuk ke beberapa paket sekaligus.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {packages.map((pkg) => {
                        const isSelected = (form.package_ids || []).includes(pkg.id)
                        return (
                          <button key={pkg.id} type="button" onClick={() => togglePackageId(pkg.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-[#534AB7] border-[#534AB7] text-white"
                                : "bg-[#FAFAF9] border-[#B4B2A9] text-[#444441] hover:border-[#7F77DD]"
                            }`}>
                            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-white border-white" : "border-[#B4B2A9]"
                            }`}>
                              {isSelected && <span className="text-[#534AB7] text-[10px] font-black">✓</span>}
                            </span>
                            <span className="truncate">{pkg.nama_paket}</span>
                          </button>
                        )
                      })}
                    </div>
                    {(form.package_ids || []).length > 0 && (
                      <p className="mt-2 text-xs text-[#534AB7] font-semibold">
                        ✓ {(form.package_ids || []).length} paket dipilih
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-[#EEEDFE]" />
                    <span className="text-[10px] font-bold text-[#7F77DD] tracking-widest uppercase">Konten Soal</span>
                    <div className="h-px flex-1 bg-[#EEEDFE]" />
                  </div>

                  {editorFields.map((field) => (
                    <div key={field.key}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-[#1A1917] uppercase tracking-wider">{field.label}</label>
                        <button type="button"
                          onClick={() => setShowPreview((p) => ({ ...p, [field.key]: !p[field.key] }))}
                          className="text-xs font-semibold text-[#534AB7] hover:text-[#3C3489] underline transition">
                          {showPreview[field.key] ? "Sembunyikan preview" : "Lihat preview"}
                        </button>
                      </div>
                      <div className="border-2 border-[#B4B2A9] rounded-xl overflow-hidden bg-white focus-within:border-[#534AB7] focus-within:ring-2 focus-within:ring-[#EEEDFE] transition">
                        <ReactQuill
                          theme="snow" modules={quillModules}
                          value={(form as any)[field.key] || ""}
                          onChange={(value) => setForm((p) => ({ ...p, [field.key]: value }))}
                          style={{ display: "flex", flexDirection: "column" }}
                        />
                      </div>
                      {showPreview[field.key] && <MathPreview html={(form as any)[field.key] || ""} />}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-bold text-[#1A1917] uppercase tracking-wider mb-2">Jawaban Benar</label>
                    <select value={form.jawaban_benar} onChange={(e) => setForm((p) => ({ ...p, jawaban_benar: e.target.value }))}
                      className="w-full border-2 border-[#B4B2A9] p-2.5 rounded-xl text-sm font-medium bg-[#FAFAF9] text-[#111110] outline-none focus:border-[#534AB7] transition">
                      {["a", "b", "c", "d", "e"].map((x) => <option key={x} value={x}>{x.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border-t-2 border-[#E5E3DC] bg-white px-6 py-4 flex justify-end gap-3 shrink-0">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="h-10 px-5 rounded-xl border-2 border-[#B4B2A9] text-sm font-semibold text-[#444441] hover:bg-[#F1EFE8] transition">
                    Batal
                  </button>
                  <button type="button" disabled={saving} onClick={handleSubmit}
                    className="h-10 px-6 rounded-xl bg-[#534AB7] text-white text-sm font-bold hover:bg-[#3C3489] disabled:opacity-50 transition">
                    {saving ? "Menyimpan..." : "Simpan Soal"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </MathJaxContext>
    )
  }
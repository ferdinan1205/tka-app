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

const STAT_CFG = [
  { key: "total",    title: "Total Ujian",   icon: "📝", grad: "linear-gradient(135deg,#6366f1,#4f46e5)" },
  { key: "terbaik",  title: "Skor Terbaik",  icon: "🏆", grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { key: "terakhir", title: "Skor Terakhir", icon: "📈", grad: "linear-gradient(135deg,#ec4899,#db2777)" },
  { key: "rata",     title: "Rata-rata",     icon: "🎯", grad: "linear-gradient(135deg,#10b981,#059669)" },
]

function getProgress(avg: number) {
  if (avg >= 90) return { label: "Sangat Baik", emoji: "🔥", color: "#10b981" }
  if (avg >= 75) return { label: "Baik",        emoji: "👍", color: "#6366f1" }
  if (avg >= 60) return { label: "Cukup",       emoji: "🙂", color: "#f59e0b" }
  return           { label: "Perlu Latihan",    emoji: "📘", color: "#ef4444" }
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [userId,    setUserId]    = useState("")
  const [nama,      setNama]      = useState("")
  const [email,     setEmail]     = useState("")
  const [foto,      setFoto]      = useState("")
  const [editNama,  setEditNama]  = useState("")
  const [hasil,     setHasil]     = useState<Hasil[]>([])
  const [totalUjian,   setTotalUjian]   = useState(0)
  const [skorTerbaik,  setSkorTerbaik]  = useState(0)
  const [skorTerakhir, setSkorTerakhir] = useState(0)
  const [rataRata,     setRataRata]     = useState(0)

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push("/login"); return }
    const user = data.user
    setUserId(user.id)
    setEmail(user.email || "")
    await getProfile(user.id)
    await getHasil(user.id)
    setLoading(false)
  }

  async function getProfile(id: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle()
    if (data) {
      setNama(data.nama || "")
      setEditNama(data.nama || "")
      setFoto(data.foto || "")
    }
  }

  async function saveNama() {
    if (!editNama) return
    const { error } = await supabase.from("profiles").update({ nama: editNama }).eq("id", userId)
    if (!error) { setNama(editNama); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  async function uploadFoto(e: any) {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) { alert("Ukuran max 2MB"); return }
      const ext  = file.name.split(".").pop()
      const name = `${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from("foto-profile").upload(name, file, { upsert: true })
      if (upErr) { alert(upErr.message); return }
      const { data: urlData } = supabase.storage.from("foto-profile").getPublicUrl(name)
      const url = urlData.publicUrl
      const { error: dbErr } = await supabase.from("profiles").update({ foto: url }).eq("id", userId)
      if (dbErr) { alert(dbErr.message); return }
      setFoto(url)
    } catch { alert("Terjadi error") }
    finally { setUploading(false) }
  }

  async function getHasil(id: string) {
    const { data } = await supabase.from("hasil").select("*").eq("user_id", id).order("tanggal", { ascending: false })
    const h = (data || []) as Hasil[]
    setHasil(h)
    const total = h.length
    const best  = total > 0 ? Math.max(...h.map(x => x.skor)) : 0
    const last  = total > 0 ? h[0].skor : 0
    const avg   = total > 0 ? Math.round(h.reduce((a,b) => a + b.skor, 0) / total) : 0
    setTotalUjian(total); setSkorTerbaik(best); setSkorTerakhir(last); setRataRata(avg)
  }

  const statValues: Record<string,number> = { total: totalUjian, terbaik: skorTerbaik, terakhir: skorTerakhir, rata: rataRata }
  const prog = getProgress(rataRata)

  /* ── LOADING ── */
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0a0f1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`
        @keyframes spin-r{to{transform:rotate(360deg)}}
        @keyframes pg2{0%,100%{box-shadow:0 0 20px rgba(99,102,241,.4)}50%{box-shadow:0 0 44px rgba(99,102,241,.9)}}
        .lr2{width:52px;height:52px;border:3px solid transparent;border-top:3px solid #6366f1;border-right:3px solid #06b6d4;border-radius:50%;animation:spin-r .8s linear infinite,pg2 1.5s ease-in-out infinite}
      `}</style>
      <div style={{ textAlign:"center" }}>
        <div className="lr2" style={{ margin:"0 auto 14px" }} />
        <p style={{ color:"#818cf8", fontSize:11, fontWeight:800, letterSpacing:"0.18em" }}>MEMUAT PROFIL…</p>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
        *,*::before,*::after{font-family:'Plus Jakarta Sans',sans-serif;box-sizing:border-box}
        :root{
          --bg:#0a0f1e;--card:#111827;--card2:#161f35;
          --border:rgba(99,102,241,.15);--accent:#6366f1;--accent2:#06b6d4;
          --text:#f1f5f9;--muted:#64748b;--muted2:#475569
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.5}}
        @keyframes countUp{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
        @keyframes spin-r{to{transform:rotate(360deg)}}
        @keyframes shimIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes savedPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}

        /* topbar */
        .pf-topbar{background:rgba(10,15,30,.88);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(99,102,241,.12)}

        /* hero */
        .pf-hero{background:linear-gradient(135deg,#1e1b4b 0%,#0f172a 55%,#0c1a2e 100%);border-bottom:1px solid rgba(99,102,241,.12);position:relative;overflow:hidden}
        .pf-hero::before{content:'';position:absolute;width:700px;height:700px;background:radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 70%);top:-260px;right:-80px;pointer-events:none}
        .pf-hero::after{content:'';position:absolute;width:500px;height:500px;background:radial-gradient(circle,rgba(6,182,212,.12) 0%,transparent 70%);bottom:-180px;left:-60px;pointer-events:none}

        /* card */
        .pf-card{background:var(--card);border:1px solid var(--border);border-radius:24px;animation:fadeUp .45s ease both;transition:transform .3s,box-shadow .3s,border-color .3s}
        .pf-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(0,0,0,.4),0 0 0 1px rgba(99,102,241,.3);border-color:rgba(99,102,241,.35)}

        /* stat */
        .pf-stat{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:18px 20px;animation:fadeUp .4s ease both;transition:transform .3s,box-shadow .3s,border-color .3s;position:relative;overflow:hidden}
        .pf-stat:hover{transform:translateY(-4px);box-shadow:0 16px 36px rgba(0,0,0,.35),0 0 0 1px rgba(99,102,241,.3);border-color:rgba(99,102,241,.35)}
        .pf-stat-val{animation:countUp .5s cubic-bezier(.34,1.56,.64,1) both;animation-delay:.15s}

        /* input */
        .pf-input{background:rgba(255,255,255,.05);border:1.5px solid rgba(99,102,241,.2);color:#f1f5f9;border-radius:14px;padding:12px 16px;width:100%;outline:none;font-size:14px;font-weight:600;transition:all .3s}
        .pf-input:focus{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.6);box-shadow:0 0 0 4px rgba(99,102,241,.1)}
        .pf-input::placeholder{color:#475569}

        /* btn */
        .pf-btn{background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;font-weight:800;border-radius:12px;display:flex;align-items:center;justify-content:center;transition:all .3s;position:relative;overflow:hidden;cursor:pointer;border:none}
        .pf-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,#818cf8,#22d3ee);opacity:0;transition:opacity .3s}
        .pf-btn:hover::before{opacity:1}
        .pf-btn:active{transform:scale(.97)}
        .pf-btn span{position:relative;z-index:1}

        /* avatar ring */
        .ava-ring{box-shadow:0 0 0 3px rgba(99,102,241,.5),0 0 24px rgba(99,102,241,.25)}

        /* camera btn */
        .cam-btn{position:absolute;bottom:0;right:0;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#06b6d4);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.5);transition:transform .2s;font-size:14px}
        .cam-btn:hover{transform:scale(1.1)}

        /* dot live */
        .dot-live{width:7px;height:7px;background:#10b981;border-radius:50%;display:inline-block;animation:pulse-dot 1.5s ease-in-out infinite;flex-shrink:0}

        /* badge */
        .pf-badge{border-radius:99px;padding:4px 12px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:5px}

        /* field row (read-only) */
        .pf-field{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;color:#94a3b8;font-size:13px;font-weight:600}

        /* saved pop */
        .saved-toast{animation:savedPop .4s ease both}

        /* stagger */
        .pf-stat:nth-child(1){animation-delay:.05s}
        .pf-stat:nth-child(2){animation-delay:.10s}
        .pf-stat:nth-child(3){animation-delay:.15s}
        .pf-stat:nth-child(4){animation-delay:.20s}
        .pf-card:nth-child(1){animation-delay:.05s}
        .pf-card:nth-child(2){animation-delay:.12s}
        .pf-card:nth-child(3){animation-delay:.18s}

        /* sb */
        .sb-hide::-webkit-scrollbar{display:none}.sb-hide{-ms-overflow-style:none;scrollbar-width:none}

        /* score colors */
        .sc-high{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
        .sc-mid {background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff}
        .sc-low {background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff}
      `}</style>

      <div style={{ minHeight:"100vh", background:"var(--bg)", paddingBottom:48 }}>

        {/* ══════════ TOPBAR ══════════ */}
        <div className="sticky top-0 z-50 pf-topbar">
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>

            <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
              {/* avatar mini */}
              {foto ? (
                <img src={foto} alt="av" className="ava-ring"
                  style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
              ) : (
                <div className="ava-ring"
                  style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:900, flexShrink:0 }}>
                  {nama.slice(0,2).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth:0 }}>
                <p style={{ color:"var(--accent2)", fontSize:9, fontWeight:900, letterSpacing:"0.18em", textTransform:"uppercase" }}>Lampung Cerdas</p>
                <h1 style={{ color:"var(--text)", fontSize:"clamp(13px,3vw,20px)", fontWeight:900, lineHeight:1.1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  Profile Akademik
                </h1>
              </div>
            </div>

            <button onClick={() => router.push("/dashboard")} className="pf-btn" style={{ height:36, padding:"0 16px", fontSize:12, flexShrink:0 }}>
              <span>← Dashboard</span>
            </button>
          </div>
        </div>

        {/* ══════════ HERO (desktop only) ══════════ */}
        <div className="pf-hero" style={{ display:"none" }} id="pf-hero">
          <style>{`@media(min-width:768px){#pf-hero{display:block!important}}`}</style>
        </div>
        <div className="pf-hero" id="pf-hero" style={{ display:"none" }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"36px 32px", position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:32, flexWrap:"wrap" }}>

              {/* Left */}
              <div>
                <p style={{ color:"var(--accent2)", fontSize:11, fontWeight:900, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:8 }}>✦ Profil & Statistik</p>
                <h2 style={{ color:"var(--text)", fontSize:"clamp(26px,3.5vw,42px)", fontWeight:900, lineHeight:1.15, marginBottom:10 }}>
                  Halo, <span style={{ background:"linear-gradient(135deg,#a5b4fc,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{nama}</span> 👋
                </h2>
                <p style={{ color:"var(--muted)", fontSize:14, maxWidth:440, lineHeight:1.65 }}>
                  Kelola profil, pantau statistik belajar, dan lihat perkembanganmu dari waktu ke waktu.
                </p>
                {/* Progress badge */}
                <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:10 }}>
                  <div className="pf-badge" style={{ background:`${prog.color}22`, color:prog.color, border:`1px solid ${prog.color}44` }}>
                    <span>{prog.emoji}</span>{prog.label}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:99, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
                    <span className="dot-live" />
                    <span style={{ color:"var(--muted)", fontSize:11, fontWeight:700 }}>Aktif</span>
                  </div>
                </div>
              </div>

              {/* Right: avatar big */}
              <div style={{ display:"flex", alignItems:"center", gap:20, flexShrink:0 }}>
                <div style={{ position:"relative" }}>
                  {foto ? (
                    <img src={foto} alt="av" className="ava-ring"
                      style={{ width:100, height:100, borderRadius:"50%", objectFit:"cover" }} />
                  ) : (
                    <div className="ava-ring"
                      style={{ width:100, height:100, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:32, fontWeight:900 }}>
                      {nama.slice(0,2).toUpperCase()}
                    </div>
                  )}
                  <label className="cam-btn">
                    {uploading ? <span style={{ fontSize:12, color:"#fff" }}>⏳</span> : "📷"}
                    <input type="file" hidden accept="image/*" onChange={uploadFoto} />
                  </label>
                </div>
                <div>
                  <p style={{ color:"var(--muted)", fontSize:12, fontWeight:600 }}>Email</p>
                  <p style={{ color:"var(--text)", fontSize:14, fontWeight:700, marginTop:2, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis" }}>{email}</p>
                  <p style={{ color:"var(--muted)", fontSize:12, fontWeight:600, marginTop:10 }}>Bergabung sejak</p>
                  <p style={{ color:"var(--text)", fontSize:14, fontWeight:700, marginTop:2 }}>Mei 2026</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ══════════ CONTENT ══════════ */}
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"14px 16px 0" }}>

          {/* ── MOBILE PROFILE CARD ── */}
          <div id="mob-pf" style={{ marginBottom:12 }}>
            <style>{`@media(min-width:768px){#mob-pf{display:none!important}}`}</style>
            <div className="pf-card" style={{ padding:"16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {/* avatar */}
                <div style={{ position:"relative", flexShrink:0 }}>
                  {foto ? (
                    <img src={foto} alt="av" className="ava-ring"
                      style={{ width:64, height:64, borderRadius:"50%", objectFit:"cover" }} />
                  ) : (
                    <div className="ava-ring"
                      style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:20, fontWeight:900 }}>
                      {nama.slice(0,2).toUpperCase()}
                    </div>
                  )}
                  <label className="cam-btn" style={{ width:26, height:26, fontSize:12 }}>
                    {uploading ? "⏳" : "📷"}
                    <input type="file" hidden accept="image/*" onChange={uploadFoto} />
                  </label>
                </div>
                {/* info */}
                <div style={{ minWidth:0, flex:1 }}>
                  <h2 style={{ color:"var(--text)", fontSize:16, fontWeight:900, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nama}</h2>
                  <p style={{ color:"var(--muted)", fontSize:11, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{email}</p>
                  <div className="pf-badge" style={{ marginTop:8, background:`${prog.color}22`, color:prog.color, border:`1px solid ${prog.color}44`, fontSize:10 }}>
                    {prog.emoji} {prog.label}
                  </div>
                </div>
                {/* status */}
                <div style={{ textAlign:"center", flexShrink:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.25)" }}>
                    <span className="dot-live" />
                    <span style={{ color:"#10b981", fontSize:10, fontWeight:800 }}>Aktif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── STAT CARDS ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:12 }} id="pf-stat-grid">
            <style>{`@media(min-width:768px){#pf-stat-grid{grid-template-columns:repeat(4,1fr)!important;gap:16px!important;margin-bottom:20px!important}}`}</style>
            {STAT_CFG.map((s, i) => (
              <div key={s.key} className="pf-stat" style={{ animationDelay:`${i*0.07}s` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ color:"var(--muted)", fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{s.title}</p>
                    <p className="pf-stat-val" style={{ color:"var(--text)", fontSize:"clamp(26px,5vw,46px)", fontWeight:900, lineHeight:1 }}>
                      {statValues[s.key]}
                    </p>
                  </div>
                  <div style={{ width:42, height:42, borderRadius:13, background:s.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, boxShadow:"0 8px 20px rgba(0,0,0,.3)" }}>
                    {s.icon}
                  </div>
                </div>
                {/* mini bar */}
                <div style={{ marginTop:10, height:3, background:"rgba(255,255,255,.07)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(statValues[s.key], 100)}%`, background:s.grad, borderRadius:99, transition:"width .8s ease" }} />
                </div>
              </div>
            ))}
          </div>

          {/* ── TWO COL: Edit + Info ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:12, marginBottom:12 }} id="pf-two-col">
            <style>{`@media(min-width:768px){#pf-two-col{grid-template-columns:1fr 1fr!important;gap:20px!important;margin-bottom:20px!important}}`}</style>

            {/* Edit Nama */}
            <div className="pf-card" style={{ padding:"20px 20px 22px" }}>
              <h2 style={{ color:"var(--text)", fontSize:"clamp(15px,2.5vw,22px)", fontWeight:900, marginBottom:4 }}>Edit Profil</h2>
              <p style={{ color:"var(--muted)", fontSize:12, marginBottom:16 }}>Perbarui nama tampilan kamu</p>

              <label style={{ color:"var(--muted)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6 }}>Nama Lengkap</label>
              <input
                value={editNama}
                onChange={e => setEditNama(e.target.value)}
                className="pf-input"
                placeholder="Masukkan nama lengkap..."
                style={{ marginBottom:12 }}
              />

              <label style={{ color:"var(--muted)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:6, marginTop:4 }}>Email</label>
              <div className="pf-field" style={{ marginBottom:16 }}>{email}</div>

              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <button onClick={saveNama} className="pf-btn" style={{ height:42, flex:1, fontSize:13 }}>
                  <span>💾 Simpan Perubahan</span>
                </button>
                {saved && (
                  <div className="saved-toast" style={{ padding:"8px 14px", borderRadius:12, background:"rgba(16,185,129,.15)", border:"1px solid rgba(16,185,129,.3)", color:"#10b981", fontSize:12, fontWeight:800, whiteSpace:"nowrap" }}>
                    ✓ Tersimpan
                  </div>
                )}
              </div>
            </div>

            {/* Info Akun */}
            <div className="pf-card" style={{ padding:"20px 20px 22px" }}>
              <h2 style={{ color:"var(--text)", fontSize:"clamp(15px,2.5vw,22px)", fontWeight:900, marginBottom:4 }}>Informasi Akun</h2>
              <p style={{ color:"var(--muted)", fontSize:12, marginBottom:16 }}>Detail status dan perkembangan belajar</p>

              {[
                { label:"Status Akun",    val:"Aktif ✅",             accent:"#10b981" },
                { label:"Bergabung",      val:"Mei 2026",              accent:"var(--accent2)" },
                { label:"Status Belajar", val:`${prog.emoji} ${prog.label}`, accent:prog.color },
                { label:"Total Ujian",    val:`${totalUjian} Ujian`,   accent:"var(--accent)" },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                  <span style={{ color:"var(--muted)", fontSize:12, fontWeight:600 }}>{row.label}</span>
                  <span style={{ color:row.accent, fontSize:13, fontWeight:800 }}>{row.val}</span>
                </div>
              ))}

              {/* Foto upload row */}
              <div style={{ marginTop:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                <span style={{ color:"var(--muted)", fontSize:12, fontWeight:600 }}>Foto Profil</span>
                <label style={{ cursor:"pointer" }}>
                  <div className="pf-btn" style={{ height:34, padding:"0 14px", fontSize:12, borderRadius:10, display:"inline-flex" }}>
                    <span>{uploading ? "⏳ Upload..." : "📷 Ganti Foto"}</span>
                  </div>
                  <input type="file" hidden accept="image/*" onChange={uploadFoto} />
                </label>
              </div>
            </div>
          </div>

          {/* ── RIWAYAT UJIAN ── */}
          <div className="pf-card" style={{ padding:"20px 20px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
              <div>
                <h2 style={{ color:"var(--text)", fontSize:"clamp(15px,2.5vw,22px)", fontWeight:900 }}>Riwayat Ujian</h2>
                <p style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>{hasil.length} hasil tersimpan</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:99, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.2)" }}>
                <span className="dot-live" />
                <span style={{ color:"#a5b4fc", fontSize:11, fontWeight:700 }}>Live sync</span>
              </div>
            </div>

            {hasil.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:44, marginBottom:10, animation:"float 3s ease-in-out infinite" }}>📘</div>
                <p style={{ color:"var(--text)", fontWeight:900, fontSize:15, marginBottom:4 }}>Belum Ada Riwayat</p>
                <p style={{ color:"var(--muted)", fontSize:12 }}>Kerjakan ujian untuk melihat histori nilai</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:7, paddingBottom:8 }}>
                {hasil.slice(0, 10).map((item, i) => {
                  const sc = item.skor >= 80 ? "sc-high" : item.skor >= 60 ? "sc-mid" : "sc-low"
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"10px 12px", borderRadius:14, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)", transition:"all .25s", animationDelay:`${i*0.05}s`, animation:"fadeUp .4s ease both" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(99,102,241,.08)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.2)"; (e.currentTarget as HTMLElement).style.transform="translateX(4px)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.03)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.05)"; (e.currentTarget as HTMLElement).style.transform="translateX(0)" }}>

                      {/* Score circle */}
                      <div className={sc} style={{ width:46, height:46, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, flexShrink:0 }}>
                        {item.skor}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:"var(--text)", fontSize:13, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.kategori}</p>
                        <p style={{ color:"var(--muted)", fontSize:10, marginTop:1 }}>
                          {new Date(item.tanggal).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" })}
                        </p>
                      </div>

                      {/* Mini bar */}
                      <div style={{ flexShrink:0, textAlign:"right", minWidth:56 }}>
                        <div style={{ height:4, width:56, background:"rgba(255,255,255,.07)", borderRadius:99, overflow:"hidden", marginBottom:3 }}>
                          <div style={{ height:"100%", width:`${item.skor}%`, background:"linear-gradient(90deg,#6366f1,#06b6d4)", borderRadius:99 }} />
                        </div>
                        <span style={{ color:"var(--muted)", fontSize:10, fontWeight:700 }}>{item.skor}/100</span>
                      </div>

                    </div>
                  )
                })}
                {hasil.length > 10 && (
                  <p style={{ color:"var(--muted)", fontSize:11, textAlign:"center", padding:"8px 0", fontWeight:600 }}>
                    + {hasil.length - 10} riwayat lainnya
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
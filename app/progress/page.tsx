"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts"

type HasilType = {
  id: number
  skor: number
  kategori: string
  tanggal: string
  package_id?: number | null
}
type PackageType = { id: number; nama_paket: string }

const COLORS = ["#6366f1","#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444"]

const STAT_CFG = [
  { key:"total",    title:"Total Ujian", icon:"📝", grad:"from-indigo-500 to-blue-600"   },
  { key:"tinggi",   title:"Tertinggi",   icon:"🏆", grad:"from-amber-400 to-orange-500"  },
  { key:"terakhir", title:"Terakhir",    icon:"📈", grad:"from-pink-500 to-rose-600"     },
  { key:"rata",     title:"Rata-rata",   icon:"⭐", grad:"from-emerald-400 to-teal-600"  },
]

export default function ProgressPage() {
  const router = useRouter()
  const [loading, setLoading]             = useState(true)
  const [nama, setNama]                   = useState("Siswa")
  const [foto, setFoto]                   = useState("")
  const [hasil, setHasil]                 = useState<HasilType[]>([])
  const [packages, setPackages]           = useState<PackageType[]>([])
  const [selectedPaket, setSelectedPaket] = useState("Semua")

  useEffect(() => { init() }, [])

  async function init() {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) { router.push("/login"); return }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setNama(profile?.nama || "Siswa")
      setFoto(profile?.foto || "")
      const { data: hasilData } = await supabase.from("hasil").select("*").eq("user_id", user.id).order("tanggal", { ascending: true })
      setHasil(hasilData || [])
      const { data: packageData } = await supabase.from("packages").select("*")
      setPackages(packageData || [])
    } catch (e) { console.log(e) }
    finally { setLoading(false) }
  }

  function getPackageName(id?: number | null) {
    if (!id) return "Tanpa Paket"
    return packages.find(x => x.id === id)?.nama_paket || "Tanpa Paket"
  }

  const filteredData = useMemo(() => {
    if (selectedPaket === "Semua") return hasil
    return hasil.filter(item => getPackageName(item.package_id) === selectedPaket)
  }, [hasil, selectedPaket, packages])

  const totalUjian      = filteredData.length
  const nilaiTertinggi  = filteredData.length > 0 ? Math.max(...filteredData.map(x => x.skor)) : 0
  const nilaiTerakhir   = filteredData.length > 0 ? filteredData[filteredData.length - 1]?.skor : 0
  const rataRata        = filteredData.length > 0 ? Math.round(filteredData.reduce((a,b) => a + b.skor, 0) / filteredData.length) : 0

  const statValues: Record<string,number> = { total: totalUjian, tinggi: nilaiTertinggi, terakhir: nilaiTerakhir, rata: rataRata }

  const chartData = filteredData.map(item => ({
    tanggal: new Date(item.tanggal).toLocaleDateString("id-ID", { day:"2-digit", month:"short" }),
    skor: item.skor,
    kategori: item.kategori,
    paket: getPackageName(item.package_id),
  }))

  const pieRaw = filteredData.reduce<Record<string,number>>((acc, item) => {
    acc[item.kategori] = (acc[item.kategori] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(pieRaw).map(([name, value]) => ({ name, value }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background:"#1e293b", border:"1px solid rgba(99,102,241,0.3)", borderRadius:16, padding:"12px 16px" }}>
        <p style={{ color:"#94a3b8", fontSize:11, marginBottom:4 }}>{d.tanggal} · {d.kategori}</p>
        <p style={{ color:"#a5b4fc", fontSize:28, fontWeight:900, lineHeight:1 }}>{d.skor}</p>
        <p style={{ color:"#64748b", fontSize:11, marginTop:4 }}>{d.paket}</p>
      </div>
    )
  }

  /* ── LOADING ── */
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0a0f1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`
        @keyframes spin-ring { to { transform: rotate(360deg); } }
        @keyframes pg { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.4)} 50%{box-shadow:0 0 44px rgba(99,102,241,0.9)} }
        .lr { width:56px;height:56px;border:3px solid transparent;border-top:3px solid #6366f1;border-right:3px solid #06b6d4;border-radius:50%;animation:spin-ring .8s linear infinite,pg 1.5s ease-in-out infinite; }
      `}</style>
      <div style={{ textAlign:"center" }}>
        <div className="lr" style={{ margin:"0 auto 16px" }} />
        <p style={{ color:"#818cf8", fontSize:11, fontWeight:800, letterSpacing:"0.18em" }}>MEMUAT PROGRESS…</p>
      </div>
    </div>
  )

  /* ── MAIN ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { font-family:'Plus Jakarta Sans',sans-serif; box-sizing:border-box; }
        :root {
          --bg:#0a0f1e; --card:#111827; --card2:#161f35;
          --border:rgba(99,102,241,0.15); --accent:#6366f1; --accent2:#06b6d4;
          --text:#f1f5f9; --muted:#64748b; --muted2:#475569;
        }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes pulse-dot{ 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} }
        @keyframes shine    { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes countUp  { from{opacity:0;transform:scale(.6)} to{opacity:1;transform:scale(1)} }
        @keyframes spin-ring{ to{transform:rotate(360deg)} }
        @keyframes bar-grow { from{width:0} to{width:var(--bar-w)} }

        /* topbar */
        .pg-topbar {
          background:rgba(10,15,30,0.88);
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
          border-bottom:1px solid rgba(99,102,241,0.12);
        }

        /* hero */
        .pg-hero {
          background:linear-gradient(135deg,#1e1b4b 0%,#0f172a 55%,#0c1a2e 100%);
          position:relative; overflow:hidden;
          border-bottom:1px solid rgba(99,102,241,0.12);
        }
        .pg-hero::before{
          content:''; position:absolute;
          width:700px;height:700px;
          background:radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%);
          top:-250px; right:-100px; pointer-events:none;
        }
        .pg-hero::after{
          content:''; position:absolute;
          width:500px;height:500px;
          background:radial-gradient(circle,rgba(6,182,212,0.13) 0%,transparent 70%);
          bottom:-180px; left:-60px; pointer-events:none;
        }

        /* card base */
        .pg-card {
          background:var(--card);
          border:1px solid var(--border);
          border-radius:24px;
          animation:fadeUp .45s ease both;
          transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease;
        }
        .pg-card:hover {
          transform:translateY(-4px);
          box-shadow:0 20px 44px rgba(0,0,0,0.4),0 0 0 1px rgba(99,102,241,0.3);
          border-color:rgba(99,102,241,0.4);
        }

        /* stat card */
        .pg-stat {
          background:var(--card);
          border:1px solid var(--border);
          border-radius:20px;
          padding:18px 20px;
          animation:fadeUp .4s ease both;
          transition:transform .3s,box-shadow .3s,border-color .3s;
          position:relative; overflow:hidden;
        }
        .pg-stat:hover {
          transform:translateY(-4px);
          box-shadow:0 16px 40px rgba(0,0,0,0.35),0 0 0 1px rgba(99,102,241,0.3);
          border-color:rgba(99,102,241,0.35);
        }
        .pg-stat-val { animation:countUp .5s cubic-bezier(.34,1.56,.64,1) both; animation-delay:.2s; }

        /* history row */
        .pg-row {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.05);
          border-radius:18px;
          animation:fadeUp .4s ease both;
          transition:all .25s ease;
        }
        .pg-row:hover {
          background:rgba(99,102,241,0.07);
          border-color:rgba(99,102,241,0.2);
          transform:translateX(4px);
        }

        /* select */
        .pg-select {
          background:rgba(255,255,255,0.05);
          border:1.5px solid rgba(99,102,241,0.2);
          color:#f1f5f9;
          border-radius:14px;
          padding:0 16px;
          outline:none;
          transition:all .3s;
          appearance:none;
          cursor:pointer;
        }
        .pg-select:focus {
          background:rgba(99,102,241,0.1);
          border-color:rgba(99,102,241,0.6);
          box-shadow:0 0 0 4px rgba(99,102,241,0.1);
        }
        .pg-select option { background:#1e293b; color:#f1f5f9; }

        /* btn */
        .pg-btn {
          background:linear-gradient(135deg,#6366f1,#06b6d4);
          color:#fff; font-weight:800; border-radius:12px;
          display:flex; align-items:center; justify-content:center;
          transition:all .3s; position:relative; overflow:hidden; cursor:pointer; border:none;
        }
        .pg-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,#818cf8,#22d3ee); opacity:0; transition:opacity .3s; }
        .pg-btn:hover::before { opacity:1; }
        .pg-btn:active { transform:scale(.97); }
        .pg-btn span { position:relative; z-index:1; }

        /* score ring */
        .score-ring {
          width:52px; height:52px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:18px; font-weight:900; flex-shrink:0;
        }

        /* dot live */
        .dot-live { width:7px;height:7px;background:#10b981;border-radius:50%;display:inline-block;animation:pulse-dot 1.5s ease-in-out infinite; }

        /* scrollbar */
        .sb-hide::-webkit-scrollbar{display:none} .sb-hide{-ms-overflow-style:none;scrollbar-width:none}

        /* chart grid */
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical   line { stroke:rgba(255,255,255,0.05) !important; }

        /* stagger */
        .pg-stat:nth-child(1){animation-delay:.05s}
        .pg-stat:nth-child(2){animation-delay:.10s}
        .pg-stat:nth-child(3){animation-delay:.15s}
        .pg-stat:nth-child(4){animation-delay:.20s}
        .pg-row:nth-child(1){animation-delay:.06s}
        .pg-row:nth-child(2){animation-delay:.10s}
        .pg-row:nth-child(3){animation-delay:.14s}
        .pg-row:nth-child(4){animation-delay:.18s}
        .pg-row:nth-child(5){animation-delay:.22s}

        /* empty float */
        .pg-float { animation:float 3s ease-in-out infinite; }

        /* score color */
        .sc-high  { background:linear-gradient(135deg,#10b981,#059669); color:#fff; }
        .sc-mid   { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }
        .sc-low   { background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; }

        /* avatar shimmer */
        .ava-ring { box-shadow:0 0 0 3px rgba(99,102,241,0.4),0 0 20px rgba(99,102,241,0.2); }

        /* mobile history compact */
        @media(max-width:767px){
          .pg-hist-score { font-size:28px; }
          .pg-hist-title { font-size:14px; }
          .pg-hist-sub   { font-size:11px; }
        }
      `}</style>

      <div style={{ minHeight:"100vh", background:"var(--bg)", paddingBottom:40 }}>

        {/* ══════════ TOP BAR ══════════ */}
        <div className="sticky top-0 z-50 pg-topbar">
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>

            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
              {/* Avatar */}
              {foto ? (
                <img src={foto} alt="avatar"
                  className="ava-ring"
                  style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
              ) : (
                <div className="ava-ring"
                  style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, fontWeight:900, flexShrink:0 }}>
                  {nama.slice(0,2).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth:0 }}>
                <p style={{ color:"var(--accent2)", fontSize:9, fontWeight:900, letterSpacing:"0.18em", textTransform:"uppercase" }}>Lampung Cerdas</p>
                <h1 style={{ color:"var(--text)", fontSize:"clamp(13px,3vw,20px)", fontWeight:900, lineHeight:1.1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  Progress Akademik
                </h1>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              {/* Desktop count */}
              <div className="d-none d-md-flex" style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:10, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                <span className="dot-live" />
                <span style={{ color:"var(--muted)", fontSize:11, fontWeight:700 }}>{totalUjian} Ujian</span>
              </div>
              <button onClick={() => router.push("/dashboard")} className="pg-btn" style={{ height:36, padding:"0 16px", fontSize:12 }}>
                <span>← Dashboard</span>
              </button>
            </div>

          </div>
        </div>

        {/* ══════════ HERO (desktop) ══════════ */}
        <div className="pg-hero" style={{ display:"none" }} id="pg-hero-section">
          {/* shown via media query override below */}
        </div>
        <style>{`@media(min-width:768px){#pg-hero-section{display:block!important}}`}</style>
        <div className="pg-hero" id="pg-hero-section" style={{ display:"none" }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"36px 32px", position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:24, flexWrap:"wrap" }}>
              <div>
                <p style={{ color:"var(--accent2)", fontSize:11, fontWeight:900, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:8 }}>✦ Pantau Perkembanganmu</p>
                <h2 style={{ color:"var(--text)", fontSize:"clamp(28px,3.5vw,44px)", fontWeight:900, lineHeight:1.15, marginBottom:12 }}>
                  Lihat Seberapa Jauh<br />
                  <span style={{ background:"linear-gradient(135deg,#a5b4fc,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    Kamu Berkembang
                  </span>
                </h2>
                <p style={{ color:"var(--muted)", fontSize:14, maxWidth:480, lineHeight:1.6 }}>
                  Pantau grafik nilai, distribusi mapel, dan riwayat ujian kamu dalam satu halaman yang lengkap.
                </p>
              </div>

              {/* Profile + filter */}
              <div style={{ display:"flex", alignItems:"center", gap:20, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  {foto ? (
                    <img src={foto} alt="avatar" className="ava-ring"
                      style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover" }} />
                  ) : (
                    <div className="ava-ring"
                      style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:24, fontWeight:900 }}>
                      {nama.slice(0,2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p style={{ color:"var(--muted)", fontSize:11, fontWeight:600 }}>Selamat belajar,</p>
                    <h3 style={{ color:"var(--text)", fontSize:22, fontWeight:900, lineHeight:1.1 }}>{nama}</h3>
                  </div>
                </div>

                {/* Select */}
                <div style={{ position:"relative" }}>
                  <select value={selectedPaket} onChange={e => setSelectedPaket(e.target.value)}
                    className="pg-select" style={{ height:46, width:220, fontSize:13, fontWeight:700 }}>
                    <option>Semua</option>
                    {packages.map(p => <option key={p.id} value={p.nama_paket}>{p.nama_paket}</option>)}
                  </select>
                  <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"var(--muted)", pointerEvents:"none", fontSize:12 }}>▾</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ CONTENT ══════════ */}
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"16px 16px 0" }}>

          {/* MOBILE: nama + filter */}
          <div style={{ marginBottom:14 }} id="mob-profile">
            <style>{`@media(min-width:768px){#mob-profile{display:none!important}}`}</style>
            <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:20, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, animation:"fadeUp .4s ease both" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                {foto ? (
                  <img src={foto} alt="av" className="ava-ring" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                ) : (
                  <div className="ava-ring" style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:15, fontWeight:900, flexShrink:0 }}>
                    {nama.slice(0,2).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth:0 }}>
                  <p style={{ color:"var(--muted)", fontSize:10, fontWeight:600 }}>Halo 👋</p>
                  <p style={{ color:"var(--text)", fontSize:14, fontWeight:900, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nama}</p>
                </div>
              </div>
              <div style={{ position:"relative", flexShrink:0 }}>
                <select value={selectedPaket} onChange={e => setSelectedPaket(e.target.value)}
                  className="pg-select" style={{ height:36, width:130, fontSize:11, fontWeight:700, paddingRight:24 }}>
                  <option>Semua</option>
                  {packages.map(p => <option key={p.id} value={p.nama_paket}>{p.nama_paket}</option>)}
                </select>
                <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", color:"var(--muted)", pointerEvents:"none", fontSize:10 }}>▾</span>
              </div>
            </div>
          </div>

          {/* ── STAT CARDS ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:14 }} id="stat-grid">
            <style>{`@media(min-width:768px){#stat-grid{grid-template-columns:repeat(4,1fr)!important;gap:16px!important;margin-bottom:24px!important}}`}</style>
            {STAT_CFG.map((s,i) => (
              <div key={s.key} className="pg-stat" style={{ animationDelay:`${i*0.07}s` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ color:"var(--muted)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{s.title}</p>
                    <p className="pg-stat-val" style={{ color:"var(--text)", fontSize:"clamp(28px,5vw,48px)", fontWeight:900, lineHeight:1 }}>
                      {statValues[s.key]}
                    </p>
                  </div>
                  <div style={{ width:44, height:44, borderRadius:14, background:`linear-gradient(135deg,${s.grad.replace("from-","").replace(" to-",",")})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, boxShadow:"0 8px 20px rgba(0,0,0,0.3)" }}>
                    {/* inline gradient trick — use direct style */}
                  </div>
                </div>
                {/* icon via absolute overlay */}
                <div style={{ position:"absolute", top:18, right:18, width:44, height:44, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}
                  className={`bg-gradient-to-br ${s.grad}`}>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* ── CHARTS ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14, marginBottom:14 }} id="chart-grid">
            <style>{`@media(min-width:1024px){#chart-grid{grid-template-columns:2fr 1fr!important;gap:20px!important;margin-bottom:24px!important}}`}</style>

            {/* AREA CHART */}
            <div className="pg-card" style={{ padding:"20px 20px 16px" }}>
              <div style={{ marginBottom:16 }}>
                <h2 style={{ color:"var(--text)", fontSize:"clamp(16px,3vw,24px)", fontWeight:900, marginBottom:4 }}>Grafik Nilai</h2>
                <p style={{ color:"var(--muted)", fontSize:12 }}>Perkembangan nilai ujian dari waktu ke waktu</p>
              </div>
              {chartData.length === 0 ? (
                <div style={{ height:280, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
                  <div className="pg-float" style={{ fontSize:48 }}>📉</div>
                  <p style={{ color:"var(--text)", fontWeight:900, fontSize:16 }}>Belum Ada Data</p>
                  <p style={{ color:"var(--muted)", fontSize:12 }}>Kerjakan ujian agar grafik muncul</p>
                </div>
              ) : (
                <div style={{ width:"100%", height:260 }} id="area-h">
                  <style>{`@media(min-width:768px){#area-h{height:340px!important}}`}</style>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top:5, right:8, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="cScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id="cScore2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="tanggal" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,100]} tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="skor" stroke="#6366f1" strokeWidth={3}
                        fillOpacity={1} fill="url(#cScore)"
                        dot={{ r:4, fill:"#6366f1", stroke:"#0a0f1e", strokeWidth:2 }}
                        activeDot={{ r:6, fill:"#06b6d4", stroke:"#0a0f1e", strokeWidth:2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* PIE CHART */}
            <div className="pg-card" style={{ padding:"20px 20px 16px" }}>
              <div style={{ marginBottom:16 }}>
                <h2 style={{ color:"var(--text)", fontSize:"clamp(15px,2.5vw,22px)", fontWeight:900, marginBottom:4 }}>Distribusi Mapel</h2>
                <p style={{ color:"var(--muted)", fontSize:12 }}>Sebaran ujian per kategori</p>
              </div>
              {pieData.length === 0 ? (
                <div style={{ height:220, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <p style={{ color:"var(--muted)", fontSize:13 }}>Belum ada data</p>
                </div>
              ) : (
                <>
                  <div style={{ width:"100%", height:200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                          {pieData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background:"#1e293b", border:"1px solid rgba(99,102,241,0.3)", borderRadius:12, color:"#f1f5f9", fontSize:12 }}
                          itemStyle={{ color:"#a5b4fc" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:12 }}>
                    {pieData.map((d,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[i%COLORS.length], flexShrink:0 }} />
                          <span style={{ color:"#94a3b8", fontSize:11, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span>
                        </div>
                        <span style={{ color:"var(--text)", fontSize:12, fontWeight:800, flexShrink:0 }}>{d.value}×</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── HISTORY ── */}
          <div className="pg-card" style={{ padding:"20px 20px 8px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:8, flexWrap:"wrap" }}>
              <div>
                <h2 style={{ color:"var(--text)", fontSize:"clamp(16px,3vw,24px)", fontWeight:900 }}>Riwayat Ujian</h2>
                <p style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>{filteredData.length} hasil ditemukan</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span className="dot-live" />
                <span style={{ color:"var(--muted)", fontSize:11, fontWeight:600 }}>Live sync</span>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 0" }}>
                <div className="pg-float" style={{ fontSize:48, marginBottom:12 }}>📘</div>
                <p style={{ color:"var(--text)", fontWeight:900, fontSize:16, marginBottom:4 }}>Belum Ada Riwayat</p>
                <p style={{ color:"var(--muted)", fontSize:12 }}>Kerjakan ujian untuk melihat histori nilai</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, paddingBottom:12 }}>
                {filteredData.slice().reverse().map((item, i) => {
                  const sc = item.skor >= 80 ? "sc-high" : item.skor >= 60 ? "sc-mid" : "sc-low"
                  return (
                    <div key={i} className="pg-row" style={{ padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, animationDelay:`${i*0.05}s` }}>
                      {/* Left */}
                      <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
                        <div className={`score-ring ${sc}`}>{item.skor}</div>
                        <div style={{ minWidth:0 }}>
                          <p className="pg-hist-title" style={{ color:"var(--text)", fontWeight:800, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {item.kategori}
                          </p>
                          <p className="pg-hist-sub" style={{ color:"var(--muted)", fontSize:11, marginTop:1 }}>
                            {getPackageName(item.package_id)}
                          </p>
                          <p className="pg-hist-sub" style={{ color:"var(--muted2)", fontSize:10, marginTop:1 }}>
                            {new Date(item.tanggal).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" })}
                          </p>
                        </div>
                      </div>
                      {/* Right: mini progress bar */}
                      <div style={{ flexShrink:0, textAlign:"right", minWidth:60 }}>
                        <div style={{ height:4, width:60, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden", marginBottom:4 }}>
                          <div style={{ height:"100%", width:`${item.skor}%`, background:"linear-gradient(90deg,#6366f1,#06b6d4)", borderRadius:99, transition:"width .8s ease" }} />
                        </div>
                        <span style={{ color:"var(--muted)", fontSize:10, fontWeight:700 }}>{item.skor}/100</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
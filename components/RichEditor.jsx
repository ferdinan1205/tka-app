'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import styles from './RichEditor.module.css';

// ── Simbol per kategori ──────────────────────────────────────────────────────
const CATS = [
  {
    name: 'Umum',
    syms: [
      ['√', 'Akar kuadrat', '√'], ['∛', 'Akar kubik', '∛'], ['∜', 'Akar pangkat 4', '∜'],
      ['xⁿ', 'Pangkat', 'xⁿ'], ['x₁', 'Indeks bawah', 'x₁'], ['x̄', 'Rata-rata', 'x̄'],
      ['|x|', 'Nilai mutlak', '|x|'], ['∞', 'Tak hingga', '∞'], ['≈', 'Hampir sama', '≈'],
      ['≠', 'Tidak sama', '≠'], ['≤', 'Kurang dari sama', '≤'], ['≥', 'Lebih dari sama', '≥'],
      ['∝', 'Sebanding', '∝'], ['±', 'Plus minus', '±'], ['×', 'Kali', '×'],
      ['÷', 'Bagi', '÷'], ['·', 'Titik kali', '·'], ['%', 'Persen', '%'],
      ['‰', 'Permil', '‰'], ['∴', 'Jadi', '∴'], ['∵', 'Karena', '∵'], ['≡', 'Identik', '≡'],
    ],
  },
  {
    name: 'Pecahan & Rumus',
    syms: [
      ['a/b', 'Pecahan', 'a/b'], ['(a+b)/c', 'Pecahan jumlah', '(a+b)/c'],
      ['a/(b+c)', 'Pecahan penyebut', 'a/(b+c)'],
      ['%', 'Persen', '(bagian/total)×100%'],
      ['x̄', 'Rata-rata', 'Σx/n'],
      ['σ', 'Standar deviasi', '√(Σ(x-x̄)²/n)'],
      ['abc', 'Rumus ABC', '(-b±√(b²-4ac))/2a'],
      ['D', 'Diskriminan', 'b²-4ac'],
      ['log', 'Logaritma', 'log_a(b)'],
      ['nPr', 'Permutasi', 'n!/(n-r)!'],
      ['nCr', 'Kombinasi', 'n!/r!(n-r)!'],
      ['lim', 'Limit', 'lim(x→a) f(x)'],
      ['d/dx', 'Turunan', 'd/dx f(x)'],
      ['∫', 'Integral', '∫f(x)dx'],
      ['∫ab', 'Integral tentu', '∫_a^b f(x)dx'],
    ],
  },
  {
    name: 'Yunani',
    syms: [
      ['α','alpha','α'],['β','beta','β'],['γ','gamma','γ'],['δ','delta','δ'],
      ['ε','epsilon','ε'],['ζ','zeta','ζ'],['η','eta','η'],['θ','theta','θ'],
      ['λ','lambda','λ'],['μ','mu','μ'],['π','pi','π'],['ρ','rho','ρ'],
      ['σ','sigma','σ'],['τ','tau','τ'],['φ','phi','φ'],['ω','omega','ω'],
      ['Δ','Delta besar','Δ'],['Σ','Sigma besar','Σ'],['Π','Pi besar','Π'],
      ['Ω','Omega besar','Ω'],['Λ','Lambda besar','Λ'],['Θ','Theta besar','Θ'],
    ],
  },
  {
    name: 'Himpunan & Logika',
    syms: [
      ['∈','Elemen dari','∈'],['∉','Bukan elemen','∉'],['⊂','Subset','⊂'],
      ['⊃','Superset','⊃'],['⊆','Subset atau sama','⊆'],['∪','Gabungan','∪'],
      ['∩','Irisan','∩'],['∅','Himpunan kosong','∅'],['∀','Untuk semua','∀'],
      ['∃','Ada/terdapat','∃'],['¬','Negasi','¬'],['∧','Dan (logika)','∧'],
      ['∨','Atau (logika)','∨'],['⇒','Implikasi','⇒'],['⟺','Biimplikasi','⟺'],
    ],
  },
  {
    name: 'Trigonometri',
    syms: [
      ['sin','Sinus','sin θ'],['cos','Kosinus','cos θ'],['tan','Tangen','tan θ'],
      ['sin⁻¹','Arcsin','sin⁻¹(x)'],['cos⁻¹','Arccos','cos⁻¹(x)'],['tan⁻¹','Arctan','tan⁻¹(x)'],
      ['sin²+cos²','Identitas Pitagoras','sin²θ+cos²θ=1'],
      ['sin2θ','Sin ganda','2sinθcosθ'],
      ['cos2θ','Cos ganda','cos²θ-sin²θ'],
      ['a/sinA','Aturan sinus','a/sinA=b/sinB=c/sinC'],
      ['c²','Aturan kosinus','c²=a²+b²-2ab·cosC'],
      ['L△','Luas segitiga','L=½ab·sinC'],
      ['π rad','Pi radian','π rad = 180°'],
      ['°→rad','Derajat ke radian','×(π/180)'],
      ['rad→°','Radian ke derajat','×(180/π)'],
    ],
  },
  {
    name: 'Fisika',
    syms: [
      ['v=s/t','Kecepatan','v=s/t'],['a=Δv/Δt','Percepatan','a=Δv/Δt'],
      ['F=ma','Hukum II Newton','F=m·a'],['W=mg','Berat','W=m·g'],
      ['Ek','Energi kinetik','Ek=½mv²'],['Ep','Energi potensial','Ep=mgh'],
      ['W=Fs','Usaha','W=F·s·cosθ'],['P=W/t','Daya','P=W/t'],
      ['p=mv','Momentum','p=m·v'],['P=F/A','Tekanan','P=F/A'],
      ['V=IR','Hukum Ohm','V=I·R'],['P=VI','Daya listrik','P=V·I'],
      ['T=1/f','Periode','T=1/f'],['v=λf','Cepat rambat gelombang','v=λ·f'],
      ['Q=mcΔT','Kalor','Q=m·c·ΔT'],['E=mc²','Einstein','E=mc²'],
    ],
  },
  {
    name: 'Biologi',
    syms: [
      ['foto','Fotosintesis','6CO₂+6H₂O→C₆H₁₂O₆+6O₂'],
      ['resp','Respirasi aerob','C₆H₁₂O₆+6O₂→6CO₂+6H₂O+ATP'],
      ['ferm','Fermentasi','C₆H₁₂O₆→2C₂H₅OH+2CO₂'],
      ['HW','Hardy-Weinberg','p²+2pq+q²=1'],
      ['p+q','Frekuensi alel','p+q=1'],
      ['BMI','Indeks Massa Tubuh','BB(kg)/TB(m)²'],
      ['r','Laju pertumbuhan','r=(N₁-N₀)/(N₀·t)'],
      ['Nt','Pertumbuhan eksponensial','Nt=N₀·eʳᵗ'],
      ['RQ','Koefisien respirasi','RQ=CO₂/O₂'],
      ['pH','pH larutan','pH=-log[H⁺]'],
      ['π=MRT','Tekanan osmosis','π=MRT'],
      ['Km','Michaelis-Menten','v=Vmax·[S]/(Km+[S])'],
    ],
  },
  {
    name: 'Tabel',
    syms: [
      ['2×2','Tabel 2×2','__tbl_2_2'],['2×3','Tabel 2×3','__tbl_2_3'],
      ['3×3','Tabel 3×3','__tbl_3_3'],['3×4','Tabel 3×4','__tbl_3_4'],
      ['4×4','Tabel 4×4','__tbl_4_4'],['4×5','Tabel 4×5','__tbl_4_5'],
      ['5×5','Tabel 5×5','__tbl_5_5'],['5×6','Tabel 5×6','__tbl_5_6'],
    ],
  },
];

// ── Komponen utama ────────────────────────────────────────────────────────────
export default function RichEditor({ placeholder = 'Tulis di sini...' }) {
  const editorRef = useRef(null);
  const savedSelRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [tooltip, setTooltip] = useState({ text: '', x: 0, y: 0, show: false });

  // Simpan posisi kursor
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // Kembalikan posisi kursor lalu fokus
  const restoreSelection = useCallback(() => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (savedSelRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelRef.current);
    }
  }, []);

  // Sisipkan HTML di posisi kursor
  const insertHTML = useCallback((html) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    saveSelection();
  }, [restoreSelection, saveSelection]);

  // Sisipkan chip rumus/simbol
  const insertSymbol = useCallback((val) => {
    if (val.startsWith('__tbl_')) {
      const parts = val.split('_');
      const rows = parseInt(parts[2]);
      const cols = parseInt(parts[3]);
      let html = '<table style="border-collapse:collapse;margin:4px 0"><tbody>';
      for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
          const tag = r === 0 ? 'th' : 'td';
          const baseStyle = 'border:1px solid #ccc;padding:4px 10px;min-width:60px;font-size:13px;';
          const thStyle = r === 0 ? 'background:#f5f5f5;font-weight:500;' : '';
          html += `<${tag} contenteditable="true" style="${baseStyle}${thStyle}">${r === 0 ? `Kol ${c + 1}` : '&nbsp;'}</${tag}>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      insertHTML(html);
    } else {
      insertHTML(
        `<span contenteditable="false" style="display:inline-block;background:#e8f0fe;border:1px solid #c5d4f5;border-radius:4px;padding:0 5px;font-family:monospace;font-size:13px;color:#1a56db;margin:0 1px;cursor:default;">${val}</span>&#8203;`
      );
    }
  }, [insertHTML]);

  // Eksekusi perintah format teks
  const fmt = useCallback((cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    saveSelection();
  }, [saveSelection]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.addEventListener('mouseup', saveSelection);
    el.addEventListener('keyup', saveSelection);
    return () => {
      el.removeEventListener('mouseup', saveSelection);
      el.removeEventListener('keyup', saveSelection);
    };
  }, [saveSelection]);

  const currentSyms = CATS[activeTab].syms;

  return (
    <div className={styles.wrap}>
      {/* ── Main toolbar ── */}
      <div className={styles.editorBox}>
        <div className={styles.mainToolbar}>
          <select
            className={styles.select}
            onChange={(e) => fmt('formatBlock', e.target.value)}
          >
            <option value="p">Normal</option>
            <option value="h1">Judul 1</option>
            <option value="h2">Judul 2</option>
            <option value="h3">Judul 3</option>
          </select>
          <span className={styles.sep} />
          <button className={styles.tbBtn} onClick={() => fmt('bold')}><b>B</b></button>
          <button className={styles.tbBtn} onClick={() => fmt('italic')}><i>I</i></button>
          <button className={styles.tbBtn} onClick={() => fmt('underline')}><u>U</u></button>
          <button className={styles.tbBtn} onClick={() => fmt('strikeThrough')}><s>S</s></button>
          <span className={styles.sep} />
          <button className={styles.tbBtn} onClick={() => fmt('insertUnorderedList')}>• List</button>
          <button className={styles.tbBtn} onClick={() => fmt('insertOrderedList')}>1. List</button>
          <span className={styles.sep} />
          <button
            className={styles.tbBtn}
            style={{ fontSize: 11, color: 'var(--color-text-secondary, #666)' }}
            onClick={() => fmt('removeFormat')}
          >Tx</button>
        </div>

        {/* ── Equation bar ── */}
        <div className={styles.eqBar}>
          <div className={styles.eqTabs}>
            {CATS.map((cat, i) => (
              <button
                key={cat.name}
                className={`${styles.eqTab} ${activeTab === i ? styles.eqTabOn : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className={styles.eqSymbols}>
            {currentSyms.map(([label, tip, val]) => (
              <button
                key={label + tip}
                className={`${styles.sym} ${label.length > 3 ? styles.symWide : ''}`}
                title={tip}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({ text: tip, show: true });
                }}
                onMouseLeave={() => setTooltip((t) => ({ ...t, show: false }))}
                onClick={() => insertSymbol(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Editor area ── */}
        <div
          ref={editorRef}
          className={styles.editorArea}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onFocus={saveSelection}
        />
      </div>
    </div>
  );
}
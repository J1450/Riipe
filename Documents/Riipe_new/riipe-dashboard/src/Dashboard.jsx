import { useState, useEffect, useRef, useCallback } from "react";
import FormFiller from "./FormFiller";

// ─── DESIGN TOKENS (matching Landing.jsx) ───────────────────────────────────
const T = {
  accent: "#c6ff00",
  accentDim: "rgba(198,255,0,.08)",
  accentBorder: "rgba(198,255,0,.22)",
  bg: "#0b0c08",
  hero: "#111410",
  card: "#141610",
  cardDark: "#111410",
  border: "rgba(255,255,255,.07)",
  borderDark: "rgba(255,255,255,.09)",
  text: "#f0f0e8",
  textMuted: "rgba(255,255,255,.55)",
  textFaint: "rgba(255,255,255,.28)",
  positive: "#6ec86a",
  negative: "#e07878",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${T.bg};
    color: ${T.text};
    font-family: 'Inter', sans-serif;
    height: 100vh;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pageIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes breathe {
    0%,100% { opacity:1; } 50% { opacity:0.35; }
  }
  @keyframes popIn {
    from { transform: scale(0); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes glowPulse {
    0%,100% { opacity:.8; } 50% { opacity:.3; }
  }

  .login-card { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
  .page-anim  { animation: pageIn 0.35s ease both; }
  .network-dot-anim { animation: breathe 2s ease-in-out infinite; }
  .success-icon-anim { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }

  .nav-item-hover:hover {
    background: rgba(198,255,0,.05) !important;
    color: #fff !important;
  }
  .nav-item-hover.active-nav {
    color: ${T.accent} !important;
    border-left-color: ${T.accent} !important;
    background: rgba(198,255,0,.06) !important;
  }

  .asset-tab-btn { cursor: pointer; transition: all 0.2s; }
  .asset-tab-btn:hover { background: rgba(198,255,0,.1) !important; color: ${T.accent} !important; border-color: ${T.accent} !important; }
  .asset-tab-btn.tab-active { background: ${T.accent} !important; color: #0b0c08 !important; border-color: ${T.accent} !important; }

  .card-hover { transition: border-color 0.2s, box-shadow 0.2s; }
  .card-hover:hover { border-color: rgba(255,255,255,.14) !important; box-shadow: 0 8px 40px rgba(0,0,0,.5) !important; }

  .connect-btn-el:hover { filter: brightness(1.12); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(198,255,0,.25); }
  .cta-btn-el:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(198,255,0,.22); }

  .pill-el { cursor: pointer; transition: all 0.2s; }
  .pill-el:hover { border-color: ${T.accent} !important; color: #fff !important; }
  .pill-el.pill-selected { border-color: ${T.accent} !important; background: rgba(198,255,0,.08) !important; color: ${T.accent} !important; }

  .upload-zone-el { cursor: pointer; transition: all 0.25s; }
  .upload-zone-el:hover { border-color: ${T.accent} !important; background: rgba(198,255,0,.04) !important; }

  .doc-card-el { cursor: pointer; transition: all 0.2s; }
  .doc-card-el:hover { border-color: rgba(198,255,0,.22) !important; }
  .doc-card-el.doc-uploaded { border-color: ${T.positive} !important; background: rgba(110,200,106,.05) !important; }

  .field-input-el, .field-select-el, .field-textarea-el {
    background: rgba(255,255,255,.04);
    border: 1.5px solid rgba(255,255,255,.1);
    border-radius: 10px;
    padding: 12px 14px;
    color: ${T.text};
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
  }
  .field-input-el::placeholder { color: rgba(255,255,255,.2); }
  .field-input-el:focus, .field-select-el:focus, .field-textarea-el:focus {
    border-color: ${T.accent};
    box-shadow: 0 0 0 3px rgba(198,255,0,.1);
  }
  .field-select-el {
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,.3)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px;
  }
  .field-select-el option { background: #181a14; }
  .field-textarea-el { resize: vertical; min-height: 90px; line-height: 1.6; }

  .btn-back-el { transition: all 0.2s; }
  .btn-back-el:hover { border-color: rgba(255,255,255,.4) !important; color: #fff !important; }
  .btn-next-el:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(198,255,0,.22); }
  .btn-submit-el:hover { filter: brightness(1.1); transform: translateY(-1px); }

  .review-row-el:hover { background: rgba(198,255,0,.03); }

  .spv-ai-content h2 {
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700;
    color: ${T.accent}; letter-spacing: 0.05em; text-transform: uppercase;
    margin: 20px 0 10px; padding-bottom: 6px;
    border-bottom: 1px solid rgba(198,255,0,.12);
  }
  .spv-ai-content p { font-family: 'DM Mono', monospace; font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.8; margin-bottom: 10px; }
  .spv-ai-content ul { padding-left: 20px; margin-bottom: 12px; }
  .spv-ai-content li { font-family: 'DM Mono', monospace; font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.8; margin-bottom: 4px; }
  .spv-ai-content strong { color: ${T.text}; }
  .spv-ai-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-family: 'DM Mono', monospace; font-size: 12px; }
  .spv-ai-content th { padding: 8px 12px; text-align: left; background: rgba(198,255,0,.06); color: ${T.accent}; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 1px solid rgba(198,255,0,.12); }
  .spv-ai-content td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.05); color: rgba(255,255,255,.65); }
`;

// ─── LOGO ────────────────────────────────────────────────────────────────────
function Logo({ size = 20 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="3.5" height="20" rx="1.5" fill={T.accent} />
        <rect x="9" y="2" width="3.5" height="13" rx="1.5" fill="rgba(198,255,0,.5)" />
        <rect x="16" y="2" width="3.5" height="17" rx="1.5" fill="rgba(198,255,0,.25)" />
      </svg>
      <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: size - 3, letterSpacing: "-0.05em", color: T.text }}>riipe</span>
    </div>
  );
}

// ─── OVERVIEW ICONS ──────────────────────────────────────────────────────────
const icons = {
  overview: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  personal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  tokenized: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  processing: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  newproject: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  formfiller: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
};

// ─── ASSET DATA ───────────────────────────────────────────────────────────────
const assetData = {
  "RWA-NYC": { price: "$1,284.40", change: "+2.14%", volume: "$2.4M", mcap: "$128M", up: true, prices: [1210,1225,1218,1240,1235,1258,1252,1270,1265,1280,1274,1284] },
  "RWA-LA":  { price: "$920.10",  change: "+0.88%", volume: "$940K",  mcap: "$74M",  up: true, prices: [890,895,900,898,905,910,908,912,915,918,920,920] },
  "RWA-MIA": { price: "$1,100.00",change: "-0.32%", volume: "$1.1M",  mcap: "$64M",  up: false,prices: [1120,1115,1108,1110,1105,1102,1108,1104,1100,1103,1101,1100] },
  "RWA-CHI": { price: "$780.50",  change: "+1.02%", volume: "$720K",  mcap: "$45M",  up: true, prices: [755,760,758,764,770,768,772,775,778,780,779,780] },
};
const chartLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── MINI SPARKLINE ──────────────────────────────────────────────────────────
function Sparkline({ prices, up }) {
  const min = Math.min(...prices), max = Math.max(...prices);
  const w = 260, h = 60;
  const pts = prices.map((p, i) => `${(i / (prices.length - 1)) * w},${h - ((p - min) / (max - min || 1)) * h}`).join(" ");
  const color = up ? T.accent : T.negative;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${up}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.8" points={pts} />
      <polygon fill={`url(#sg-${up})`} points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

// ─── YIELD BAR ───────────────────────────────────────────────────────────────
function YieldBar({ label, pct, val }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, width: 22, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,.08)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: T.accent, borderRadius: 4, transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textMuted, width: 34, textAlign: "right" }}>{val}</span>
    </div>
  );
}

// ─── ASSETS TABLE ROWS ───────────────────────────────────────────────────────
const tokenizedAssets = [
  { id: "RWA-NYC", name: "NYC Mixed-Use", type: "Real Estate", tokens: "100,000", held: "8,400", value: "$10.8M", yield: "6.2%", status: "active" },
  { id: "RWA-LA",  name: "LA Commercial", type: "Real Estate", tokens: "80,000",  held: "5,200", value: "$4.8M",  yield: "5.7%", status: "active" },
  { id: "RWA-MIA", name: "Miami Condo",   type: "Real Estate", tokens: "60,000",  held: "3,100", value: "$3.4M",  yield: "7.1%", status: "active" },
  { id: "RWA-CHI", name: "Chicago Office",type: "Real Estate", tokens: "50,000",  held: "2,800", value: "$2.2M",  yield: "5.0%", status: "active" },
];
// List your actual filenames from /public/forms/
const AVAILABLE_FORMS = [
  "California LLC Form.pdf",
  "Delaware LLC Form.pdf",
  "Wyoming LLC Form.pdf"
  // ... add every filename from your forms folder here
];

const processingAssets = [
  { id: "DRAFT-001", name: "Austin Warehouse", sector: "Industrial", value: "$18M",  progress: 65, status: "processing" },
  { id: "DRAFT-002", name: "Denver Retail Hub",  sector: "Retail",    value: "$9.5M", progress: 38, status: "pending" },
];

// ─── OVERVIEW PAGE ───────────────────────────────────────────────────────────
function OverviewPage() {
  const [currentAsset, setCurrentAsset] = useState("RWA-NYC");
  const ad = assetData[currentAsset];

  return (
    <div className="page-anim">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: "-0.04em" }}>Portfolio Overview</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Real-time asset dashboard</div>
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Total Value — spans 2 cols */}
        <div className="card-hover" style={{ gridColumn: "span 2", background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(198,255,0,.07), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: T.textFaint, marginBottom: 14 }}>Total Portfolio Value</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 52, fontWeight: 900, color: T.text, lineHeight: 1, letterSpacing: "-2px" }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: T.accent, marginRight: 6 }}>$</span>
            437,500
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'DM Mono',monospace", fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "rgba(110,200,106,.1)", color: T.positive, marginTop: 12 }}>
            ↑ +$12,480 · +3.24% today
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
            {[["TOKENIZED","$312,000"],["LIQUID","$74,200"],["IN PROCESS","$51,300"],["YIELD EARNED","$18,640"]].map(([l,v],i) => (
              <div key={l}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint, letterSpacing: "1.5px", marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, color: i===3 ? T.positive : T.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Yield Report */}
        <div className="card-hover" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: T.textFaint, marginBottom: 14 }}>Yield Report</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 42, fontWeight: 900, color: T.positive, lineHeight: 1, letterSpacing: "-1.5px" }}>+7.8%</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, marginTop: 4, marginBottom: 18 }}>Annualized APY · Last 12 months</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <YieldBar label="Q1" pct={62} val="1.9%" />
            <YieldBar label="Q2" pct={78} val="2.4%" />
            <YieldBar label="Q3" pct={55} val="1.7%" />
            <YieldBar label="Q4" pct={88} val="2.7%" />
          </div>
        </div>
      </div>

      {/* Trade Panel — full width */}
      <div className="card-hover" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: T.textFaint, marginBottom: 12 }}>Trade Activity</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.keys(assetData).map(key => (
                <button key={key} onClick={() => setCurrentAsset(key)}
                  className={`asset-tab-btn ${currentAsset === key ? "tab-active" : ""}`}
                  style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, color: T.textMuted, background: "transparent" }}>
                  {key}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {[["PRICE", ad.price, false],["24H CHANGE", ad.change, true],["VOLUME", ad.volume, false],["MARKET CAP", ad.mcap, false]].map(([l,v,isChange]) => (
              <div key={l} style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint, letterSpacing: "1.5px", marginBottom: 3 }}>{l}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: isChange ? (ad.up ? T.positive : T.negative) : T.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <Sparkline prices={ad.prices} up={ad.up} />
      </div>
    </div>
  );
}

// ─── PERSONAL INFO PAGE ──────────────────────────────────────────────────────
function PersonalPage({ session }) {
  const fields = [
    ["WALLET ADDRESS", session.address || "—", true],
    ["NETWORK", session.chainName || "—", false],
    ["ETH BALANCE", session.balance ? session.balance + " ETH" : "—", false],
    ["CONNECTED SINCE", session.connectedAt?.toLocaleString() || "—", false],
    ["KYC STATUS", "Verified ✓", false],
    ["ACCOUNT TYPE", "Accredited Investor", false],
    ["JURISDICTION", "United States", false],
    ["2FA STATUS", "Enabled", false],
  ];
  return (
    <div className="page-anim">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: "-0.04em" }}>Personal Information</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Account & wallet details</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {fields.map(([label, val, isAccent]) => (
          <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", color: T.textFaint, marginBottom: 8, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: isAccent ? T.accent : T.text, wordBreak: "break-all" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ASSETS TABLE PAGE ───────────────────────────────────────────────────────
function AssetsPage({ assets, title, subtitle, isProcessing }) {
  return (
    <div className="page-anim">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: "-0.04em" }}>{title}</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>{subtitle}</div>
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {isProcessing
                ? ["ID","PROJECT","SECTOR","TARGET VALUE","PROGRESS","STATUS"].map(h => (
                    <th key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: T.textFaint, textAlign: "left", padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))
                : ["TOKEN","ASSET","TYPE","TOKENS HELD","MARKET VALUE","YIELD","STATUS"].map(h => (
                    <th key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: T.textFaint, textAlign: "left", padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))
              }
            </tr>
          </thead>
          <tbody>
            {isProcessing ? assets.map(a => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.accent }}>{a.id}</td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.text, fontWeight: 600 }}>{a.name}</td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textMuted }}>{a.sector}</td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.text }}>{a.value}</td>
                <td style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.08)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${a.progress}%`, height: "100%", background: T.accent, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textMuted, width: 30 }}>{a.progress}%</span>
                  </div>
                </td>
                <td style={{ padding: "16px 18px" }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, padding: "3px 9px", borderRadius: 6, letterSpacing: "1px", background: a.status==="processing" ? "rgba(212,160,23,.12)" : "rgba(150,150,150,.12)", color: a.status==="processing" ? T.accent : T.textMuted }}>
                    {a.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            )) : assets.map(a => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, boxShadow: `0 0 6px ${T.accent}` }} />
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.accent }}>{a.id}</span>
                  </div>
                </td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.text, fontWeight: 600 }}>{a.name}</td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textMuted }}>{a.type}</td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textMuted }}>{a.held}</td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.text }}>{a.value}</td>
                <td style={{ padding: "16px 18px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.positive }}>{a.yield}</td>
                <td style={{ padding: "16px 18px" }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, padding: "3px 9px", borderRadius: 6, letterSpacing: "1px", background: "rgba(110,200,106,.12)", color: T.positive }}>ACTIVE</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── NEW PROJECT FORM ─────────────────────────────────────────────────────────
const STEP_NAMES = ["Asset Identity","Financial Profile","Token Structure","Legal Docs","Review & Submit"];

const assetTypes = [
  { icon: "🏢", label: "Commercial Real Estate" },
  { icon: "🏘️", label: "Residential Real Estate" },
  { icon: "🏭", label: "Industrial / Warehouse" },
  { icon: "🏨", label: "Hospitality" },
  { icon: "⚡", label: "Infrastructure" },
  { icon: "🎨", label: "Alternative Assets" },
];

const docCards = [
  { id: "title",     icon: "📋", name: "Title Deed / Certificate of Ownership", desc: "Official government-issued document proving legal ownership.", tags: ["REQUIRED","PDF / JPG"] },
  { id: "survey",    icon: "📐", name: "Survey / Property Description",          desc: "Certified survey showing legal boundaries and easements.",   tags: ["REQUIRED","PDF"] },
  { id: "lien",      icon: "🔍", name: "Title Search / Lien Report",            desc: "Third-party search confirming asset is clear of liens (≤90 days).", tags: ["REQUIRED","PDF","≤ 90 days"] },
  { id: "insurance", icon: "🛡️", name: "Insurance Certificate",                 desc: "Valid property and liability insurance documentation.",       tags: ["REQUIRED","PDF"] },
  { id: "appraisal", icon: "📊", name: "Appraisal / Valuation Report",          desc: "Certified 3rd-party appraisal — required before issuance.",   tags: ["REQUIRED","PDF"] },
  { id: "financials",icon: "📈", name: "Financial Statements (2–3 years)",       desc: "Audited P&L, balance sheet, cash flow.",                      tags: ["REQUIRED","PDF"] },
  { id: "spv",       icon: "🏛️", name: "SPV / Entity Formation Documents",      desc: "Certificate of Incorporation, Operating Agreement.",          tags: ["PDF"] },
  { id: "ppm",       icon: "⚖️", name: "Private Placement Memorandum (PPM)",    desc: "Offering document — prepared with legal counsel.",            tags: ["PDF"] },
];

function renderMarkdown(text) {
  let html = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  html = html.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g, (_,header,rows) => {
    const ths = header.split("|").filter(c=>c.trim()).map(c=>`<th>${c.trim()}</th>`).join("");
    const trs = rows.trim().split("\n").map(row=>{const tds=row.split("|").filter(c=>c.trim()).map(c=>`<td>${c.trim()}</td>`).join("");return`<tr>${tds}</tr>`;}).join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  html = html.replace(/^## (.+)$/gm,"<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g,"<em>$1</em>");
  html = html.replace(/((?:^- .+\n?)+)/gm,(block)=>{
    const items=block.trim().split("\n").map(l=>`<li>${l.replace(/^- /,"")}</li>`).join("");
    return`<ul>${items}</ul>`;
  });
  html = html.replace(/^(?!<[htupol]|$)(.+)$/gm,"<p>$1</p>");
  html = html.replace(/\n{2,}/g,"\n");
  return html;
}

// ─── FIELD COMPONENTS (defined outside to prevent remount on every render) ────
function FieldInput({ formRef, id, placeholder, type="text", maxLength, onChange }) {
  return (
    <input className="field-input-el" type={type} placeholder={placeholder} maxLength={maxLength}
      onChange={e => { formRef.current[id] = e.target.value; if(onChange) onChange(e.target.value); }}
      defaultValue={formRef.current[id] || ""} />
  );
}
function FieldSelect({ formRef, id, options, onChange }) {
  return (
    <select className="field-select-el" onChange={e => { formRef.current[id] = e.target.value; if(onChange) onChange(e.target.value); }} defaultValue={formRef.current[id]}>
      {options.map(o => typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function NewProjectPage({ onNavigate, availableForms = [] }) {
  const [step, setStep] = useState(1);
  const [assetType, setAssetType] = useState(4); // DEBUG — Infrastructure
  const [uploadedDocs, setUploadedDocs] = useState(new Set());
  const [spvLoading, setSpvLoading] = useState(false);
  const [spvResult, setSpvResult] = useState(null);
  const [spvError, setSpvError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [projectId] = useState("DRAFT · #" + Math.random().toString(36).slice(2,8).toUpperCase());
  const [successId, setSuccessId] = useState(null);
  const [finalData, setFinalData] = useState(null);

  const formRef = useRef({
    // ── DEBUG PRE-FILL — remove before prod ──────────────────────────
    "f-projectName": "NYC Data Center",
    "f-sector": "Infrastructure",
    "f-primaryUse": "Data Center",
    "f-description": "A hyperscale data center located in New York City, offering colocation and cloud infrastructure services.",
    "f-yearBuilt": "2019",
    "f-city": "New York",
    "f-state": "NY",
    "f-country": "United States",
    "f-jurisdiction": "United States — Federal (SEC)",
    "f-investorType": "Accredited Investors Only",
    "f-assetValue": "20000000",
    "f-debt": "10000000",
    "f-grossIncome": "5000000",
    "f-opex": "3000000",
    "f-occupancy": "92",
    "f-size": "85000",
    "f-sizeUnit": "sqft",
    "f-units": "1",
    "f-ownershipType": "Sole Proprietorship",
    "f-blockchain": "Ethereum",
    "f-rights": "Revenue Share (Rental / Yield)",
    "f-lockup": "12 months",
    "f-distribution": "Quarterly",
    "f-kyc": "Yes — All investors",
    "f-secondary": "Enabled after lock-up",
    // ── END DEBUG ────────────────────────────────────────────────────
  });
  const fv = (id) => formRef.current[id] || "";

  // token preview computed
  const [tpTicker, setTpTicker] = useState("RWA-NYC-DC"); // DEBUG
  const [tpStandard, setTpStandard] = useState("ERC-1400"); // DEBUG
  const [tpSupply, setTpSupply] = useState("1000000"); // DEBUG
  const [tpOfferPct, setTpOfferPct] = useState("45"); // DEBUG
  const [tpAssetVal, setTpAssetVal] = useState("20000000"); // DEBUG
  const [tpDebt, setTpDebt] = useState("10000000"); // DEBUG

  const tokenPreview = (() => {
    const supply = parseInt(tpSupply) || 0;
    const pct = parseFloat(tpOfferPct) || 0;
    const av = parseFloat(tpAssetVal) || 0;
    const debt = parseFloat(tpDebt) || 0;
    const nav = av - debt;
    const offered = supply > 0 && pct > 0 ? Math.floor(supply * pct / 100) : 0;
    const pricePerToken = supply > 0 && nav > 0 ? nav / supply : 0;
    const raise = offered > 0 && pricePerToken > 0 ? offered * pricePerToken : 0;
    return {
      ticker: tpTicker || "—",
      standard: tpStandard,
      supply: supply > 0 ? supply.toLocaleString() + " tokens" : "—",
      offered: offered > 0 ? offered.toLocaleString() + " tokens (" + pct + "%)" : "—",
      price: pricePerToken > 0 ? "$" + pricePerToken.toFixed(2) + " / token" : "Enter asset value in Step 2",
      raise: raise > 0 ? "$" + Math.round(raise).toLocaleString() : "—",
    };
  })();

  const collectData = () => ({
    projectName: fv("f-projectName"), sector: fv("f-sector"), primaryUse: fv("f-primaryUse"),
    description: fv("f-description"), yearBuilt: fv("f-yearBuilt"),
    city: fv("f-city"), state: fv("f-state"), country: fv("f-country"),
    jurisdiction: fv("f-jurisdiction"), investorType: fv("f-investorType"),
    assetValue: fv("f-assetValue"), debt: fv("f-debt"), grossIncome: fv("f-grossIncome"),
    opex: fv("f-opex"), occupancy: fv("f-occupancy"), size: fv("f-size"),
    sizeUnit: fv("f-sizeUnit"), units: fv("f-units"), ownershipType: fv("f-ownershipType"),
    coOwners: fv("f-coOwners"), ticker: tpTicker, tokenStandard: tpStandard,
    totalSupply: tpSupply, offerPct: tpOfferPct, blockchain: fv("f-blockchain"),
    rights: fv("f-rights"), lockup: fv("f-lockup"), distribution: fv("f-distribution"),
    kyc: fv("f-kyc"), secondary: fv("f-secondary"),
    assetType: assetTypes[assetType]?.label || "—",
  });

  async function getSpvRecommendation() {
    const d = collectData();
    const nav = (parseFloat(d.assetValue)||0) - (parseFloat(d.debt)||0);
    const noi = (parseFloat(d.grossIncome)||0) - (parseFloat(d.opex)||0);
    const capRate = d.assetValue ? ((noi/(parseFloat(d.assetValue)||1))*100).toFixed(2) : "N/A";

    const prompt = `You are a senior securities attorney specializing in asset tokenization and RWA (Real-World Asset) structuring.

═══ PROJECT OVERVIEW ═══
Project Name: ${d.projectName||"N/A"}
Asset Type: ${d.assetType||"N/A"}
Sector: ${d.sector||"N/A"}
Primary Use: ${d.primaryUse||"N/A"}
Location: ${[d.city,d.state,d.country].filter(Boolean).join(", ")||"N/A"}
Regulatory Jurisdiction: ${d.jurisdiction||"N/A"}

═══ FINANCIAL PROFILE ═══
Estimated Asset Value: $${Number(d.assetValue||0).toLocaleString()}
NAV: $${nav.toLocaleString()}
NOI: $${noi.toLocaleString()}
Cap Rate: ${capRate}%

═══ TOKEN STRUCTURE ═══
Token Standard: ${d.tokenStandard||"N/A"}
Total Supply: ${Number(d.totalSupply||0).toLocaleString()} tokens
% Offered: ${d.offerPct||"N/A"}%
Blockchain: ${d.blockchain||"N/A"}
Investor Rights: ${d.rights||"N/A"}
Lock-up: ${d.lockup||"N/A"}
KYC/AML: ${d.kyc||"N/A"}
Investor Type: ${d.investorType||"N/A"}

Respond with a structured analysis using EXACT section headers below:

## Recommended SPV
## Why This Structure
## Regulatory Pathway
## Token Standard Alignment
## Estimated Setup Cost
## Estimated Timeline
## Scores
## Alternative Structures
## Key Risks & Mitigations`;

    setSpvLoading(true);
    setSpvResult(null);
    setSpvError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": window.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1800, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "API error " + res.status); }
      const data = await res.json();
      setSpvResult(data.content.map(b => b.type==="text" ? b.text : "").join(""));
    } catch (err) {
      setSpvError(err.message);
    } finally {
      setSpvLoading(false);
    }
  }

  function submitProject() {
  const id = "PRJ-" + Math.random().toString(36).slice(2,8).toUpperCase();
  setSuccessId(id);
  setSubmitted(true);
  setFinalData(collectData()); // capture all form fields at submit time
}

  if (submitted) {
  return (
    <FormFiller
      projectData={finalData}
      spvResult={spvResult}
      availableForms={AVAILABLE_FORMS}
      onDone={() => onNavigate("processing")}
    />
  );
}

  const fieldStyle = { display: "flex", flexDirection: "column", gap: 7 };
  const labelStyle = { fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: T.textFaint };
  const hintStyle = { fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint, lineHeight: 1.5 };

  return (
    <div className="page-anim">
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: "-0.04em" }}>New Tokenization Project</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Asset tokenization wizard</div>
          </div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.accent, background: "rgba(198,255,0,.07)", border: `1px solid ${T.accentBorder}`, padding: "5px 12px", borderRadius: 8 }}>{projectId}</span>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
        {STEP_NAMES.map((name, i) => {
          const n = i + 1;
          const active = step === n, done = step > n;
          return (
            <div key={n} style={{ display: "flex", alignItems: "center", flex: n < STEP_NAMES.length ? 1 : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono',monospace", fontSize: 12, flexShrink: 0,
                  border: done ? `1.5px solid ${T.positive}` : active ? `1.5px solid ${T.accent}` : `1.5px solid ${T.border}`,
                  background: done ? T.positive : active ? "rgba(198,255,0,.1)" : "transparent",
                  color: done ? "#0b0c08" : active ? T.accent : T.textFaint,
                  boxShadow: active ? `0 0 0 4px rgba(198,255,0,.1)` : "none",
                }}>{done ? "✓" : n}</div>
                <div style={{ marginLeft: 8, marginRight: 6 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: done ? T.positive : active ? T.accent : T.textFaint }}>{done ? "DONE" : active ? "ACTIVE" : "UPCOMING"}</div>
                  <div style={{ fontSize: 11, color: active ? T.text : T.textFaint, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{name}</div>
                </div>
              </div>
              {n < STEP_NAMES.length && <div style={{ flex: 1, height: 1, background: done ? T.positive : T.border, margin: "0 8px", position: "relative", top: -8 }} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Asset Identity */}
      {step === 1 && (
        <div className="page-anim">
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.03em", marginBottom: 4 }}>Asset Identity & Classification</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint, marginBottom: 24, lineHeight: 1.7 }}>Define what you are tokenizing. Accurate classification affects SPV structure, regulatory pathway, and investor eligibility.</div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>ASSET TYPE <span style={{ color: T.accent }}>*</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {assetTypes.map((at, i) => (
                <div key={i} onClick={() => setAssetType(i)} className={`pill-el ${assetType === i ? "pill-selected" : ""}`}
                  style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textMuted, display: "flex", alignItems: "center", gap: 7, background: T.card }}>
                  <span style={{ fontSize: 14 }}>{at.icon}</span>{at.label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={fieldStyle}><label style={labelStyle}>PROJECT NAME <span style={{ color: T.accent }}>*</span></label><FieldInput formRef={formRef} id="f-projectName" placeholder="e.g. NYC Mixed-Use Tower" /></div>
            <div style={fieldStyle}><label style={labelStyle}>SECTOR <span style={{ color: T.accent }}>*</span></label><FieldSelect formRef={formRef} id="f-sector" options={["Real Estate","Infrastructure","Energy","Agriculture","Art & Collectibles","Private Equity","Debt / Fixed Income","Other"]} /></div>
            <div style={fieldStyle}><label style={labelStyle}>PRIMARY USE CASE <span style={{ color: T.accent }}>*</span></label><FieldSelect formRef={formRef} id="f-primaryUse" options={["Mixed-Use","Office","Retail","Residential","Industrial","Hospitality","Data Center","Land","Other"]} /></div>
            <div style={fieldStyle}><label style={labelStyle}>YEAR ESTABLISHED / BUILT</label><FieldInput formRef={formRef} id="f-yearBuilt" type="number" placeholder="2018" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 20 }}>
            <div style={fieldStyle}><label style={labelStyle}>ASSET DESCRIPTION</label><textarea className="field-textarea-el" placeholder="Brief description of the asset, its history, and strategic value proposition..." onChange={e => formRef.current["f-description"] = e.target.value} defaultValue={formRef.current["f-description"]||""} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={fieldStyle}><label style={labelStyle}>CITY</label><FieldInput formRef={formRef} id="f-city" placeholder="New York" /></div>
            <div style={fieldStyle}><label style={labelStyle}>STATE / PROVINCE</label><FieldInput formRef={formRef} id="f-state" placeholder="NY" /></div>
            <div style={fieldStyle}><label style={labelStyle}>COUNTRY</label><FieldInput formRef={formRef} id="f-country" placeholder="United States" /></div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint, alignSelf: "center", marginRight: "auto" }}>Step 1 of 5</span>
            <button className="btn-next-el" onClick={() => setStep(2)} style={{ background: T.accent, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, padding: "12px 26px", borderRadius: 10, border: "none", cursor: "pointer" }}>Continue → Financial Profile</button>
          </div>
        </div>
      )}

      {/* Step 2 — Financial Profile */}
      {step === 2 && (
        <div className="page-anim">
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.03em", marginBottom: 4 }}>Financial Profile & Valuation</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint, marginBottom: 24, lineHeight: 1.7 }}>Provide current financial data for the asset. These figures determine token price, raise target, and investor yield.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={fieldStyle}><label style={labelStyle}>ESTIMATED ASSET VALUE ($) <span style={{ color: T.accent }}>*</span></label><FieldInput formRef={formRef} id="f-assetValue" type="number" placeholder="5000000" onChange={v => setTpAssetVal(v)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>OUTSTANDING DEBT ($)</label><FieldInput formRef={formRef} id="f-debt" type="number" placeholder="1200000" onChange={v => setTpDebt(v)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>ANNUAL GROSS INCOME ($)</label><FieldInput formRef={formRef} id="f-grossIncome" type="number" placeholder="380000" /></div>
            <div style={fieldStyle}><label style={labelStyle}>ANNUAL OPERATING EXPENSES ($)</label><FieldInput formRef={formRef} id="f-opex" type="number" placeholder="120000" /></div>
            <div style={fieldStyle}><label style={labelStyle}>OCCUPANCY / UTILIZATION (%)</label><FieldInput formRef={formRef} id="f-occupancy" type="number" placeholder="94" /></div>
            <div style={fieldStyle}><label style={labelStyle}>PHYSICAL SIZE</label>
              <div style={{ display: "flex", gap: 8 }}>
                <FieldInput formRef={formRef} id="f-size" type="number" placeholder="42000" />
                <FieldSelect formRef={formRef} id="f-sizeUnit" options={["sqft","sqm","acres","hectares","units"]} />
              </div>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>NUMBER OF UNITS / LOTS</label><FieldInput formRef={formRef} id="f-units" type="number" placeholder="48" /></div>
            <div style={fieldStyle}><label style={labelStyle}>CURRENT OWNERSHIP TYPE <span style={{ color: T.accent }}>*</span></label><FieldSelect formRef={formRef} id="f-ownershipType" options={["Sole Proprietorship","LLC (Single-member)","LLC (Multi-member)","Corporation (C-Corp)","Corporation (S-Corp)","Partnership","Joint Venture","Trust","REIT","Other"]} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={fieldStyle}><label style={labelStyle}>REGULATORY JURISDICTION <span style={{ color: T.accent }}>*</span></label><FieldSelect formRef={formRef} id="f-jurisdiction" options={["United States — Federal (SEC)","United States — Delaware","United States — Wyoming","European Union (MiCA)","United Kingdom (FCA)","Singapore (MAS)","Switzerland (FINMA)","UAE (ADGM / DIFC)","Other"]} /></div>
            <div style={fieldStyle}><label style={labelStyle}>INVESTOR TYPE TARGET <span style={{ color: T.accent }}>*</span></label><FieldSelect formRef={formRef} id="f-investorType" options={["Accredited Investors Only","Institutional Only","Qualified Purchasers","Retail (Public Offering)","DAO / Token Holders"]} /></div>
          </div>

          <FormNav step={2} total={5} onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Continue → Token Structure" />
        </div>
      )}

      {/* Step 3 — Token Structure */}
      {step === 3 && (
        <div className="page-anim">
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.03em", marginBottom: 4 }}>Token Configuration & Structure</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint, marginBottom: 24, lineHeight: 1.7 }}>Define how the asset will be represented on-chain. These parameters determine smart contract behavior, investor rights, and secondary market characteristics.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={fieldStyle}><label style={labelStyle}>TOKEN TICKER SYMBOL <span style={{ color: T.accent }}>*</span></label>
              <input className="field-input-el" type="text" placeholder="RWA-NYC" maxLength={10}
                onChange={e => setTpTicker(e.target.value.toUpperCase())} value={tpTicker === "—" ? "" : tpTicker} />
              <span style={hintStyle}>3–8 characters, uppercase. This becomes the on-chain symbol.</span>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>TOKEN STANDARD <span style={{ color: T.accent }}>*</span></label>
              <select className="field-select-el" value={tpStandard} onChange={e => setTpStandard(e.target.value)}>
                <option value="ERC-20">ERC-20 (Fungible — fractional ownership)</option>
                <option value="ERC-1400">ERC-1400 (Security Token — compliance hooks)</option>
                <option value="ERC-3643">ERC-3643 (T-REX — institutional grade)</option>
                <option value="ERC-721">ERC-721 (NFT — single unique asset)</option>
              </select>
              <span style={hintStyle}>ERC-1400 / ERC-3643 recommended for regulated securities</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={fieldStyle}><label style={labelStyle}>TOTAL TOKENS TO ISSUE <span style={{ color: T.accent }}>*</span></label>
              <input className="field-input-el" type="number" placeholder="100000" value={tpSupply} onChange={e => setTpSupply(e.target.value)} />
            </div>
            <div style={fieldStyle}><label style={labelStyle}>% OFFERED TO INVESTORS <span style={{ color: T.accent }}>*</span></label>
              <input className="field-input-el" type="number" placeholder="80" min={1} max={100} value={tpOfferPct} onChange={e => setTpOfferPct(e.target.value)} />
            </div>
            <div style={fieldStyle}><label style={labelStyle}>TARGET BLOCKCHAIN <span style={{ color: T.accent }}>*</span></label>
              <FieldSelect formRef={formRef} id="f-blockchain" options={[{v:"Ethereum",l:"Ethereum Mainnet"},{v:"Polygon",l:"Polygon"},{v:"Base",l:"Base"},{v:"Arbitrum",l:"Arbitrum One"},{v:"Optimism",l:"Optimism"},{v:"Avalanche",l:"Avalanche C-Chain"}]} />
            </div>
          </div>

          {/* Token Preview */}
          <div style={{ background: "rgba(198,255,0,.04)", border: `1px solid ${T.accentBorder}`, borderRadius: 14, padding: 20, marginBottom: 22 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", color: T.accent, marginBottom: 14, opacity: 0.7 }}>LIVE TOKEN PROJECTION</div>
            {[["TOKEN SYMBOL", tokenPreview.ticker, true],["STANDARD", tokenPreview.standard, false],["TOTAL SUPPLY", tokenPreview.supply, false],["TOKENS OFFERED", tokenPreview.offered, false],["PRICE PER TOKEN", tokenPreview.price, true],["RAISE TARGET", tokenPreview.raise, false]].map(([k,v,isAccent]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid rgba(255,255,255,.05)`, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                <span style={{ color: T.textFaint, fontSize: 11 }}>{k}</span>
                <span style={{ color: isAccent ? T.accent : T.text, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 18px" }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint, letterSpacing: "2px", whiteSpace: "nowrap" }}>RIGHTS & COMPLIANCE</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={fieldStyle}><label style={labelStyle}>INVESTOR RIGHTS GRANTED <span style={{ color: T.accent }}>*</span></label><FieldSelect formRef={formRef} id="f-rights" options={["Revenue Share (Rental / Yield)","Equity + Revenue Share","Capital Appreciation Only","Voting + Revenue Share","Full Governance Rights","Debt Repayment (Fixed Income)"]} /></div>
            <div style={fieldStyle}><label style={labelStyle}>LOCK-UP / VESTING PERIOD</label><FieldSelect formRef={formRef} id="f-lockup" options={[{v:"None",l:"No Lock-up"},{v:"6 months",l:"6 Months"},{v:"12 months",l:"12 Months (Reg D standard)"},{v:"24 months",l:"24 Months"},{v:"Custom",l:"Custom"}]} /><span style={hintStyle}>Under Reg D Rule 144, US offerings typically require 12-month lock-up</span></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={fieldStyle}><label style={labelStyle}>DISTRIBUTION FREQUENCY</label><FieldSelect formRef={formRef} id="f-distribution" options={["Monthly","Quarterly","Semi-Annual","Annual","On Liquidation Only"]} /></div>
            <div style={fieldStyle}><label style={labelStyle}>KYC / AML REQUIRED <span style={{ color: T.accent }}>*</span></label><FieldSelect formRef={formRef} id="f-kyc" options={["Yes — All investors","Yes — Non-US investors only","Platform-level KYC only","No (Utility token)"]} /></div>
            <div style={fieldStyle}><label style={labelStyle}>SECONDARY MARKET TRADING</label><FieldSelect formRef={formRef} id="f-secondary" options={["Enabled after lock-up","Enabled immediately","Restricted — whitelist only","Disabled"]} /></div>
          </div>

          <FormNav step={3} total={5} onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Continue → Legal Docs" />
        </div>
      )}

      {/* Step 4 — Legal Documents */}
      {step === 4 && (
        <div className="page-anim">
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.03em", marginBottom: 4 }}>Legal Documents & SPV Formation</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint, marginBottom: 24, lineHeight: 1.7 }}>Upload documents required to legally structure your tokenization. Documents are encrypted and reviewed by our compliance team.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {docCards.map(doc => {
              const isUploaded = uploadedDocs.has(doc.id);
              return (
                <div key={doc.id} onClick={() => setUploadedDocs(prev => { const s = new Set(prev); s.has(doc.id) ? s.delete(doc.id) : s.add(doc.id); return s; })}
                  className={`doc-card-el ${isUploaded ? "doc-uploaded" : ""}`}
                  style={{ background: T.card, border: `1px solid ${isUploaded ? T.positive : T.border}`, borderRadius: 14, padding: 16, transition: "all 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 22, opacity: 0.7 }}>{doc.icon}</span>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${isUploaded ? T.positive : T.border}`, background: isUploaded ? T.positive : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#0b0c08" }}>{isUploaded ? "✓" : ""}</div>
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>{doc.name}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, lineHeight: 1.6, marginBottom: 10 }}>{doc.desc}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {doc.tags.map(t => <span key={t} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, padding: "2px 8px", borderRadius: 5, background: t==="REQUIRED" ? "rgba(198,255,0,.08)" : "rgba(255,255,255,.04)", border: `1px solid ${t==="REQUIRED" ? T.accentBorder : T.border}`, color: t==="REQUIRED" ? T.accent : T.textFaint, letterSpacing: "1px" }}>{t}</span>)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 16px" }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint, letterSpacing: "2px", whiteSpace: "nowrap" }}>AI SPV ADVISOR</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          <div style={{ background: "rgba(198,255,0,.03)", border: `1px solid ${T.accentBorder}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3 }}>SPV Structure Recommendation</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint }}>AI-powered legal structure analysis using your project data</div>
              </div>
              <button onClick={getSpvRecommendation} disabled={spvLoading} className="btn-next-el"
                style={{ background: T.accent, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 10, border: "none", cursor: spvLoading ? "not-allowed" : "pointer", opacity: spvLoading ? 0.7 : 1 }}>
                {spvLoading ? "Analyzing…" : "Analyze SPV →"}
              </button>
            </div>
            {spvLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint }}>
                <div style={{ width: 18, height: 18, border: `2px solid rgba(198,255,0,.2)`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Analyzing project structure with Claude AI…
              </div>
            )}
            {spvError && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.negative, padding: "12px 0" }}>⚠ {spvError}</div>}
            {spvResult && (
              <div className="spv-ai-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(spvResult) }} />
            )}
          </div>

          <FormNav step={4} total={5} onBack={() => setStep(3)} onNext={() => setStep(5)} nextLabel="Continue → Review & Submit" />
        </div>
      )}

      {/* Step 5 — Review */}
      {step === 5 && (
        <div className="page-anim">
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.03em", marginBottom: 4 }}>Review & Submit</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint, marginBottom: 24, lineHeight: 1.7 }}>Review all details before submission. Your compliance officer will guide you through next steps.</div>

          {[
            { header: "ASSET IDENTITY", editStep: 1, rows: [["Project Name",fv("f-projectName")||"—"],["Asset Type",assetTypes[assetType]?.label||"—"],["Sector",fv("f-sector")||"—"],["Primary Use",fv("f-primaryUse")||"—"],["Location",[fv("f-city"),fv("f-state"),fv("f-country")].filter(Boolean).join(", ")||"—"],["Year Established",fv("f-yearBuilt")||"—"]] },
            { header: "FINANCIAL PROFILE", editStep: 2, rows: [["Estimated Value",fv("f-assetValue") ? "$"+Number(fv("f-assetValue")).toLocaleString() : "—"],["Outstanding Debt",fv("f-debt") ? "$"+Number(fv("f-debt")).toLocaleString() : "—"],["NAV",fv("f-assetValue") ? "$"+((Number(fv("f-assetValue"))||0)-(Number(fv("f-debt"))||0)).toLocaleString() : "—"],["Occupancy",fv("f-occupancy") ? fv("f-occupancy")+"%" : "—"],["Jurisdiction",fv("f-jurisdiction")||"—"]] },
            { header: "TOKEN STRUCTURE", editStep: 3, rows: [["Ticker",tpTicker||"—"],["Standard",tpStandard],["Total Supply",tpSupply ? Number(tpSupply).toLocaleString()+" tokens" : "—"],["Blockchain",fv("f-blockchain")||"Ethereum"],["Investor Rights",fv("f-rights")||"—"],["Lock-up",fv("f-lockup")||"—"],["KYC/AML",fv("f-kyc")||"—"]] },
            { header: "LEGAL DOCUMENTS", editStep: 4, rows: [["Documents Checked",uploadedDocs.size+" of "+docCards.length],["Required Docs",docCards.filter(d=>d.tags.includes("REQUIRED") && uploadedDocs.has(d.id)).length+" / "+docCards.filter(d=>d.tags.includes("REQUIRED")).length+" required"]] },
          ].map(({ header, editStep, rows }) => (
            <div key={header} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", background: "rgba(255,255,255,.02)", borderBottom: `1px solid ${T.border}`, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", color: T.textFaint }}>
                {header}
                <span onClick={() => setStep(editStep)} style={{ color: T.accent, cursor: "pointer", letterSpacing: "1px" }}>EDIT ↗</span>
              </div>
              {rows.map(([key, val]) => (
                <div key={key} className="review-row-el" style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderBottom: `1px solid rgba(255,255,255,.04)`, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                  <span style={{ color: T.textFaint }}>{key}</span>
                  <span style={{ color: T.text, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                </div>
              ))}
            </div>
          ))}

          <div style={{ padding: "14px 18px", background: "rgba(212,160,23,.05)", border: "1px solid rgba(212,160,23,.18)", borderRadius: 14, marginBottom: 20, fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textMuted, lineHeight: 1.8 }}>
            ⚠ &nbsp;<strong>Disclaimer:</strong> Submitting this form initiates a preliminary review only. Token issuance requires completion of legal documentation, independent appraisal, regulatory filings, and KYC/AML compliance. Riipe does not constitute legal or financial advice.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
            <button className="btn-back-el" onClick={() => setStep(4)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted, fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500, padding: "12px 22px", borderRadius: 10, cursor: "pointer" }}>← Back</button>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint }}>Step 5 of 5</span>
            <button className="btn-submit-el" onClick={submitProject} style={{ background: T.positive, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, padding: "12px 26px", borderRadius: 10, border: "none", cursor: "pointer" }}>✓ Submit for Review</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormNav({ step, total, onBack, onNext, nextLabel }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 20, borderTop: `1px solid rgba(255,255,255,.07)` }}>
      <button className="btn-back-el" onClick={onBack} style={{ background: "transparent", border: `1px solid rgba(255,255,255,.12)`, color: "rgba(255,255,255,.55)", fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500, padding: "12px 22px", borderRadius: 10, cursor: "pointer" }}>← Back</button>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(255,255,255,.28)" }}>Step {step} of {total}</span>
      <button className="btn-next-el" onClick={onNext} style={{ background: "#c6ff00", color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, padding: "12px 26px", borderRadius: 10, border: "none", cursor: "pointer" }}>{nextLabel}</button>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [status, setStatus] = useState("Awaiting wallet connection...");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
      setStatus("⚠ MetaMask not found. Please install it."); setIsError(true); return;
    }
    setLoading(true); setStatus("Requesting wallet access..."); setIsError(false);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      const balHex = await window.ethereum.request({ method: "eth_getBalance", params: [address, "latest"] });
      const balance = (parseInt(balHex, 16) / 1e18).toFixed(4);
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const chains = { "0x1":"Ethereum","0x5":"Goerli","0xaa36a7":"Sepolia","0x89":"Polygon","0xa":"Optimism","0xa4b1":"Arbitrum","0x2105":"Base","0x38":"BNB Chain" };
      const chainName = chains[chainId] || `Chain ${chainId}`;
      setStatus("Authenticated. Loading dashboard...");
      setTimeout(() => onLogin({ address, balance, chainId, chainName, connectedAt: new Date() }), 700);
    } catch (err) {
      setLoading(false);
      setStatus(err.code === 4001 ? "✕ Rejected by user." : `✕ ${err.message}`);
      setIsError(true);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(198,255,0,.06), transparent)", pointerEvents: "none" }} />
      <div className="login-card" style={{ position: "relative", zIndex: 1, width: 420, textAlign: "center", padding: "52px 44px", background: T.card, border: `1px solid ${T.borderDark}`, borderRadius: 28, boxShadow: "0 8px 60px rgba(0,0,0,.5)" }}>
        <Logo size={28} />
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: T.textFaint, margin: "14px 0 36px" }}>Asset Tokenization Platform</div>
        <button onClick={connectWallet} disabled={loading} className="connect-btn-el"
          style={{ width: "100%", padding: "16px", background: T.accent, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 14, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.25s", opacity: loading ? 0.7 : 1, letterSpacing: "0.2px" }}>
          🦊 &nbsp;Connect MetaMask
        </button>
        <div style={{ marginTop: 18, fontFamily: "'DM Mono',monospace", fontSize: 12, color: isError ? T.negative : T.textFaint, minHeight: 18 }}>{status}</div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [activePage, setActivePage] = useState("overview");

  const navItems = [
    { id: "overview",    label: "Overview",                  badge: null },
    { id: "personal",    label: "Personal Information",      badge: null },
    { id: "tokenized",   label: "Assets Tokenized",          badge: "4" },
    { id: "processing",  label: "Assets in Processing",      badge: "2" },
    { id: "newproject",  label: "New Tokenization Project",  badge: null, isAction: true },
    { id: "formfiller", label: "Form Auto-Fill", badge: null },
  ];

  const shortAddr = (a) => a ? a.slice(0,6)+"..."+a.slice(-4) : "—";

  return (
    <>
      <style>{CSS}</style>

      {!session && <LoginScreen onLogin={setSession} />}

      {session && (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

          {/* TOP BAR */}
          <div style={{ height: 58, background: T.card, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0, position: "relative", zIndex: 10, boxShadow: "0 1px 0 rgba(255,255,255,.05)" }}>
            <Logo size={20} />
            <div style={{ width: 1, height: 22, background: T.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textMuted }}>
              <div className="network-dot-anim" style={{ width: 7, height: 7, borderRadius: "50%", background: T.positive, boxShadow: `0 0 6px ${T.positive}` }} />
              {session.chainName}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.accent, background: "rgba(198,255,0,.07)", border: `1px solid ${T.accentBorder}`, padding: "5px 12px", borderRadius: 8 }}>
              {shortAddr(session.address)}
            </div>
          </div>

          {/* BODY */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

            {/* SIDEBAR */}
            <nav style={{ width: 234, flexShrink: 0, background: T.card, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", padding: "24px 0", gap: 2, overflowY: "auto" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: T.textFaint, padding: "0 22px", marginBottom: 8 }}>Navigate</div>

              {navItems.filter(n => !n.isAction).map(item => (
                <div key={item.id} onClick={() => setActivePage(item.id)}
                  className={`nav-item-hover ${activePage === item.id ? "active-nav" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 22px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: T.textMuted, borderLeft: "2px solid transparent", transition: "all 0.2s" }}>
                  <span style={{ flexShrink: 0, opacity: 0.7 }}>{icons[item.id]}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && <span style={{ background: T.accent, color: "#0b0c08", fontFamily: "'DM Mono',monospace", fontSize: 10, padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>{item.badge}</span>}
                </div>
              ))}

              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: T.textFaint, padding: "0 22px", marginTop: 16, marginBottom: 8 }}>Actions</div>

              {navItems.filter(n => n.isAction).map(item => (
                <div key={item.id} onClick={() => setActivePage(item.id)}
                  className={`nav-item-hover ${activePage === item.id ? "active-nav" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 22px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: T.textMuted, borderLeft: "2px solid transparent", transition: "all 0.2s" }}>
                  <span style={{ flexShrink: 0, opacity: 0.7 }}>{icons[item.id]}</span>
                  {item.label}
                </div>
              ))}

              <div style={{ marginTop: "auto", padding: "20px 18px", borderTop: `1px solid ${T.border}` }}>
                <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${T.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", color: T.textFaint, marginBottom: 6, textTransform: "uppercase" }}>Connected Wallet</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.accent, marginBottom: 3 }}>{shortAddr(session.address)}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textMuted }}>{session.balance} ETH</div>
                </div>
              </div>
            </nav>

            {/* MAIN CONTENT */}
            <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: T.bg, scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,.1) transparent" }}>
              {activePage === "overview"   && <OverviewPage />}
              {activePage === "personal"   && <PersonalPage session={session} />}
              {activePage === "tokenized"  && <AssetsPage assets={tokenizedAssets}  title="Assets Tokenized"     subtitle="On-chain holdings" isProcessing={false} />}
              {activePage === "processing" && <AssetsPage assets={processingAssets} title="Assets in Processing" subtitle="Pending tokenization" isProcessing={true} />}
              {activePage === "newproject" && (<NewProjectPage onNavigate={setActivePage} availableForms={AVAILABLE_FORMS} />)}              
              {activePage === "formfiller" && (<FormFiller projectData={{}} spvResult={null} availableForms={AVAILABLE_FORMS} onDone={() => {}} />)}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
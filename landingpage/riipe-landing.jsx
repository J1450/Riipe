import { useState, useEffect, useRef } from "react";

const PRIMARY = "#101720";
const ACCENT = "#101720";
const P = ["#d6dfea","#c9d5e4","#bccbdc","#afc1d5","#a1b6ce","#94acc7","#6c8bb2","#5f81ab","#5477a0"];

// ─── Inline SVG Chart helpers ───────────────────────────────────────────────

function pointsToPolyline(data, w, h, minY, maxY) {
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - minY) / (maxY - minY)) * h;
    return `${x},${y}`;
  }).join(" ");
}

function pointsToArea(data, w, h, minY, maxY) {
  const line = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - minY) / (maxY - minY)) * h;
    return `${x},${y}`;
  }).join(" ");
  return `0,${h} ${line} ${w},${h}`;
}

// Smooth cubic bezier path
function smoothPath(data, w, h, minY, maxY) {
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - minY) / (maxY - minY)) * h,
  }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function smoothArea(data, w, h, minY, maxY) {
  const path = smoothPath(data, w, h, minY, maxY);
  const lastX = w;
  const lastY = h - ((data[data.length-1] - minY) / (maxY - minY)) * h;
  return `${path} L ${lastX} ${h} L 0 ${h} Z`;
}

// Generate smooth noise for wind
function windNoise(base, len) {
  const arr = [];
  let v = base;
  for (let i = 0; i < len; i++) {
    v += (Math.random() - 0.5) * 0.12;
    v = Math.max(0.3, Math.min(1.1, v));
    arr.push(v);
  }
  return arr;
}

// Avg 24hr load curve
const AVG_LOAD = [0.68,0.65,0.62,0.60,0.59,0.60,0.63,0.70,0.78,0.86,0.92,0.97,1.02,1.05,1.04,1.02,0.99,0.96,0.97,0.98,0.97,0.95,0.90,0.82,0.78];

// Solar wheeled profile (bell)
const SOLAR_WHEELED = [0,0,0,0,0,0,0.02,0.08,0.28,0.55,0.82,1.05,1.22,1.18,1.05,0.82,0.55,0.28,0.08,0.01,0,0,0,0,0];
// On-site solar (smaller bell)
const SOLAR_ONSITE  = [0,0,0,0,0,0,0.01,0.04,0.14,0.28,0.40,0.46,0.47,0.43,0.35,0.24,0.14,0.05,0.01,0,0,0,0,0,0];

// Wind (jagged, higher morning/evening)
const WIND_BASE = [0.72,0.80,0.75,0.82,0.78,0.70,0.65,0.62,0.60,0.55,0.52,0.50,0.52,0.55,0.54,0.56,0.60,0.68,0.78,0.88,0.95,1.00,0.98,0.95,0.90];

// Hydro (steady, rises midday)
const HYDRO = [0.32,0.28,0.26,0.25,0.26,0.28,0.32,0.38,0.44,0.52,0.60,0.67,0.70,0.70,0.68,0.65,0.62,0.60,0.58,0.56,0.55,0.54,0.53,0.52,0.50];

const HOURS = ["00:00","06:00","12:00","18:00","23:59"];

function MiniChart({ type, primary, palette }) {
  const W = 340, H = 160;
  const minY = 0, maxY = 1.4;

  const avgLoadPath = smoothPath(AVG_LOAD, W, H, minY, maxY);
  const avgLoadArea = smoothArea(AVG_LOAD, W, H, minY, maxY);

  const gridYs = [0, 0.25, 0.50, 0.75, 1.00, 1.25];

  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} width="100%" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`solarFill-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette[6]} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={palette[6]} stopOpacity="0.05"/>
        </linearGradient>
        <linearGradient id={`windFill-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3d8" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#7dd3d8" stopOpacity="0.04"/>
        </linearGradient>
        <linearGradient id={`hydroFill-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette[5]} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={palette[5]} stopOpacity="0.04"/>
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridYs.map(v => {
        const y = H - ((v - minY) / (maxY - minY)) * H;
        return <line key={v} x1="0" y1={y} x2={W} y2={y} stroke={primary} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.15"/>;
      })}

      {type === "solar" && <>
        {/* Wheeled solar filled area */}
        <path d={smoothArea(SOLAR_WHEELED, W, H, minY, maxY)} fill={`url(#solarFill-${type})`}/>
        {/* Wheeled solar border */}
        <path d={smoothPath(SOLAR_WHEELED, W, H, minY, maxY)} fill="none" stroke={palette[6]} strokeWidth="1.8"/>
        {/* On-site solar dashed */}
        <path d={smoothPath(SOLAR_ONSITE, W, H, minY, maxY)} fill="none" stroke={primary} strokeWidth="1.4" strokeDasharray="5,4" opacity="0.6"/>
        {/* Avg load dashed red */}
        <path d={avgLoadPath} fill="none" stroke="#c0392b" strokeWidth="1.6" strokeDasharray="5,4"/>
      </>}

      {type === "wind" && <>
        <path d={smoothArea(WIND_BASE, W, H, minY, maxY)} fill={`url(#windFill-${type})`}/>
        <path d={smoothPath(WIND_BASE, W, H, minY, maxY)} fill="none" stroke="#5bbfc7" strokeWidth="1.6"/>
        <path d={avgLoadPath} fill="none" stroke="#c0392b" strokeWidth="1.6" strokeDasharray="5,4"/>
      </>}

      {type === "hydro" && <>
        <path d={smoothArea(HYDRO, W, H, minY, maxY)} fill={`url(#hydroFill-${type})`}/>
        <path d={smoothPath(HYDRO, W, H, minY, maxY)} fill="none" stroke={palette[7]} strokeWidth="1.8"/>
        <path d={avgLoadPath} fill="none" stroke="#c0392b" strokeWidth="1.6" strokeDasharray="5,4"/>
      </>}

      {/* X axis labels */}
      {HOURS.map((h, i) => {
        const x = (i / (HOURS.length - 1)) * W;
        return <text key={h} x={x} y={H + 22} textAnchor={i === 0 ? "start" : i === HOURS.length-1 ? "end" : "middle"} fontSize="10" fill={primary} opacity="0.45">{h}</text>;
      })}
    </svg>
  );
}

function UseCaseCard({ index, title, tag, desc, type, legendItems, primary, palette }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background: "white",
      borderRadius: "16px",
      border: `1px solid rgba(16,23,32,0.08)`,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 2px 16px rgba(16,23,32,0.06)",
    }}>
      {/* Card header */}
      <div style={{ padding: "28px 28px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", color: primary, lineHeight: 1.1 }}>
            {title}
          </h3>
          <span style={{ fontSize: "12px", color: primary, opacity: 0.4, fontWeight: 400, whiteSpace: "nowrap", marginTop: "6px" }}>
            {tag}
          </span>
        </div>
        <p style={{ fontSize: "13.5px", color: primary, opacity: 0.55, lineHeight: 1.65, marginBottom: "24px" }}>
          {desc}
        </p>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
          <span style={{ fontSize: "11px", color: primary, opacity: 0.5 }}>Demand (MW)</span>
          {legendItems.map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: primary, opacity: 0.7 }}>
              {l.dashed
                ? <svg width="18" height="10"><circle cx="9" cy="5" r="3.5" fill={l.color}/></svg>
                : l.dotted
                ? <svg width="18" height="10"><line x1="0" y1="5" x2="18" y2="5" stroke={primary} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"/><circle cx="9" cy="5" r="0" fill="none"/></svg>
                : <svg width="18" height="10"><circle cx="9" cy="5" r="3.5" fill={l.color}/></svg>
              }
              {l.label}
            </span>
          ))}
        </div>

        {/* Y axis labels + chart */}
        <div style={{ display: "flex", gap: "0", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "160px", paddingRight: "8px", paddingTop: "0" }}>
            {[1.25, 1.00, 0.75, 0.50, 0.25, 0].map(v => (
              <span key={v} style={{ fontSize: "10px", color: primary, opacity: 0.4, lineHeight: 1 }}>{v.toFixed(2)}</span>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <MiniChart type={type} primary={primary} palette={palette}/>
          </div>
        </div>

        {/* X axis label */}
        <div style={{ display: "flex", paddingLeft: "28px" }}>
          <span style={{ fontSize: "10px", color: primary, opacity: 0.4 }}>Hour</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "auto",
        borderTop: `1px solid rgba(16,23,32,0.08)`,
        padding: "14px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "13px", color: primary, opacity: 0.6, fontWeight: 400 }}>Learn more</span>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: "28px", height: "28px",
            border: `1px solid rgba(16,23,32,0.15)`,
            borderRadius: "6px",
            background: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px",
            color: primary,
            opacity: 0.5,
          }}
        >
          {open ? "∨" : "∧"}
        </button>
      </div>
    </div>
  );
}

function UseCaseCards({ PRIMARY, P }) {
  const cards = [
    {
      title: "GPUs",
      tag: "[00-1]",
      type: "solar",
      desc: "Easily integrate paraUSD into your platform with developer-friendly APIs and SDKs, enabling seamless access to high-yield opportunities and real-time data",
      legendItems: [
        { label: "Average 24hr load", color: "#c0392b", dashed: true },
        { label: "API Activity", color: P[6] },
        { label: "On-chain Volume", color: null, dotted: true },
      ],
    },
    {
      title: "Businesses",
      tag: "[00-2]",
      type: "wind",
      desc: "Boost user engagement by offering paraUSD, a secure fiat-backed stablecoin with high yields, allowing your customers to earn effortlessly on your platform.",
      legendItems: [
        { label: "Average 24hr load", color: "#c0392b", dashed: true },
        { label: "Yield Profile", color: "#5bbfc7" },
      ],
    },
    {
      title: "Treasuries",
      tag: "[00-3]",
      type: "hydro",
      desc: "Optimize your treasury management with risk-free yields backed by U.S. Treasury liquidity and complete transparency.",
      legendItems: [
        { label: "Average 24hr load", color: "#c0392b", dashed: true },
        { label: "Treasury Profile", color: P[7] },
      ],
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "16px",
      marginLeft: "-56px",
      marginRight: "-56px",
      padding: "0 56px",
    }}>
      {cards.map((c, i) => (
        <UseCaseCard key={c.title} index={i} {...c} primary={PRIMARY} palette={P}/>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function WhelLanding() {
  const [hovered, setHovered] = useState(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;
    let frame;
    let angle = 0;
    const animate = () => {
      angle += 0.003;
      el.style.transform = `perspective(900px) rotateX(${18 + Math.sin(angle) * 2}deg) rotateY(${-20 + Math.cos(angle * 0.7) * 3}deg) rotateZ(${-8 + Math.sin(angle * 0.5) * 1}deg)`;
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  const navLinks = ["ParaUSD", "Developers", "Businesses", "Treasuries", "Resources"];

  const logos = [
    { name: "semantic.", icon: "◈" },
    { name: "LIGHTSHIFT", icon: "⟋" },
    { name: "veryearly", icon: null },
    { name: "Orange DAO", icon: "⬡" },
  ];

  const cards = [
    { bg: "rgba(17,20,25,0.92)", blur: 0 },
    { bg: "rgba(17,20,25,0.72)", blur: 1 },
    { bg: "rgba(17,20,25,0.50)", blur: 2 },
    { bg: "rgba(17,20,25,0.32)", blur: 3 },
    { bg: "rgba(17,20,25,0.16)", blur: 4 },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      fontFamily: "'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: PRIMARY,
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-link {
          color: ${PRIMARY};
          text-decoration: none;
          font-size: 15px;
          font-weight: 400;
          opacity: 0.75;
          transition: opacity 0.2s;
          cursor: pointer;
        }
        .nav-link:hover { opacity: 1; }
        .btn-primary {
          background: ${PRIMARY};
          color: white;
          border: none;
          border-radius: 999px;
          padding: 11px 24px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          font-family: inherit;
        }
        .btn-primary:hover { background: ${P[7]}; transform: translateY(-1px); }
        .btn-ghost {
          background: none;
          border: none;
          color: ${PRIMARY};
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0.7;
          transition: opacity 0.2s;
          font-family: inherit;
        }
        .btn-ghost:hover { opacity: 1; }
        .logo-item {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0.35;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.02em;
          transition: opacity 0.2s;
          cursor: default;
        }
        .logo-item:hover { opacity: 0.55; }
        .floating-card {
          position: absolute;
          border-radius: 18px;
          width: 240px;
          height: 155px;
          transition: transform 0.1s;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.15s; }
        .fade-up-3 { animation-delay: 0.25s; }
        .fade-up-4 { animation-delay: 0.35s; }
        .fade-up-5 { animation-delay: 0.45s; }
      `}</style>

      {/* NAV */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 56px",
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "18px" }}>
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
            <path d="M2 2L8 16L11 9L14 16L20 2" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Whel
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
          {navLinks.map(l => (
            <span key={l} className="nav-link">{l}</span>
          ))}
        </div>

        <button className="btn-ghost" style={{ opacity: 0.85, fontWeight: 500 }}>
          Get Started
        </button>
      </nav>

      {/* HERO */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        alignItems: "center",
        padding: "60px 56px 0",
        minHeight: "calc(100vh - 120px)",
        position: "relative",
      }}>
        {/* LEFT */}
        <div style={{ paddingTop: "20px" }}>
          <h1 className="fade-up fade-up-1" style={{
            fontSize: "clamp(52px, 6vw, 80px)",
            fontWeight: 300,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            marginBottom: "40px",
            color: PRIMARY,
          }}>
            Invest,<br />like the 1%.
          </h1>

          <div className="fade-up fade-up-2" style={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            marginTop: "8px",
          }}>
            <span style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 700,
              color: P[7],
              letterSpacing: "-0.02em",
            }}>11.00%</span>
            <span style={{
              fontSize: "clamp(20px, 2.5vw, 30px)",
              fontWeight: 300,
              color: PRIMARY,
              opacity: 0.6,
            }}>APY</span>
          </div>
        </div>



        {/* RIGHT */}
        <div className="fade-up fade-up-3" style={{
          paddingLeft: "40px",
          paddingTop: "20px",
          alignSelf: "start",
          marginTop: "80px",
        }}>
          <p style={{
            fontSize: "15px",
            lineHeight: 1.65,
            color: PRIMARY,
            opacity: 0.7,
            maxWidth: "340px",
            marginBottom: "32px",
            fontWeight: 400,
          }}>
            Let your users earn more securely through USD-backed paraUSD. Integrate high yield capabilities into your product with one simple API.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button className="btn-primary">Get Started</button>
            <button className="btn-ghost">
              Learn more
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 11L11 3M11 3H5M11 3V9" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <p style={{
            fontSize: "12px",
            color: PRIMARY,
            opacity: 0.35,
            marginTop: "48px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}>Earn with paraUSD</p>
        </div>
      </section>

      {/* USE CASES */}
      <section style={{
        background: P[0],
        padding: "72px 56px 0",
        overflow: "hidden",
      }}>
        {/* Header */}
        <p style={{ fontSize: "13px", color: PRIMARY, opacity: 0.45, marginBottom: "12px", fontWeight: 400 }}>
          ParaUSD in Action
        </p>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 400, letterSpacing: "-0.02em", color: PRIMARY, marginBottom: "16px" }}>
          Use cases
        </h2>
        <p style={{ fontSize: "15px", color: PRIMARY, opacity: 0.55, lineHeight: 1.6, maxWidth: "380px", marginBottom: "48px" }}>
          paraUSD offers a variety of use cases for developers, businesses and treasuries seeking secure and profitable stablecoin integrations
        </p>

        {/* Cards row */}
        <UseCaseCards PRIMARY={PRIMARY} P={P} />

        {/* Features strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0",
          borderTop: `1px solid rgba(17,20,25,0.1)`,
          marginLeft: "-56px",
          marginRight: "-56px",
          padding: "48px 56px",
          background: P[0],
        }}>
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="4" y="8" width="14" height="11" rx="2" stroke={PRIMARY} strokeWidth="1.5" opacity="0.7"/>
                  <path d="M8 8V6a3 3 0 016 0v2" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                  <circle cx="11" cy="14" r="1.5" fill={PRIMARY} opacity="0.7"/>
                </svg>
              ),
              title: "Secure",
              desc: "Riipe uses USDC stablecoins, providing a stable and secure investment option.",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3L4 7v4c0 4.4 3 8.1 7 9 4-0.9 7-4.6 7-9V7l-7-4z" stroke={PRIMARY} strokeWidth="1.5" strokeLinejoin="round" opacity="0.7"/>
                  <path d="M8 11l2 2 4-4" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
                </svg>
              ),
              title: "Risk-Free",
              desc: "Enjoy a risk-free experience with full collateralization, ensuring consistent value at all times.",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="3" width="16" height="16" rx="3" stroke={PRIMARY} strokeWidth="1.5" opacity="0.7"/>
                  <path d="M7 15l3-4 2 2 3-5" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
                  <circle cx="17" cy="5" r="2.5" fill={PRIMARY} opacity="0.85"/>
                </svg>
              ),
              title: "High Yields",
              desc: "Benefit from a unique yield mechanism that offers both fixed and floating returns, maximizing your earnings.",
            },
          ].map(f => (
            <div key={f.title} style={{ paddingRight: "40px" }}>
              <div style={{ marginBottom: "16px" }}>{f.icon}</div>
              <h4 style={{ fontSize: "15px", fontWeight: 500, color: PRIMARY, marginBottom: "8px" }}>{f.title}</h4>
              <p style={{ fontSize: "14px", color: PRIMARY, opacity: 0.5, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT IS PARAUSD */}
      <section style={{
        background: "#fafafa",
        padding: "72px 56px 0",
        overflow: "hidden",
      }}>
        <p style={{ fontSize: "13px", color: PRIMARY, opacity: 0.45, marginBottom: "12px" }}>Our ecosystem</p>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 400, letterSpacing: "-0.02em", color: PRIMARY, marginBottom: "48px" }}>
          What is paraUSD?
        </h2>

        {/* Highway network diagram */}
        <div style={{ position: "relative", height: "480px", marginBottom: "64px", overflow: "hidden" }}>
          <svg
            viewBox="0 0 1100 480"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Road gradients flowing toward center */}
              <linearGradient id="roadL1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={P[0]} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={P[6]} stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="roadL2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={P[1]} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={P[7]} stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="roadR1" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={P[0]} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={P[6]} stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="roadT1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={P[0]} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={P[5]} stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="roadB1" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={P[0]} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={P[5]} stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="roadDiag1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={P[1]} stopOpacity="0.25"/>
                <stop offset="100%" stopColor={P[8]} stopOpacity="0.85"/>
              </linearGradient>
              <linearGradient id="roadDiag2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={P[1]} stopOpacity="0.25"/>
                <stop offset="100%" stopColor={P[7]} stopOpacity="0.85"/>
              </linearGradient>
              <linearGradient id="glowGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor={P[4]} stopOpacity="0.35"/>
                <stop offset="100%" stopColor={P[4]} stopOpacity="0"/>
              </linearGradient>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={P[3]} stopOpacity="0.4"/>
                <stop offset="60%" stopColor={P[3]} stopOpacity="0.1"/>
                <stop offset="100%" stopColor={P[3]} stopOpacity="0"/>
              </radialGradient>
              <filter id="blur4">
                <feGaussianBlur stdDeviation="4"/>
              </filter>
              <filter id="blur2">
                <feGaussianBlur stdDeviation="2"/>
              </filter>
            </defs>

            {/* Glow at center */}
            <ellipse cx="550" cy="240" rx="120" ry="90" fill="url(#centerGlow)" filter="url(#blur4)"/>

            {/* === HIGHWAY ROADS === */}
            {/* Main horizontal highway from left */}
            <rect x="0" y="228" width="518" height="24" rx="0" fill="url(#roadL1)" opacity="0.7"/>
            {/* Center stripe */}
            <line x1="0" y1="240" x2="518" y2="240" stroke="white" strokeWidth="1.5" strokeDasharray="24,16" opacity="0.25"/>

            {/* Main horizontal highway from right */}
            <rect x="582" y="228" width="518" height="24" rx="0" fill="url(#roadR1)" opacity="0.7"/>
            <line x1="582" y1="240" x2="1100" y2="240" stroke="white" strokeWidth="1.5" strokeDasharray="24,16" opacity="0.25"/>

            {/* Main vertical highway from top */}
            <rect x="538" y="0" width="24" height="208" rx="0" fill="url(#roadT1)" opacity="0.7"/>
            <line x1="550" y1="0" x2="550" y2="208" stroke="white" strokeWidth="1.5" strokeDasharray="24,16" opacity="0.25"/>

            {/* Main vertical highway from bottom */}
            <rect x="538" y="272" width="24" height="208" rx="0" fill="url(#roadB1)" opacity="0.7"/>
            <line x1="550" y1="272" x2="550" y2="480" stroke="white" strokeWidth="1.5" strokeDasharray="24,16" opacity="0.25"/>

            {/* Diagonal from top-left */}
            <path d="M 80 0 L 520 230" stroke={P[5]} strokeWidth="14" opacity="0.5" fill="none" strokeLinecap="round"/>
            <path d="M 80 0 L 520 230" stroke="white" strokeWidth="1" strokeDasharray="20,14" opacity="0.2" fill="none"/>

            {/* Diagonal from top-right */}
            <path d="M 980 20 L 582 228" stroke={P[6]} strokeWidth="12" opacity="0.45" fill="none" strokeLinecap="round"/>
            <path d="M 980 20 L 582 228" stroke="white" strokeWidth="1" strokeDasharray="20,14" opacity="0.2" fill="none"/>

            {/* Diagonal from bottom-left */}
            <path d="M 60 460 L 520 272" stroke={P[4]} strokeWidth="12" opacity="0.45" fill="none" strokeLinecap="round"/>
            <path d="M 60 460 L 520 272" stroke="white" strokeWidth="1" strokeDasharray="20,14" opacity="0.2" fill="none"/>

            {/* Diagonal from bottom-right */}
            <path d="M 1000 460 L 582 272" stroke={P[5]} strokeWidth="10" opacity="0.4" fill="none" strokeLinecap="round"/>
            <path d="M 1000 460 L 582 272" stroke="white" strokeWidth="1" strokeDasharray="20,14" opacity="0.2" fill="none"/>

            {/* Secondary roads - curved offramps */}
            <path d="M 200 0 Q 200 180 518 235" stroke={P[3]} strokeWidth="8" opacity="0.35" fill="none" strokeLinecap="round"/>
            <path d="M 860 0 Q 860 160 582 232" stroke={P[3]} strokeWidth="8" opacity="0.35" fill="none" strokeLinecap="round"/>
            <path d="M 150 480 Q 250 340 518 248" stroke={P[2]} strokeWidth="7" opacity="0.3" fill="none" strokeLinecap="round"/>
            <path d="M 920 480 Q 820 340 582 248" stroke={P[2]} strokeWidth="7" opacity="0.3" fill="none" strokeLinecap="round"/>

            {/* Tertiary thin roads */}
            <path d="M 0 80 Q 300 80 518 228" stroke={P[1]} strokeWidth="4" opacity="0.3" fill="none"/>
            <path d="M 0 400 Q 280 400 518 252" stroke={P[1]} strokeWidth="4" opacity="0.3" fill="none"/>
            <path d="M 1100 120 Q 800 120 582 228" stroke={P[1]} strokeWidth="4" opacity="0.3" fill="none"/>
            <path d="M 1100 380 Q 820 380 582 252" stroke={P[1]} strokeWidth="4" opacity="0.3" fill="none"/>

            {/* Road shoulder markings */}
            <line x1="0" y1="226" x2="516" y2="226" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>
            <line x1="0" y1="254" x2="516" y2="254" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>
            <line x1="584" y1="226" x2="1100" y2="226" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>
            <line x1="584" y1="254" x2="1100" y2="254" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>
            <line x1="536" y1="0" x2="536" y2="206" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>
            <line x1="564" y1="0" x2="564" y2="206" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>
            <line x1="536" y1="274" x2="536" y2="480" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>
            <line x1="564" y1="274" x2="564" y2="480" stroke={P[3]} strokeWidth="1.5" opacity="0.4"/>

            {/* Interchange circles at junctions */}
            <circle cx="550" cy="240" r="60" fill="none" stroke={P[4]} strokeWidth="1.5" opacity="0.4"/>
            <circle cx="550" cy="240" r="40" fill="none" stroke={P[5]} strokeWidth="1" opacity="0.3"/>
          </svg>

          {/* Center logo */}
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 4,
          }}>
            <div style={{
              position: "absolute",
              inset: "-28px",
              background: `radial-gradient(circle, ${P[3]}55 0%, transparent 70%)`,
              borderRadius: "50%",
              filter: "blur(8px)",
            }}/>
            <div style={{
              width: "72px",
              height: "72px",
              background: PRIMARY,
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
              boxShadow: `0 8px 40px ${P[7]}88, 0 2px 12px rgba(16,23,32,0.4)`,
              border: `1.5px solid ${P[5]}`,
            }}>
              <svg width="32" height="28" viewBox="0 0 22 18" fill="none">
                <path d="M2 2L8 16L11 9L14 16L20 2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Floating labels */}
          {[
            { label: "Earn Risk-Free Yields", top: "15%", left: "62%", color: P[8] },
            { label: "Exchanges", top: "42%", left: "5%", color: P[7] },
            { label: "Grow your treasury", top: "58%", left: "3%", color: P[6] },
            { label: "Neobanks", top: "72%", left: "22%", color: P[7] },
            { label: "Wallets", top: "80%", left: "46%", color: P[6] },
            { label: "Earn Rewards", top: "68%", left: "74%", color: P[8] },
          ].map(({ label, top, left, color }) => (
            <div key={label} style={{
              position: "absolute",
              top,
              left,
              background: "white",
              border: `1px solid ${color}55`,
              borderRadius: "999px",
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: 400,
              color: PRIMARY,
              whiteSpace: "nowrap",
              zIndex: 5,
              boxShadow: `0 2px 12px ${color}33`,
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bottom two-column text */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "48px",
          borderTop: `1px solid rgba(17,20,25,0.08)`,
          padding: "48px 0 64px",
        }}>
          <div>
            <p style={{ fontSize: "14px", color: PRIMARY, opacity: 0.5, lineHeight: 1.7, marginBottom: "32px" }}>
              ParaUSD is a USD-pegged stablecoin backed by U.S. Treasury Bills and overnight repurchase agreements. paraUSD can be obtained through exchanges or minted after completing KYB (Know Your Business) verification
            </p>
            <button style={{
              background: PRIMARY,
              color: "white",
              border: "none",
              borderRadius: "999px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "opacity 0.2s",
            }}>
              See how paraUSD works
            </button>
          </div>
          <div>
            <p style={{ fontSize: "14px", color: PRIMARY, opacity: 0.5, lineHeight: 1.7 }}>
              Simplest way to save and earn. Lock paraUSD for a set time period, and when your time is up you get back your principal plus rewards
            </p>
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <footer className="fade-up fade-up-5" style={{
        padding: "48px 56px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <p style={{
            fontSize: "13px",
            color: PRIMARY,
            opacity: 0.4,
            lineHeight: 1.5,
            maxWidth: "200px",
          }}>
            Backed by the best companies<br />and visionary angels.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
          {logos.map(l => (
            <div key={l.name} className="logo-item">
              {l.icon && <span style={{ fontSize: "18px" }}>{l.icon}</span>}
              <span style={{ fontWeight: l.name === "veryearly" ? 400 : 600, fontStyle: l.name === "veryearly" ? "italic" : "normal" }}>
                {l.name}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

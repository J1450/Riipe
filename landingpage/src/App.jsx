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
  const cardRef = useRef(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // #region agent log
    fetch('http://127.0.0.1:7721/ingest/aff1f977-b4bf-47b7-b1e4-418a2ea38ec7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b33273'},body:JSON.stringify({sessionId:'b33273',location:'App.jsx:UseCaseCard',message:'card dimensions post-fix',data:{index,title,cardW:Math.round(r.width),cardH:Math.round(r.height),vpW:window.innerWidth,vpH:window.innerHeight},runId:'post-fix',timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
    // #endregion
  }, []);
  return (
    <div ref={cardRef} className="use-case-card" style={{
      background: "white",
      borderRadius: "20px",
      border: "1px solid rgba(255,255,255,0.6)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "8px 8px 24px rgba(150, 165, 185, 0.5), -8px -8px 24px rgba(255, 255, 255, 0.8)",
    }}>
      {/* Card header */}
      <div className="uc-header" style={{ padding: "28px 28px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <h3 className="uc-title" style={{ fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", color: primary, lineHeight: 1.1 }}>
            {title}
          </h3>
          <span style={{ fontSize: "12px", color: primary, opacity: 0.4, fontWeight: 400, whiteSpace: "nowrap", marginTop: "6px" }}>
            {tag}
          </span>
        </div>
        <p className="uc-desc" style={{ fontSize: "13.5px", color: primary, opacity: 0.55, lineHeight: 1.65, marginBottom: "24px" }}>
          {desc}
        </p>

        {/* Legend */}
        <div className="uc-legend" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
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
          <div className="uc-chart-col" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "160px", paddingRight: "8px", paddingTop: "0" }}>
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
      <div className="uc-footer" style={{
        marginTop: "auto",
        borderTop: `1px solid rgba(255,255,255,0.3)`,
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
            border: "none",
            borderRadius: "8px",
            background: "white",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px",
            color: primary,
            opacity: 0.6,
            boxShadow: "3px 3px 6px rgba(150, 165, 185, 0.5), -3px -3px 6px rgba(255, 255, 255, 0.6), inset 1px 1px 2px rgba(255, 255, 255, 0.3)",
          }}
        >
          {open ? "∨" : "∧"}
        </button>
      </div>
    </div>
  );
}

function UseCaseCards({ PRIMARY, P }) {
  const scrollRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const children = Array.from(container.children);
    if (!children.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = children.indexOf(entry.target);
            if (idx !== -1) setActiveDot(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  const cards = [
    {
      title: "GPUs",
      tag: "[00-1]",
      type: "solar",
      desc: "Easily invest in the foundational layer of the AI infrastructure. GPUs are an incredibly high revenue generating asset with increasing demands and fixed recurring costs.",
      legendItems: [
        { label: "Average 24hr load", color: "#c0392b", dashed: true },
        { label: "API Activity", color: P[6] },
        { label: "On-chain Volume", color: null, dotted: true },
      ],
    },
    {
      title: "Infrastructure",
      tag: "[00-2]",
      type: "wind",
      desc: "Invest into hyperscale public infrastructure projects.",
      legendItems: [
        { label: "Average 24hr load", color: "#c0392b", dashed: true },
        { label: "Yield Profile", color: "#5bbfc7" },
      ],
    },
    {
      title: "Industrial Equipment",
      tag: "[00-3]",
      type: "hydro",
      desc: "Optimize your treasury management with risk-free yields backed by USDC and complete transparency.",
      legendItems: [
        { label: "Average 24hr load", color: "#c0392b", dashed: true },
        { label: "Treasury Profile", color: P[7] },
      ],
    },
  ];

  return (
    <>
      <div className="use-case-grid" ref={scrollRef}>
        {cards.map((c, i) => (
          <UseCaseCard key={c.title} index={i} {...c} primary={PRIMARY} palette={P}/>
        ))}
      </div>
      <div className="scroll-dots">
        {cards.map((_, i) => (
          <span key={i} className={`dot${activeDot === i ? " active" : ""}`} />
        ))}
      </div>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function WhelLanding() {
  const [hovered, setHovered] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [howStep, setHowStep] = useState(null);
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

  // #region agent log
  useEffect(() => {
    const contactEl = document.getElementById('contact');
    const form = contactEl?.querySelector('form');
    fetch('http://127.0.0.1:7721/ingest/aff1f977-b4bf-47b7-b1e4-418a2ea38ec7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cca1f0'},body:JSON.stringify({sessionId:'cca1f0',location:'App.jsx:mount',message:'contact section check',data:{contactExists:!!contactEl,formAction:form?.action||'none',formMethod:form?.method||'none',sectionBg:contactEl?.style?.background||'none'},runId:'verify',hypothesisId:'all',timestamp:Date.now()})}).catch(()=>{});
  }, []);
  // #endregion
  const scrollToContact = () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  const openWhitepaper = () => window.open('https://riipe-1.gitbook.io/riipe-whitepaper', '_blank');
  const navSectionMap = { "Riipe": "hero", "Assets": "assets", "How it Works": "how-it-works", "Invest": "invest", "FAQs": "faqs", "Team": "team", "Whitepaper": null };
  const handleNavClick = (label) => {
    setMenuOpen(false);
    if (label === "Whitepaper") return openWhitepaper();
    const id = navSectionMap[label];
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const navLinks = ["Riipe", "Assets", "How it Works", "Invest", "FAQs", "Team", "Whitepaper"];

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
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
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

        /* ─── Responsive layout classes ─── */
        .section-pad { padding-left: 56px; padding-right: 56px; }
        .nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 20px 56px; position: relative; z-index: 10; }
        .nav-links { display: flex; align-items: center; gap: 36px; }
        .nav-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
        .nav-mobile-menu {
          display: none;
          position: absolute; top: 100%; left: 0; right: 0;
          background: white; padding: 16px 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          flex-direction: column; gap: 16px; z-index: 100;
        }
        .nav-mobile-menu.open { display: flex; }
        .nav-cta-desktop { display: flex; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 60px 56px 0; min-height: calc(100vh - 120px); position: relative; }
        .hero-right { padding-left: 40px; padding-top: 20px; align-self: start; margin-top: 80px; }
        .use-case-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-left: -56px; margin-right: -56px; padding: 0 56px; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 1px solid rgba(17,20,25,0.1); margin-left: -56px; margin-right: -56px; padding: 48px 56px; }
        .how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .invest-grid { display: grid; grid-template-columns: 1fr 1fr 0.75fr; overflow: hidden; min-height: 520px; position: relative; }
        .invest-stats { border-radius: 0 20px 20px 0; }
        .faq-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 64px; align-items: start; }
        .faq-sidebar { position: sticky; top: 96px; }
        .team-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; max-width: 820px; margin: 0 auto; }
        .cta-buttons { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 56px; flex-wrap: wrap; }
        .email-row { display: flex; gap: 8px; margin-bottom: 10px; }
        .footer-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 24px; }
        .footer-links { display: flex; align-items: center; gap: 32px; flex-wrap: wrap; }
        .footer-socials { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; max-width: 1100px; margin: 0 auto; }
        .contact-input {
          width: 100%; background: transparent; border: none;
          border-bottom: 1px solid ${PRIMARY}20; padding: 14px 0;
          font-size: 14px; color: ${PRIMARY}; font-family: inherit; outline: none;
          transition: border-color 0.2s;
        }
        .contact-input::placeholder { color: ${PRIMARY}66; }
        .contact-input:focus { border-bottom-color: ${P[7]}; }

        /* ─── Tablet: <=1024px ─── */
        @media (max-width: 1024px) {
          .section-pad { padding-left: 32px; padding-right: 32px; }
          .nav-bar { padding: 20px 32px; }
          .hero-grid { grid-template-columns: 1fr; padding: 40px 32px 0; min-height: auto; }
          .hero-right { padding-left: 0; margin-top: 32px; }
          .use-case-grid { grid-template-columns: repeat(2, 1fr); margin-left: -32px; margin-right: -32px; padding: 0 32px; }
          .features-grid { margin-left: -32px; margin-right: -32px; padding: 48px 32px; }
          .how-grid { grid-template-columns: repeat(2, 1fr); }
          .invest-grid { grid-template-columns: 1fr 1fr; min-height: auto; }
          .invest-stats { border-radius: 0 0 20px 20px; grid-column: 1 / -1; }
          .faq-grid { gap: 40px; }
          .team-grid { max-width: 100%; }
          .contact-grid { gap: 40px; }
        }

        /* ─── Scroll dots & accordion (base, hidden on desktop) ─── */
        .scroll-dots { display: none; justify-content: center; gap: 8px; padding: 16px 0 0; }
        .scroll-dots .dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: ${P[4]}; transition: background 0.25s, transform 0.25s;
        }
        .scroll-dots .dot.active { background: ${P[7]}; transform: scale(1.3); }
        .how-step-header { display: none; }
        .how-step-expand { display: none; }
        .how-step-desktop { display: block; }

        /* ─── Mobile: <=768px ─── */
        @media (max-width: 768px) {
          .section-pad { padding-left: 20px; padding-right: 20px; }
          .nav-bar { padding: 16px 20px; }
          .nav-links { display: none; }
          .nav-hamburger { display: block; }
          .nav-cta-desktop { display: none; }
          .hero-grid { padding: 32px 20px 0; }
          .hero-right { margin-top: 24px; }
          .use-case-grid {
            display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch; gap: 12px;
            margin-left: -20px; margin-right: -20px; padding: 0 20px 4px;
            scrollbar-width: none;
          }
          .use-case-grid::-webkit-scrollbar { display: none; }
          .use-case-grid > * { min-width: 85vw; flex-shrink: 0; scroll-snap-align: start; }
          .uc-header { padding: 16px 16px 0 !important; }
          .uc-title { font-size: 20px !important; }
          .uc-desc { font-size: 12px !important; margin-bottom: 10px !important; }
          .uc-legend { gap: 10px !important; margin-bottom: 8px !important; }
          .uc-chart-col { height: 100px !important; }
          .uc-footer { padding: 8px 16px !important; }
          .scroll-dots { display: flex; }
          .features-grid { grid-template-columns: 1fr; margin-left: -20px; margin-right: -20px; padding: 32px 20px; gap: 32px; }
          .how-grid { display: flex; flex-direction: column; gap: 8px; }
          .how-step-header {
            display: flex; align-items: center; gap: 12px;
            padding: 14px 16px; cursor: pointer; width: 100%;
            background: none; border: none; font-family: inherit; text-align: left;
            outline: none;
          }
          .how-step-header:focus, .how-step-header:active { outline: none; box-shadow: none; }
          .how-step-desktop { display: none; }
          .how-step-expand { display: none; }
          .how-step-expand.open {
            display: block; padding: 0 16px 16px 64px;
            font-size: 14px; line-height: 1.6; opacity: 0.5;
          }
          .how-step-num { font-size: 18px; font-weight: 300; opacity: 0.35; min-width: 20px; }
          .how-step-icon-sm {
            width: 36px; height: 36px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .how-step-icon-sm svg { width: 22px; height: 22px; }
          .how-step-title { font-size: 14px; font-weight: 600; flex: 1; }
          .how-step-toggle {
            font-size: 18px; font-weight: 300; flex-shrink: 0;
            width: 28px; text-align: center; transition: color 0.2s;
          }
          .invest-grid { grid-template-columns: 1fr; min-height: auto; }
          .invest-stats { border-radius: 0 0 20px 20px; grid-column: auto; }
          .faq-grid { grid-template-columns: 1fr; gap: 32px; }
          .faq-sidebar { position: static; }
          .team-grid { grid-template-columns: 1fr; }
          .cta-buttons { flex-direction: column; gap: 12px; }
          .cta-buttons button { width: 100%; max-width: 320px; }
          .footer-top { flex-direction: column; align-items: flex-start; }
          .footer-links { flex-direction: column; gap: 12px; }
          .footer-socials { gap: 16px; }
          .contact-grid { grid-template-columns: 1fr; gap: 32px; }
        }

        /* ─── Small phone: <=480px ─── */
        @media (max-width: 480px) {
          .section-pad { padding-left: 16px; padding-right: 16px; }
          .nav-bar { padding: 14px 16px; }
          .hero-grid { padding: 24px 16px 0; }
          .use-case-grid { margin-left: -16px; margin-right: -16px; padding: 0 16px 4px; }
          .use-case-grid > * { min-width: 88vw; }
          .uc-header { padding: 12px 12px 0 !important; }
          .uc-title { font-size: 18px !important; }
          .uc-desc { font-size: 11.5px !important; margin-bottom: 8px !important; }
          .uc-chart-col { height: 80px !important; }
          .uc-footer { padding: 6px 12px !important; }
          .features-grid { margin-left: -16px; margin-right: -16px; padding: 24px 16px; }
          .email-row { flex-direction: column; }
          .email-row input, .email-row button { width: 100%; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "18px" }}>
          <img src="/riipe logo.png" alt="Riipe" style={{ height: "60px", width: "auto", objectFit: "contain" }} />
        </div>

        <div className="nav-links">
          {navLinks.map(l => (
            <span key={l} className="nav-link" onClick={() => handleNavClick(l)}>{l}</span>
          ))}
        </div>

        <button className="btn-ghost nav-cta-desktop" style={{ opacity: 0.85, fontWeight: 500 }} onClick={scrollToContact}>
          Get Started
        </button>

        <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round">
            {menuOpen
              ? <><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>

        <div className={`nav-mobile-menu${menuOpen ? " open" : ""}`}>
          {navLinks.map(l => (
            <span key={l} className="nav-link" onClick={() => handleNavClick(l)}>{l}</span>
          ))}
          <button className="btn-primary" style={{ alignSelf: "flex-start", marginTop: "8px" }} onClick={() => { setMenuOpen(false); scrollToContact(); }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" className="hero-grid">
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
            Invest in Infrastructure,<br />Like the 1%.
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
            }}>Simple, Intuitive, and Frictionless</span>
            <span style={{
              fontSize: "clamp(20px, 2.5vw, 30px)",
              fontWeight: 300,
              color: PRIMARY,
              opacity: 0.6,
            }}></span>
          </div>
        </div>



        {/* RIGHT */}
        <div className="fade-up fade-up-3 hero-right">
          <p style={{
            fontSize: "15px",
            lineHeight: 1.65,
            color: PRIMARY,
            opacity: 0.7,
            maxWidth: "340px",
            marginBottom: "32px",
            fontWeight: 400,
          }}>
          Unlock institutional-grade infrastructure investing by transforming capital-intensive real-world assets into liquid, yield-generating digital tokens—making private market ownership accessible, tradable, and digitally native.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button className="btn-primary" onClick={scrollToContact}>Get Started</button>
            <button className="btn-ghost" onClick={openWhitepaper}>
              Learn more
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 11L11 3M11 3H5M11 3V9" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "36px",
          }}>
            {["Fully compliant", "No-code", "Integrated KYC/KYB", "Easy onboarding"].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke={P[7]} strokeWidth="1.5" fill="none"/>
                  <path d="M6.5 10.5L9 13L13.5 7.5" stroke={P[7]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span style={{ fontSize: "14px", fontWeight: 500, color: PRIMARY, opacity: 0.75 }}>{item}</span>
              </div>
            ))
            }
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="assets" className="section-pad" style={{
        background: P[0],
        paddingTop: "72px",
        paddingBottom: "0",
        overflow: "hidden",
      }}>
        {/* Header */}
        <p style={{ fontSize: "13px", color: PRIMARY, opacity: 0.45, marginBottom: "12px", fontWeight: 400 }}>
          Invest with Riipe
        </p>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 400, letterSpacing: "-0.02em", color: PRIMARY, marginBottom: "16px" }}>
          Assets
        </h2>
        <p style={{ fontSize: "15px", color: PRIMARY, opacity: 0.55, lineHeight: 1.6, maxWidth: "380px", marginBottom: "48px" }}>
          Riipe offers access to high-capital, revenue generating infrastructure assets which were previously institutionally gatekept
        </p>

        {/* Cards row */}
        <UseCaseCards PRIMARY={PRIMARY} P={P} />

        {/* Features strip */}
        <div className="features-grid" style={{
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

      {/* HOW RIIPE WORKS */}
      <section id="how-it-works" className="section-pad" style={{
        background: "#fafafa",
        paddingTop: "72px",
        paddingBottom: "64px",
        overflow: "hidden",
      }}>
        <p style={{ fontSize: "13px", color: PRIMARY, opacity: 0.45, marginBottom: "12px" }}>Our process</p>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 400, letterSpacing: "-0.02em", color: PRIMARY, marginBottom: "56px" }}>
          How Riipe Works
        </h2>

        <div className="how-grid">
          {[
            {
              title: "Asset Origination",
              desc: "Asset owner/business wanting access to global capital faster for efficient fundraising list their assets on Riipe.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="8" y="16" width="24" height="16" rx="2" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <path d="M20 8L32 16H8L20 8Z" stroke={PRIMARY} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                  <line x1="14" y1="22" x2="14" y2="32" stroke={PRIMARY} strokeWidth="1.5"/>
                  <line x1="20" y1="22" x2="20" y2="32" stroke={PRIMARY} strokeWidth="1.5"/>
                  <line x1="26" y1="22" x2="26" y2="32" stroke={PRIMARY} strokeWidth="1.5"/>
                </svg>
              ),
            },
            {
              title: "SPV Structuring",
              desc: "Each asset is placed into an SPV to ensure legal clarity, investor protection, and regulatory compliance.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M20 4L34 12V24C34 30 28 35 20 38C12 35 6 30 6 24V12L20 4Z" stroke={PRIMARY} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                  <path d="M14 20L18 24L26 16" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ),
            },
            {
              title: "Tokenization",
              desc: "The SPV ownership is represented on-chain through programmable tokens that encode revenue rights and transfer logic.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="10" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <circle cx="20" cy="20" r="4" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <line x1="20" y1="10" x2="20" y2="6" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="20" y1="34" x2="20" y2="30" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="10" y1="20" x2="6" y2="20" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="34" y1="20" x2="30" y2="20" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              title: "Capital Formation",
              desc: "Investors purchase tokens to meet fundraising goal for asset owner, converting infrastructure into a liquid, investable asset.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="7" y="24" width="6" height="10" rx="1" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <rect x="17" y="18" width="6" height="16" rx="1" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <rect x="27" y="12" width="6" height="22" rx="1" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <path d="M10 12L20 7L32 9" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M29 7.5L32 9L30 12" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ),
            },
            {
              title: "Revenue Generation",
              desc: "Assets generate recurring revenue tied directly to asset performance.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="12" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <path d="M22 15.5C21.5 15 20.8 14.5 20 14.5C18.3 14.5 17 15.8 17 17.5C17 19.2 18.3 20.5 20 20.5C21.7 20.5 23 21.8 23 23.5C23 25.2 21.7 26.5 20 26.5C19.2 26.5 18.5 26 18 25.5" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <line x1="20" y1="12" x2="20" y2="14.5" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="20" y1="26.5" x2="20" y2="29" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              title: "Distribution & Governance",
              desc: "Revenue is programmatically distributed to token holders, with transparent reporting and structured governance mechanisms.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="12" r="4" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <circle cx="10" cy="30" r="4" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <circle cx="30" cy="30" r="4" stroke={PRIMARY} strokeWidth="1.5" fill="none"/>
                  <line x1="18" y1="15.5" x2="12" y2="26.5" stroke={PRIMARY} strokeWidth="1.5"/>
                  <line x1="22" y1="15.5" x2="28" y2="26.5" stroke={PRIMARY} strokeWidth="1.5"/>
                  <line x1="14" y1="30" x2="26" y2="30" stroke={PRIMARY} strokeWidth="1.5"/>
                </svg>
              ),
            },
          ].map((step, i) => (
            <div key={step.title} style={{
              background: "white",
              border: `1px solid ${P[0]}`,
              borderRadius: "16px",
            }}>
              {/* Mobile accordion header */}
              <button
                className="how-step-header"
                onClick={() => setHowStep(howStep === i ? null : i)}
              >
                <span className="how-step-num" style={{ color: P[2] }}>{i + 1}</span>
                <div className="how-step-icon-sm" style={{ background: `${P[0]}88` }}>
                  {step.icon}
                </div>
                <span className="how-step-title" style={{ color: PRIMARY }}>{step.title}</span>
                <span className="how-step-toggle" style={{ color: howStep === i ? P[7] : P[5] }}>
                  {howStep === i ? "×" : "+"}
                </span>
              </button>
              {/* Mobile accordion body */}
              <div className={`how-step-expand${howStep === i ? " open" : ""}`} style={{ color: PRIMARY }}>
                {step.desc}
              </div>
              {/* Desktop full card content */}
              <div className="how-step-desktop" style={{ padding: "28px 24px" }}>
                <span style={{
                  fontSize: "clamp(36px, 3vw, 36px)",
                  fontWeight: 300,
                  color: P[2],
                  lineHeight: 1,
                  display: "block",
                  marginBottom: "20px",
                }}>{i + 1}</span>
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "12px",
                  background: `${P[0]}88`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}>
                  {step.icon}
                </div>
                <h4 style={{ fontSize: "15px", fontWeight: 600, color: PRIMARY, marginBottom: "10px" }}>{step.title}</h4>
                <p style={{ fontSize: "15px", color: PRIMARY, opacity: 0.5, lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INVEST */}
      <section id="invest" className="section-pad" style={{
        background: "white",
        paddingTop: "72px",
        paddingBottom: "72px",
      }}>
        <p style={{ fontSize: "13px", color: PRIMARY, opacity: 0.45, marginBottom: "12px" }}>Get started</p>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 400, letterSpacing: "-0.02em", color: PRIMARY, marginBottom: "48px" }}>
          Invest
        </h2>

        <div className="invest-grid" style={{
          background: "white",
          borderRadius: "20px",
          border: `1px solid ${P[0]}`,
          boxShadow: `0 8px 40px ${P[2]}44`,
        }}>
          {/* Property image */}
          <div style={{
            padding: "24px",
            display: "flex",
            alignItems: "stretch",
          }}>
            <img
              src="/h200.png"
              alt="Investment property"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "12px",
                minHeight: "260px",
              }}
            />
          </div>

          {/* Middle: details */}
          <div style={{
            padding: "32px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>
            <h3 style={{
              fontSize: "22px",
              fontWeight: 600,
              color: PRIMARY,
              marginBottom: "16px",
              lineHeight: 1.3,
            }}>
              8x NVIDIA H200 GPU SXM
            </h3>
            <p style={{
              fontSize: "14px",
              fontWeight: 600,
              color: PRIMARY,
              marginBottom: "12px",
            }}>
              141GB HBM3e memory and 4.8TB/s bandwidth
            </p>
            <p style={{
              fontSize: "15px",
              color: PRIMARY,
              opacity: 0.55,
              lineHeight: 1.65,
              marginBottom: "28px",
              maxWidth: "320px",
            }}>
              High-performance data center GPU based on Hopper architecture with 141GB HBM3e memory and 4.8TB/s bandwidth for accelerating generative AI and HPC workloads.
            </p>
            <button onClick={scrollToContact} style={{
              background: PRIMARY,
              color: "white",
              border: "none",
              borderRadius: "999px",
              padding: "14px 28px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              alignSelf: "flex-start",
              transition: "opacity 0.2s",
            }}>
              Invest
            </button>
          </div>

          {/* Right: stats panel */}
          <div className="invest-stats" style={{
            background: P[1],
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "28px",
          }}>
            {/* Panel icon + amount */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: `${P[3]}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <rect x="3" y="6" width="20" height="14" rx="2" stroke={PRIMARY} strokeWidth="1.4" fill="none"/>
                  <line x1="3" y1="11" x2="23" y2="11" stroke={PRIMARY} strokeWidth="1.4"/>
                  <rect x="6" y="14" width="4" height="3" rx="0.5" stroke={PRIMARY} strokeWidth="1" fill="none"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "22px", fontWeight: 700, color: PRIMARY, lineHeight: 1.2 }}>$360,000</p>
                <p style={{ fontSize: "12px", color: PRIMARY, opacity: 0.55, marginTop: "2px" }}>Investment Size</p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: `${P[4]}88` }}/>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 16px" }}>
              {[
                { value: "3", label: "Years of service", icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7.5" stroke={P[6]} strokeWidth="1.2" fill="none"/>
                    <polyline points="9,4.5 9,9 12,11" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )},
                { value: "210,240", label: "Total GPU Hours", icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="4" width="14" height="10" rx="1.5" stroke={P[6]} strokeWidth="1.2" fill="none"/>
                    <line x1="6" y1="14" x2="6" y2="16" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="12" y1="14" x2="12" y2="16" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="5" y1="16" x2="13" y2="16" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round"/>
                    <rect x="5" y="7" width="3" height="4" rx="0.5" stroke={P[6]} strokeWidth="0.8" fill="none"/>
                    <rect x="10" y="7" width="3" height="4" rx="0.5" stroke={P[6]} strokeWidth="0.8" fill="none"/>
                  </svg>
                )},
                { value: "$118,258", label: "Annual Recurring Cost", icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7.5" stroke={P[6]} strokeWidth="1.2" fill="none"/>
                    <path d="M10 6C9.6 5.7 9.1 5.5 8.5 5.5C7.4 5.5 6.5 6.2 6.5 7.2C6.5 8.2 7.4 8.8 8.5 9C9.6 9.2 10.5 9.8 10.5 10.8C10.5 11.8 9.6 12.5 8.5 12.5C7.9 12.5 7.4 12.3 7 12" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                    <line x1="8.5" y1="4.5" x2="8.5" y2="5.5" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="8.5" y1="12.5" x2="8.5" y2="13.5" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                )},
                { value: "44.1%", label: "Max Projected ROI", icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <polyline points="2,14 6,9 10,11 16,4" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <polyline points="12,4 16,4 16,8" stroke={P[6]} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )},
                { value: "20-25%", label: "Expected yield", icon: (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="12" width="3" height="4" rx="0.5" stroke={P[6]} strokeWidth="1.2" fill="none"/>
                    <rect x="7.5" y="8" width="3" height="8" rx="0.5" stroke={P[6]} strokeWidth="1.2" fill="none"/>
                    <rect x="13" y="3" width="3" height="13" rx="0.5" stroke={P[6]} strokeWidth="1.2" fill="none"/>
                  </svg>
                )},
              ].map(stat => (
                <div key={stat.label} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ marginTop: "2px", flexShrink: 0 }}>{stat.icon}</div>
                  <div>
                    <p style={{ fontSize: "18px", fontWeight: 700, color: PRIMARY, marginBottom: "3px" }}>{stat.value}</p>
                    <p style={{ fontSize: "11px", color: PRIMARY, opacity: 0.55 }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative dots */}
          <div style={{
            position: "absolute", top: "16px", left: "16px",
            width: "8px", height: "8px", borderRadius: "50%",
            background: P[7], opacity: 0.5,
          }}/>
          <div style={{
            position: "absolute", bottom: "16px", left: "16px",
            width: "6px", height: "6px", borderRadius: "2px",
            border: `1.5px solid ${P[5]}`, opacity: 0.5,
          }}/>
          <div style={{
            position: "absolute", top: "16px", right: "340px",
            width: "6px", height: "6px", borderRadius: "50%",
            background: P[5], opacity: 0.4,
          }}/>
        </div>
      </section>

      {/* FAQ */}
      <section id="faqs" className="section-pad" style={{
        background: "#fafafa",
        paddingTop: "96px",
        paddingBottom: "96px",
      }}>
        <div className="faq-grid">
          <div className="faq-sidebar">
            <h2 style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 400,
              color: PRIMARY,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              marginBottom: "40px",
            }}>
              FAQs
            </h2>

            <div style={{
              background: "white",
              borderRadius: "20px",
              padding: "32px 28px",
              border: `0px solid ${P[0]}`,
              boxShadow: `0 4px 24px ${P[1]}44`,
            }}>
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "0%",
                overflow: "hidden",
                marginBottom: "20px",
                border: `0px solid ${P[4]}`,
              }}>
                <img src="/riipe logo.png" alt="Riipe" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: PRIMARY, lineHeight: 1.3, marginBottom: "12px" }}>
                Book a 15 min call
              </h3>
              <p style={{ fontSize: "14px", color: PRIMARY, opacity: 0.5, lineHeight: 1.6, marginBottom: "24px" }}>
                If you have any questions, just book a 15-minute call with us before subscribing
              </p>
              <button onClick={() => window.open('https://calendly.com/team-riipe/30min', '_blank')} style={{
                width: "40%",
                background: PRIMARY,
                color: "white",
                border: "none",
                borderRadius: "999px",
                padding: "16px 24px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "opacity 0.2s",
              }}>
                Book a Free Call
              </button>
            </div>
          </div>

          <div>
            {[
              { q: "What actually backs my token?", a: "A real GPU cluster deployed in an AI data center, generating compute revenue. Your token represents a fractional, verifiable claim on that asset and its revenue stream. Every asset's physical existence and performance data is independently verified before listing." },
              { q: "How is this different from buying NVIDIA stock?", a: "When you buy NVIDIA stock, you're betting on a company's overall performance — R&D costs, margins, competition. When you buy a Riipe GPU token, you're getting direct exposure to a specific, physical asset generating specific, measurable compute revenue. It's the difference between owning a share of an oil company and owning a stake in a specific well." },
              { q: "What are the risks?", a: "Like any investment, Riipe tokens carry risk. GPU compute revenue can fluctuate with AI market demand. Physical assets can depreciate or fail. Regulatory changes may affect how tokens are treated in your jurisdiction. We publish full risk disclosures on every asset listing." },
              { q: "What's the minimum I can invest?", a: "Entry thresholds are designed to be accessible — the whole point is to remove the capital barrier, not just lower it slightly." },
              { q: "Is this available in my country?", a: "Riipe is expanding regulatory coverage actively. Sign up to the waitlist and we'll notify you when your region goes live." },
              { q: "How do I receive my yield?", a: "Yield is distributed automatically to your wallet via smart contract. You can track all distributions in your Riipe dashboard." },
              { q: "Can I sell my tokens before the end of the investment period?", a: "Yes. Because your position is tokenized, it's liquid. You can trade your tokens on the Riipe secondary market at any time, subject to market conditions." },
              { q: "I own GPU infrastructure. How do I get listed?", a: "Submit an application via the 'Tokenize Your Assets' form. We'll review your assets, run due diligence, and if approved, handle the full tokenization and listing process." },
            ].map((faq, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${P[0]}` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "24px 0",
                    background: "none",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 500, color: PRIMARY }}>{faq.q}</span>
                  <span style={{
                    fontSize: "20px",
                    fontWeight: 300,
                    color: openFaq === i ? P[7] : P[5],
                    transition: "color 0.2s",
                    flexShrink: 0,
                    marginLeft: "24px",
                  }}>
                    {openFaq === i ? "×" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <p style={{
                    fontSize: "14px",
                    color: PRIMARY,
                    opacity: 0.55,
                    lineHeight: 1.7,
                    paddingBottom: "24px",
                    maxWidth: "560px",
                  }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="section-pad" style={{
        background: "white",
        paddingTop: "96px",
        paddingBottom: "96px",
        overflow: "hidden",
      }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={{
            fontSize: "13px",
            color: P[7],
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}>
            Who's Building This
          </p>
          <h2 style={{
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: PRIMARY,
            lineHeight: 1.15,
            marginBottom: "16px",
          }}>
            The Team Behind Riipe
          </h2>
          <p style={{
            fontSize: "15px",
            color: PRIMARY,
            opacity: 0.55,
            lineHeight: 1.65,
            maxWidth: "560px",
            margin: "0 auto",
          }}>
            We're highly technical and very passionate about democratizing investing.
          </p>
        </div>

        <div className="team-grid">
          {[
            {
              name: "Varun Saikia",
              title: "Founder & CEO",
              img: "/Varun Saikia.jpeg",
              linkedin: "https://www.linkedin.com/in/varunsaikia/",
              bio: "CMU ECE undergrad with a patent in clean tech. Rise Global Fellow (Schmidt Futures & Rhodes Trust). Multiple national award winner in India combining deep engineering expertise with vision.",
            },
            {
              name: "Jai Sengupta",
              title: "Founder & COO",
              img: "/Jai Sengupta.png",
              linkedin: "https://www.linkedin.com/in/jaiseng/",
              bio: "ECE BME double major @ CMU with hardware research experience in biomedical devices. Stanford Anesthesia Informatics. Worked at a Series B startup, bringing operational excellence to complex products.",
            },
          ].map((member) => (
            <div key={member.name} style={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              aspectRatio: "3 / 4",
              background: P[1],
            }}>
              <img
                src={member.img}
                alt={member.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div style={{
                position: "absolute",
                bottom: "0",
                left: "0",
                right: "0",
                padding: "28px 24px 24px",
                background: "linear-gradient(to top, rgba(16,23,32,0.85) 0%, rgba(16,23,32,0.6) 60%, transparent 100%)",
              }}>
                <div style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: "16px",
                  padding: "20px 20px 16px",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: 600, color: "white", marginBottom: "2px" }}>{member.name}</h3>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", fontWeight: 400 }}>{member.title}</p>
                    </div>
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      textDecoration: "none",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 11L11 3M11 3H5M11 3V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                  <p style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.55,
                    marginBottom: "12px",
                  }}>
                    {member.bio}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button className="btn-ghost" style={{ margin: "0 auto", fontSize: "14px", fontWeight: 500 }} onClick={openWhitepaper}>
            Read the full whitepaper
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 11L11 3M11 3H5M11 3V9" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section-pad" style={{
        background: P[0],
        paddingTop: "96px",
        paddingBottom: "96px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="contact-grid" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <span style={{
              display: "inline-block",
              fontSize: "13px",
              color: P[7],
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: `${P[7]}18`,
              padding: "8px 18px",
              borderRadius: "999px",
              marginBottom: "24px",
            }}>
              Contact
            </span>
            <h2 style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 700,
              color: PRIMARY,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
            }}>
              Get In touch<br />with us!
            </h2>
            <p style={{
              fontSize: "15px",
              color: PRIMARY,
              opacity: 0.55,
              lineHeight: 1.65,
              maxWidth: "360px",
              marginBottom: "36px",
            }}>
              Want to start investing in industrial assets? Or want tokenize your industrial assets? Contact us!
            </p>
            <button onClick={scrollToContact} style={{
              background: PRIMARY,
              color: "white",
              border: "none",
              borderRadius: "999px",
              padding: "14px 32px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}>
              Contact Us
            </button>
          </div>

          <form
            action="https://formsubmit.co/team@riipe.fund"
            method="POST"
            style={{
              background: "#fafafa",
              borderRadius: "20px",
              padding: "40px 36px",
              border: "none",
              boxShadow: "8px 8px 24px rgba(150, 165, 185, 0.5), -8px -8px 24px rgba(255, 255, 255, 0.8), inset 1px 1px 2px rgba(255, 255, 255, 0.3)",
            }}
          >
            <input type="hidden" name="_subject" value="New Contact from Riipe Website" />
            <input type="hidden" name="_captcha" value="true" />
            <input type="hidden" name="_template" value="table" />
            <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
            <h3 style={{ fontSize: "22px", fontWeight: 600, color: PRIMARY, marginBottom: "32px" }}>
              Contact Us
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <input
                className="contact-input"
                type="text"
                name="First Name"
                placeholder="First Name"
                required
              />
              <input
                className="contact-input"
                type="text"
                name="Last Name"
                placeholder="Last Name"
                required
              />
              <input
                className="contact-input"
                type="text"
                name="Postal Code"
                placeholder="Postal Code"
              />
              <input
                className="contact-input"
                type="email"
                name="email"
                placeholder="Email Address"
                required
              />
            </div>
            <textarea
              className="contact-input"
              name="Message"
              placeholder="Message"
              rows={4}
              required
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${PRIMARY}20`,
                padding: "14px 0",
                fontSize: "14px",
                color: PRIMARY,
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
                marginTop: "8px",
              }}
            />
            <button type="submit" style={{
              background: PRIMARY,
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "14px 36px",
              fontSize: "14px",
              fontWeight: 400,
              cursor: "pointer",
              fontFamily: "inherit",
              marginTop: "28px",
              transition: "opacity 0.2s",
            }}>
              Submit
            </button>
          </form>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section-pad" style={{
        background: PRIMARY,
        paddingTop: "96px",
        paddingBottom: "96px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontSize: "clamp(28px, 4vw, 44px)",
          fontWeight: 400,
          color: "white",
          lineHeight: 1.3,
          letterSpacing: "-0.02em",
          maxWidth: "720px",
          margin: "0 auto 24px",
        }}>
          The infrastructure powering the future is already generating returns. The only question is whether you're in.
        </h2>
        <p style={{
          fontSize: "15px",
          color: "white",
          opacity: 0.6,
          lineHeight: 1.65,
          maxWidth: "540px",
          margin: "0 auto 40px",
        }}>
          Riipe is live. Our first GPU assets are available now. Get in early — positions are limited by available asset inventory.
        </p>

        <div className="cta-buttons">
          <button onClick={scrollToContact} style={{
            background: "white",
            color: PRIMARY,
            border: "none",
            borderRadius: "999px",
            padding: "14px 32px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Get Early Access
          </button>
          <button onClick={openWhitepaper} style={{
            background: "transparent",
            color: "white",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: "999px",
            padding: "14px 32px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Read the Whitepaper
          </button>
        </div>

        <div style={{ maxWidth: "440px", margin: "0 auto" }}>
          <p style={{ fontSize: "13px", color: "white", opacity: 0.5, marginBottom: "14px" }}>Stay in the loop.</p>
          <div className="email-row">
            <input
              type="email"
              placeholder="Your email address"
              style={{
                flex: 1,
                padding: "12px 18px",
                borderRadius: "999px",
                border: `1.5px solid ${P[6]}`,
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontSize: "14px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button onClick={scrollToContact} style={{
              background: P[7],
              color: "white",
              border: "none",
              borderRadius: "999px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 400,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}>
              Join the Waitlist
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "white", opacity: 0.3 }}>No spam. We'll only write when there's something worth reading.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="section-pad" style={{
        background: PRIMARY,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: "48px",
        paddingBottom: "40px",
      }}>
        <div className="footer-top">
          <div className="footer-links">
            {navLinks.map(link => (
              <span key={link} onClick={() => handleNavClick(link)} style={{ fontSize: "13px", color: "white", opacity: 0.6, cursor: "pointer", fontWeight: 500 }}>{link}</span>
            ))}
          </div>
          <div className="footer-socials">
            {["Twitter / X", "Telegram", "LinkedIn", "Discord"].map(social => (
              <span key={social} style={{ fontSize: "13px", color: "white", opacity: 0.45, cursor: "pointer" }}>{social}</span>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px" }}>
          <p style={{ fontSize: "11px", color: "white", opacity: 0.3, lineHeight: 1.7, maxWidth: "680px", marginBottom: "12px" }}>
            Riipe tokens represent fractional ownership of tokenized real-world assets. This page does not constitute financial advice. Investing in tokenized assets involves risk, including the possible loss of principal. Please review the full risk disclosure and terms of service before investing.
          </p>
          <p style={{ fontSize: "11px", color: "white", opacity: 0.25 }}>© 2025 Riipe. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

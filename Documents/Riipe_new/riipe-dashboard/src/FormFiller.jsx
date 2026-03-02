import { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

const T = {
  accent: "#c6ff00",
  accentBorder: "rgba(198,255,0,.22)",
  card: "#141610",
  border: "rgba(255,255,255,.07)",
  text: "#f0f0e8",
  textMuted: "rgba(255,255,255,.55)",
  textFaint: "rgba(255,255,255,.28)",
  positive: "#6ec86a",
  negative: "#e07878",
};

// ─── FIELD MAPPINGS PER FORM ──────────────────────────────────────────────────
// Keys are the exact AcroForm field names from the PDF.
// Values are functions that extract the right data from projectData.
const FORM_FIELD_MAPS = {
  "Delaware LLC Form.pdf": (d) => ({
    "The name of the limited liability company is": d.projectName ? `${d.projectName} LLC` : "",
    "undefined":                                    "", // second line of LLC name if it overflows
    "located at":                                   "251 Little Falls Drive",
    "in the City of":                               "Wilmington",
    "Zip Code":                                     "19808",
    "liability company may be served  is":          "Corporate Creations Network Inc.",
    "undefined_2":                                  "",
    "By":                                           "",  // signature — leave blank
    "Name":                                         d.ownershipType?.includes("Sole") ? d.projectName || "" : "",
  }),
  "California LLC Form.pdf": (d) => ({
    // Add California field mappings here once you have the AcroForm version
  }),
  "Wyoming LLC Form.pdf": (d) => ({
    // Add Wyoming field mappings here once you have the AcroForm version
  }),
};

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
async function callClaude(system, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": window.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

// ─── PICK FORM ────────────────────────────────────────────────────────────────
async function resolveRecommendedForm(spvResult, availableForms) {
  const raw = await callClaude(
    "Pick EXACTLY ONE filename from the list that best matches the SPV recommendation jurisdiction. Return ONLY the filename, nothing else — no quotes, no markdown, no explanation.",
    [{ role: "user", content: `SPV RECOMMENDATION:\n${spvResult}\n\nFORMS:\n${availableForms.join("\n")}` }]
  );
  const clean = raw.trim();
  return availableForms.find((f) => clean.includes(f) || f.includes(clean)) || availableForms[0];
}

// ─── FILL PDF WITH ACROFORM FIELDS ───────────────────────────────────────────
async function fillPDF(filename, projectData) {
  // 1. Fetch the PDF
  const res = await fetch(`/forms/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Could not load ${filename} — make sure it's in /public/forms/`);
  const pdfBytes = await res.arrayBuffer();

  // 2. Load with pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  // 3. Get field mapping for this form
  const mapFn = FORM_FIELD_MAPS[filename];
  if (!mapFn) throw new Error(`No field mapping defined for "${filename}". Add it to FORM_FIELD_MAPS in FormFiller.jsx.`);
  const fieldValues = mapFn(projectData);

  // 4. Fill each field and collect results for the UI
  const results = [];
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    try {
      const field = form.getTextField(fieldName);
      field.setText(value || "");
      results.push({ label: fieldName, value: value || "", status: "filled" });
    } catch (e) {
      results.push({ label: fieldName, value: value || "", status: "not_found" });
    }
  }

  // 5. Remove opaque white backgrounds from each field widget, then flatten
  try {
    for (const f of form.getFields()) {
      for (const widget of f.acroField.getWidgets()) {
        try { widget.getOrCreateAppearanceCharacteristics().setBackgroundColor(null); } catch {}
        try { widget.getOrCreateAppearanceCharacteristics().setBorderColor(null); } catch {}
      }
    }
  } catch {}
  form.flatten();

  const filledBytes = await pdfDoc.save();
  return { filledBytes, results };
}

function downloadPDF(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(".pdf", "-filled.pdf");
  a.click();
  URL.revokeObjectURL(url);
}

// ─── FIELD ROW ────────────────────────────────────────────────────────────────
function FieldRow({ label, value, status, onChange }) {
  const baseStyle = {
    background: "rgba(255,255,255,.04)",
    border: `1.5px solid ${status === "not_found" ? "rgba(224,120,120,.4)" : "rgba(255,255,255,.1)"}`,
    borderRadius: 10,
    padding: "10px 12px",
    color: T.text,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    outline: "none",
    width: "100%",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: status === "not_found" ? T.negative : T.textFaint }}>
        {label} {status === "not_found" && "⚠ field not found"}
      </label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(label, e.target.value)}
        style={baseStyle}
        onFocus={(e) => (e.target.style.borderColor = T.accent)}
        onBlur={(e) => (e.target.style.borderColor = status === "not_found" ? "rgba(224,120,120,.4)" : "rgba(255,255,255,.1)")}
      />
    </div>
  );
}

// ─── FORM PANEL ───────────────────────────────────────────────────────────────
function FormPanel({ filename, projectData, onExport }) {
  const [status, setStatus] = useState("Loading PDF…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState(null);
  const [pdfDocRef, setPdfDocRef] = useState(null); // keep original bytes for re-export
  const [originalBytes, setOriginalBytes] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => { run(); }, []);

  async function run() {
    setLoading(true); setError(null);
    try {
      setStatus("Filling form fields…");
      const { filledBytes, results } = await fillPDF(filename, projectData);

      // Keep original PDF bytes for re-export after edits
      const origRes = await fetch(`/forms/${encodeURIComponent(filename)}`);
      setOriginalBytes(await origRes.arrayBuffer());

      setFields(results);
      downloadPDF(filledBytes, filename);
      setDownloaded(true);
      if (onExport) onExport(filename);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setStatus("");
    }
  }

  async function reExport() {
    if (!originalBytes || !fields) return;
    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
      const form = pdfDoc.getForm();
      for (const f of fields) {
        try {
          form.getTextField(f.label).setText(f.value || "");
        } catch {}
      }
      try {
        for (const f of form.getFields()) {
          for (const widget of f.acroField.getWidgets()) {
            try { widget.getOrCreateAppearanceCharacteristics().setBackgroundColor(null); } catch {}
            try { widget.getOrCreateAppearanceCharacteristics().setBorderColor(null); } catch {}
          }
        }
      } catch {}
      form.flatten();
      const bytes = await pdfDoc.save();
      downloadPDF(bytes, filename);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(label, val) {
    setFields((prev) => prev.map((f) => f.label === label ? { ...f, value: val } : f));
  }

  const filled = fields ? fields.filter(f => f.value?.trim() && f.status === "filled").length : 0;
  const total = fields ? fields.filter(f => f.status === "filled").length : 0;
  const notFound = fields ? fields.filter(f => f.status === "not_found").length : 0;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: "rgba(255,255,255,.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{filename}</div>
            {!loading && !error && fields && (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textFaint, marginTop: 2 }}>
                {filled}/{total} fields filled
                {notFound > 0 && <span style={{ color: T.negative, marginLeft: 8 }}>· {notFound} fields not found in PDF</span>}
              </div>
            )}
          </div>
        </div>
        {!loading && !error && downloaded && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reExport}
              style={{ background: "transparent", border: `1px solid rgba(255,255,255,.12)`, color: T.textMuted, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 12, padding: "7px 14px", borderRadius: 8, cursor: "pointer" }}>
              ↺ Re-export PDF
            </button>
            <div style={{ background: T.positive, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 8 }}>
              ✓ PDF Downloaded
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 20 }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint }}>
            <div style={{ width: 16, height: 16, border: `2px solid rgba(198,255,0,.2)`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
            {status}
          </div>
        )}
        {error && (
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.negative, background: "rgba(224,120,120,.06)", border: "1px solid rgba(224,120,120,.18)", borderRadius: 10, padding: "10px 14px" }}>
            ⚠ {error}
          </div>
        )}
        {fields && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {fields.map((f, i) => (
              <FieldRow key={i} label={f.label} value={f.value} status={f.status} onChange={updateField} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function FormFiller({ projectData = {}, spvResult = null, availableForms = [], onDone }) {
  const [resolving, setResolving] = useState(true);
  const [resolveError, setResolveError] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    if (availableForms.length === 0) { setResolving(false); return; }
    if (!spvResult) { setSelectedForm(availableForms[0]); setResolving(false); return; }
    resolveRecommendedForm(spvResult, availableForms)
      .then(setSelectedForm)
      .catch((e) => setResolveError(e.message))
      .finally(() => setResolving(false));
  }, []);

  const spvName = (() => {
    if (!spvResult) return null;
    const lines = spvResult.split("\n");
    const idx = lines.findIndex((l) => l.includes("Recommended SPV"));
    return idx >= 0 ? lines[idx + 1]?.trim() : null;
  })();

  return (
    <div className="page-anim" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: "-0.04em", fontFamily: "'Inter', sans-serif" }}>
          Complete Your Filing
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textFaint, marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          AcroForm filling · values written directly into PDF fields
        </div>
      </div>

      {spvName && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(198,255,0,.04)", border: `1px solid ${T.accentBorder}`, borderRadius: 12, padding: "10px 16px", marginBottom: 24 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", color: T.accent }}>RECOMMENDED SPV</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.text }}>{spvName}</span>
        </div>
      )}

      {resolving && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint, padding: "24px 0" }}>
          <div style={{ width: 18, height: 18, border: `2px solid rgba(198,255,0,.2)`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Selecting the right LLC form…
        </div>
      )}
      {resolveError && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.negative, background: "rgba(224,120,120,.08)", border: "1px solid rgba(224,120,120,.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
          ⚠ {resolveError}
        </div>
      )}
      {!resolving && !selectedForm && !resolveError && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint }}>
          No forms found. Make sure PDFs are in <code style={{ color: T.accent }}>public/forms/</code>.
        </div>
      )}
      {!resolving && selectedForm && (
        <FormPanel filename={selectedForm} projectData={projectData} onExport={() => setExported(true)} />
      )}
      {!resolving && onDone && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onDone} style={{ background: exported ? T.positive : T.accent, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, padding: "13px 28px", borderRadius: 12, border: "none", cursor: "pointer" }}>
            {exported ? "✓ Done — View Processing →" : "Skip to Processing →"}
          </button>
        </div>
      )}
    </div>
  );
}
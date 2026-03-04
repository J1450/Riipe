import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const T = {
  accent: "#c6ff00",
  accentBorder: "rgba(198,255,0,.22)",
  card: "#141610",
  cardDark: "#0f1009",
  border: "rgba(255,255,255,.07)",
  borderMid: "rgba(255,255,255,.11)",
  text: "#f0f0e8",
  textMuted: "rgba(255,255,255,.55)",
  textFaint: "rgba(255,255,255,.28)",
  positive: "#6ec86a",
  negative: "#e07878",
  bg: "#0b0c08",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const FORM_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
  @keyframes pinPop { from{transform:scale(0) translate(-50%,-50%);} to{transform:scale(1) translate(-50%,-50%);} }

  .ff-field-row { transition: background 0.15s; border-radius: 10px; }
  .ff-field-row:hover { background: rgba(198,255,0,.03); }
  .ff-field-row.ff-active { background: rgba(198,255,0,.06); outline: 1px solid rgba(198,255,0,.18); }

  .ff-input {
    background: rgba(255,255,255,.04);
    border: 1.5px solid rgba(255,255,255,.1);
    border-radius: 8px;
    padding: 9px 11px;
    color: #f0f0e8;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ff-input:focus { border-color: #c6ff00; box-shadow: 0 0 0 3px rgba(198,255,0,.08); }
  .ff-input.ff-error { border-color: rgba(224,120,120,.5); }
  .ff-input.ff-skipped { opacity: 0.4; }

  .ff-pin {
    position: absolute;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #c6ff00;
    border: 2px solid #111;
    transform: translate(-50%, -50%);
    cursor: pointer;
    transition: transform 0.12s, box-shadow 0.12s;
    animation: pinPop 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
    box-shadow: 0 0 0 0 rgba(198,255,0,.5);
    z-index: 5;
  }
  .ff-pin:hover, .ff-pin.ff-pin-active {
    transform: translate(-50%,-50%) scale(1.6);
    box-shadow: 0 0 0 5px rgba(198,255,0,.22);
    z-index: 10;
  }
  .ff-pin.ff-pin-empty { background: rgba(255,255,255,.25); }
  .ff-pin.ff-pin-error { background: #e07878; }

  .ff-drag-handle {
    width: 5px;
    background: rgba(255,255,255,.06);
    cursor: col-resize;
    flex-shrink: 0;
    transition: background 0.15s;
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ff-drag-handle:hover, .ff-drag-handle.ff-dragging { background: rgba(198,255,0,.25); }

  .ff-scrollbar::-webkit-scrollbar { width: 3px; }
  .ff-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .ff-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }

  .ff-tab { cursor:pointer; transition: all 0.15s; border-bottom: 2px solid transparent; }
  .ff-tab.ff-tab-active { color: #c6ff00 !important; border-bottom-color: #c6ff00; }
  .ff-tab:hover:not(.ff-tab-active) { color: rgba(255,255,255,.75) !important; }

  .ff-re-export { transition: all 0.15s; }
  .ff-re-export:hover { border-color: rgba(255,255,255,.3) !important; color: #fff !important; }
  .ff-done-btn { transition: all 0.2s; }
  .ff-done-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

  .ff-page-btn { transition: all 0.15s; }
  .ff-page-btn:hover:not(:disabled) { border-color: rgba(198,255,0,.4) !important; color: #c6ff00 !important; }
`;

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
async function callClaude(system, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": window.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "anthropic-beta": "pdfs-2024-09-25",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ─── PICK FORM ────────────────────────────────────────────────────────────────
async function resolveRecommendedForm(spvResult, availableForms) {
  const raw = await callClaude(
    "Pick EXACTLY ONE filename from the list that best matches the SPV recommendation jurisdiction. Return ONLY the filename, nothing else.",
    [{ role: "user", content: `SPV RECOMMENDATION:\n${spvResult}\n\nFORMS:\n${availableForms.join("\n")}` }]
  );
  const clean = raw.trim();
  return availableForms.find((f) => clean.includes(f) || f.includes(clean)) || availableForms[0];
}

// ─── DETECT PDF TYPE ──────────────────────────────────────────────────────────
async function detectPDFType(pdfDoc) {
  try {
    const fields = pdfDoc.getForm().getFields();
    return fields.length > 0 ? "acroform" : "flat";
  } catch { return "flat"; }
}

// ─── AI FIELD EXTRACTION ──────────────────────────────────────────────────────
async function extractFieldsFromFlatPDF(pdfBytes, projectData) {
  const base64PDF = arrayBufferToBase64(pdfBytes);
  const projectSummary = Object.entries({
    "Project Name": projectData.projectName,
    "Asset Type": projectData.assetType,
    "Sector": projectData.sector,
    "Primary Use": projectData.primaryUse,
    "City": projectData.city,
    "State": projectData.state,
    "Country": projectData.country,
    "Year Built": projectData.yearBuilt,
    "Asset Value": projectData.assetValue,
    "Debt": projectData.debt,
    "Gross Income": projectData.grossIncome,
    "Occupancy": projectData.occupancy,
    "Ownership Type": projectData.ownershipType,
    "Jurisdiction": projectData.jurisdiction,
    "Investor Type": projectData.investorType,
    "Token Ticker": projectData.ticker,
    "Token Standard": projectData.tokenStandard,
    "Total Supply": projectData.totalSupply,
    "Blockchain": projectData.blockchain,
    "Distribution": projectData.distribution,
    "Lock-up": projectData.lockup,
    "KYC/AML": projectData.kyc,
    "Rights": projectData.rights,
    "Co-owners": projectData.coOwners,
    "Description": projectData.description,
  }).filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join("\n");

  const raw = await callClaude(
    `You are a PDF form analysis expert. Analyze flat PDF documents and identify all blank fields.
For each blank, return:
- id: unique snake_case string
- label: human-readable field name (from nearby label text)
- value: best matching value from project data, or "" if unknown/signature
- page: 1-indexed page number
- xPct: X as % of page width (0=left, 100=right) — start of the blank area
- yPct: Y as % of page height (0=top, 100=bottom) — just above the underline
- fontSize: 9-11 for most fields

Return ONLY valid JSON, no markdown:
{"pageCount":<n>,"fields":[{"id":"...","label":"...","value":"...","page":1,"xPct":0,"yPct":0,"fontSize":10}]}`,
    [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64PDF } },
        { type: "text", text: `Analyze ALL blank fields. Map to project data:\n${projectSummary}` },
      ],
    }]
  );
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── OVERFLOW SPLIT HELPER ────────────────────────────────────────────────────
// Splits a string at the last word boundary before maxChars, returns [line1, overflow].
function splitOverflow(text, maxChars = 45) {
  if (!text || text.length <= maxChars) return [text || "", ""];
  const cut = text.lastIndexOf(" ", maxChars);
  const breakAt = cut > 0 ? cut : maxChars;
  return [text.slice(0, breakAt).trim(), text.slice(breakAt).trim()];
}

// ─── ACROFORM FIELD MAPS ──────────────────────────────────────────────────────
const FORM_FIELD_MAPS = {
  "Delaware LLC Form.pdf": (d) => {
    const llcName = d.projectName ? `${d.projectName} LLC` : "";
    const agentName = "Corporate Creations Network Inc.";
    const [llcLine1, llcLine2] = splitOverflow(llcName);
    const [agentLine1, agentLine2] = splitOverflow(agentName);
    return {
      "The name of the limited liability company is": llcLine1,
      "undefined":                                    llcLine2,
      "located at":                                   "251 Little Falls Drive",
      "in the City of":                               "Wilmington",
      "Zip Code":                                     "19808",
      "liability company may be served  is":          agentLine1,
      "undefined_2":                                  agentLine2,
      "By":                                           "",
      "Name": d.ownershipType?.includes("Sole") ? d.projectName || "" : "",
    };
  },
  // ── California LLC-1A (Articles of Organization - Conversion) ────────────────
  // Cover sheet (page 1) + Articles (page 2)
  "California LLC Form.pdf": (d) => {
    const llcName = d.projectName ? `${d.projectName} LLC` : "";
    const fullAddress = [d.address, d.city].filter(Boolean).join(", ");
    const organizerName = d.ownershipType?.includes("Sole") ? d.projectName || "" : d.coOwners || "";
    return {
      // ── Cover sheet ──
      "Contact Person - First Name":               organizerName.split(" ")[0] || "",
      "Contact Person - Last Name":                organizerName.split(" ").slice(1).join(" ") || "",
      "Contact Person - Phone Number":             "",   // not collected
      "Contact Person - Email":                    "",   // not collected
      "Entity Information - Name":                 llcName,
      "Entity Information - Entity Number if applicable": "",
      "Entity Information - Comments 1":           d.description ? d.description.slice(0, 80) : "",
      "Entity Information - Comments 2":           d.description ? d.description.slice(80, 160) : "",
      "Entity Information - Comments 3":           d.description ? d.description.slice(160, 240) : "",

      // ── Articles of Organization (LLC-1A) ──
      "1 Name of Limited Liability Company":       llcName,

      // Item 4 — designated office in CA (asset address if in CA, otherwise leave for user)
      "4 Initial Street Address of Limited Liability Company's Designated Office in CA  City": fullAddress,
      "State_1":                                   d.state || "CA",
      "Zip Code_1":                                d.zip || "",

      // Item 5 — mailing address (leave blank if same as item 4)
      "5 Initial Mailing Address of Limited Liability Company, if different from Item 4  City": "",
      "State_2":                                   "",
      "Zip Code_2":                                "",

      // Item 6 — registered agent (user must appoint a CA-registered agent)
      "6a Name of Agent For Service of Process":   "",   // must be CA-registered agent
      "6b If an individual, Street Addres of Agent for Service of Process - Do not list a P.O.Box": "",
      "City_1":                                    "",
      "Zip Code_3":                                "",
      "6c If an individual, Mailing Address of Agent for Service of Process": "",
      "City_2":                                    "",
      "Zip Code_4":                                "",

      // Converting entity info (for conversion filings — leave blank for new formations)
      "7 Name of Converting Entity":               "",
      "8 Form of Entity":                          "",
      "9 Jurisdiction":                            d.jurisdiction || "",
      "10 CA Secretary of State Entity Number if any": "",

      // Authorized signatories (signed manually)
      "Type or Print Name and Title of Authorized Person":   organizerName,
      "Type or Print Name and Title of Authorized Person_2": "",
    };
  },

  // ── Wyoming Series LLC Articles of Organization ───────────────────────────
  "Wyoming LLC Form.pdf": (d) => {
    const llcName = d.projectName ? `${d.projectName} LLC` : "";
    const fullAddress = [d.address, d.city, d.state, d.zip].filter(Boolean).join(", ");
    const organizerName = d.ownershipType?.includes("Sole") ? d.projectName || "" : d.coOwners || "";
    return {
      // ── Articles of Organization (page 2) ──
      "Name of Series LLC":        llcName,
      "Mailing Address":           fullAddress,
      "Principal Office Address":  fullAddress,

      // Registered agent — must be a Wyoming resident or WY-authorized entity
      "RA Name":                   "",   // user must appoint WY registered agent
      "RA Address":                "",

      // Limitations on liabilities (boilerplate; user should review)
      "Limitations on Liabilities": `The liability of each series of ${llcName} is limited as set forth in the Operating Agreement.`,

      // Series established — default to "No" (series added via amendment later)
      "No, there are none":        "Yes",

      // Organizer signature block
      "Printed Name":              organizerName,
      "Contact Person":            organizerName,
      "Phone Number":              "",   // not collected
      "Email Address":             "",   // not collected
      "Date":                      new Date().toLocaleDateString("en-US"),

      // ── Registered Agent Consent (page 4) ──
      "RA Name-1":                 "",
      "RA Address-1":              "",
      "Entity Name-1":             llcName,
      "Registered Agent Printed Name-1": "",
      "Registered Agent Phone #-1":      "",
      "Registered Agent Title-1":        "",
      "Registered Agent Email-1":        "",
      "Registered Agent Mailing Address-1": "",
      "Registered Agent Date-1":         new Date().toLocaleDateString("en-US"),
    };
  },
};

// ─── FILL FUNCTIONS ───────────────────────────────────────────────────────────
async function fillAcroFormPDF(pdfBytes, filename, projectData) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const mapFn = FORM_FIELD_MAPS[filename];
  if (!mapFn) throw new Error(`No field mapping for "${filename}". Add it to FORM_FIELD_MAPS.`);
  const fieldValues = mapFn(projectData);
  // Fields that are internal/non-editable and should be hidden from the UI when empty
  const OVERFLOW_FIELDS = new Set([
    "undefined", "undefined_2",          // Delaware LLC name / agent overflow lines
    "Reset1", "Print",                   // California UI buttons
    "Individual1", "Individual2", "Individual3", // California management checkboxes (set by user)
    "Pursuant to WS 1729108 the name must include the words Limited Liability Company or its",
    "If established the names of each series must be listed in accordance with Chapter 5 of the Business",
    "Under the circumstances specified in WS 1728104e an email address is required",
    "Filing fee of 10000 plus 1000 for each series established Visa or MasterCard payment available",
    "The limitations on liabilities must be set forth in the Operating Agreement and must be listed in your",
    "Processing time is up to 15 business days following the date of receipt in our office",
    "Please review the form prior to submission The Secretary of States Office is unable to process",
    "Cert",                              // Wyoming certification checkbox
  ]);
  const results = [];
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    const isOverflow = OVERFLOW_FIELDS.has(fieldName);
    try {
      form.getTextField(fieldName).setText(value || "");
      // Hide empty overflow fields from the editor — they're internal continuation lines
      if (isOverflow && !value) continue;
      results.push({ id: fieldName, label: fieldName, value: value || "", status: "filled" });
    } catch {
      if (isOverflow && !value) continue;
      results.push({ id: fieldName, label: fieldName, value: value || "", status: "not_found" });
    }
  }
  try {
    for (const f of form.getFields())
      for (const w of f.acroField.getWidgets()) {
        try { w.getOrCreateAppearanceCharacteristics().setBackgroundColor(null); } catch {}
        try { w.getOrCreateAppearanceCharacteristics().setBorderColor(null); } catch {}
      }
  } catch {}
  form.flatten();
  return { filledBytes: await pdfDoc.save(), results, mode: "acroform" };
}

async function fillFlatPDF(pdfBytes, aiFields) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const results = [];
  for (const field of aiFields) {
    if (!field.value?.trim()) { results.push({ ...field, status: "skipped" }); continue; }
    const pageIndex = (field.page || 1) - 1;
    if (pageIndex >= pages.length) { results.push({ ...field, status: "not_found" }); continue; }
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    try {
      page.drawText(field.value, {
        x: (field.xPct / 100) * width,
        y: height - (field.yPct / 100) * height,
        size: field.fontSize || 10,
        font,
        color: rgb(0, 0, 0),
      });
      results.push({ ...field, status: "filled" });
    } catch (e) {
      results.push({ ...field, status: "error", error: e.message });
    }
  }
  return { filledBytes: await pdfDoc.save(), results, mode: "flat" };
}

async function buildFilledBytes(originalBytes, fields, fillMode) {
  if (fillMode === "acroform") {
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    for (const f of fields) {
      try { form.getTextField(f.label).setText(f.value || ""); } catch {}
    }
    try {
      for (const f of form.getFields())
        for (const w of f.acroField.getWidgets()) {
          try { w.getOrCreateAppearanceCharacteristics().setBackgroundColor(null); } catch {}
          try { w.getOrCreateAppearanceCharacteristics().setBorderColor(null); } catch {}
        }
    } catch {}
    form.flatten();
    return await pdfDoc.save();
  } else {
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    for (const f of fields) {
      if (!f.value?.trim() || !f.page) continue;
      const page = pages[(f.page - 1)] || pages[0];
      const { width, height } = page.getSize();
      try {
        page.drawText(f.value, {
          x: (f.xPct / 100) * width,
          y: height - (f.yPct / 100) * height,
          size: f.fontSize || 10, font, color: rgb(0, 0, 0),
        });
      } catch {}
    }
    return await pdfDoc.save();
  }
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

// ─── PDF PREVIEW ──────────────────────────────────────────────────────────────
function PDFPreview({ previewUrl, fields, activeFieldId, onPinClick, fillMode, pageCount, currentPage, onPageChange }) {
  const pageFields = fillMode === "flat"
    ? (fields || []).filter(f => (f.page || 1) === currentPage)
    : [];

  const iframeSrc = previewUrl
    ? `${previewUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: T.cardDark, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.textFaint, letterSpacing: "2px", textTransform: "uppercase" }}>Live Preview</span>

        {pageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="ff-page-btn" onClick={() => onPageChange(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted, borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontSize: 13, lineHeight: 1.2, transition: "all 0.15s" }}>‹</button>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textMuted, minWidth: 44, textAlign: "center" }}>{currentPage} / {pageCount}</span>
            <button className="ff-page-btn" onClick={() => onPageChange(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}
              style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted, borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontSize: 13, lineHeight: 1.2, transition: "all 0.15s" }}>›</button>
          </div>
        )}

        {fillMode && (
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "1.5px", padding: "3px 7px", borderRadius: 4, background: fillMode === "flat" ? "rgba(198,255,0,.08)" : "rgba(110,200,106,.08)", color: fillMode === "flat" ? T.accent : T.positive, textTransform: "uppercase" }}>
            {fillMode === "flat" ? "🤖 AI" : "AcroForm"}
          </span>
        )}
      </div>

      {/* PDF + Pins */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#1a1c14" }}>
        {iframeSrc ? (
          <>
            <iframe
              src={iframeSrc}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              title="PDF Preview"
            />
            {fillMode === "flat" && pageFields.length > 0 && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {pageFields.map((f) => {
                  const isActive = f.id === activeFieldId;
                  const isEmpty = !f.value?.trim();
                  const isError = f.status === "not_found" || f.status === "error";
                  return (
                    <div
                      key={f.id}
                      className={`ff-pin${isActive ? " ff-pin-active" : ""}${isEmpty ? " ff-pin-empty" : ""}${isError ? " ff-pin-error" : ""}`}
                      style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, pointerEvents: "all" }}
                      onClick={() => onPinClick(f.id)}
                      title={`${f.label}: ${f.value || "(empty)"}`}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 10 }}>
            <div style={{ width: 20, height: 20, border: `2px solid rgba(198,255,0,.2)`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint }}>Generating preview…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FIELD ROW ────────────────────────────────────────────────────────────────
function FieldRow({ field, isActive, onChange, onActivate, rowRef }) {
  const isError = field.status === "not_found" || field.status === "error";
  const isSkipped = field.status === "skipped" && !field.value?.trim();

  return (
    <div ref={rowRef} className={`ff-field-row${isActive ? " ff-active" : ""}`}
      style={{ padding: "9px 11px", cursor: "pointer" }}
      onClick={onActivate}>
      <label style={{
        fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "1.8px",
        textTransform: "uppercase", color: isError ? T.negative : T.textFaint,
        display: "flex", alignItems: "center", gap: 6, marginBottom: 5, cursor: "pointer",
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: isError ? T.negative : isSkipped ? "rgba(255,255,255,.15)" : field.value?.trim() ? T.positive : T.accent }} />
        {field.label}
        {field.page && <span style={{ marginLeft: "auto", opacity: 0.45, fontWeight: 400, fontSize: 8 }}>p.{field.page}</span>}
      </label>
      <input
        className={`ff-input${isError ? " ff-error" : ""}${isSkipped ? " ff-skipped" : ""}`}
        type="text"
        value={field.value || ""}
        placeholder={isError ? "⚠ not placed in PDF" : isSkipped ? "(left blank)" : ""}
        onChange={(e) => onChange(field.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onFocus={onActivate}
      />
    </div>
  );
}

// ─── FORM PANEL ───────────────────────────────────────────────────────────────
function FormPanel({ filename, projectData, onExport }) {
  const [statusMsg, setStatusMsg] = useState("Fetching PDF…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState(null);
  const [originalBytes, setOriginalBytes] = useState(null);
  const [fillMode, setFillMode] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloaded, setDownloaded] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBuilding, setPreviewBuilding] = useState(false);
  const [splitPct, setSplitPct] = useState(52);
  const [dragging, setDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [containerWidth, setContainerWidth] = useState(900);

  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const activeRowRef = useRef(null);
  const prevUrlRef = useRef(null);

  // Observe container width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isMobile = containerWidth < 680;

  useEffect(() => { runFill(); }, []);

  async function runFill() {
    setLoading(true); setError(null);
    try {
      setStatusMsg("Fetching PDF…");
      const res = await fetch(`/forms/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error(`Could not load ${filename} — check /public/forms/`);
      const bytes = await res.arrayBuffer();
      setOriginalBytes(bytes);

      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const numPages = pdfDoc.getPages().length;
      setPageCount(numPages);

      const pdfType = await detectPDFType(pdfDoc);
      let result;

      if (pdfType === "acroform") {
        setStatusMsg("Filling AcroForm fields…");
        result = await fillAcroFormPDF(bytes, filename, projectData);
      } else {
        setStatusMsg("Analyzing flat PDF with AI…");
        const aiResult = await extractFieldsFromFlatPDF(bytes, projectData);
        setStatusMsg(`Placing ${aiResult.fields?.length || 0} detected fields…`);
        result = await fillFlatPDF(bytes, aiResult.fields || []);
        if (aiResult.pageCount) setPageCount(aiResult.pageCount);
      }

      setFields(result.results);
      setFillMode(result.mode);
      triggerPreview(bytes, result.results, result.mode);
      downloadPDF(result.filledBytes, filename);
      setDownloaded(true);
      if (onExport) onExport(filename);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setStatusMsg("");
    }
  }

  function triggerPreview(origBytes, currentFields, mode) {
    setPreviewBuilding(true);
    buildFilledBytes(origBytes, currentFields, mode)
      .then(bytes => {
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
      })
      .catch(console.error)
      .finally(() => setPreviewBuilding(false));
  }

  const schedulePreview = useCallback((newFields) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (originalBytes && fillMode) triggerPreview(originalBytes, newFields, fillMode);
    }, 700);
  }, [originalBytes, fillMode]);

  useEffect(() => () => {
    clearTimeout(debounceRef.current);
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
  }, []);

  function updateField(id, val) {
    setFields(prev => {
      const next = prev.map(f => f.id === id ? { ...f, value: val } : f);
      schedulePreview(next);
      return next;
    });
  }

  function handlePinClick(id) {
    setActiveFieldId(id);
    if (isMobile) setActiveTab("fields");
  }

  function handleActivateField(id, page) {
    setActiveFieldId(id);
    if (page && page !== currentPage) setCurrentPage(page);
  }

  async function reExport() {
    if (!originalBytes || !fields) return;
    try {
      const bytes = await buildFilledBytes(originalBytes, fields, fillMode);
      downloadPDF(bytes, filename);
    } catch (e) { setError(e.message); }
  }

  // Drag handle logic
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPct(Math.min(74, Math.max(30, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const up = () => setDragging(false);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  }, [dragging]);

  // Scroll active field row into view
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeFieldId]);

  const filled = fields ? fields.filter(f => f.value?.trim() && f.status === "filled").length : 0;
  const total = fields ? fields.filter(f => f.status !== "skipped").length : 0;
  const notFound = fields ? fields.filter(f => f.status === "not_found" || f.status === "error").length : 0;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: `1px solid ${T.border}`, background: "rgba(255,255,255,.02)", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: T.text }}>{filename}</div>
            {!loading && !error && fields && (
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint, marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span>{filled}/{total} fields filled</span>
                {fillMode && (
                  <span style={{ padding: "2px 7px", borderRadius: 4, background: fillMode === "flat" ? "rgba(198,255,0,.07)" : "rgba(110,200,106,.07)", color: fillMode === "flat" ? T.accent : T.positive, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                    {fillMode === "flat" ? "🤖 AI Overlay" : "AcroForm"}
                  </span>
                )}
                {previewBuilding && <span style={{ color: T.accent, animation: "pulse 1.2s ease infinite" }}>● refreshing</span>}
                {notFound > 0 && <span style={{ color: T.negative }}>· {notFound} unplaced</span>}
              </div>
            )}
          </div>
        </div>
        {!loading && !error && downloaded && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ff-re-export" onClick={reExport}
              style={{ background: "transparent", border: `1px solid ${T.borderMid}`, color: T.textMuted, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 12, padding: "7px 14px", borderRadius: 8, cursor: "pointer" }}>
              ↺ Re-export
            </button>
            <div style={{ background: T.positive, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 8 }}>
              ✓ Downloaded
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "28px 20px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.textFaint }}>
          <div style={{ width: 16, height: 16, border: `2px solid rgba(198,255,0,.2)`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          {statusMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.negative, background: "rgba(224,120,120,.06)", border: "1px solid rgba(224,120,120,.18)", borderRadius: 10, padding: "12px 16px", margin: 16 }}>
          ⚠ {error}
        </div>
      )}

      {/* Main content */}
      {fields && !loading && (
        <>
          {/* Mobile tabs */}
          {isMobile && (
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 16px" }}>
              {[{ id: "preview", label: "📄 Preview" }, { id: "fields", label: "✏️ Fields" }].map(tab => (
                <div key={tab.id} className={`ff-tab${activeTab === tab.id ? " ff-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ padding: "10px 16px", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: T.textFaint }}>
                  {tab.label}
                </div>
              ))}
            </div>
          )}

          <div ref={containerRef}
            style={{ display: "flex", height: isMobile ? 540 : 640, userSelect: dragging ? "none" : "auto" }}>

            {/* Left: PDF Preview */}
            {(!isMobile || activeTab === "preview") && (
              <div style={{ width: isMobile ? "100%" : `${splitPct}%`, flexShrink: 0, padding: 12, boxSizing: "border-box" }}>
                <div style={{ height: "100%", borderRadius: 12, overflow: "hidden", border: `1px solid ${T.borderMid}` }}>
                  <PDFPreview
                    previewUrl={previewUrl}
                    fields={fields}
                    activeFieldId={activeFieldId}
                    onPinClick={handlePinClick}
                    fillMode={fillMode}
                    pageCount={pageCount}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            )}

            {/* Drag handle */}
            {!isMobile && (
              <div
                className={`ff-drag-handle${dragging ? " ff-dragging" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); setDragging(true); }}
              >
                <div style={{ width: 2, height: 32, background: "rgba(255,255,255,.14)", borderRadius: 2 }} />
              </div>
            )}

            {/* Right: Field editor */}
            {(!isMobile || activeTab === "fields") && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* AI banner */}
                {fillMode === "flat" && (
                  <div style={{ margin: "10px 10px 0", padding: "8px 12px", background: "rgba(198,255,0,.04)", border: `1px solid ${T.accentBorder}`, borderRadius: 9, fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.textFaint, lineHeight: 1.7, flexShrink: 0 }}>
                    🤖 <span style={{ color: T.accent }}>AI Overlay</span> — Click pins <span style={{ color: T.text }}>●</span> on the PDF to jump to a field. Edit values, then <em>Re-export</em>.
                  </div>
                )}

                <div className="ff-scrollbar"
                  style={{ flex: 1, overflowY: "auto", padding: "6px 6px 12px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,.1) transparent" }}>
                  {fields.map((f) => (
                    <FieldRow
                      key={f.id}
                      field={f}
                      isActive={f.id === activeFieldId}
                      onChange={updateField}
                      onActivate={() => handleActivateField(f.id, f.page)}
                      rowRef={f.id === activeFieldId ? activeRowRef : null}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
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
    <>
      <style>{FORM_CSS}</style>
      <div className="page-anim" style={{ maxWidth: 1120 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: T.text, letterSpacing: "-0.04em", fontFamily: "'Inter',sans-serif" }}>
            Complete Your Filing
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.textFaint, marginTop: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Smart PDF filler · live preview · AcroForm + flat PDF
          </div>
        </div>

        {spvName && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(198,255,0,.04)", border: `1px solid ${T.accentBorder}`, borderRadius: 12, padding: "10px 16px", marginBottom: 20 }}>
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
            <button className="ff-done-btn" onClick={onDone}
              style={{ background: exported ? T.positive : T.accent, color: "#0b0c08", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, padding: "13px 28px", borderRadius: 12, border: "none", cursor: "pointer" }}>
              {exported ? "✓ Done — View Processing →" : "Skip to Processing →"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
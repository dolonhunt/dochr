import { readFileSync } from 'fs'
import { join } from 'path'

// Cache the base64 logo so we only read it once
let _logoBase64: string | null = null
let _footerPinBase64: string | null = null

function getLogoBase64(): string {
  if (_logoBase64) return _logoBase64
  try {
    const logoPath = join(process.cwd(), 'public', 'Logo-main.png')
    const buf = readFileSync(logoPath)
    _logoBase64 = `data:image/png;base64,${buf.toString('base64')}`
    return _logoBase64
  } catch (e) {
    console.error('Failed to load logo:', e)
    return ''
  }
}

function getFooterPinBase64(): string {
  if (_footerPinBase64) return _footerPinBase64
  try {
    const pinPath = join(process.cwd(), 'public', 'footer-pin.png')
    const buf = readFileSync(pinPath)
    _footerPinBase64 = `data:image/png;base64,${buf.toString('base64')}`
    return _footerPinBase64
  } catch (e) {
    console.error('Failed to load footer pin:', e)
    return ''
  }
}

// A4 dimensions: 210mm × 297mm
// At 96dpi: 794px × 1123px
// Print margins: 15mm top/bottom/sides (safe for most printers)
export const SHARED_DOC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  background: #d4d4d4;
  font-family: 'Open Sans', Arial, sans-serif;
  font-size: 11px;
  color: #111;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ════════ DOCUMENT WRAPPER (auto-repeating header/footer) ════════ */
.doc-wrapper {
  display: table;
  width: 794px;
  margin: 40px auto;
  background: #ffffff;
  box-shadow: 0 4px 32px rgba(0,0,0,0.22);
}

/* ════════ HEADER (repeats on every page) ════════ */
.doc-header {
  display: table-header-group;
}

.header {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.header-logo-area {
  width: 100%;
  padding: 18px 40px 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-img {
  display: block;
  width: 100%;
  max-width: 260px;
  height: auto;
  object-fit: contain;
  object-position: center;
}

.header-rule {
  display: block;
  width: 100%;
  height: 2px;
  background: #FF0103;
  border: none;
  margin-top: 12px;
}

/* ════════ PAGE NUMBERING (centered before footer) ════════ */
.page-number-center {
  width: 100%;
  text-align: center;
  padding: 6px 0 4px 0;
  font-size: 9px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.03em;
}

/* ════════ BODY (content area) ════════ */
.doc-body {
  display: table-row-group;
}

.body {
  padding: 8px 20px 8px 20px;
}

/* ════════ FOOTER (repeats on every page) ════════ */
.doc-footer {
  display: table-footer-group;
}

.footer {
  background: #FF0103;
  padding: 0px 0px 5px 0px;
  text-align: center;
  flex-shrink: 0;
}

.footer-pin {
  display: inline-block;
  margin-bottom: 0px;
  line-height: 1;
}

.footer-pin-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  display: block;
  margin-bottom: -6px;
}

.footer-label {
  font-size: 6px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.05em;
  margin-top: 0px;
  margin-bottom: 0px;
  line-height: 1;
}

.footer-address {
  font-size: 6px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
}

/* ════════ PAGED.JS AUTO HEADER/FOOTER ════════ */
.running-header {
  position: running(docHeader);
}
.running-footer {
  position: running(docFooter);
}
.running-page-num {
  position: running(docPageNum);
}

@page {
  size: A4;
  margin: 15mm;

  @top-center {
    content: element(docHeader);
  }
  @bottom-center {
    content: element(docPageNum);
  }
  @bottom-left {
    content: element(docFooter);
  }
}

/* ════════ SINGLE PAGE (fallback for non-auto layouts) ════════ */
.page {
  width: 210mm;
  min-height: 297mm;
  background: #ffffff;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 32px rgba(0,0,0,0.22);
  overflow: visible;
  page-break-after: always;
  position: relative;
}
.page:last-child {
  page-break-after: auto;
}

/* ════════ PRINT STYLES ════════ */
@media print {
  @page {
    size: A4;
    margin: 10mm;
  }

  html, body {
    background: #fff;
    width: 210mm;
  }

  .page {
    margin: 0;
    box-shadow: none;
    width: 100%;
    min-height: auto;
    page-break-after: always;
  }
  .page:last-child {
    page-break-after: auto;
  }

  .doc-wrapper {
    margin: 0;
    box-shadow: none;
    width: 100%;
  }
}
`

export function HEADER_HTML(pageNum?: number, totalPages?: number): string {
  const logoSrc = getLogoBase64()
  const logoHtml = logoSrc
    ? `<img class="logo-img" src="${logoSrc}" alt="The Beyond Headlines" />`
    : `<div style="font-size:20px;font-weight:800;color:#333;padding:10px 0;">THE BEYOND HEADLINES</div>`

  return `
  <div class="running-header">
    <div class="header">
      <div class="header-logo-area">
        ${logoHtml}
      </div>
      <hr class="header-rule" />
    </div>
  </div>
  `
}

export function FOOTER_HTML(pageNum?: number, totalPages?: number): string {
  const pinSrc = getFooterPinBase64()
  const pinHtml = pinSrc
    ? `<img class="footer-pin-img" src="${pinSrc}" alt="Location" />`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`

  const pageDisplay = (pageNum && totalPages) ? `Page ${pageNum} of ${totalPages}` : 'Page 1 of 1'

  return `
  <div class="running-page-num">
    <div class="page-number-center">${pageDisplay}</div>
  </div>
  <div class="running-footer">
    <div class="footer">
      <div class="footer-pin">${pinHtml}</div>
      <div class="footer-label">Office Address:</div>
      <div class="footer-address">
        Eureka Kanon Villa, House-84, Level-3, Road-10/1, Block-D,<br>
        Niketon, Gulshan-1, Dhaka-1212, Bangladesh.
      </div>
    </div>
  </div>
  `
}

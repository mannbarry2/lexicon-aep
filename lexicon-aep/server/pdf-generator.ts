import fs from 'fs';
import path from 'path';
import { storage } from './storage';
import axios from 'axios';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { PDFDocument as PdfLibDocument } from 'pdf-lib';

/**
 * Legacy plain-text HTML processor — still used by the single-term test route.
 * The main book generator below renders real HTML via Chromium instead.
 */
export function processHtmlForPdf(html: string): { text: string; styles: { highlighted: string[]; codeBlocks: { text: string; position: number }[] } } {
  if (!html) return { text: '', styles: { highlighted: [], codeBlocks: [] } };
  const tmpText = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return { text: tmpText, styles: { highlighted: [], codeBlocks: [] } };
}

type ProgressFn = (percent: number, stage: string) => void;

interface EnrichedTerm {
  id: number;
  name: string;
  definition: string;
  isLegacy?: boolean;
  categories: { id: number; name: string }[];
  images?: { id: number; filename: string; firebaseUrl?: string | null }[];
}

const BRAND_BLUE = '#2563eb';
const DROPZONE_RE = /drop\s*zone/i;

// --- helpers -------------------------------------------------------------

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainText(html: string): string {
  const div = (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return div;
}

/**
 * Remove authoring artefacts that have no printable glyph — chiefly
 * U+2E30 (⸰ RING POINT), used in the source data to bracket key terms.
 */
function stripArtifacts(s: string): string {
  return (s || '').replace(/[⸰⸱]/g, '');
}

/** Sanitise a stored definition so it renders cleanly inside the book. */
function cleanDefinition(html: string): string {
  return stripArtifacts(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/ on[a-z]+="[^"]*"/gi, '')
    .replace(/<a\s/gi, '<a target="_blank" ');
}

/** Download a remote image and return it as a base64 data URI (or null on failure). */
async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const contentType = (resp.headers['content-type'] as string) || 'image/png';
    const b64 = Buffer.from(resp.data).toString('base64');
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

function formattedToday(): string {
  const today = new Date();
  const day = today.getDate();
  const suffix = day > 3 && day < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
  return `${day}${suffix} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
}

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Color+Emoji&display=swap');";

const LOGO_MARK = `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 9 L9 9 L9 39 L14 39" stroke="${BRAND_BLUE}" stroke-width="3.5"/>
    <path d="M34 9 L39 9 L39 39 L34 39" stroke="${BRAND_BLUE}" stroke-width="3.5"/>
    <path d="M24 15 L18 34 M24 15 L30 34" stroke="${BRAND_BLUE}" stroke-width="4"/>
    <path d="M20 27 L28 27" stroke="#14b8a6" stroke-width="3.5"/>
  </g>
</svg>`;

// --- HTML templates ------------------------------------------------------

function renderCover(termCount: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_IMPORT}
@page { margin: 0; size: A4; }
html,body { margin:0; padding:0; }
.cover { width:210mm; height:297mm; box-sizing:border-box;
  font-family:'Inter','Noto Color Emoji',sans-serif; color:#1e293b;
  display:flex; flex-direction:column; }
.band { height:9mm; background:${BRAND_BLUE}; }
.main { flex:1; display:flex; flex-direction:column; align-items:center;
  justify-content:center; padding:0 28mm; text-align:center; }
.mark { width:104px; height:104px; margin-bottom:16mm; }
.title { font-size:64px; font-weight:800; letter-spacing:-0.03em; line-height:1.04; }
.title .lex { color:#64748b; font-weight:600; }
.rule { width:66px; height:4px; background:#14b8a6; border-radius:2px; margin:10mm 0; }
.subtitle { font-size:16px; color:#64748b; max-width:122mm; line-height:1.55; }
.foot { padding:0 0 30mm; text-align:center; }
.author { font-size:18px; font-weight:700; color:#1e293b; }
.meta { font-size:12px; color:#94a3b8; margin-top:3mm; letter-spacing:0.02em; }
</style></head><body>
<div class="cover">
  <div class="band"></div>
  <div class="main">
    <div class="mark">${LOGO_MARK}</div>
    <div class="title">AEP<br><span class="lex">Lexicon</span></div>
    <div class="rule"></div>
    <div class="subtitle">The definitive glossary of Adobe Experience Platform terminology</div>
  </div>
  <div class="foot">
    <div class="author">Barry Mann</div>
    <div class="meta">Updated ${formattedToday()} &nbsp;·&nbsp; ${termCount} terms</div>
  </div>
  <div class="band"></div>
</div>
</body></html>`;
}

function renderTermEntry(term: EnrichedTerm, imageUri: string | null): string {
  const cats = (term.categories || [])
    .map((c) => `<span class="cat${DROPZONE_RE.test(c.name) ? ' dropzone' : ''}">${escapeHtml(c.name)}</span>`)
    .join('');

  const hasDefinition = plainText(term.definition).length > 0;
  const defHtml = hasDefinition
    ? `<div class="def">${cleanDefinition(term.definition)}</div>`
    : `<div class="term-empty">No definition yet — this term needs writing up.</div>`;

  const imgHtml = imageUri ? `<div class="term-img"><img src="${imageUri}" alt=""></div>` : '';

  return `<div class="term">
  <div class="term-name">${escapeHtml(stripArtifacts(term.name))}</div>
  ${cats ? `<div class="cats">${cats}</div>` : ''}
  ${defHtml}
  ${imgHtml}
</div>`;
}

function renderBody(terms: EnrichedTerm[], imageMap: Map<number, string>): string {
  // Group by first alphabetic character in the name. Names that lead with
  // brackets/punctuation (e.g. "[A]") fall back to their first letter, and
  // names with no letters at all bucket under '#' — which sorts at the end.
  const groups = new Map<string, EnrichedTerm[]>();
  for (const t of terms) {
    const key = (t.name.match(/[A-Za-z]/)?.[0] || '#').toUpperCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  const letters = Array.from(groups.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  const contents = `<section class="contents">
  <h1>Contents</h1>
  <div class="sub">${terms.length} terms across ${letters.length} sections — tap any letter to jump.</div>
  <div class="az">
    ${letters
      .map(
        (l) =>
          `<a href="#letter-${encodeURIComponent(l)}"><span class="L">${escapeHtml(l)}</span><span class="c">${groups.get(l)!.length}</span></a>`,
      )
      .join('\n    ')}
  </div>
</section>`;

  const sections = letters
    .map((l) => {
      const items = groups
        .get(l)!
        .map((t) => renderTermEntry(t, imageMap.get(t.id) || null))
        .join('\n');
      return `<section class="letter" id="letter-${encodeURIComponent(l)}">
  <div class="letter-head">
    <span class="big">${escapeHtml(l)}</span>
    <span class="line"></span>
    <span class="n">${groups.get(l)!.length} ${groups.get(l)!.length === 1 ? 'term' : 'terms'}</span>
  </div>
  ${items}
</section>`;
    })
    .join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_IMPORT}
* { box-sizing:border-box; }
html,body { margin:0; padding:0; }
body { font-family:'Inter','Noto Color Emoji',sans-serif; color:#1e293b;
  font-size:11pt; line-height:1.55; -webkit-print-color-adjust:exact; }

.contents { break-after:page; }
.contents h1 { font-size:32px; font-weight:800; letter-spacing:-0.02em; margin:0 0 2mm; color:#0f172a; }
.contents .sub { color:#64748b; font-size:10.5pt; margin-bottom:9mm; }
.az { display:flex; flex-wrap:wrap; gap:3mm; }
.az a { display:flex; align-items:baseline; justify-content:space-between;
  width:37mm; padding:2.6mm 4mm; border:1px solid #e2e8f0; border-radius:7px;
  text-decoration:none; color:#1e293b; }
.az a .L { font-size:15px; font-weight:700; color:${BRAND_BLUE}; }
.az a .c { font-size:8.5pt; color:#94a3b8; }

.letter { margin-top:8mm; }
.letter:first-of-type { margin-top:0; }
.letter-head { display:flex; align-items:center; gap:4mm; margin:0 0 4mm; break-after:avoid; }
.letter-head .big { font-size:32px; font-weight:800; color:${BRAND_BLUE}; line-height:1; }
.letter-head .line { flex:1; height:2px; background:#e2e8f0; }
.letter-head .n { font-size:8.5pt; color:#94a3b8; white-space:nowrap; }

.term { padding:3.5mm 0; border-bottom:1px solid #eef2f6; }
.term-name { font-size:13.5pt; font-weight:700; color:#0f172a; margin:0 0 1.5mm;
  break-after:avoid; }
.cats { margin:0 0 2mm; break-after:avoid; }
.cat { display:inline-block; font-size:7.5pt; font-weight:600; color:${BRAND_BLUE};
  background:#eef4fe; border-radius:10px; padding:1px 8px; margin:0 4px 2px 0; }
.cat.dropzone { color:#b45309; background:#fef3e2; }
.term-empty { font-size:10pt; color:#b45309; font-style:italic; }

.def { font-size:10.5pt; color:#334155; }
.def > *:first-child { margin-top:0; }
.def > *:last-child { margin-bottom:0; }
.def p { margin:0 0 1.6mm; }
.def h1,.def h2,.def h3,.def h4,.def h5,.def h6 {
  font-size:10.5pt; font-weight:700; color:#0f172a; margin:2.4mm 0 1mm; line-height:1.4; }
.def ul,.def ol { margin:1mm 0 1.8mm; padding-left:5.5mm; }
.def li { margin:0.4mm 0; }
.def strong,.def b { font-weight:700; color:#0f172a; }
.def a,.def .term-link { color:${BRAND_BLUE}; text-decoration:none;
  border-bottom:1px solid #bfdbfe; }
.def pre { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:5px;
  padding:2.6mm 3mm; white-space:pre-wrap; word-break:break-word; margin:1.8mm 0;
  font-family:'SF Mono',Menlo,Consolas,monospace; font-size:8.6pt; color:#0f172a; }
.def code { font-family:'SF Mono',Menlo,Consolas,monospace; font-size:9pt;
  background:#f1f5f9; border-radius:3px; padding:0 3px; }
.def pre code { background:none; padding:0; }
.def img { max-width:90mm; max-height:60mm; border:1px solid #e2e8f0;
  border-radius:6px; margin:2mm 0; display:block; }

.term-img { margin-top:2.5mm; break-inside:avoid; }
.term-img img { max-width:96mm; max-height:74mm; border:1px solid #e2e8f0;
  border-radius:7px; display:block; }
</style></head><body>
${contents}
${sections}
</body></html>`;
}

const HEADER_TEMPLATE = `<div style="width:100%; font-family:Arial,sans-serif; font-size:7px;
  letter-spacing:0.12em; color:#cbd5e1; text-align:right; padding:0 16mm;">
  AEP LEXICON</div>`;

const FOOTER_TEMPLATE = `<div style="width:100%; font-family:Arial,sans-serif; font-size:8px;
  color:#94a3b8; text-align:center; padding-top:2px;">
  <span class="pageNumber"></span></div>`;

// --- main generator ------------------------------------------------------

// Only one Chromium-backed generation may run at a time — concurrent
// launches race to extract/exec the shared binary and throw ETXTBSY.
let generationChain: Promise<unknown> = Promise.resolve();

/**
 * Generate a professionally typeset PDF of the glossary.
 * Renders an HTML/CSS book with Chromium so emoji, rich formatting and
 * images all appear correctly. Calls are serialised — a second request
 * queues behind the first.
 *
 * @param outputPath  where to write the PDF
 * @param onProgress  optional callback (percent 0-100, stage label)
 */
export function generateGlossaryPdf(outputPath: string, onProgress?: ProgressFn): Promise<string> {
  const result = generationChain
    .catch(() => {})
    .then(() => generateGlossaryPdfImpl(outputPath, onProgress));
  generationChain = result.catch(() => {});
  return result;
}

async function generateGlossaryPdfImpl(outputPath: string, onProgress?: ProgressFn): Promise<string> {
  const report = (p: number, s: string) => {
    try {
      onProgress?.(Math.max(0, Math.min(100, Math.round(p))), s);
    } catch {
      /* ignore */
    }
  };

  report(2, 'Gathering terms');
  const baseTerms = await storage.searchTerms('');
  baseTerms.sort((a: any, b: any) => a.name.localeCompare(b.name));
  const total = baseTerms.length;
  console.log(`Generating PDF book with ${total} terms`);

  // Enrich each term with categories / images (batched for speed + progress)
  const enriched: EnrichedTerm[] = [];
  let metaDone = 0;
  const META_BATCH = 8;
  for (let i = 0; i < total; i += META_BATCH) {
    const batch = baseTerms.slice(i, i + META_BATCH);
    const results = await Promise.all(batch.map((t: any) => storage.getTermWithMetadata(t.id)));
    for (const r of results) if (r) enriched.push(r as EnrichedTerm);
    metaDone += batch.length;
    report(2 + (metaDone / total) * 33, `Reading terms (${metaDone}/${total})`);
  }
  enriched.sort((a, b) => a.name.localeCompare(b.name));

  // Pre-fetch the lead image for each term as a data URI (real progress here)
  const imageTasks = enriched.filter((t) => t.images && t.images.length && t.images[0].firebaseUrl);
  const imageMap = new Map<number, string>();
  let imgDone = 0;
  const IMG_BATCH = 6;
  for (let i = 0; i < imageTasks.length; i += IMG_BATCH) {
    const batch = imageTasks.slice(i, i + IMG_BATCH);
    await Promise.all(
      batch.map(async (t) => {
        const uri = await fetchAsDataUri(t.images![0].firebaseUrl as string);
        if (uri) imageMap.set(t.id, uri);
      }),
    );
    imgDone += batch.length;
    report(35 + (imgDone / Math.max(imageTasks.length, 1)) * 25, `Loading images (${imgDone}/${imageTasks.length})`);
  }

  report(62, 'Building pages');
  const coverHtml = renderCover(enriched.length);
  const bodyHtml = renderBody(enriched, imageMap);

  report(66, 'Launching renderer');
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: await chromium.executablePath(),
    headless: (chromium as any).headless ?? true,
  });

  // Render HTML, then wait for webfonts (Inter + emoji) to finish loading.
  const renderReady = async (page: import('puppeteer-core').Page, html: string) => {
    await page.setContent(html, { waitUntil: 'load' });
    try {
      await page.evaluate(() => (document as any).fonts?.ready);
    } catch {
      /* fonts API unavailable — proceed */
    }
    await new Promise((r) => setTimeout(r, 350));
  };

  try {
    report(72, 'Rendering cover');
    const coverPage = await browser.newPage();
    await renderReady(coverPage, coverHtml);
    const coverPdf = await coverPage.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await coverPage.close();

    report(80, 'Rendering glossary');
    const bodyPage = await browser.newPage();
    await renderReady(bodyPage, bodyHtml);
    const bodyPdf = await bodyPage.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: HEADER_TEMPLATE,
      footerTemplate: FOOTER_TEMPLATE,
      margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
    });
    await bodyPage.close();

    report(90, 'Assembling book');
    const merged = await PdfLibDocument.create();
    const coverDoc = await PdfLibDocument.load(coverPdf);
    const bodyDoc = await PdfLibDocument.load(bodyPdf);
    for (const p of await merged.copyPages(coverDoc, coverDoc.getPageIndices())) merged.addPage(p);
    for (const p of await merged.copyPages(bodyDoc, bodyDoc.getPageIndices())) merged.addPage(p);
    merged.setTitle('AEP Lexicon');
    merged.setAuthor('Barry Mann');
    merged.setSubject('A glossary of Adobe Experience Platform terminology');
    const finalBytes = await merged.save();

    report(96, 'Saving file');
    const outputFilePath = path.resolve(outputPath);
    fs.writeFileSync(outputFilePath, finalBytes);
    report(100, 'Done');
    console.log(`PDF book generated at ${outputFilePath}`);
    return outputFilePath;
  } finally {
    await browser.close();
  }
}

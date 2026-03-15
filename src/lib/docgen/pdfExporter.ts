const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 36;
const CONTENT_LEFT = 52;
const CONTENT_RIGHT = PAGE_WIDTH - 52;
const CONTENT_TOP = 690;
const CONTENT_BOTTOM = 58;
const LINE_HEIGHT = 15;

function esc(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function estimateCharWidth(ch: string, fontSize: number): number {
  if (ch === " ") return fontSize * 0.28;
  if (/[A-Z]/.test(ch)) return fontSize * 0.62;
  if (/[a-z]/.test(ch)) return fontSize * 0.52;
  if (/[0-9]/.test(ch)) return fontSize * 0.55;
  return fontSize * 0.5;
}

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) width += estimateCharWidth(ch, fontSize);
  return width;
}

function wrapTextByWidth(line: string, fontSize: number, maxWidth: number): string[] {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const out: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (estimateTextWidth(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      if (current) out.push(current);
      current = w;
    }
  }
  if (current) out.push(current);
  return out;
}

function normalizeLines(fullText: string): string[] {
  const maxLineWidth = CONTENT_RIGHT - CONTENT_LEFT - 10;
  return fullText
    .split("\n")
    .map((l) => l.trim())
    .flatMap((line) => {
      if (!line) return [""];
      const isHeading = isSectionHeading(line);
      const fontSize = isHeading ? 12 : 11;
      return wrapTextByWidth(line, fontSize, maxLineWidth);
    });
}

function isSectionHeading(line: string): boolean {
  return (
    /^\d+\.\s+[A-Z]/.test(line) ||
    line.startsWith("SUBJECT:") ||
    line.startsWith("ANNEXURES")
  );
}

function pageFrame(): string {
  return [
    "q",
    "0.8 w",
    "0.22 0.22 0.22 RG",
    `${PAGE_MARGIN} ${PAGE_MARGIN} ${PAGE_WIDTH - PAGE_MARGIN * 2} ${PAGE_HEIGHT - PAGE_MARGIN * 2} re S`,
    "0.45 w",
    "0.35 0.35 0.35 RG",
    `${PAGE_MARGIN + 6} ${PAGE_HEIGHT - 102} ${PAGE_WIDTH - (PAGE_MARGIN + 6) * 2} 58 re S`,
    "Q",
  ].join("\n");
}

function headerBlock(): string {
  const title = "LEGAL NOTICE";
  const sub = "Section 138 / 142 - Negotiable Instruments Act, 1881";

  return [
    "BT",
    "/F2 20 Tf",
    "0.1 0.1 0.1 rg",
    `${(PAGE_WIDTH / 2) - 86} ${PAGE_HEIGHT - 70} Td`,
    `(${esc(title)}) Tj`,
    "ET",
    "BT",
    "/F1 10 Tf",
    "0.32 0.32 0.32 rg",
    `${(PAGE_WIDTH / 2) - 128} ${PAGE_HEIGHT - 88} Td`,
    `(${esc(sub)}) Tj`,
    "ET",
    "q",
    "1 w",
    "0.45 0.45 0.45 RG",
    `${PAGE_MARGIN + 20} ${PAGE_HEIGHT - 108} m ${PAGE_WIDTH - PAGE_MARGIN - 20} ${PAGE_HEIGHT - 108} l S`,
    "Q",
  ].join("\n");
}

function buildPageContent(lines: string[], pageNo: number): string {
  const ops: string[] = [pageFrame(), headerBlock()];
  let y = CONTENT_TOP;

  ops.push("BT");
  for (const line of lines) {
    if (y < CONTENT_BOTTOM) break;

    if (line === "") {
      y -= LINE_HEIGHT - 3;
      continue;
    }

    const isHeading = isSectionHeading(line);
    const fontSize = isHeading ? 12 : 11;
    if (isHeading) {
      ops.push(`/F2 ${fontSize} Tf`);
      ops.push("0.14 0.14 0.14 rg");
    } else {
      ops.push(`/F1 ${fontSize} Tf`);
      ops.push("0.08 0.08 0.08 rg");
    }

    ops.push(`1 0 0 1 ${CONTENT_LEFT} ${y} Tm`);
    ops.push(`(${esc(line)}) Tj`);
    y -= LINE_HEIGHT;
  }
  ops.push("ET");

  ops.push(
    "BT",
    "/F1 9 Tf",
    "0.4 0.4 0.4 rg",
    `1 0 0 1 ${PAGE_WIDTH - 96} ${PAGE_MARGIN + 10} Tm`,
    `(Page ${pageNo}) Tj`,
    "ET"
  );

  return ops.join("\n");
}

function buildObjects(contents: string[]): string[] {
  const pageCount = contents.length;
  const firstPageId = 3;
  const fontRegularId = firstPageId + pageCount * 2;
  const fontBoldId = fontRegularId + 1;
  const totalObjects = fontBoldId;

  const objects: string[] = new Array(totalObjects + 1).fill("");
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;

  const kids: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const pageId = firstPageId + i * 2;
    const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);

    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`;

    const stream = contents[i];
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  }

  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`;
  objects[fontRegularId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  objects[fontBoldId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;

  return objects;
}

function toPdf(objects: string[]): Buffer {
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function exportNoticeToPdf(fullText: string): Promise<Buffer> {
  const lines = normalizeLines(fullText);

  const linesPerPage = Math.max(1, Math.floor((CONTENT_TOP - CONTENT_BOTTOM) / LINE_HEIGHT));
  const pageChunks: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pageChunks.push(lines.slice(i, i + linesPerPage));
  }
  if (pageChunks.length === 0) {
    pageChunks.push([" "]);
  }

  const contents = pageChunks.map((chunk, idx) => buildPageContent(chunk, idx + 1));
  const objects = buildObjects(contents);
  return toPdf(objects);
}

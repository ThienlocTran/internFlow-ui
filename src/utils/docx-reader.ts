/**
 * Minimal DOCX reader for the browser.
 * A .docx file is a ZIP archive. We scan the raw bytes for the two XML entry
 * names we care about and decompress them using DecompressionStream (supported
 * in every modern browser since ~2023).
 *
 * Fallback: if DecompressionStream is not available we return null so the caller
 * can fall back to word-count estimation.
 */

/** Read 4 bytes little-endian uint32 */
function u32(buf: Uint8Array, off: number): number {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
}

/** Read 2 bytes little-endian uint16 */
function u16(buf: Uint8Array, off: number): number {
  return buf[off] | (buf[off + 1] << 8);
}

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedData: Uint8Array;
}

/**
 * Very small local-file-header scanner (enough for DOCX):
 * - Signature: 0x04034b50
 * - Stops at end-of-central-directory or end-of-buffer
 */
function scanLocalEntries(buf: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let i = 0;
  while (i + 30 < buf.length) {
    const sig = u32(buf, i);
    if (sig !== 0x04034b50) break; // not a local file header
    const compression = u16(buf, i + 8);
    const compressedSize = u32(buf, i + 18);
    const fileNameLen = u16(buf, i + 26);
    const extraLen = u16(buf, i + 28);
    const nameBytes = buf.slice(i + 30, i + 30 + fileNameLen);
    const name = new TextDecoder().decode(nameBytes);
    const dataStart = i + 30 + fileNameLen + extraLen;
    const compressedData = buf.slice(dataStart, dataStart + compressedSize);
    entries.push({ name, compressionMethod: compression, compressedData });
    i = dataStart + compressedSize;
  }
  return entries;
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(data);
  writer.close();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function entryText(entry: ZipEntry): Promise<string> {
  if (entry.compressionMethod === 0) {
    return new TextDecoder().decode(entry.compressedData);
  }
  if (entry.compressionMethod === 8) {
    const raw = await decompress(entry.compressedData);
    return new TextDecoder().decode(raw);
  }
  return "";
}

export interface DocxInfo {
  /** Actual page count from Word's metadata (may be null if not found) */
  pageCount: number | null;
  /** Plain text extracted from the document body */
  text: string;
  /** Word count of extracted text */
  wordCount: number;
}

export async function readDocx(file: File): Promise<DocxInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const buf = new Uint8Array(arrayBuffer);

  let pageCount: number | null = null;
  let text = "";

  try {
    const entries = scanLocalEntries(buf);

    // 1. Try to get page count from docProps/app.xml
    const appEntry = entries.find((e) => e.name === "docProps/app.xml");
    if (appEntry) {
      const xml = await entryText(appEntry);
      const match = xml.match(/<Pages>(\d+)<\/Pages>/i);
      if (match) pageCount = parseInt(match[1], 10);
    }

    // 2. Extract plain text from word/document.xml
    const docEntry = entries.find((e) => e.name === "word/document.xml");
    if (docEntry) {
      const xml = await entryText(docEntry);
      // Strip all XML tags and decode common XML entities
      text = xml
        .replace(/<w:br[^/]*/g, "\n")
        .replace(/<w:p[ >][^>]*>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
    }
  } catch {
    // Silently fall through — caller will handle null pageCount
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { pageCount, text, wordCount };
}

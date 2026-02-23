/**
 * Minimal client-side ZIP generator for text files (no compression, stored method).
 * Produces a valid ZIP archive as a Uint8Array.
 */

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >> 8) & 0xff;
}

function writeU32(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >> 8) & 0xff;
  buf[offset + 2] = (val >> 16) & 0xff;
  buf[offset + 3] = (val >> 24) & 0xff;
}

interface ZipEntry {
  name: string;
  content: string;
}

/**
 * Generate a ZIP file from an array of { name, content } entries.
 * All files are stored uncompressed (method 0).
 */
export function generateZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: { name: Uint8Array; data: Uint8Array; crc: number; offset: number }[] = [];

  // Calculate total size for pre-allocation
  let localOffset = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    parts.push({ name: nameBytes, data: dataBytes, crc: crc32(dataBytes), offset: localOffset });
    localOffset += 30 + nameBytes.length + dataBytes.length;
  }

  const centralStart = localOffset;
  let centralSize = 0;
  for (const p of parts) {
    centralSize += 46 + p.name.length;
  }

  const totalSize = localOffset + centralSize + 22;
  const buf = new Uint8Array(totalSize);

  // Write local file headers + data
  let pos = 0;
  for (const p of parts) {
    // Local file header signature
    writeU32(buf, pos, 0x04034b50); pos += 4;
    writeU16(buf, pos, 20); pos += 2;        // version needed
    writeU16(buf, pos, 0); pos += 2;         // flags
    writeU16(buf, pos, 0); pos += 2;         // compression: stored
    writeU16(buf, pos, 0); pos += 2;         // mod time
    writeU16(buf, pos, 0); pos += 2;         // mod date
    writeU32(buf, pos, p.crc); pos += 4;     // crc32
    writeU32(buf, pos, p.data.length); pos += 4; // compressed size
    writeU32(buf, pos, p.data.length); pos += 4; // uncompressed size
    writeU16(buf, pos, p.name.length); pos += 2; // filename length
    writeU16(buf, pos, 0); pos += 2;         // extra field length
    buf.set(p.name, pos); pos += p.name.length;
    buf.set(p.data, pos); pos += p.data.length;
  }

  // Write central directory entries
  for (const p of parts) {
    writeU32(buf, pos, 0x02014b50); pos += 4; // Central dir signature
    writeU16(buf, pos, 20); pos += 2;         // version made by
    writeU16(buf, pos, 20); pos += 2;         // version needed
    writeU16(buf, pos, 0); pos += 2;          // flags
    writeU16(buf, pos, 0); pos += 2;          // compression: stored
    writeU16(buf, pos, 0); pos += 2;          // mod time
    writeU16(buf, pos, 0); pos += 2;          // mod date
    writeU32(buf, pos, p.crc); pos += 4;
    writeU32(buf, pos, p.data.length); pos += 4;
    writeU32(buf, pos, p.data.length); pos += 4;
    writeU16(buf, pos, p.name.length); pos += 2;
    writeU16(buf, pos, 0); pos += 2;          // extra field length
    writeU16(buf, pos, 0); pos += 2;          // file comment length
    writeU16(buf, pos, 0); pos += 2;          // disk number start
    writeU16(buf, pos, 0); pos += 2;          // internal file attrs
    writeU32(buf, pos, 0); pos += 4;          // external file attrs
    writeU32(buf, pos, p.offset); pos += 4;   // relative offset of local header
    buf.set(p.name, pos); pos += p.name.length;
  }

  // End of central directory record
  writeU32(buf, pos, 0x06054b50); pos += 4;
  writeU16(buf, pos, 0); pos += 2;            // disk number
  writeU16(buf, pos, 0); pos += 2;            // disk with central dir
  writeU16(buf, pos, parts.length); pos += 2;  // entries on this disk
  writeU16(buf, pos, parts.length); pos += 2;  // total entries
  writeU32(buf, pos, centralSize); pos += 4;   // central dir size
  writeU32(buf, pos, centralStart); pos += 4;  // central dir offset
  writeU16(buf, pos, 0);                       // comment length

  return buf;
}

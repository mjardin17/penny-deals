// One-off icon generator: hand-rolled PNG encoder (no image lib dependency) that
// draws a simple "coin" (Penny Deals) icon at the sizes the PWA manifest and
// apple-touch-icon need. Run with: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BG = [0x0f, 0x5c, 0x3f]; // dark green background
const COIN = [0xf5, 0xc8, 0x42]; // gold coin
const COIN_EDGE = [0xb8, 0x8a, 0x1a];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function pixelColor(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > r) return BG;
  if (dist > r - Math.max(2, size * 0.035)) return COIN_EDGE;
  // A simple cent-sign notch: a vertical bar with a short horizontal tick, in the coin's color minus a shade.
  const barW = size * 0.06;
  const inBar = Math.abs(dx) < barW && Math.abs(dy) < r * 0.55;
  const inTick = Math.abs(dy) < barW * 0.9 && Math.abs(dx) < r * 0.3;
  if (inBar || inTick) return COIN_EDGE;
  return COIN;
}

function encodePng(size) {
  const raw = Buffer.alloc((1 + size * 3) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelColor(x, y, size);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const idat = deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "icons");
  await mkdir(outDir, { recursive: true });
  const sizes = [192, 512];
  for (const size of sizes) {
    const png = encodePng(size);
    await writeFile(path.join(outDir, `icon-${size}.png`), png);
    console.log(`wrote icon-${size}.png (${png.length} bytes)`);
  }
  const appleTouch = encodePng(180);
  await writeFile(path.join(outDir, "apple-touch-icon.png"), appleTouch);
  console.log(`wrote apple-touch-icon.png (${appleTouch.length} bytes)`);
}

main();

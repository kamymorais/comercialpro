import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const NAVY = [15, 23, 42];
const WHITE = [255, 255, 255];

function crc32(buf) {
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Icone simples e provisorio: fundo azul-marinho solido com um anel branco
// centralizado (identidade visual minima do ComercialPro ate haver arte final).
function buildPng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const center = (size - 1) / 2;
  const outerRadius = size * 0.32;
  const innerRadius = size * 0.16;
  const barHalfWidth = size * 0.06;
  const barHalfHeight = size * 0.22;

  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;

  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // sem filtro

    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isRing = dist <= outerRadius && dist >= innerRadius;
      const isCenterBar =
        Math.abs(dx) <= barHalfWidth && Math.abs(dy) <= barHalfHeight;

      const color = isRing || isCenterBar ? WHITE : NAVY;

      raw[offset++] = color[0];
      raw[offset++] = color[1];
      raw[offset++] = color[2];
    }
  }

  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const png = buildPng(size);
  writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`icon-${size}.png gerado (${png.length} bytes)`);
}

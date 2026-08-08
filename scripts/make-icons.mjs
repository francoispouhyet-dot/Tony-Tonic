// Génère les icônes PWA (PNG) sans dépendance externe :
// fond orange, "TT" blanc dessiné en rectangles pixel.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filtre none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x / size, y / size);
      const o = row + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// "TT" : deux T blancs sur fond dégradé orange
const BG_TOP = [249, 115, 22]; // orange-500
const BG_BOT = [194, 65, 12]; // orange-700
const WHITE = [255, 255, 255];

function inT(u, v, cx) {
  // T centré en cx : barre horizontale + fût vertical (coordonnées 0..1)
  const barW = 0.24, barH = 0.07, stemW = 0.07, top = 0.32, bottom = 0.68;
  if (v >= top && v <= top + barH && Math.abs(u - cx) <= barW / 2) return true;
  if (v >= top && v <= bottom && Math.abs(u - cx) <= stemW / 2) return true;
  return false;
}

function draw(u, v) {
  if (inT(u, v, 0.36) || inT(u, v, 0.64)) return WHITE;
  const t = v;
  return [
    Math.round(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t),
    Math.round(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t),
    Math.round(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t),
  ];
}

mkdirSync("public/icons", { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(size, draw));
  console.log(`icon-${size}.png ✓`);
}

#!/usr/bin/env node
/**
 * generate-android-branding.js
 *
 * Generates "by\ntenovski" PNG splash branding images for Android
 * at every DPI bucket. Pure Node.js — zero npm dependencies.
 *
 * Run from repo root:
 *   node scripts/generate-android-branding.js
 *
 * Output files:
 *   android/app/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash_branding.png
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── CRC-32 (required by PNG format) ─────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ─── Minimal PNG encoder (RGBA, no interlace) ─────────────────────────────────
function encodePNG(width, height, rgba) {
  const stride = width * 4;
  // Add filter byte (0 = None) per scanline
  const raw = Buffer.allocUnsafe(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0;
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const lenBuf = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body    = Buffer.concat([typeBuf, data]);
    const crcBuf  = Buffer.allocUnsafe(4);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([lenBuf, body, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ─── 5 × 7 pixel font ────────────────────────────────────────────────────────
// Each glyph: 7 rows × 5 columns  (1 = pixel on)
const FONT = {
  b: [[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  y: [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  t: [[0,1,0,0,0],[0,1,0,0,0],[1,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,1,1,0]],
  e: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0]],
  n: [[1,0,0,0,1],[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  o: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  v: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
  s: [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
  k: [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  i: [[1,1,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,1,1,0,0]],
};

const FW = 5; // font pixels wide
const FH = 7; // font pixels tall
const FG = 1; // gap between chars (font pixels)

// Render one text string into a Buffer of RGBA pixels
function renderLine(text, scale, r, g, b) {
  const chars = text.toLowerCase().split('').map(c => FONT[c]).filter(Boolean);
  const n = chars.length;
  const W = (n * (FW + FG) - FG) * scale;
  const H = FH * scale;
  const buf = Buffer.alloc(W * H * 4, 0);

  chars.forEach((glyph, ci) => {
    const originX = ci * (FW + FG) * scale;
    for (let row = 0; row < FH; row++) {
      for (let col = 0; col < FW; col++) {
        if (!glyph[row][col]) continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = originX + col * scale + sx;
            const py = row * scale + sy;
            const i = (py * W + px) * 4;
            buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
          }
        }
      }
    }
  });

  return { buf, W, H };
}

// Compose both lines onto a transparent canvas, centered
function buildBrandingPNG(scale) {
  const PAD_H  = 4 * scale;  // top & bottom padding
  const LINE_G = 3 * scale;  // gap between the two text lines
  const PAD_W  = 12 * scale; // horizontal margin on each side

  const l1 = renderLine('by',       scale, 142, 142, 147); // grey  (#8E8E93)
  const l2 = renderLine('tenovski', scale, 255, 255, 255); // white

  const imgW = Math.max(l1.W, l2.W) + PAD_W * 2;
  const imgH = PAD_H + l1.H + LINE_G + l2.H + PAD_H;
  const canvas = Buffer.alloc(imgW * imgH * 4, 0);

  function blit(src, srcW, srcH, dstX, dstY) {
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const si = (y * srcW + x) * 4;
        const di = ((dstY + y) * imgW + (dstX + x)) * 4;
        canvas[di]   = src[si];
        canvas[di+1] = src[si+1];
        canvas[di+2] = src[si+2];
        canvas[di+3] = src[si+3];
      }
    }
  }

  blit(l1.buf, l1.W, l1.H, Math.floor((imgW - l1.W) / 2), PAD_H);
  blit(l2.buf, l2.W, l2.H, Math.floor((imgW - l2.W) / 2), PAD_H + l1.H + LINE_G);

  return encodePNG(imgW, imgH, canvas);
}

// ─── Write per-density PNGs ───────────────────────────────────────────────────
const DENSITIES = [
  { folder: 'drawable-mdpi',    scale: 3  },
  { folder: 'drawable-hdpi',    scale: 4  },
  { folder: 'drawable-xhdpi',   scale: 6  },
  { folder: 'drawable-xxhdpi',  scale: 9  },
  { folder: 'drawable-xxxhdpi', scale: 12 },
];

const RES_ROOT = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

for (const { folder, scale } of DENSITIES) {
  const dir = path.join(RES_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, 'splash_branding.png');
  const png = buildBrandingPNG(scale);
  fs.writeFileSync(out, png);
  console.log(`✓  ${folder}/splash_branding.png  (${Math.round(png.length / 1024)} KB)`);
}

console.log('\nDone. Add to android/app/src/main/res/values/styles.xml:');
console.log('  <item name="windowSplashScreenBrandingImage">@drawable/splash_branding</item>');

/**
 * withAndroidSplashBranding.js
 *
 * Expo config plugin that:
 *   1. Generates "by\ntenovski" splash_branding.png at every Android DPI bucket
 *   2. Patches android/app/src/main/res/values/styles.xml to set
 *      windowSplashScreenBrandingImage → @drawable/splash_branding
 *
 * This runs during `expo prebuild` (both local and EAS cloud builds), so the
 * PNG files and styles patch are always present in the final native build — even
 * when EAS starts from a clean prebuild.
 *
 * PNG generation uses only Node.js built-ins (zlib, fs, path) — zero extra deps.
 */

'use strict';

const { withDangerousMod } = require('@expo/config-plugins');
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── CRC-32 ───────────────────────────────────────────────────────────────────
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

// ─── PNG encoder ──────────────────────────────────────────────────────────────
function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.allocUnsafe(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0; // filter = None
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  function chunk(type, data) {
    const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
    const tb = Buffer.from(type, 'ascii');
    const body = Buffer.concat([tb, data]);
    const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ─── 5 × 7 pixel font ────────────────────────────────────────────────────────
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

function renderLine(text, scale, r, g, b) {
  const chars = text.toLowerCase().split('').map(c => FONT[c]).filter(Boolean);
  const n = chars.length;
  const W = (n * (5 + 1) - 1) * scale; // FW=5  FG=1
  const H = 7 * scale;                  // FH=7
  const buf = Buffer.alloc(W * H * 4, 0);
  chars.forEach((glyph, ci) => {
    const ox = ci * 6 * scale;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (!glyph[row][col]) continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = ox + col * scale + sx;
            const py = row * scale + sy;
            const i = (py * W + px) * 4;
            buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=255;
          }
        }
      }
    }
  });
  return { buf, W, H };
}

function buildBrandingPNG(scale) {
  const PAD_H  = 4 * scale;
  const LINE_G = 3 * scale;
  const PAD_W  = 12 * scale;
  const l1 = renderLine('by',       scale, 142, 142, 147);
  const l2 = renderLine('tenovski', scale, 255, 255, 255);
  const imgW = Math.max(l1.W, l2.W) + PAD_W * 2;
  const imgH = PAD_H + l1.H + LINE_G + l2.H + PAD_H;
  const canvas = Buffer.alloc(imgW * imgH * 4, 0);
  function blit(src, srcW, srcH, dstX, dstY) {
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const si = (y * srcW + x) * 4;
        const di = ((dstY + y) * imgW + (dstX + x)) * 4;
        canvas[di]=src[si]; canvas[di+1]=src[si+1]; canvas[di+2]=src[si+2]; canvas[di+3]=src[si+3];
      }
    }
  }
  blit(l1.buf, l1.W, l1.H, Math.floor((imgW - l1.W) / 2), PAD_H);
  blit(l2.buf, l2.W, l2.H, Math.floor((imgW - l2.W) / 2), PAD_H + l1.H + LINE_G);
  return encodePNG(imgW, imgH, canvas);
}

const DENSITIES = [
  { folder: 'drawable-mdpi',    scale: 3  },
  { folder: 'drawable-hdpi',    scale: 4  },
  { folder: 'drawable-xhdpi',   scale: 6  },
  { folder: 'drawable-xxhdpi',  scale: 9  },
  { folder: 'drawable-xxxhdpi', scale: 12 },
];

// ─── Styles.xml patch ─────────────────────────────────────────────────────────
const BRANDING_ITEM = '    <item name="windowSplashScreenBrandingImage">@drawable/splash_branding</item>';

function patchStylesXml(stylesPath) {
  if (!fs.existsSync(stylesPath)) return;
  let xml = fs.readFileSync(stylesPath, 'utf-8');
  if (xml.includes('windowSplashScreenBrandingImage')) return; // already present
  xml = xml.replace(
    /<item name="postSplashScreenTheme">/,
    `${BRANDING_ITEM}\n    <item name="postSplashScreenTheme">`,
  );
  fs.writeFileSync(stylesPath, xml, 'utf-8');
  console.log('[withAndroidSplashBranding] patched styles.xml');
}

// ─── Config plugin ────────────────────────────────────────────────────────────
const withAndroidSplashBranding = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const platformRoot = modConfig.modRequest.platformProjectRoot; // …/android

      // 1. Generate branding PNGs
      const resRoot = path.join(platformRoot, 'app', 'src', 'main', 'res');
      for (const { folder, scale } of DENSITIES) {
        const dir = path.join(resRoot, folder);
        fs.mkdirSync(dir, { recursive: true });
        const png = buildBrandingPNG(scale);
        fs.writeFileSync(path.join(dir, 'splash_branding.png'), png);
        console.log(`[withAndroidSplashBranding] wrote ${folder}/splash_branding.png`);
      }

      // 2. Patch styles.xml
      patchStylesXml(path.join(resRoot, 'values', 'styles.xml'));

      return modConfig;
    },
  ]);

module.exports = withAndroidSplashBranding;

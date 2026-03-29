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

// ─── 6 × 10 proportional-width lowercase font ────────────────────────────────
// Height: 10 rows  (ascenders 0-2, x-height 3-8, descender 9)
// Each glyph: { w: <width>, d: <10-row array of pixel rows> }
const FH = 10;
const FG = 2; // inter-glyph gap in font pixels

const FONT = {
  b: { w:6, d:[
    [1,0,0,0,0,0],[1,0,0,0,0,0],[1,0,0,0,0,0],
    [1,0,1,1,0,0],[1,1,0,0,1,0],[1,0,0,0,0,1],
    [1,0,0,0,0,1],[1,1,0,0,1,0],[1,0,1,1,0,0],
    [0,0,0,0,0,0]]},
  y: { w:6, d:[
    [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
    [1,0,0,0,0,1],[1,0,0,0,0,1],[0,1,0,0,1,0],
    [0,0,1,1,0,0],[0,0,0,1,0,0],[0,0,1,0,0,0],
    [0,1,0,0,0,0]]},
  t: { w:5, d:[
    [0,0,0,0,0],[0,1,0,0,0],[0,1,0,0,0],
    [1,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],
    [0,1,0,0,0],[0,1,0,0,0],[0,0,1,1,0],
    [0,0,0,0,0]]},
  e: { w:6, d:[
    [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
    [0,1,1,1,0,0],[1,0,0,0,1,0],[1,1,1,1,1,0],
    [1,0,0,0,0,0],[1,0,0,0,0,0],[0,1,1,1,0,0],
    [0,0,0,0,0,0]]},
  n: { w:6, d:[
    [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
    [1,0,1,1,0,0],[1,1,0,0,1,0],[1,0,0,0,0,1],
    [1,0,0,0,0,1],[1,0,0,0,0,1],[1,0,0,0,0,1],
    [0,0,0,0,0,0]]},
  o: { w:6, d:[
    [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
    [0,0,1,1,0,0],[0,1,0,0,1,0],[1,0,0,0,0,1],
    [1,0,0,0,0,1],[0,1,0,0,1,0],[0,0,1,1,0,0],
    [0,0,0,0,0,0]]},
  v: { w:6, d:[
    [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
    [1,0,0,0,0,1],[1,0,0,0,0,1],[1,0,0,0,0,1],
    [0,1,0,0,1,0],[0,1,0,0,1,0],[0,0,1,1,0,0],
    [0,0,0,0,0,0]]},
  s: { w:6, d:[
    [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
    [0,1,1,1,0,0],[1,0,0,0,1,0],[0,1,1,0,0,0],
    [0,0,0,1,1,0],[1,0,0,0,1,0],[0,1,1,1,0,0],
    [0,0,0,0,0,0]]},
  k: { w:6, d:[
    [1,0,0,0,0,0],[1,0,0,0,0,0],[1,0,0,0,0,0],
    [1,0,0,1,0,0],[1,0,1,0,0,0],[1,1,0,0,0,0],
    [1,0,1,0,0,0],[1,0,0,1,0,0],[1,0,0,0,1,0],
    [0,0,0,0,0,0]]},
  i: { w:4, d:[
    [0,0,0,0],[0,1,0,0],[0,0,0,0],
    [1,1,0,0],[0,1,0,0],[0,1,0,0],
    [0,1,0,0],[0,1,0,0],[1,1,1,0],
    [0,0,0,0]]},
};

// ─── Render at high resolution ────────────────────────────────────────────────

function renderLineHiRes(text, scale, r, g, b) {
  const glyphs = text.toLowerCase().split('').map(c => FONT[c]).filter(Boolean);
  let totalFW = 0;
  const offsets = [];
  glyphs.forEach((g, idx) => {
    offsets.push(totalFW);
    totalFW += g.w;
    if (idx < glyphs.length - 1) totalFW += FG;
  });
  const W = totalFW * scale;
  const H = FH * scale;
  const buf = Buffer.alloc(W * H * 4, 0);
  glyphs.forEach((glyph, gi) => {
    const ox = offsets[gi] * scale;
    for (let row = 0; row < FH; row++) {
      for (let col = 0; col < glyph.w; col++) {
        if (!glyph.d[row][col]) continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = ox + col * scale + sx;
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

// ─── Area-average downsample ──────────────────────────────────────────────────
// Shrinks an RGBA buffer by an integer factor using box filtering.  Each output
// pixel is the average of (factor × factor) source pixels.  This converts the
// hard bitmap edges into smooth gradients — the same technique GPUs use for
// super-sampled anti-aliasing (SSAA).

function downsample(src, srcW, srcH, factor) {
  const dstW = Math.floor(srcW / factor);
  const dstH = Math.floor(srcH / factor);
  const area = factor * factor;
  const out = Buffer.alloc(dstW * dstH * 4, 0);
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const si = ((dy * factor + sy) * srcW + (dx * factor + sx)) * 4;
          rr += src[si]; gg += src[si+1]; bb += src[si+2]; aa += src[si+3];
        }
      }
      const di = (dy * dstW + dx) * 4;
      out[di]   = Math.round(rr / area);
      out[di+1] = Math.round(gg / area);
      out[di+2] = Math.round(bb / area);
      out[di+3] = Math.round(aa / area);
    }
  }
  return { buf: out, W: dstW, H: dstH };
}

// ─── Build branding PNG with 4× SSAA ─────────────────────────────────────────
// We render at 4× the target scale then downsample.  The box filter naturally
// produces smooth, anti-aliased text at every density — no edge-softening
// heuristics needed.

const SSAA = 4; // super-sample factor

function buildBrandingPNG(targetScale) {
  const hiScale = targetScale * SSAA;
  const PAD_H  = 4 * hiScale;
  const LINE_G = 3 * hiScale;
  const PAD_W  = 12 * hiScale;
  const l1 = renderLineHiRes('by',       hiScale, 142, 142, 147);
  const l2 = renderLineHiRes('tenovski', hiScale, 255, 255, 255);
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
  const ds = downsample(canvas, imgW, imgH, SSAA);
  return encodePNG(ds.W, ds.H, ds.buf);
}

const DENSITIES = [
  { folder: 'drawable-mdpi',    scale: 2  },
  { folder: 'drawable-hdpi',    scale: 2  },
  { folder: 'drawable-xhdpi',   scale: 3  },
  { folder: 'drawable-xxhdpi',  scale: 4  },
  { folder: 'drawable-xxxhdpi', scale: 5  },
];

// ─── Android 12+ branding-image style override ───────────────────────────────
// `android:windowSplashScreenBrandingImage` is available from API 31 (Android
// 12).  We create a `values-v31/styles.xml` that inherits the base splash theme
// and adds the branding drawable.  This keeps pre-12 devices unaffected while
// showing the "by tenovski" branding on 12+.

function writeV31StylesOverride(resRoot) {
  const dir = path.join(resRoot, 'values-v31');
  fs.mkdirSync(dir, { recursive: true });

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<resources>',
    '  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">',
    '    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>',
    '    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>',
    '    <item name="postSplashScreenTheme">@style/AppTheme</item>',
    '    <item name="android:windowSplashScreenBrandingImage">@drawable/splash_branding</item>',
    '  </style>',
    '</resources>',
    '',
  ].join('\n');

  const dest = path.join(dir, 'styles.xml');
  fs.writeFileSync(dest, xml, 'utf-8');
  console.log(`[withAndroidSplashBranding] wrote values-v31/styles.xml`);
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

      // 2. Write Android 12+ style override with branding image
      writeV31StylesOverride(resRoot);

      return modConfig;
    },
  ]);

module.exports = withAndroidSplashBranding;

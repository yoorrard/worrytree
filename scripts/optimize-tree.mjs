#!/usr/bin/env node
/**
 * 나무 이미지를 앱에 맞게 최적화해서 assets/ 에 넣습니다.
 *
 *   npm run tree -- ~/Downloads/내가만든나무.png
 *   npm run tree -- ./tree.png --remove-white --trim
 *
 * 하는 일:
 *  - 화면에 필요한 크기(최대 1600px)로 축소 — 원본이 작으면 그대로 둡니다
 *  - 투명 배경을 유지한 채 WebP로 변환 (PNG 대비 보통 60~90% 절감)
 *  - EXIF 등 메타데이터 제거
 *  - assets/tree.meta.json 생성 — 그림의 비율과 나뭇잎 범위를 담아
 *    앱이 어떤 모양의 나무든 알아서 맞추게 합니다
 *  - assets/ 안의 이전 tree.* 정리
 *
 * 옵션:
 *  --remove-white   흰 배경을 투명하게 (AI로 만든 그림에 흔합니다)
 *  --trim           가장자리의 투명한 여백 제거
 *  --quality <n>    WebP 품질 (기본 82)
 *  --canopy <t,b,l,r>  나뭇잎 범위를 %로 직접 지정 (위,아래,왼쪽,오른쪽)
 */

import { readdir, stat, unlink, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUTPUT = path.join(ASSETS_DIR, 'tree.webp');
const META_OUTPUT = path.join(ASSETS_DIR, 'tree.meta.json');

/** 고해상도 화면까지 선명하게 덮는 최대 변 길이. */
const MAX_EDGE = 1600;
/** 이 값보다 밝으면 배경으로 간주 (--remove-white). */
const WHITE_THRESHOLD = 243;

const KNOWN_TREE_FILES = ['tree.webp', 'tree.png', 'tree.jpg', 'tree.jpeg', 'tree.svg'];

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;
const fail = (message) => {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
};

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--') && !isOptionValue(a));
function isOptionValue(a) {
  const i = args.indexOf(a);
  return i > 0 && (args[i - 1] === '--quality' || args[i - 1] === '--canopy');
}
const shouldTrim = args.includes('--trim');
const removeWhite = args.includes('--remove-white');
const qualityIdx = args.indexOf('--quality');
const quality = qualityIdx > -1 ? Number(args[qualityIdx + 1]) : 82;
const canopyIdx = args.indexOf('--canopy');
const canopyArg = canopyIdx > -1 ? args[canopyIdx + 1] : null;

if (!input) fail('사용법: npm run tree -- <이미지 파일 경로>  (예: npm run tree -- ~/Downloads/tree.png)');
if (!Number.isFinite(quality) || quality < 1 || quality > 100) fail('--quality 는 1~100 사이의 숫자여야 합니다.');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  fail("이미지 변환에 sharp가 필요합니다. 먼저 'npm install' 을 실행해주세요.");
}

const inputPath = path.resolve(process.cwd(), input);
let inputStat;
try {
  inputStat = await stat(inputPath);
} catch {
  fail(`파일을 찾을 수 없습니다: ${inputPath}`);
}

await mkdir(ASSETS_DIR, { recursive: true });

const source = sharp(inputPath, { animated: false });
const meta = await source.metadata();
if (!meta.width || !meta.height) fail('이미지 크기를 읽을 수 없습니다. 손상된 파일일 수 있어요.');

console.log(`\n  원본: ${meta.format} ${meta.width}x${meta.height} (${kb(inputStat.size)})`);

/** 흰 배경을 투명하게. AI 생성 이미지는 배경이 흰색인 경우가 많습니다. */
async function makeWhiteTransparent(buffer) {
  const img = sharp(buffer).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  let cleared = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] >= WHITE_THRESHOLD && data[i + 1] >= WHITE_THRESHOLD && data[i + 2] >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
      cleared++;
    }
  }
  console.log(`  흰 배경 제거: ${((cleared / (info.width * info.height)) * 100).toFixed(1)}% 투명 처리`);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

let working = await source.ensureAlpha().png().toBuffer();
if (removeWhite) working = await makeWhiteTransparent(working);

let pipeline = sharp(working);
if (shouldTrim) pipeline = pipeline.trim();

const resized = await pipeline
  .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
  .toBuffer();

const { data: webp, info } = await sharp(resized)
  .webp({ quality, effort: 6, alphaQuality: 100 })
  .toBuffer({ resolveWithObject: true });

/**
 * 그림에서 실제로 불투명한 부분(= 나무)의 범위를 찾아,
 * 걱정 괴물이 매달릴 나뭇잎 타원을 추정합니다.
 * 줄기는 아래쪽 가운데에 몰려 있으므로 위쪽 절반만 보고 잎을 가늠합니다.
 */
async function detectCanopy(buffer) {
  const { data, info: si } = await sharp(buffer)
    .resize({ width: 220, fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 불투명한 픽셀이 없거나 거의 전부라면(=배경이 안 지워진 그림) 추정이 무의미합니다.
  const spans = [];
  let opaque = 0;
  for (let y = 0; y < si.height; y++) {
    let lo = si.width, hi = -1;
    for (let x = 0; x < si.width; x++) {
      if (data[(y * si.width + x) * si.channels + 3] > 24) {
        if (x < lo) lo = x;
        if (x > hi) hi = x;
        opaque++;
      }
    }
    spans.push(hi >= lo ? { lo, hi, w: hi - lo } : null);
  }
  const filled = opaque / (si.width * si.height);
  if (filled < 0.02 || filled > 0.97) return null;

  const top = spans.findIndex((s) => s);
  if (top < 0) return null;

  // 잎이 가장 넓게 퍼진 줄 = 캐노피의 허리
  let widestY = top;
  let widest = 0;
  spans.forEach((s, y) => {
    if (s && s.w > widest) {
      widest = s.w;
      widestY = y;
    }
  });

  // 허리 아래로 내려가다 폭이 확 줄어드는 지점이 잎과 줄기의 경계입니다.
  let bottom = widestY;
  for (let y = widestY; y < si.height; y++) {
    const s = spans[y];
    if (!s || s.w < widest * 0.45) break;
    bottom = y;
  }

  const pct = (v, total) => (v / total) * 100;
  const waist = spans[widestY];
  // 괴물이 잎 밖으로 삐져나오지 않도록 실제 범위보다 안쪽으로 줄여 잡습니다.
  return {
    cx: +pct((waist.lo + waist.hi) / 2, si.width).toFixed(1),
    cy: +pct((top + bottom) / 2, si.height).toFixed(1),
    rx: +(pct(widest / 2, si.width) * 0.74).toFixed(1),
    ry: +(pct((bottom - top) / 2, si.height) * 0.8).toFixed(1),
  };
}

let canopy;
if (canopyArg) {
  const [top, bottom, left, right] = canopyArg.split(',').map(Number);
  if ([top, bottom, left, right].some((n) => !Number.isFinite(n))) {
    fail('--canopy 는 "위,아래,왼쪽,오른쪽" 형식의 숫자 4개여야 합니다. 예: --canopy 8,66,16,84');
  }
  canopy = {
    cx: +((left + right) / 2).toFixed(1),
    cy: +((top + bottom) / 2).toFixed(1),
    rx: +((right - left) / 2).toFixed(1),
    ry: +((bottom - top) / 2).toFixed(1),
  };
  console.log('  나뭇잎 범위: 직접 지정한 값 사용');
} else {
  canopy = await detectCanopy(resized);
  if (canopy) {
    console.log('  나뭇잎 범위: 그림에서 자동 감지');
  } else {
    console.log('  나뭇잎 범위: 자동 감지 실패 — 기본값을 씁니다 (--canopy 로 직접 지정 가능)');
  }
}

// 어떤 파일이 나무로 쓰일지 헷갈리지 않도록 이전 tree.* 를 정리합니다.
const existing = await readdir(ASSETS_DIR).catch(() => []);
for (const name of existing) {
  if (KNOWN_TREE_FILES.includes(name) && path.join(ASSETS_DIR, name) !== OUTPUT) {
    await unlink(path.join(ASSETS_DIR, name));
    console.log(`  이전 파일 정리: assets/${name}`);
  }
}

await writeFile(OUTPUT, webp);

const shape = {
  aspect: +(info.width / info.height).toFixed(4),
  ...(canopy ? { canopy } : {}),
  _생성됨: 'npm run tree 명령이 만든 파일입니다. 직접 고쳐도 되고, 다시 실행하면 덮어씁니다.',
};
await writeFile(META_OUTPUT, JSON.stringify(shape, null, 2) + '\n');

const saved = ((1 - webp.length / inputStat.size) * 100).toFixed(0);
console.log(`  결과: webp ${info.width}x${info.height} (${kb(webp.length)}, ${saved}% 절감)`);
console.log(`  저장: assets/tree.webp + assets/tree.meta.json`);
console.log(`  비율: ${shape.aspect} (${info.width}:${info.height})`);
if (canopy) {
  console.log(
    `  괴물이 매달릴 범위: 가로 ${(canopy.cx - canopy.rx).toFixed(0)}~${(canopy.cx + canopy.rx).toFixed(0)}%, ` +
      `세로 ${(canopy.cy - canopy.ry).toFixed(0)}~${(canopy.cy + canopy.ry).toFixed(0)}%`,
  );
}

const finalMeta = await sharp(webp).metadata();
if (!finalMeta.hasAlpha) {
  console.log(
    `\n  ⚠ 배경이 투명하지 않습니다. 하늘색 배경 위에 네모난 사각형이 그대로 보입니다.\n` +
      `    흰 배경이라면 --remove-white 를 붙여 다시 실행해보세요.`,
  );
}

console.log('\n  ✓ 완료. npm run dev 로 확인해보세요.\n');

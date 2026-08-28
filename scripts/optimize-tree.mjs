#!/usr/bin/env node
/**
 * 나무 이미지를 앱에 맞게 최적화해서 assets/tree.webp 로 저장합니다.
 *
 *   npm run tree -- ~/Downloads/내가만든나무.png
 *   npm run tree -- ./tree.png --trim
 *
 * 하는 일:
 *  - 3:4 무대에 맞는 크기(최대 1200x1600)로 축소 (원본이 작으면 그대로 둡니다)
 *  - 투명 배경을 유지한 채 WebP로 변환 (PNG 대비 보통 70~90% 절감)
 *  - EXIF 등 불필요한 메타데이터 제거
 *  - assets/ 안의 다른 tree.* 파일을 정리해 어떤 이미지가 쓰일지 모호해지지 않게 함
 *
 * 옵션:
 *  --trim          가장자리의 투명한 여백을 잘라내 나무가 화면을 꽉 채우게 합니다
 *  --quality <n>   WebP 품질 (기본 82)
 */

import { readdir, stat, unlink, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUTPUT = path.join(ASSETS_DIR, 'tree.webp');

// 무대 비율 3:4 기준. 고해상도 화면(DPR 2)까지 선명하게 덮는 크기입니다.
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600;
const TARGET_RATIO = 3 / 4;

const KNOWN_TREE_FILES = ['tree.webp', 'tree.png', 'tree.jpg', 'tree.jpeg', 'tree.svg'];

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

const fail = (message) => {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
};

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const shouldTrim = args.includes('--trim');
const qualityArg = args.indexOf('--quality');
const quality = qualityArg > -1 ? Number(args[qualityArg + 1]) : 82;

if (!input) {
  fail('사용법: npm run tree -- <이미지 파일 경로>  (예: npm run tree -- ~/Downloads/tree.png)');
}
if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
  fail('--quality 는 1~100 사이의 숫자여야 합니다.');
}

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

let pipeline = sharp(inputPath, { animated: false });
const meta = await pipeline.metadata();

if (!meta.width || !meta.height) {
  fail('이미지 크기를 읽을 수 없습니다. 손상된 파일일 수 있어요.');
}

console.log(`\n  원본: ${meta.format} ${meta.width}x${meta.height} (${kb(inputStat.size)})`);

if (shouldTrim) {
  pipeline = pipeline.trim();
}

pipeline = pipeline
  .resize({
    width: MAX_WIDTH,
    height: MAX_HEIGHT,
    fit: 'inside',
    // 원본이 권장 크기보다 작으면 억지로 늘리지 않습니다(흐려지기만 합니다).
    withoutEnlargement: true,
  })
  .webp({ quality, effort: 6, alphaQuality: 100 });

const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

// 어떤 파일이 나무로 쓰일지 헷갈리지 않도록 이전 tree.* 를 정리합니다.
const existing = await readdir(ASSETS_DIR).catch(() => []);
for (const name of existing) {
  if (KNOWN_TREE_FILES.includes(name) && path.join(ASSETS_DIR, name) !== OUTPUT) {
    await unlink(path.join(ASSETS_DIR, name));
    console.log(`  이전 파일 정리: assets/${name}`);
  }
}

await sharp(data).toFile(OUTPUT);

const ratio = info.width / info.height;
const saved = ((1 - data.length / inputStat.size) * 100).toFixed(0);

console.log(`  결과: webp ${info.width}x${info.height} (${kb(data.length)}, ${saved}% 절감)`);
console.log(`  저장: assets/tree.webp`);

if (Math.abs(ratio - TARGET_RATIO) > 0.08) {
  console.log(
    `\n  ⚠ 가로:세로 비율이 ${ratio.toFixed(2)} 입니다. 앱의 무대는 3:4(${TARGET_RATIO}) 기준이라\n` +
      `    위아래에 빈 공간이 생길 수 있어요. 1200x1600 처럼 3:4로 만들면 가장 잘 맞습니다.`,
  );
}
if (!meta.hasAlpha) {
  console.log(
    `\n  ⚠ 배경이 투명하지 않습니다. 하늘색 배경 위에 네모난 사각형이 그대로 보일 수 있어요.\n` +
      `    배경을 지운 PNG로 다시 만들어주세요.`,
  );
}

console.log('\n  ✓ 완료. npm run dev 로 확인해보세요.\n');

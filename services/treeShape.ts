import {
  DEFAULT_TREE_SHAPE,
  monsterColors,
  MAX_STAGE_OVERFLOW,
  MONSTER_MIN_PX,
  MONSTER_SIZE_RATIO,
  STAGE_EDGE_PAD_PX,
  TreeShape,
} from '../types';

/**
 * 나무 그림과 그 모양 정보를 빌드 시점에 찾아옵니다.
 *
 * `assets/tree.*` 가 있으면 Vite가 번들에 넣고 파일명에 해시를 붙여 주므로
 * 브라우저가 영구 캐시할 수 있고(재방문 트래픽 0), 없으면 기본 SVG 나무를 씁니다.
 * 런타임 404도, 사용자가 고쳐야 할 설정도 없습니다.
 */

const FORMAT_PRIORITY = ['.webp', '.svg', '.png', '.jpg', '.jpeg'];

const treeAssets = import.meta.glob<string>('../assets/tree.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** 여러 형식이 동시에 있어도 항상 같은 파일이 선택되도록 우선순위를 고정합니다. */
export const customTreeSrc: string | undefined = Object.entries(treeAssets)
  .sort(([a], [b]) => {
    const rank = (file: string) =>
      FORMAT_PRIORITY.findIndex(ext => file.toLowerCase().endsWith(ext));
    return rank(a) - rank(b);
  })
  .map(([, url]) => url)[0];

/**
 * `npm run tree` 가 만들어 두는 그림의 비율·나뭇잎 범위.
 * 그림을 바꾸면 이 값도 함께 바뀌므로 앱이 알아서 새 모양에 맞춰집니다.
 */
const metaModules = import.meta.glob<Partial<TreeShape>>('../assets/tree.meta.json', {
  eager: true,
  import: 'default',
});
const meta = Object.values(metaModules)[0];

const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

export const treeShape: TreeShape = {
  aspect: isPositive(meta?.aspect) ? meta.aspect : DEFAULT_TREE_SHAPE.aspect,
  canopy: {
    cx: meta?.canopy?.cx ?? DEFAULT_TREE_SHAPE.canopy.cx,
    cy: meta?.canopy?.cy ?? DEFAULT_TREE_SHAPE.canopy.cy,
    rx: meta?.canopy?.rx ?? DEFAULT_TREE_SHAPE.canopy.rx,
    ry: meta?.canopy?.ry ?? DEFAULT_TREE_SHAPE.canopy.ry,
  },
};

/** 괴물이 매달릴 수 있는 나뭇잎 타원 (무대 기준 %). */
export const canopy = treeShape.canopy;

/**
 * 무대의 폭.
 *
 * 좁은 화면에서 나무를 화면에 맞춰 줄이면 아래쪽에 납작하게 깔려 휑해 보입니다.
 * 그래서 나무는 화면 밖으로 넘칠 만큼 키우고 좌우를 잘라냅니다.
 * 잘려도 되는 건 나무뿐이고, 눌러야 하는 괴물은 canopySqueeze 가 화면 안으로
 * 모아 줍니다.
 */
export const stageWidthCss =
  `min(calc(100dvh * ${treeShape.aspect}), calc(100vw * ${MAX_STAGE_OVERFLOW}))`;

/**
 * 나무가 화면 밖으로 넘칠 때, 괴물이 매달리는 가로 범위를 얼마나 좁힐지(0~1).
 *
 * 1이면 원래 나뭇잎 폭 그대로, 0.6이면 중앙 쪽으로 60%만큼 모입니다.
 * 덕분에 나무는 시원하게 잘려 나가면서도 괴물은 항상 화면 안에 남습니다.
 * 화면에 보이는 나뭇잎 위에 고르게 퍼지므로 어색해 보이지도 않습니다.
 */
export const canopySqueeze = (stageWidth: number, viewportWidth: number): number => {
  if (stageWidth <= 0) return 1;
  const monsterWidth = Math.max(MONSTER_MIN_PX, stageWidth * MONSTER_SIZE_RATIO);
  const visibleHalf = (viewportWidth - monsterWidth - STAGE_EDGE_PAD_PX) / 2;
  const canopyHalf = (canopy.rx / 100) * stageWidth;
  if (canopyHalf <= 0) return 1;
  return Math.max(0.15, Math.min(1, visibleHalf / canopyHalf));
};

/**
 * 걱정 하나가 나무 어디에 매달릴지, 어떤 색이 될지를 **본문에서 계산**합니다.
 *
 * 예전에는 자리와 색을 무작위로 뽑아 공유 링크에 함께 실어 보냈습니다.
 * 하지만 자리와 색은 장식일 뿐인데도 링크 길이의 3분의 1을 차지했고,
 * 걱정이 늘수록 QR 코드가 촘촘해지는 주된 원인이었습니다.
 *
 * 이제는 보내는 쪽과 받는 쪽이 같은 글자에서 같은 값을 계산해 냅니다.
 * 덕분에 링크에는 걱정 내용만 담기고(약 30% 짧아짐), 그러면서도 친구가 보는
 * 나무는 내가 보던 나무와 똑같이 생겼습니다. 나무 그림을 바꾸면 예전에 만든
 * 링크도 새 나뭇잎 범위에 맞춰 다시 자리를 잡습니다.
 */

/** 문자열 → 32비트 정수. 짧은 한글 문장에서도 값이 고르게 흩어집니다. */
const hashText = (text: string, salt: number): number => {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};

// 나뭇잎 타원의 '아래쪽 한가운데'는 잎이 아니라 줄기입니다.
// 거기 걸린 괴물은 가지가 아니라 기둥에 붙은 것처럼 보이므로 피해서 다시 뽑습니다.
const TRUNK_HALF_WIDTH = 0.45;
const TRUNK_TOP = 0.5;
const MAX_TRIES = 12;

export interface WorryPlacement {
  top: number;
  left: number;
  rotate: number;
  colorIndex: number;
}

/**
 * @param text 걱정 내용
 * @param duplicateIndex 같은 내용이 이미 몇 개 있었는지. 똑같은 걱정을 두 번 적어도
 *                       서로 다른 자리에 매달리도록 씨앗을 다르게 합니다.
 */
export const placeWorry = (text: string, duplicateIndex = 0): WorryPlacement => {
  const { cx, cy, rx, ry } = canopy;
  const style = hashText(text, 0x5bf03635 + duplicateIndex);

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const h = hashText(text, duplicateIndex * 977 + attempt * 131 + 1);
    const angle = ((h & 0xffff) / 0x10000) * Math.PI * 2;
    // sqrt를 쓰는 이유: 그냥 난수를 반지름에 곱하면 가운데로 몰립니다.
    const radius = Math.sqrt(((h >>> 16) & 0x7fff) / 0x8000);
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);

    const onTrunk = Math.abs(dx) < TRUNK_HALF_WIDTH && dy > TRUNK_TOP;
    if (onTrunk && attempt < MAX_TRIES - 1) continue;

    return {
      left: Math.round(cx + rx * dx),
      top: Math.round(cy + ry * dy),
      rotate: (style % 31) - 15,
      colorIndex: (style >>> 8) % monsterColors.length,
    };
  }
  return { left: Math.round(cx), top: Math.round(cy), rotate: 0, colorIndex: 0 };
};

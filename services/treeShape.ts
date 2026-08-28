import { DEFAULT_TREE_SHAPE, STAGE_ASPECT, TreeShape } from '../types';

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

const imageShape: TreeShape = {
  aspect: isPositive(meta?.aspect) ? meta.aspect : DEFAULT_TREE_SHAPE.aspect,
  canopy: {
    cx: meta?.canopy?.cx ?? DEFAULT_TREE_SHAPE.canopy.cx,
    cy: meta?.canopy?.cy ?? DEFAULT_TREE_SHAPE.canopy.cy,
    rx: meta?.canopy?.rx ?? DEFAULT_TREE_SHAPE.canopy.rx,
    ry: meta?.canopy?.ry ?? DEFAULT_TREE_SHAPE.canopy.ry,
  },
};

/**
 * 그림 기준 좌표를 무대 기준 좌표로 옮깁니다.
 *
 * 그림은 무대를 빈틈없이 채우도록(object-fit: cover) 그려지므로, 그림과 무대의
 * 비율이 다르면 가로나 세로가 균등하게 잘려 나갑니다. 그만큼 나뭇잎의 위치와
 * 크기도 달라지기 때문에, 괴물을 매달기 전에 좌표를 바꿔줘야 합니다.
 */
const toStageCoords = (shape: TreeShape): TreeShape['canopy'] => {
  const { canopy, aspect } = shape;
  if (Math.abs(aspect - STAGE_ASPECT) < 0.001) return canopy;

  if (aspect > STAGE_ASPECT) {
    // 그림이 무대보다 가로로 넓다 → 좌우가 잘린다
    const visible = STAGE_ASPECT / aspect;
    const cut = (1 - visible) / 2;
    return {
      ...canopy,
      cx: ((canopy.cx / 100 - cut) / visible) * 100,
      rx: canopy.rx / visible,
    };
  }
  // 그림이 무대보다 세로로 길다 → 위쪽이 잘린다.
  // (아래쪽을 기준으로 맞추므로 줄기와 땅은 절대 잘리지 않습니다.)
  const visible = aspect / STAGE_ASPECT;
  const cut = 1 - visible;
  return {
    ...canopy,
    cy: ((canopy.cy / 100 - cut) / visible) * 100,
    ry: canopy.ry / visible,
  };
};

/** 무대 기준으로 환산된 나뭇잎 범위. 괴물은 이 타원 안에만 생깁니다. */
export const canopy = toStageCoords(imageShape);

export const treeShape = { ...imageShape, stageCanopy: canopy };

/**
 * 무대를 화면 안에 'contain' 방식으로 채우는 CSS 폭.
 * 가로가 넓은 화면에서는 높이에, 좁은 화면에서는 너비에 맞춰집니다.
 */
export const stageWidthCss = `min(100vw, calc(100dvh * ${STAGE_ASPECT}))`;

/**
 * 나뭇잎(타원) 안의 한 점을 고릅니다.
 * sqrt를 쓰는 이유: 그냥 난수를 반지름에 곱하면 가운데로 몰립니다.
 */
export const randomCanopyPoint = (): { top: number; left: number } => {
  const { cx, cy, rx, ry } = canopy;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random());
  return {
    left: cx + rx * radius * Math.cos(angle),
    top: cy + ry * radius * Math.sin(angle),
  };
};


export interface Worry {
  id: string;
  text: string;
  position: { top: string; left: string; transform: string };
  isFalling: boolean;
  color: string;
}

export interface ClearedWorry {
  worryText: string;
  comfortText: string;
}

/**
 * 나무 그림과 걱정 괴물이 공유하는 '무대'의 모양.
 *
 * 괴물의 좌표(%)는 화면이 아니라 이 무대를 기준으로 하므로, 기기가 달라져도
 * 항상 나뭇잎 위 같은 자리에 매달립니다.
 *
 * 값은 `assets/tree.meta.json` 이 있으면 그 그림의 실제 비율로 덮어써집니다.
 * (`npm run tree` 가 이미지를 넣을 때 함께 만들어 줍니다.)
 * 아래는 기본 SVG 나무의 값입니다.
 */
export interface TreeShape {
  /** 무대의 가로:세로 비율 (가로 ÷ 세로) */
  aspect: number;
  /**
   * 나뭇잎이 덮는 영역을 타원으로 나타낸 것 (무대 기준 %).
   * 나무의 잎은 사각형이 아니라 둥근 돔이라, 사각형 범위에 괴물을 뿌리면
   * 네 모서리에 생긴 괴물이 잎이 없는 허공에 뜹니다.
   */
  canopy: { cx: number; cy: number; rx: number; ry: number };
}

/**
 * 앱이 쓰는 무대의 가로:세로 비율. **기기와 무관하게 항상 같습니다.**
 *
 * 걱정 괴물의 좌표(%)가 이 무대를 기준으로 저장되므로, 화면 크기에 따라
 * 비율이 바뀌면 같은 공유 링크가 기기마다 다른 그림이 되어 버립니다.
 *
 * 4:3인 이유: 나무 그림은 대개 가로로 넓지만(16:9 등) 휴대폰 화면은 세로로 깁니다.
 * 그림 비율을 그대로 쓰면 휴대폰에서 나무가 납작한 띠가 되고, 정사각형에 가깝게
 * 하면 넓은 그림의 좌우가 너무 많이 잘립니다. 4:3이 그 사이의 균형점입니다.
 */
export const STAGE_ASPECT = 4 / 3;

/**
 * 기본 SVG 나무의 모양. 무대와 같은 비율로 그렸기 때문에 좌표 변환이 필요 없습니다.
 * (사용자가 넣은 그림은 비율이 다를 수 있어 services/treeShape.ts 에서 변환합니다.)
 */
export const DEFAULT_TREE_SHAPE: TreeShape = {
  aspect: STAGE_ASPECT,
  canopy: { cx: 50, cy: 34, rx: 30, ry: 24 },
};

/** 괴물 크기. 나무와 함께 커지되, 손가락으로 누를 수 있는 크기는 지킵니다. */
export const MONSTER_SIZE_CSS = 'clamp(42px, 7%, 92px)';

/** 괴물이 떨어지는 애니메이션 길이(ms). CSS transition 시간과 반드시 같아야 합니다. */
export const FALL_DURATION_MS = 2000;

export const monsterColors = [
    '#ff7b7b', '#ffb07b', '#ffd97b', '#a6ff7b',
    '#7bffb0', '#7bffff', '#7ba6ff', '#b07bff', '#ff7bff'
];

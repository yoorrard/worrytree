
export interface Worry {
  id: string;
  text: string;
  /** 무대 기준 위치(%)와 기울기(도). 예전에는 'rotate(7deg)' 같은 문자열이라
   *  쓸 때마다 정규식으로 다시 뜯어야 했습니다. */
  position: { top: number; left: number; rotate: number };
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

/** 기본 SVG 나무의 모양. 그림을 넣으면 그 그림의 값으로 대체됩니다. */
export const DEFAULT_TREE_SHAPE: TreeShape = {
  aspect: 4 / 3,
  canopy: { cx: 50, cy: 34, rx: 30, ry: 24 },
};

/** 화면 좌우 끝에 남겨둘 최소 여백(양쪽 합, px). */
export const STAGE_EDGE_PAD_PX = 24;

/**
 * 나무를 화면 폭의 몇 배까지 키울지.
 *
 * 좁은 화면에서 나무를 화면에 맞춰 줄이면 아래쪽에 납작하게 깔려 휑합니다.
 * 대신 나무를 크게 키워 좌우로 넘치게 두면 화면이 꽉 차 보입니다.
 * 너무 키우면 나무 윤곽이 사라져 잎사귀 벽처럼 보이므로 이쯤에서 멈춥니다.
 */
export const MAX_STAGE_OVERFLOW = 2.75;

/**
 * 괴물 크기 — 무대 폭에 대한 비율.
 * 나무와 항상 같은 비율로 커지고 작아져서, 어느 화면에서 보든 나무 위 괴물의
 * 크기감이 같습니다. 다만 손가락으로 누를 수 있는 최소 크기는 지킵니다.
 */
export const MONSTER_SIZE_RATIO = 0.065;
export const MONSTER_MIN_PX = 40;
export const MONSTER_SIZE_CSS = `max(${MONSTER_MIN_PX}px, ${MONSTER_SIZE_RATIO * 100}%)`;

/** 괴물이 떨어지는 애니메이션 길이(ms). CSS transition 시간과 반드시 같아야 합니다. */
export const FALL_DURATION_MS = 2000;

export const monsterColors = [
    '#ff7b7b', '#ffb07b', '#ffd97b', '#a6ff7b',
    '#7bffb0', '#7bffff', '#7ba6ff', '#b07bff', '#ff7bff'
];


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
 * 걱정 괴물의 좌표(%)가 기준으로 삼는 "무대"의 가로:세로 비율.
 * 나무 그림과 괴물이 같은 무대를 공유하기 때문에, 화면 크기나 기기가 달라져도
 * 괴물은 항상 나뭇잎 위 같은 자리에 매달립니다.
 * 나무 이미지를 교체할 때도 이 비율(3:4)에 맞춰 만들어야 합니다.
 */
export const TREE_ASPECT_W = 3;
export const TREE_ASPECT_H = 4;
export const TREE_ASPECT_RATIO = `${TREE_ASPECT_W} / ${TREE_ASPECT_H}`;

/**
 * 무대를 화면 안에 "contain" 방식으로 꽉 채우는 CSS 폭.
 * 가로가 넓은 데스크톱에서는 높이에, 좁은 모바일에서는 너비에 맞춰집니다.
 */
export const TREE_STAGE_WIDTH =
  `min(100vw, calc(100dvh * ${TREE_ASPECT_W} / ${TREE_ASPECT_H}))`;

/** 괴물이 새로 생길 수 있는 영역(무대 기준 %). 나뭇잎이 덮는 범위 안이어야 합니다. */
export const CANOPY_BOUNDS = {
  top: { min: 14, max: 56 },
  left: { min: 12, max: 86 },
};

/** 괴물이 떨어지는 애니메이션 길이(ms). CSS transition 시간과 반드시 같아야 합니다. */
export const FALL_DURATION_MS = 2000;

export const monsterColors = [
    '#ff7b7b', '#ffb07b', '#ffd97b', '#a6ff7b',
    '#7bffb0', '#7bffff', '#7ba6ff', '#b07bff', '#ff7bff'
];

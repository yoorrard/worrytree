import React from 'react';
import { DEFAULT_TREE_SHAPE } from '../types';

/**
 * 기본 나무 그림.
 *
 * 외부 이미지를 핫링크하면 상대 사이트가 이미지를 내리거나 차단하는 순간
 * 앱의 배경이 통째로 사라집니다. 그래서 기본값은 네트워크 요청이 전혀 없는
 * 인라인 SVG로 두었습니다. 벡터라 어떤 해상도에서도 선명하고 용량 부담도 없습니다.
 *
 * 직접 만든 나무 이미지를 쓰려면 `npm run tree -- <이미지>` 한 줄이면 됩니다.
 * (자세한 내용은 README의 "나무 이미지 교체하기")
 *
 * 좌표계는 1440x1080(4:3, 무대와 동일)이고, 걱정 괴물이 매달리는 타원
 * (DEFAULT_TREE_SHAPE.canopy)을 나뭇잎이 넉넉히 덮도록 그렸습니다.
 */

const { canopy } = DEFAULT_TREE_SHAPE;
// 무대와 같은 4:3. 비율이 같으므로 잘리는 부분 없이 그대로 들어맞습니다.
const W = 1440;
const H = 1080;

/**
 * 나뭇잎 뭉치 하나. [중심x%, 중심y%, 반지름(가로 %기준)]
 * 반지름은 가로 기준이라 세로로는 4/3배로 커집니다. 프레임 위로 잘리지 않도록
 * 세로 방향 여유를 계산해서 배치했습니다.
 */
const BLOBS: Array<[number, number, number]> = [
  [50, 36, 20],
  [28, 41, 15],
  [72, 41, 15],
  [36, 24, 13],
  [65, 24, 12],
  [15, 38, 11],
  [85, 38, 11],
  [50, 19, 11],
  [24, 52, 11],
  [76, 52, 11],
];

const toX = (pct: number) => (pct / 100) * W;
const toY = (pct: number) => (pct / 100) * H;
const toR = (pct: number) => (pct / 100) * W;

const Canopy: React.FC<{ fill: string; dx?: number; dy?: number; scale?: number }> = ({
  fill,
  dx = 0,
  dy = 0,
  scale = 1,
}) => (
  <g fill={fill}>
    {BLOBS.map(([x, y, r], i) => (
      <circle key={i} cx={toX(x) + dx} cy={toY(y) + dy} r={toR(r) * scale} />
    ))}
  </g>
);

const TreeIllustration: React.FC = () => (
  <svg
    viewBox={`0 0 ${W} ${H}`}
    preserveAspectRatio="xMidYMax meet"
    className="w-full h-full"
    role="img"
    aria-label="걱정을 매다는 나무"
  >
    {/* 땅 */}
    <ellipse cx={W / 2} cy={H - 26} rx={W * 0.26} ry={26} fill="#8fce7a" />

    {/* 줄기와 뿌리 */}
    <g fill="#a9713f">
      <path
        d={`M${W / 2 - 88} ${toY(48)}
            q-14 ${H * 0.28} -46 ${H * 0.4}
            q-14 16 8 18 h${252} q22 -2 8 -18
            q-32 ${-H * 0.12} -46 ${-H * 0.4} z`}
      />
      {/* 굵은 가지 */}
      <path d={`M${W / 2 - 40} ${toY(52)} q-120 -70 -186 -168 q-12 -20 10 -28 q20 -6 30 12 q56 92 156 150 z`} />
      <path d={`M${W / 2 + 40} ${toY(52)} q118 -74 176 -176 q12 -20 32 -12 q20 10 8 30 q-64 108 -186 178 z`} />
    </g>
    {/* 줄기 결 */}
    <g stroke="#8d5a30" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.5">
      <path d={`M${W / 2 - 30} ${toY(62)} q-10 ${H * 0.16} -24 ${H * 0.24}`} />
      <path d={`M${W / 2 + 26} ${toY(64)} q10 ${H * 0.14} 22 ${H * 0.22}`} />
    </g>

    {/* 나뭇잎 – 뒤쪽 짙은 층 */}
    <Canopy fill="#3f8a3c" dy={34} scale={1.04} />
    <Canopy fill="#4f9e46" dy={22} scale={1.02} />
    {/* 나뭇잎 – 앞쪽 밝은 층 */}
    <Canopy fill="#6cbb52" />
    {/* 햇빛이 닿는 윗면 */}
    <g fill="#9fd35f" opacity="0.3">
      <circle cx={toX(43)} cy={toY(25)} r={toR(5)} />
      <circle cx={toX(56)} cy={toY(21)} r={toR(3.5)} />
    </g>

    {/* 바람에 날리는 잎 몇 장 */}
    <g fill="#7cc457">
      <ellipse cx={toX(canopy.cx - 42)} cy={toY(30)} rx={16} ry={10} transform={`rotate(-25 ${toX(canopy.cx - 42)} ${toY(30)})`} />
      <ellipse cx={toX(canopy.cx + 43)} cy={toY(26)} rx={14} ry={9} transform={`rotate(20 ${toX(canopy.cx + 43)} ${toY(26)})`} />
      <ellipse cx={toX(canopy.cx + 45)} cy={toY(46)} rx={12} ry={8} transform={`rotate(-15 ${toX(canopy.cx + 45)} ${toY(46)})`} />
    </g>
  </svg>
);

export default TreeIllustration;

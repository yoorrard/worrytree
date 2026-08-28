import React from 'react';

/**
 * 기본 나무 그림.
 *
 * 외부 이미지를 핫링크하면 상대 사이트가 이미지를 내리거나 차단하는 순간
 * 앱의 배경이 통째로 사라집니다. 그래서 기본값은 네트워크 요청이 전혀 없는
 * 인라인 SVG로 두었습니다. 벡터라 어떤 해상도에서도 선명하고 용량 부담도 없습니다.
 *
 * 직접 만든 나무 이미지를 쓰고 싶다면 `assets/tree.*` 에 넣어주세요.
 * (자세한 방법은 README의 "나무 이미지 교체하기" 참고)
 *
 * 좌표계는 300x400(3:4)이며, 걱정 괴물이 매달리는 영역인
 * 가로 8~88% / 세로 12~58% 를 나뭇잎이 충분히 덮도록 그렸습니다.
 */
const TreeIllustration: React.FC = () => (
  <svg
    viewBox="0 0 300 400"
    preserveAspectRatio="xMidYMax meet"
    className="w-full h-full"
    role="img"
    aria-label="걱정을 매다는 나무"
  >
    {/* 땅 */}
    <ellipse cx="150" cy="388" rx="112" ry="14" fill="#8fce7a" />

    {/* 줄기와 가지 */}
    <g fill="#7d5636">
      <path d="M133 250 q-4 70 -14 108 q-2 8 6 10 h50 q8 -2 6 -10 q-10 -38 -14 -108 z" />
      <path d="M146 268 q-26 -18 -40 -44 q-3 -6 3 -9 q6 -3 9 3 q12 22 34 38 z" />
      <path d="M158 262 q24 -20 34 -46 q3 -6 9 -3 q6 3 3 9 q-12 28 -40 50 z" />
    </g>
    {/* 줄기 그림자 (입체감) */}
    <path d="M155 250 q4 70 12 108 q2 8 -6 10 h-8 q8 -2 6 -10 q-8 -38 -10 -108 z" fill="#6a462a" opacity="0.22" />

    {/* 나뭇잎 – 뒤쪽 어두운 층 */}
    <g fill="#4e9c50">
      <circle cx="150" cy="158" r="108" />
      <circle cx="70" cy="182" r="70" />
      <circle cx="230" cy="182" r="70" />
      <circle cx="104" cy="92" r="62" />
      <circle cx="198" cy="90" r="58" />
      <circle cx="42" cy="140" r="44" />
      <circle cx="258" cy="140" r="44" />
    </g>

    {/* 나뭇잎 – 앞쪽 밝은 층 */}
    <g fill="#69bd60">
      <circle cx="146" cy="148" r="98" />
      <circle cx="70" cy="170" r="60" />
      <circle cx="226" cy="170" r="60" />
      <circle cx="104" cy="86" r="53" />
      <circle cx="194" cy="84" r="49" />
      <circle cx="48" cy="132" r="36" />
      <circle cx="252" cy="132" r="36" />
    </g>

    {/* 햇빛이 닿는 하이라이트 */}
    <g fill="#8ed97e" opacity="0.35">
      <circle cx="112" cy="70" r="26" />
      <circle cx="160" cy="56" r="16" />
    </g>
  </svg>
);

export default TreeIllustration;

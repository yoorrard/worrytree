import React from 'react';
import { Worry, FALL_DURATION_MS, MONSTER_SIZE_CSS } from '../types';
import { canopy } from '../services/treeShape';
import { MonsterIcon } from './icons';

interface WorryMonsterProps {
  worry: Worry;
  isComfortingMode: boolean;
  onClick: (worry: Worry) => void;
}

/**
 * 레이어를 3겹으로 나눈 이유:
 *  - 바깥: 무대 위 위치와 크기. transform은 가운데 정렬 전용으로만 씁니다.
 *  - 가운데: 매달려 흔들리는 CSS 애니메이션(animate-hang).
 *  - 안쪽: 걱정마다 다른 고유 기울기와 떨어질 때의 회전.
 *
 * 예전에는 셋을 한 요소에 몰아넣어서, CSS 애니메이션이 인라인 transform보다
 * 우선순위가 높은 탓에 걱정마다 저장해둔 기울기가 화면에 전혀 반영되지 않았습니다.
 */
const WorryMonster: React.FC<WorryMonsterProps> = ({ worry, isComfortingMode, onClick }) => {
  const isClickable = isComfortingMode && !worry.isFalling;

  // 나무가 화면 밖으로 넘칠 때는 괴물이 잘리지 않도록 가로 위치를 나뭇잎 중심
  // 쪽으로 모읍니다(--canopy-squeeze). 넘치지 않으면 1이라 원래 자리 그대로입니다.
  const offsetFromCenter = worry.position.left - canopy.cx;
  const left = `calc(${canopy.cx}% + var(--canopy-squeeze, 1) * ${offsetFromCenter}%)`;

  const positionStyle: React.CSSProperties = {
    top: worry.isFalling ? '125%' : `${worry.position.top}%`,
    left,
    // 좌표가 괴물의 '중심'을 가리키도록 맞춥니다. 나뭇잎 가장자리에 매달린
    // 괴물이 잘리지 않습니다.
    transform: 'translate(-50%, -50%)',
    // 크기를 px로 고정하면 큰 화면에서는 나무에 비해 점처럼 작아지고
    // 작은 화면에서는 나무를 뒤덮습니다. 무대 폭에 비례시키되
    // 손가락으로 누를 수 있는 최소 크기는 지킵니다.
    width: MONSTER_SIZE_CSS,
    aspectRatio: '1',
    opacity: worry.isFalling ? 0 : 1,
    transition: `top ${FALL_DURATION_MS}ms ease-in, opacity ${FALL_DURATION_MS}ms ease-in`,
  };

  const tiltStyle: React.CSSProperties = {
    transform: worry.isFalling
      ? `rotate(${worry.position.rotate + 180}deg) scale(0.5)`
      : `rotate(${worry.position.rotate}deg)`,
    transition: `transform ${FALL_DURATION_MS}ms ease-in-out`,
  };

  const handleClick = () => {
    if (isClickable) onClick(worry);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isClickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(worry);
    }
  };

  // 클릭은 둥근 몸통만 받습니다. 바깥 두 겹은 네모난 상자라서, 괴물끼리 겹치면
  // 앞쪽 괴물의 투명한 모서리가 뒤쪽 괴물의 클릭을 가로채 위로할 수 없는 걱정이
  // 생겼습니다. 바깥 겹은 클릭을 통과시키고, 둥근 몸통(rounded-full)만 받게 합니다.
  return (
    <div className="absolute z-20 group animate-fadeIn pointer-events-none" style={positionStyle}>
      <div className={`w-full h-full ${worry.isFalling ? '' : 'animate-hang'}`}>
        <div
          style={tiltStyle}
          className={`relative w-full h-full rounded-full pointer-events-auto transition-transform duration-300 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-green-600 ${
            isClickable ? 'cursor-pointer group-hover:scale-110' : ''
          }`}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : undefined}
          aria-label={isClickable ? `걱정 "${worry.text}" 위로하기` : undefined}
        >
          {/* 그림은 네모난 SVG라 모서리가 클릭을 가로채지 않도록 통과시킵니다. */}
          <div className="w-full h-full pointer-events-none">
            <MonsterIcon color={worry.color} />
          </div>
          {isClickable && (
            <div
              className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none"
              style={{ filter: 'blur(10px)' }}
            />
          )}
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-max max-w-[160px] p-2 bg-white bg-opacity-95 text-slate-700 text-xs rounded-lg shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none truncate">
            {worry.text}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorryMonster;

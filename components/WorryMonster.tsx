import React from 'react';
import { Worry } from '../types';
import { MonsterIcon } from './icons';

interface WorryMonsterProps {
  worry: Worry;
  isComfortingMode: boolean;
  onClick: (worry: Worry) => void;
}

const WorryMonster: React.FC<WorryMonsterProps> = ({ worry, isComfortingMode, onClick }) => {
  const monsterStyle: React.CSSProperties = {
    top: worry.isFalling ? '110%' : worry.position.top,
    left: worry.position.left,
    transform: worry.isFalling ? `translateY(200px) rotate(180deg) scale(0.5)` : worry.position.transform,
    transition: 'top 2s ease-in, opacity 2s ease-in, transform 2s ease-in-out',
    opacity: worry.isFalling ? 0 : 1,
  };

  const handleClick = () => {
    onClick(worry);
  };

  return (
    <div
      className={`absolute z-20 w-16 h-16 md:w-20 md:h-20 flex flex-col items-center group animate-fadeIn ${worry.isFalling ? '' : 'animate-hang'}`}
      style={monsterStyle}
      onClick={handleClick}
    >
      <div 
        className={`relative w-full h-full transition-transform duration-300 ease-in-out ${isComfortingMode && !worry.isFalling ? 'cursor-pointer group-hover:scale-110' : ''}`}
      >
        <MonsterIcon color={worry.color} />
        {isComfortingMode && !worry.isFalling && (
            <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{filter: 'blur(10px)'}}></div>
        )}
      </div>
      <div className="absolute -bottom-6 w-max max-w-[150px] p-2 bg-white bg-opacity-90 text-slate-700 text-xs rounded-lg shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none truncate">
        {worry.text}
      </div>
    </div>
  );
};

export default WorryMonster;
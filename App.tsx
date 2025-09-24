import React, { useState, useCallback } from 'react';
import { Worry } from './types';
import WorryTree from './components/WorryTree';
import WorryMonster from './components/WorryMonster';
import WorryInput from './components/WorryInput';
import ComfortModal from './components/ComfortModal';

const monsterColors = [
    '#ff7b7b', '#ffb07b', '#ffd97b', '#a6ff7b',
    '#7bffb0', '#7bffff', '#7ba6ff', '#b07bff', '#ff7bff'
];

const App: React.FC = () => {
  const [worries, setWorries] = useState<Worry[]>([]);
  const [isComfortingMode, setIsComfortingMode] = useState<boolean>(false);
  const [selectedWorry, setSelectedWorry] = useState<Worry | null>(null);

  const handleAddWorry = useCallback((text: string) => {
    const newWorry: Worry = {
      id: Date.now(),
      text,
      isFalling: false,
      position: {
        top: `${Math.random() * 45 + 15}%`,
        left: `${Math.random() * 80 + 10}%`,
        transform: `rotate(${Math.random() * 30 - 15}deg)`
      },
      color: monsterColors[Math.floor(Math.random() * monsterColors.length)]
    };
    setWorries(prev => [...prev, newWorry]);
  }, []);

  const handleToggleComfortMode = () => {
    setIsComfortingMode(prev => !prev);
  };

  const handleMonsterClick = (worry: Worry) => {
    if (isComfortingMode && !worry.isFalling) {
      setSelectedWorry(worry);
    }
  };

  const handleCloseModal = () => {
    setSelectedWorry(null);
  };

  const handleConfirmComfort = (worryId: number) => {
    setWorries(prevWorries =>
      prevWorries.map(w =>
        w.id === worryId ? { ...w, isFalling: true } : w
      )
    );
    handleCloseModal();

    setTimeout(() => {
      setWorries(prevWorries => prevWorries.filter(w => w.id !== worryId));
    }, 2000); // Corresponds to animation duration
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-sky-100 text-slate-800 flex items-center justify-center">
      <WorryTree>
        {worries.map(worry => (
          <WorryMonster
            key={worry.id}
            worry={worry}
            isComfortingMode={isComfortingMode}
            onClick={handleMonsterClick}
          />
        ))}
      </WorryTree>

      <div className="absolute top-0 left-0 p-6 md:p-8 z-20">
        <h1 className="text-3xl md:text-5xl font-bold text-green-800">
          걱정 나무
        </h1>
        <p className="text-sm md:text-lg text-green-700 mt-2">
          {isComfortingMode ? "위로하고 싶은 걱정 괴물을 눌러주세요." : "당신의 걱정을 나무에 매달아보세요."}
        </p>
      </div>

      <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-20 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-sky-100 via-sky-100/90 to-transparent">
        <WorryInput onAddWorry={handleAddWorry} disabled={isComfortingMode} />
        <button
          onClick={handleToggleComfortMode}
          className="px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
          disabled={worries.length === 0}
        >
          {isComfortingMode ? '걱정 추가하기' : '위로하기'}
        </button>
      </div>
      
      {selectedWorry && (
        <ComfortModal
          worry={selectedWorry}
          onClose={handleCloseModal}
          onConfirm={handleConfirmComfort}
        />
      )}
    </main>
  );
};

export default App;
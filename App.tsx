import React, { useState, useCallback, useEffect } from 'react';
import pako from 'pako';
import { Worry } from './types';
import WorryTree from './components/WorryTree';
import WorryMonster from './components/WorryMonster';
import WorryInput from './components/WorryInput';
import ComfortModal from './components/ComfortModal';
import ShareModal from './components/ShareModal';

const monsterColors = [
    '#ff7b7b', '#ffb07b', '#ffd97b', '#a6ff7b',
    '#7bffb0', '#7bffff', '#7ba6ff', '#b07bff', '#ff7bff'
];

const App: React.FC = () => {
  const [worries, setWorries] = useState<Worry[]>([]);
  const [isComfortingMode, setIsComfortingMode] = useState<boolean>(false);
  const [selectedWorry, setSelectedWorry] = useState<Worry | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);

  useEffect(() => {
    const loadSharedWorries = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const treeData = params.get('tree');
        if (treeData) {
          const decodedData = decodeURIComponent(treeData);
          const binaryString = atob(decodedData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }

          const decodedJson = pako.inflate(bytes, { to: 'string' });
          
          const initialWorries = JSON.parse(decodedJson);
          setWorries(initialWorries);
          setIsComfortingMode(true);
          setIsSharedView(true);
        }
      } catch (error) {
        console.error("Failed to parse shared worries:", error);
        alert("걱정 나무를 불러오는 데 실패했습니다. 링크가 올바른지 확인해주세요.");
        setWorries([]);
      }
    };

    loadSharedWorries();
  }, []);


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
          {isSharedView ? "친구가 남긴 걱정들을 위로해주세요." : isComfortingMode ? "위로하고 싶은 걱정 괴물을 눌러주세요." : "당신의 걱정을 나무에 매달아보세요."}
        </p>
      </div>
      
      {!isSharedView && (
        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-20 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-sky-100 via-sky-100/90 to-transparent">
          <WorryInput onAddWorry={handleAddWorry} disabled={isComfortingMode} />
          <div className="flex gap-4">
            <button
              onClick={handleToggleComfortMode}
              className="px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
              disabled={worries.length === 0}
            >
              {isComfortingMode ? '걱정 추가하기' : '위로하기'}
            </button>
             <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white focus:ring-blue-300"
              disabled={worries.length === 0}
            >
              공유하기
            </button>
          </div>
        </div>
      )}
      
      {selectedWorry && (
        <ComfortModal
          worry={selectedWorry}
          onClose={handleCloseModal}
          onConfirm={handleConfirmComfort}
        />
      )}
      
      {isShareModalOpen && (
        <ShareModal
          worries={worries}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </main>
  );
};

export default App;
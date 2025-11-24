import React, { useState, useCallback, useEffect } from 'react';
import { Worry, monsterColors } from './types';
import WorryTree from './components/WorryTree';
import WorryMonster from './components/WorryMonster';
import WorryInput from './components/WorryInput';
import ComfortModal from './components/ComfortModal';
import ShareModal from './components/ShareModal';
import Celebration from './components/Celebration';
import WorrySummary from './components/WorrySummary';
import LZString from 'lz-string';

interface ClearedWorry {
  worryText: string;
  comfortText: string;
}

const App: React.FC = () => {
  const [worries, setWorries] = useState<Worry[]>([]);
  const [clearedWorries, setClearedWorries] = useState<ClearedWorry[]>([]);
  const [isComfortingMode, setIsComfortingMode] = useState<boolean>(false);
  const [selectedWorry, setSelectedWorry] = useState<Worry | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [allWorriesCleared, setAllWorriesCleared] = useState(false);

  useEffect(() => {
    const loadSharedWorries = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const dataParam = params.get('data');
        const worryId = params.get('worryId');
        const store = params.get('store');

        let simplifiedWorries: any[] | null = null;

        if (dataParam) {
           // New method: Decompress from URL
           try {
               const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
               if (decompressed) {
                   simplifiedWorries = JSON.parse(decompressed);
               }
           } catch (e) {
               console.error("Failed to decompress data", e);
           }
        } else if (worryId) {
          // Legacy method: Fetch from store
          let response;
          if (store === 'kv') {
            const bucket = 'worry-tree-app-v1';
            response = await fetch(`https://kvstore.io/api/${bucket}/${worryId}`);
          } else {
            response = await fetch(`https://jsonblob.com/api/jsonBlob/${worryId}`);
          }
          
          if (!response.ok) {
            throw new Error('Failed to fetch worry data.');
          }
          simplifiedWorries = await response.json();
        }

        if (simplifiedWorries) {
          const initialWorries: Worry[] = simplifiedWorries.map((w: any[]) => ({
            id: w[0],
            text: w[1],
            position: {
              top: `${w[2]}%`,
              left: `${w[3]}%`,
              transform: `rotate(${w[4]}deg)`,
            },
            color: monsterColors[w[5]] || monsterColors[0],
            isFalling: false,
          }));

          setWorries(initialWorries);
          setIsComfortingMode(true);
          setIsSharedView(true);
        }
      } catch (error) {
        console.error("Failed to parse shared worries:", error);
        alert("걱정 나무를 불러오는 데 실패했습니다. 링크가 올바르지 않거나 만료되었을 수 있습니다.");
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
    if (allWorriesCleared) {
      setAllWorriesCleared(false);
      setClearedWorries([]);
      setIsComfortingMode(false);
    } else {
      setIsComfortingMode(prev => !prev);
    }
  };

  const handleMonsterClick = (worry: Worry) => {
    if (isComfortingMode && !worry.isFalling) {
      setSelectedWorry(worry);
    }
  };

  const handleCloseModal = () => {
    setSelectedWorry(null);
  };

  const handleConfirmComfort = (worryId: number, comfortText: string) => {
    const worryToClear = worries.find(w => w.id === worryId);
    if (worryToClear) {
      setClearedWorries(prev => [...prev, { worryText: worryToClear.text, comfortText }]);
    }
    
    setWorries(prevWorries =>
      prevWorries.map(w =>
        w.id === worryId ? { ...w, isFalling: true } : w
      )
    );
    handleCloseModal();

    setTimeout(() => {
      setWorries(prevWorries => {
        const newWorries = prevWorries.filter(w => w.id !== worryId);
        if (newWorries.length === 0 && prevWorries.length > 0) {
          setAllWorriesCleared(true);
        }
        return newWorries;
      });
    }, 2000); // Corresponds to animation duration
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-sky-100 text-slate-800 flex items-center justify-center">
      {allWorriesCleared && (
        <>
          <Celebration />
          <WorrySummary 
            clearedWorries={clearedWorries} 
            isSharedView={isSharedView}
            onClose={() => {
                setAllWorriesCleared(false);
                setClearedWorries([]);
                if (!isSharedView) {
                    setIsComfortingMode(false);
                }
            }}
          />
        </>
      )}

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
          {allWorriesCleared ? "모든 걱정을 해결했어요! 정말 대단해요! 🎉" : isSharedView ? "친구가 남긴 걱정들을 위로해주세요." : isComfortingMode ? "위로하고 싶은 걱정 괴물을 눌러주세요." : "당신의 걱정을 나무에 매달아보세요."}
        </p>
      </div>
      
      {!isSharedView && !allWorriesCleared && (
        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-20 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-sky-100 via-sky-100/90 to-transparent">
          <WorryInput onAddWorry={handleAddWorry} disabled={isComfortingMode || allWorriesCleared} />
          <div className="flex gap-4">
            <button
              onClick={handleToggleComfortMode}
              className="px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
              disabled={worries.length === 0 && !allWorriesCleared}
            >
              {isComfortingMode || allWorriesCleared ? '걱정 추가하기' : '위로하기'}
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
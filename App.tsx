import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Worry, ClearedWorry, FALL_DURATION_MS } from './types';
import {
  createWorry,
  decodeLegacySharedWorries,
  decodeSharedWorries,
  fetchLegacySharedWorries,
  getAppBaseUrl,
  sanitizeWorryText,
  ShareLinkError,
} from './services/shareLink';
import WorryTree from './components/WorryTree';
import WorryMonster from './components/WorryMonster';
import WorryInput from './components/WorryInput';
import ComfortModal from './components/ComfortModal';
import ShareModal from './components/ShareModal';
import Celebration from './components/Celebration';
import WorrySummary from './components/WorrySummary';
import ShareLinkErrorNotice from './components/ShareLinkErrorNotice';

const App: React.FC = () => {
  const [worries, setWorries] = useState<Worry[]>([]);
  const [clearedWorries, setClearedWorries] = useState<ClearedWorry[]>([]);
  const [isComfortingMode, setIsComfortingMode] = useState<boolean>(false);
  const [selectedWorry, setSelectedWorry] = useState<Worry | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [allWorriesCleared, setAllWorriesCleared] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 낙하 애니메이션 타이머. 언마운트될 때 정리하지 않으면 사라진 컴포넌트의
  // 상태를 갱신하려 시도하게 됩니다.
  const fallTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => () => {
    fallTimers.current.forEach(clearTimeout);
    fallTimers.current.clear();
  }, []);

  /** 주소창의 공유 파라미터를 지우고 빈 나무로 되돌립니다. */
  const startOwnTree = useCallback(() => {
    window.history.replaceState(null, '', getAppBaseUrl());
    setWorries([]);
    setClearedWorries([]);
    setSelectedWorry(null);
    setIsComfortingMode(false);
    setIsSharedView(false);
    setAllWorriesCleared(false);
    setLoadError(null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('d');
    const legacyData = params.get('data');
    const worryId = params.get('worryId');

    // 공유 링크로 들어온 게 아니면 그냥 내 나무를 시작합니다.
    if (!shared && !legacyData && !worryId) return;

    let cancelled = false;
    setIsLoadingShared(true);

    (async () => {
      try {
        const loaded = shared
          ? decodeSharedWorries(shared)
          : legacyData
            ? decodeLegacySharedWorries(legacyData)
            : await fetchLegacySharedWorries(worryId as string, params.get('store'));

        if (cancelled) return;
        setWorries(loaded);
        setIsComfortingMode(true);
        setIsSharedView(true);
      } catch (error) {
        if (cancelled) return;
        // 예전에는 여기서 console.error만 하고 끝나 사용자에게는 텅 빈 나무만
        // 보였습니다. 이제 무엇이 잘못됐는지 화면에 알려주고 빠져나갈 길을 줍니다.
        console.error('공유된 걱정 나무를 불러오지 못했습니다:', error);
        setLoadError(
          error instanceof ShareLinkError
            ? error.message
            : '걱정 나무를 불러오는 데 실패했어요.',
        );
      } finally {
        if (!cancelled) setIsLoadingShared(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 마지막 걱정이 떨어지고 나면 축하 화면을 띄웁니다.
  useEffect(() => {
    if (worries.length === 0 && clearedWorries.length > 0) {
      setAllWorriesCleared(true);
    }
  }, [worries.length, clearedWorries.length]);

  const handleAddWorry = useCallback((rawText: string) => {
    const text = sanitizeWorryText(rawText);
    if (!text) return;
    setWorries(prev => {
      // 자리와 색은 본문에서 계산합니다. 같은 걱정을 또 적으면 겹치지 않도록
      // 몇 번째인지를 함께 넘깁니다.
      const duplicateIndex = prev.filter(w => w.text === text).length;
      return [...prev, createWorry(text, duplicateIndex)];
    });
  }, []);

  const handleMonsterClick = (worry: Worry) => {
    if (isComfortingMode && !worry.isFalling) {
      setSelectedWorry(worry);
    }
  };

  const handleConfirmComfort = (worryId: string, comfortText: string) => {
    const worryToClear = worries.find(w => w.id === worryId);
    if (!worryToClear) return;

    setClearedWorries(prev => [
      ...prev,
      { worryText: worryToClear.text, comfortText, color: worryToClear.color },
    ]);
    setWorries(prev => prev.map(w => (w.id === worryId ? { ...w, isFalling: true } : w)));
    setSelectedWorry(null);

    const timer = setTimeout(() => {
      fallTimers.current.delete(timer);
      setWorries(prev => prev.filter(w => w.id !== worryId));
    }, FALL_DURATION_MS);
    fallTimers.current.add(timer);
  };

  const closeSummary = () => {
    setAllWorriesCleared(false);
    setClearedWorries([]);
    if (!isSharedView) {
      setIsComfortingMode(false);
    }
  };

  const headline = allWorriesCleared
    ? '모든 걱정을 해결했어요! 정말 대단해요! 🎉'
    : isSharedView
      ? '친구가 남긴 걱정들을 위로해주세요.'
      : isComfortingMode
        ? '위로하고 싶은 걱정 괴물을 눌러주세요.'
        : '당신의 걱정을 나무에 매달아보세요.';

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-sky-100 text-slate-800 flex items-center justify-center">
      {allWorriesCleared && (
        <>
          <Celebration />
          <WorrySummary
            clearedWorries={clearedWorries}
            isSharedView={isSharedView}
            onClose={closeSummary}
            onStartOwnTree={startOwnTree}
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
        <h1 className="text-3xl md:text-5xl font-bold text-green-800">걱정 나무</h1>
        <p className="text-sm md:text-lg text-green-700 mt-2">
          {isLoadingShared ? '친구의 걱정 나무를 불러오는 중이에요...' : headline}
        </p>
      </div>

      {!isSharedView && !allWorriesCleared && (
        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-20 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-sky-100 via-sky-100/90 to-transparent">
          <WorryInput onAddWorry={handleAddWorry} disabled={isComfortingMode} />
          <div className="flex gap-4">
            <button
              onClick={() => setIsComfortingMode(prev => !prev)}
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

      {/* 친구의 나무를 보고 있을 때도 언제든 내 나무를 시작할 수 있어야 합니다. */}
      {isSharedView && !allWorriesCleared && (
        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-20 flex justify-center bg-gradient-to-t from-sky-100 via-sky-100/90 to-transparent">
          <button
            onClick={startOwnTree}
            className="px-6 py-3 rounded-full text-base font-semibold bg-white/90 text-green-800 border border-green-300 shadow-lg transition-all duration-300 hover:bg-white hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-opacity-50"
          >
            나도 걱정 나무 만들기
          </button>
        </div>
      )}

      {loadError && (
        <ShareLinkErrorNotice message={loadError} onStartOwnTree={startOwnTree} />
      )}

      {selectedWorry && (
        <ComfortModal
          worry={selectedWorry}
          onClose={() => setSelectedWorry(null)}
          onConfirm={handleConfirmComfort}
        />
      )}

      {isShareModalOpen && (
        <ShareModal worries={worries} onClose={() => setIsShareModalOpen(false)} />
      )}
    </main>
  );
};

export default App;

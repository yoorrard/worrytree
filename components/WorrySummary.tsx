import React, { useCallback, useEffect, useState } from 'react';
import { ClearedWorry } from '../types';
import { renderComfortImages, saveImages } from '../services/comfortImage';
import { customTreeSrc } from '../services/treeShape';

interface WorrySummaryProps {
  clearedWorries: ClearedWorry[];
  isSharedView: boolean;
  onClose: () => void;
  onStartOwnTree: () => void;
}

type ImageState =
  | { status: 'preparing' }
  | { status: 'ready'; files: File[] }
  | { status: 'error' };

type Notice = { tone: 'info' | 'error'; text: string } | null;

const WorrySummary: React.FC<WorrySummaryProps> = ({
  clearedWorries,
  isSharedView,
  onClose,
  onStartOwnTree,
}) => {
  const [image, setImage] = useState<ImageState>({ status: 'preparing' });
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // 이미지는 화면이 열리자마자 미리 만들어 둡니다.
  // 휴대폰의 공유 시트는 버튼을 누른 직후에만 열 수 있어서, 누른 뒤에 이미지를
  // 그리느라 시간을 쓰면 브라우저가 공유를 막아버립니다.
  const prepare = useCallback(() => {
    let cancelled = false;
    setImage({ status: 'preparing' });
    renderComfortImages({ items: clearedWorries, isSharedView, treeSrc: customTreeSrc })
      .then(files => {
        if (!cancelled) setImage({ status: 'ready', files });
      })
      .catch(error => {
        console.error('위로 기록 이미지를 만들지 못했습니다:', error);
        if (!cancelled) setImage({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [clearedWorries, isSharedView]);

  useEffect(prepare, [prepare]);

  const handleSave = async () => {
    if (image.status === 'error') {
      setNotice(null);
      prepare();
      return;
    }
    if (image.status !== 'ready') return;

    setIsSaving(true);
    setNotice(null);
    try {
      const result = await saveImages(image.files);
      if (result === 'downloaded') {
        setNotice({
          tone: 'info',
          text:
            image.files.length > 1
              ? `이미지 ${image.files.length}장을 저장했어요. 다운로드 폴더를 확인해보세요.`
              : '이미지를 저장했어요. 다운로드 폴더를 확인해보세요.',
        });
      }
    } catch (error) {
      console.error('위로 기록 이미지를 저장하지 못했습니다:', error);
      setNotice({ tone: 'error', text: '이미지를 저장하지 못했어요. 잠시 후 다시 시도해주세요.' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveLabel =
    image.status === 'preparing'
      ? '이미지 준비 중...'
      : image.status === 'error'
        ? '이미지 다시 만들기'
        : isSaving
          ? '저장하는 중...'
          : '이미지로 저장하기';

  return (
    <div
      className="fixed inset-0 bg-sky-100/80 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="위로 기록"
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl border border-green-300 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-green-800 mb-2">
          모든 걱정을 해결했어요!
        </h2>
        <p className="text-slate-600 mb-6">
          {isSharedView
            ? '친구의 걱정을 모두 위로해줬어요. 고마워요!'
            : '당신이 보낸 따뜻한 위로를 확인해보세요.'}
        </p>

        <div className="max-h-[50vh] overflow-y-auto space-y-4 bg-slate-50 p-4 rounded-lg text-left">
          {clearedWorries.map((item, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 break-words"
            >
              <p className="text-sm text-slate-500">걱정:</p>
              <p className="font-semibold text-slate-800 mb-2">"{item.worryText}"</p>
              <hr className="my-2 border-slate-200" />
              <p className="text-sm text-green-600">따뜻한 위로:</p>
              <p className="font-semibold text-green-800 whitespace-pre-line">"{item.comfortText}"</p>
            </div>
          ))}
        </div>

        {image.status === 'error' && !notice && (
          <p className="mt-4 text-sm text-rose-600 bg-rose-50 rounded-xl py-2 px-3">
            이미지를 만들지 못했어요. 아래 버튼으로 다시 시도해주세요.
          </p>
        )}
        {notice && (
          <p
            className={`mt-4 text-sm rounded-xl py-2 px-3 ${
              notice.tone === 'error' ? 'text-rose-600 bg-rose-50' : 'text-green-700 bg-green-50'
            }`}
            role="status"
          >
            {notice.text}
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={isSharedView ? onStartOwnTree : onClose}
            className="px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
          >
            {/* 친구의 나무를 다 위로하고 나면 갈 곳이 없어 빈 화면에 갇혔었습니다. */}
            {isSharedView ? '나도 걱정 나무 만들기' : '새로운 걱정 추가하기'}
          </button>
          <button
            onClick={handleSave}
            disabled={image.status === 'preparing' || isSaving}
            className="px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white focus:ring-indigo-300"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorrySummary;

import React from 'react';

interface ClearedWorry {
  worryText: string;
  comfortText: string;
}

interface WorrySummaryProps {
  clearedWorries: ClearedWorry[];
  isSharedView: boolean;
  onClose: () => void;
}

const WorrySummary: React.FC<WorrySummaryProps> = ({ clearedWorries, isSharedView, onClose }) => {
  return (
    <div className="fixed inset-0 bg-sky-100/80 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl border border-green-300 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-green-800 mb-2">모든 걱정을 해결했어요!</h2>
        <p className="text-slate-600 mb-6">{isSharedView ? "친구의 걱정을 모두 위로해줬어요. 고마워요!" : "당신이 보낸 따뜻한 위로를 확인해보세요."}</p>
        
        <div className="max-h-[50vh] overflow-y-auto space-y-4 bg-slate-50 p-4 rounded-lg text-left">
          {clearedWorries.map((item, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">걱정:</p>
              <p className="font-semibold text-slate-800 mb-2">"{item.worryText}"</p>
              <hr className="my-2 border-slate-200" />
              <p className="text-sm text-green-600">따뜻한 위로:</p>
              <p className="font-semibold text-green-800">"{item.comfortText}"</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-8 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
        >
          {isSharedView ? '닫기' : '새로운 걱정 추가하기'}
        </button>
      </div>
    </div>
  );
};

export default WorrySummary;

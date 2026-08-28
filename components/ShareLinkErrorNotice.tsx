import React from 'react';

interface ShareLinkErrorNoticeProps {
  message: string;
  onStartOwnTree: () => void;
}

/**
 * 공유 링크를 불러오지 못했을 때 보여주는 안내.
 *
 * 예전에는 실패해도 console에만 기록돼서 사용자는 아무 설명 없이 텅 빈 나무만
 * 봤습니다. 무엇이 잘못됐는지 알려주고, 곧바로 자기 나무를 시작할 수 있게 합니다.
 * (alert 대신 화면 안에서 처리해 다른 모달들과 톤을 맞췄습니다.)
 */
const ShareLinkErrorNotice: React.FC<ShareLinkErrorNoticeProps> = ({ message, onStartOwnTree }) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm"
    role="alertdialog"
    aria-modal="true"
    aria-label="공유 링크 오류"
  >
    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-green-100 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">🌱</div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">걱정 나무를 못 찾았어요</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-6">
        {message}
        <br />
        대신 나만의 걱정 나무를 시작해볼까요?
      </p>
      <button
        onClick={onStartOwnTree}
        className="w-full px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
      >
        내 걱정 나무 만들기
      </button>
    </div>
  </div>
);

export default ShareLinkErrorNotice;

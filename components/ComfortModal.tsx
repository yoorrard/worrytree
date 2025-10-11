import React, { useState } from 'react';
import { Worry } from '../types';
import { generateComfortingMessage } from '../services/geminiService';

interface ComfortModalProps {
  worry: Worry;
  onClose: () => void;
  onConfirm: (worryId: number) => void;
}

const ComfortModal: React.FC<ComfortModalProps> = ({ worry, onClose, onConfirm }) => {
  const [comfortingMessage, setComfortingMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleConfirm = () => {
    onConfirm(worry.id);
  };
  
  const handleGenerateComfort = async () => {
    setIsGenerating(true);
    setComfortingMessage("따뜻한 위로를 찾고 있어요...");
    const message = await generateComfortingMessage(worry.text);
    setComfortingMessage(message);
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md border border-green-300">
        <div className="text-center">
          <p className="text-sm text-green-600">당신의 걱정</p>
          <h2 className="text-xl md:text-2xl font-bold mt-1 mb-4 text-slate-800">"{worry.text}"</h2>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 min-h-[120px] flex items-center justify-center">
          <textarea
            value={comfortingMessage}
            onChange={(e) => setComfortingMessage(e.target.value)}
            placeholder="따뜻한 위로의 말을 직접 적거나 AI의 위로를 받아보세요."
            className="w-full h-full bg-transparent text-slate-700 text-center text-lg resize-none focus:outline-none placeholder-gray-500"
            rows={4}
          />
        </div>

        <div className="flex justify-center my-4">
            <button
              onClick={handleGenerateComfort}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white focus:ring-purple-300"
            >
              {isGenerating ? '생성 중...' : 'AI 위로 받기'}
            </button>
        </div>

        <div className="flex gap-4 mt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full font-semibold transition-colors duration-300 bg-slate-200 hover:bg-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            닫기
          </button>
          <button
            onClick={handleConfirm}
            disabled={!comfortingMessage.trim()}
            className="flex-1 px-4 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
          >
            위로 보내기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComfortModal;

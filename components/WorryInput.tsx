import React, { useState } from 'react';
import { MAX_WORRY_TEXT_LENGTH } from '../services/shareLink';

interface WorryInputProps {
  onAddWorry: (text: string) => void;
  disabled: boolean;
}

const WorryInput: React.FC<WorryInputProps> = ({ onAddWorry, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddWorry(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={disabled ? "지금은 위로할 시간이에요" : "어떤 걱정이 있나요?"}
        disabled={disabled}
        // 링크가 끝없이 길어지지 않도록 입력 단계에서 막습니다.
        // (예전에는 제한 없이 받아두고 저장할 때 조용히 잘랐습니다.)
        maxLength={MAX_WORRY_TEXT_LENGTH}
        className="flex-grow min-w-0 px-4 py-3 bg-white bg-opacity-80 border border-green-400 rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition duration-300 disabled:opacity-50"
      />
      <button 
        type="submit" 
        disabled={disabled || !inputValue.trim()}
        className="flex-shrink-0 whitespace-nowrap px-5 sm:px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white focus:ring-amber-300"
      >
        추가
      </button>
    </form>
  );
};

export default WorryInput;
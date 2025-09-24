import React, { useEffect, useRef, useState } from 'react';
import { Worry } from '../types';

declare var QRCode: any;

interface ShareModalProps {
  worries: Worry[];
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ worries, onClose }) => {
  const qrCodeRef = useRef<HTMLCanvasElement>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (worries.length > 0) {
      try {
        const json = JSON.stringify(worries);
        
        // Unicode-safe Base64 encoding
        const uint8Array = new TextEncoder().encode(json);
        let binaryString = '';
        uint8Array.forEach((byte) => {
          binaryString += String.fromCharCode(byte);
        });
        const base64 = btoa(binaryString);

        const url = `${window.location.origin}${window.location.pathname}?tree=${encodeURIComponent(base64)}`;
        setShareUrl(url);

        if (qrCodeRef.current) {
          QRCode.toCanvas(qrCodeRef.current, url, { width: 256, margin: 2 }, (error: Error | null) => {
            if (error) console.error("QR Code generation failed:", error);
          });
        }
      } catch (error) {
        console.error("Failed to create share link:", error);
      }
    }
  }, [worries]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4 text-slate-800">걱정 나무 공유하기</h2>
        <p className="text-slate-600 mb-6">친구가 QR코드를 찍거나 링크로 접속해서<br/>당신의 걱정을 위로해줄 수 있어요.</p>
        
        <div className="flex justify-center mb-6">
          <canvas ref={qrCodeRef} className="rounded-lg border"></canvas>
        </div>

        <div className="relative flex items-center mb-6">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full bg-slate-100 text-slate-600 text-sm p-3 rounded-lg pr-24"
          />
          <button
            onClick={handleCopyLink}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-2 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600 transition-colors"
          >
            {copied ? '복사됨!' : '링크 복사'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-3 rounded-full font-semibold transition-colors duration-300 bg-slate-200 hover:bg-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
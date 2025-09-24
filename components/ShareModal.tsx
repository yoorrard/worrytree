import React, { useEffect, useState } from 'react';
import { Worry } from '../types';

declare var QRCode: any;
declare var pako: any;

interface ShareModalProps {
  worries: Worry[];
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ worries, onClose }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (worries.length === 0) {
      setIsLoading(false);
      return;
    }

    const generateShareables = async () => {
      setIsLoading(true);
      setError(null);
      setQrCodeDataUrl('');
      
      let url = '';
      try {
        const jsonString = JSON.stringify(worries);
        // Compress the JSON string using pako
        const compressed = pako.deflate(jsonString);
        // Convert Uint8Array to binary string for btoa
        let binaryString = '';
        compressed.forEach((byte) => {
            binaryString += String.fromCharCode(byte);
        });
        const base64 = btoa(binaryString);
        url = `${window.location.origin}${window.location.pathname}?tree=${encodeURIComponent(base64)}`;
        setShareUrl(url);
      } catch (err) {
        console.error("Failed to create share link:", err);
        setError('공유 링크 생성 중 오류가 발생했습니다.');
        setIsLoading(false);
        return;
      }

      try {
        const qrCodeLibrary = await new Promise((resolve, reject) => {
          let attempts = 0;
          const interval = setInterval(() => {
            if (typeof QRCode !== 'undefined' && typeof pako !== 'undefined') {
              clearInterval(interval);
              resolve(QRCode);
            } else {
              attempts++;
              if (attempts > 100) { // 10 seconds timeout
                clearInterval(interval);
                reject(new Error("QRCode library did not load in time."));
              }
            }
          }, 100);
        });

        const dataUrl = await (qrCodeLibrary as any).toDataURL(url, {
          width: 256,
          margin: 2,
          errorCorrectionLevel: 'L',
        });
        setQrCodeDataUrl(dataUrl);
      } catch (generationError: any) {
        console.error("QR Code generation failed:", generationError);
        if (generationError.message.includes("did not load")) {
            setError('QR 코드 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인 후 새로고침 해보세요.');
        } else {
            setError('QR 코드 생성에 실패했습니다. 내용이 너무 길 수 있습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    generateShareables();

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
        
        <div className="flex justify-center items-center mb-6 w-[256px] h-[256px] mx-auto bg-gray-100 rounded-lg border">
          {isLoading && <p className="text-slate-500">QR 코드 생성 중...</p>}
          {error && <p className="text-red-500 text-sm px-4">{error}</p>}
          {!isLoading && !error && qrCodeDataUrl && (
            <img src={qrCodeDataUrl} alt="Share QR Code" className="rounded-lg" />
          )}
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
            disabled={!shareUrl}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-2 bg-green-500 text-white rounded-md text-sm font-semibold hover:bg-green-600 transition-colors disabled:bg-gray-400"
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
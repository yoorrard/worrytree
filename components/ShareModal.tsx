
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import LZString from 'lz-string';
import { Worry, monsterColors } from '../types';

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
  const [isFallbackParams, setIsFallbackParams] = useState(false);

  useEffect(() => {
    if (worries.length === 0) {
      setError("공유할 걱정이 없습니다.");
      setIsLoading(false);
      return;
    }

    const generateShareables = async () => {
      setIsLoading(true);
      setError(null);
      setIsFallbackParams(false);
      setQrCodeDataUrl('');
      
      try {
        // 1. Optimize data structure to a highly compact array
        // Format: [text, top, left, rotate, colorIndex]
        // We omit the ID and generate it on the fly during loading to save space.
        const simplifiedWorries = worries.map(w => {
            const top = Math.round(parseFloat(w.position.top));
            const left = Math.round(parseFloat(w.position.left));
            const rotateMatch = w.position.transform.match(/-?[\d.]+/);
            const rotate = rotateMatch ? Math.round(parseFloat(rotateMatch[0])) : 0;
            const colorIndex = monsterColors.indexOf(w.color);
            
            return [
              w.text,
              top,
              left,
              rotate,
              colorIndex > -1 ? colorIndex : 0,
            ];
        });

        const jsonBody = JSON.stringify(simplifiedWorries);
        let finalUrl = '';

        // Attempt 1: URL Parameter (Primary for reliability without Firebase/External Storage)
        // We use compression first to ensure it works even if external services are down.
        try {
            const compressed = LZString.compressToEncodedURIComponent(jsonBody);
            finalUrl = `${window.location.origin}/?data=${compressed}`;
            
            // If the URL is too long (> 2000 chars), we might have issues with some browsers/QR codes.
            // In that case, we can try a fallback or just inform the user.
            if (finalUrl.length > 2000) {
                console.warn("URL is becoming very long. QR code might be hard to scan.");
            }
        } catch (zipError) {
            console.error("Compression failed:", zipError);
            throw new Error("데이터를 압축하는 중에 오류가 발생했습니다.");
        }

        setShareUrl(finalUrl);

        // Generate QR Code with optimized settings
        const qrDataUrl = await QRCode.toDataURL(finalUrl, {
          width: 512, // Higher resolution for better scanning
          margin: 4,
          errorCorrectionLevel: 'M', // Medium error correction - good balance
          color: {
            dark: '#064e3b', // Deep green for better contrast
            light: '#ffffff',
          },
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (err) {
        console.error("Share generation process failed:", err);
        setError("공유 링크 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setIsLoading(false);
      }
    };

    generateShareables();
  }, [worries]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-sm border border-green-100 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 p-1 rounded-full"
            aria-label="닫기"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-green-900 mb-2">걱정 나무 공유하기</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            아래 QR 코드를 보여주거나 링크를 복사해<br/>친구에게 기운을 북돋아 달라고 하세요!
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-100 border-t-green-600"></div>
            </div>
            <p className="text-green-700 mt-4 font-medium">링크 만드는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-rose-500 bg-rose-50 p-4 rounded-xl mb-4 text-sm">
              {error}
            </div>
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-900 transition-colors"
            >
                확인
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              {qrCodeDataUrl && (
                <div className="p-4 bg-white border-2 border-green-50 rounded-2xl shadow-inner mb-2">
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
              )}
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-sans">scan me</span>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-transparent text-slate-600 text-[11px] truncate focus:outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    copied 
                      ? 'bg-green-600 text-white shadow-lg shadow-green-200' 
                      : 'bg-white text-green-700 border border-green-100 hover:border-green-200 hover:bg-green-50'
                  }`}
                >
                  {copied ? '완료' : '복사'}
                </button>
              </div>
              <p className="text-[11px] text-center text-slate-400 px-4">
                ※ 걱정 내용이 많으면 링크가 길어질 수 있습니다.<br/>링크를 복사해서 사용하는 것을 권장해요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;

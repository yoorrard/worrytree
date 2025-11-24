
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
        // Format: [id, text, top, left, rotate, colorIndex]
        const simplifiedWorries = worries.map(w => {
            const top = parseFloat(w.position.top);
            const left = parseFloat(w.position.left);
            const rotateMatch = w.position.transform.match(/-?[\d.]+/);
            const rotate = rotateMatch ? parseFloat(rotateMatch[0]) : 0;
            const colorIndex = monsterColors.indexOf(w.color);
            return [
              w.id,
              w.text,
              Math.round(top * 10) / 10,
              Math.round(left * 10) / 10,
              Math.round(rotate * 10) / 10,
              colorIndex > -1 ? colorIndex : 0,
            ];
        });

        const jsonBody = JSON.stringify(simplifiedWorries);
        let finalUrl = '';

        // Attempt 1: Try jsonblob.com (Cleanest short URL)
        // We wrap this in a specific try/catch so network errors don't stop the process
        try {
            const response = await fetch('https://jsonblob.com/api/jsonBlob', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: jsonBody,
                mode: 'cors'
            });

            if (response.ok) {
                const locationHeader = response.headers.get('Location');
                if (locationHeader) {
                    const blobId = locationHeader.split('/').pop();
                    if (blobId) {
                        finalUrl = `${window.location.origin}/?worryId=${blobId}`;
                    }
                }
            }
        } catch (e) {
            console.warn("JsonBlob storage failed (likely CORS or AdBlock), falling back to URL compression.", e);
        }

        // Attempt 2: URL Parameter Fallback (Guaranteed to work client-side)
        // If server storage failed or returned invalid data, use this method.
        if (!finalUrl) {
            console.log("Generating client-side compressed URL...");
            try {
                const compressed = LZString.compressToEncodedURIComponent(jsonBody);
                finalUrl = `${window.location.origin}/?data=${compressed}`;
                setIsFallbackParams(true);
            } catch (zipError) {
                console.error("Compression failed:", zipError);
                throw new Error("데이터 압축에 실패했습니다.");
            }
        }

        if (!finalUrl) {
             throw new Error("공유 URL을 생성할 수 없습니다.");
        }

        setShareUrl(finalUrl);

        // Generate QR Code
        const qrDataUrl = await QRCode.toDataURL(finalUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (err) {
        console.error("Share generation process failed:", err);
        setError("공유 링크를 생성하는 중 문제가 발생했습니다.");
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
      console.error('Failed to copy:', err);
      // Fallback
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md border border-green-300 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">걱정 나무 공유하기</h2>
        <p className="text-slate-600 mb-6 text-center text-sm">
          친구에게 링크를 보내 위로를 부탁해보세요.
        </p>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
            <p className="text-slate-500">공유 링크 생성 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <button 
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-200 rounded-lg text-slate-700 hover:bg-slate-300"
            >
                닫기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              {qrCodeDataUrl && (
                <div className="p-2 border-2 border-dashed border-green-200 rounded-xl relative">
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
              )}
            </div>
            
            {isFallbackParams && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded text-center">
                    네트워크 상태로 인해 긴 주소가 생성되었지만<br/>기능은 정상적으로 작동합니다.
                </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm focus:outline-none"
              />
              <button
                onClick={handleCopyUrl}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 min-w-[80px] ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
            
             <p className="text-xs text-center text-slate-400">
                링크를 통해 접속하면 누구나 당신의 걱정 나무를 볼 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;

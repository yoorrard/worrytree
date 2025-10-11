import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
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

  useEffect(() => {
    if (worries.length === 0) {
      setError("공유할 걱정이 없습니다.");
      setIsLoading(false);
      return;
    }

    const generateShareables = async () => {
      setIsLoading(true);
      setError(null);
      setQrCodeDataUrl('');
      
      try {
        // 1. Optimize data structure to a highly compact array
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

        // 2. Store data on jsonblob.com
        const response = await fetch('https://jsonblob.com/api/jsonBlob', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(simplifiedWorries),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to store worry data on jsonblob:', response.status, errorText);
          throw new Error('Failed to store worry data.');
        }

        // 3. Extract the ID from the 'Location' header
        const blobUrl = response.headers.get('Location');
        if (!blobUrl) {
            throw new Error("Could not get blob URL from response header.");
        }
        const worryId = blobUrl.split('/').pop();

        if (!worryId) {
             throw new Error("Could not parse worry ID from blob URL.");
        }
        
        // 4. Create the share URL (without the 'store' parameter)
        const url = `${window.location.origin}${window.location.pathname}?worryId=${worryId}`;
        setShareUrl(url);

        // 5. Generate QR code from the share URL
        const dataUrl = await QRCode.toDataURL(url, {
          width: 256,
          margin: 2,
        });
        setQrCodeDataUrl(dataUrl);

      } catch (err) {
        console.error("Shareable generation failed:", err);
        setError('공유 링크 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
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
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Worry } from '../types';
import { buildShareUrl, MAX_SHARED_WORRIES } from '../services/shareLink';

interface ShareModalProps {
  worries: Worry[];
  onClose: () => void;
}

/**
 * QR 코드 설정.
 *
 * QR은 "몇 글자까지 되느냐"보다 "화면에서 한 칸(모듈)이 몇 픽셀이냐"가 스캔 성공을
 * 좌우합니다. 걱정이 늘수록 모듈 수가 늘어 한 칸이 작아지고, 어느 선을 넘으면
 * 생성은 되지만 폰 카메라가 못 읽습니다. 그래서 실제 표시 크기를 기준으로
 * 오류정정 레벨을 조절합니다.
 */
const QR_DISPLAY_PX = 256;
/** QR 자체의 여백(모듈 단위). 카드의 흰 여백이 규격상 필요한 여백을 대신합니다. */
const QR_MARGIN = 2;
/** 한 모듈이 이 픽셀 이상이면 넉넉하게 스캔됩니다. */
const COMFORTABLE_PX_PER_MODULE = 2.5;
/** 이 아래로 내려가면 스캔이 불안정해져 링크 복사를 안내합니다. */
const USABLE_PX_PER_MODULE = 2.0;

const pxPerModule = (moduleCount: number) => QR_DISPLAY_PX / (moduleCount + QR_MARGIN * 2);

type ErrorCorrectionLevel = 'M' | 'L';

/** 해당 오류정정 레벨로 만들었을 때의 한 변의 모듈 수. 용량을 넘으면 null. */
const measureModules = (text: string, ec: ErrorCorrectionLevel): number | null => {
  try {
    return QRCode.create(text, { errorCorrectionLevel: ec }).modules.size;
  } catch {
    return null;
  }
};

/**
 * 기본은 오류정정 M. 화면에서 너무 촘촘해지면 L로 낮춥니다.
 * L은 복원력이 조금 낮지만 같은 내용을 더 적은 모듈에 담기 때문에
 * (예: 걱정 20개 → 105칸에서 93칸으로) 화면으로 스캔하는 용도에서는 훨씬 유리합니다.
 */
const chooseQrSettings = (
  text: string,
): { level: ErrorCorrectionLevel; modules: number } | null => {
  const medium = measureModules(text, 'M');
  if (medium !== null && pxPerModule(medium) >= COMFORTABLE_PX_PER_MODULE) {
    return { level: 'M', modules: medium };
  }

  const low = measureModules(text, 'L');
  if (low !== null) return { level: 'L', modules: low };
  if (medium !== null) return { level: 'M', modules: medium };
  return null;
};

const ShareModal: React.FC<ShareModalProps> = ({ worries, onClose }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [qrSrc, setQrSrc] = useState('');
  const [qrNotice, setQrNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (worries.length === 0) {
      setError('공유할 걱정이 없습니다.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const generate = async () => {
      setIsLoading(true);
      setError(null);
      setQrNotice(null);
      setQrSrc('');

      let url: string;
      try {
        url = buildShareUrl(worries);
      } catch (err) {
        console.error('공유 링크 생성 실패:', err);
        if (!cancelled) {
          setError('공유 링크를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
          setIsLoading(false);
        }
        return;
      }

      if (cancelled) return;
      // 링크를 먼저 확정합니다. QR이 실패하더라도 링크 복사는 항상 되도록
      // 두 과정을 분리했습니다. (예전에는 QR이 실패하면 공유 전체가 실패했습니다.)
      setShareUrl(url);
      setIsLoading(false);

      const settings = chooseQrSettings(url);
      if (!settings) {
        if (!cancelled) {
          setQrNotice('걱정이 너무 많아 QR 코드로는 담을 수 없어요. 아래 링크를 복사해 보내주세요.');
        }
        return;
      }

      try {
        const svg = await QRCode.toString(url, {
          type: 'svg',
          margin: QR_MARGIN,
          errorCorrectionLevel: settings.level,
          color: { dark: '#064e3b', light: '#ffffff' },
        });
        if (cancelled) return;

        // PNG를 512px로 만들어 192px로 줄여 그리면 브라우저 리샘플링 때문에
        // 칸 경계가 흐려집니다. SVG는 어떤 크기에서도 경계가 또렷하고
        // 데이터도 1/3 수준이라 스캔 성공률이 올라갑니다.
        setQrSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);

        if (pxPerModule(settings.modules) < USABLE_PX_PER_MODULE) {
          setQrNotice('걱정이 많아 QR이 촘촘해요. 잘 안 찍히면 링크를 복사해서 보내주세요.');
        } else if (worries.length > MAX_SHARED_WORRIES) {
          setQrNotice(`걱정이 많아 앞의 ${MAX_SHARED_WORRIES}개만 공유돼요.`);
        }
      } catch (err) {
        console.error('QR 생성 실패:', err);
        if (!cancelled) {
          setQrNotice('QR 코드를 만들지 못했어요. 아래 링크를 복사해 보내주세요.');
        }
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [worries]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // 구형 브라우저나 https가 아닌 환경을 위한 대비책
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="걱정 나무 공유하기"
    >
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md border border-green-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400"
          aria-label="닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-green-900 mb-2">걱정 나무 공유하기</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            아래 QR 코드를 보여주거나 링크를 복사해<br />친구에게 기운을 북돋아 달라고 하세요!
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-100 border-t-green-600" />
            <p className="text-green-700 mt-4 font-medium">링크 만드는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-rose-500 bg-rose-50 p-4 rounded-xl mb-4 text-sm">{error}</div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-900 transition-colors"
            >
              확인
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {qrSrc && (
              <div className="flex flex-col items-center">
                <div className="p-5 bg-white border-2 border-green-50 rounded-2xl shadow-inner mb-2">
                  <img
                    src={qrSrc}
                    alt="걱정 나무 공유 QR 코드"
                    width={QR_DISPLAY_PX}
                    height={QR_DISPLAY_PX}
                    className="block max-w-full h-auto"
                    style={{ width: QR_DISPLAY_PX, height: QR_DISPLAY_PX }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-sans">
                  scan me
                </span>
              </div>
            )}

            {qrNotice && (
              <p className="text-xs text-center text-amber-700 bg-amber-50 rounded-xl py-2 px-3">
                {qrNotice}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  aria-label="공유 링크"
                  className="flex-1 px-3 py-2 bg-transparent text-slate-600 text-[11px] truncate focus:outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    copied
                      ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                      : 'bg-white text-green-700 border border-green-100 hover:border-green-200 hover:bg-green-50'
                  }`}
                >
                  {copied ? '완료' : '복사'}
                </button>
              </div>
              <p className="text-[11px] text-center text-slate-400 px-4">
                ※ 링크에 걱정 내용이 그대로 담겨요. 링크를 받은 사람은 누구나 볼 수 있으니
                믿을 수 있는 사람에게만 보내주세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;

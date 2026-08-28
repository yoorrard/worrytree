import React, { useState } from 'react';
import { ClearedWorry } from '../types';

interface WorrySummaryProps {
  clearedWorries: ClearedWorry[];
  isSharedView: boolean;
  onClose: () => void;
  onStartOwnTree: () => void;
}

/**
 * PDF에 쓸 글꼴.
 *
 * 예전에는 'Arial, sans-serif'를 강제해서, 한글이 없는 Arial 대신 브라우저가
 * 아무 글꼴이나 골라 쓰는 바람에 환경마다 결과가 달라지고 글자가 깨졌습니다.
 * 앱에서 쓰는 Jua를 먼저 두고, 운영체제별 한글 기본 글꼴을 뒤에 깔아둡니다.
 */
const PDF_FONT_STACK =
  "'Jua', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * 캡처 배율. 2배로 찍어 축소해 넣으면 글자가 또렷합니다.
 * 더 올려도 눈에 띄는 차이 없이 용량만 커집니다.
 */
const CAPTURE_SCALE = 2;

/**
 * 이미지를 JPEG로 넣는 이유:
 * jsPDF는 PNG를 다시 풀어 헤쳐 담기 때문에 A4 두 장짜리가 13MB까지 부풀었습니다.
 * JPEG는 압축된 데이터를 그대로 품어서, 같은 화질에 용량이 40분의 1 수준입니다.
 * (아이들이 메신저로 주고받기에 13MB는 너무 큽니다.)
 */
const CAPTURE_FORMAT = 'JPEG' as const;
const CAPTURE_QUALITY = 0.92;

const WorrySummary: React.FC<WorrySummaryProps> = ({
  clearedWorries,
  isSharedView,
  onClose,
  onStartOwnTree,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    const originalContent = document.getElementById('worry-summary-content');
    if (!originalContent) return;

    setIsGeneratingPdf(true);
    setPdfError(null);

    // PDF 라이브러리는 무겁습니다(약 550KB). 버튼을 누른 사람만 내려받도록
    // 동적 import로 분리해 두면 첫 화면 로딩에는 전혀 영향을 주지 않습니다.
    let jsPDF: typeof import('jspdf').jsPDF;
    let html2canvas: typeof import('html2canvas').default;
    try {
      [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
    } catch (error) {
      console.error('PDF 라이브러리를 불러오지 못했습니다:', error);
      setPdfError('PDF 기능을 불러오지 못했어요. 인터넷 연결을 확인해주세요.');
      setIsGeneratingPdf(false);
      return;
    }

    // 화면 밖에 복제본을 만들어 캡처합니다. 실제 화면 레이아웃을 건드리지 않고
    // 스크롤로 잘린 내용까지 전부 담을 수 있습니다.
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    container.style.width = `${originalContent.offsetWidth}px`;
    container.style.backgroundColor = '#f8fafc';

    const clone = originalContent.cloneNode(true) as HTMLElement;
    clone.style.fontFamily = PDF_FONT_STACK;
    clone.style.maxHeight = 'none';
    clone.style.overflowY = 'visible';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      // 웹폰트(Jua)가 아직 안 실려 있으면 캡처 결과에서 글꼴이 바뀝니다.
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(clone, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });

      const imgData = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
      const imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width;

      // compress: true 를 켜야 PDF 내부 스트림이 압축됩니다(기본값은 무압축).
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

      // 같은 이미지를 여러 페이지에 얹으므로 별칭을 붙여 한 번만 저장되게 합니다.
      const alias = 'worry-summary';
      doc.addImage(imgData, CAPTURE_FORMAT, 0, 0, A4_WIDTH_MM, imgHeight, alias);

      // 내용 높이가 A4 배수와 딱 맞아떨어지면 예전 조건(>= 0)에서는
      // 빈 페이지가 한 장 더 붙었습니다.
      let heightLeft = imgHeight - A4_HEIGHT_MM;
      while (heightLeft > 0) {
        doc.addPage();
        doc.addImage(imgData, CAPTURE_FORMAT, 0, heightLeft - imgHeight, A4_WIDTH_MM, imgHeight, alias);
        heightLeft -= A4_HEIGHT_MM;
      }

      doc.save('worry-tree-summary.pdf');
    } catch (error) {
      console.error('PDF 생성에 실패했습니다:', error);
      setPdfError('PDF를 만드는 데 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      // 성공하든 실패하든 화면 밖 복제본은 반드시 치웁니다.
      container.remove();
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-sky-100/80 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="위로 기록"
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl border border-green-300 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-green-800 mb-2">
          모든 걱정을 해결했어요!
        </h2>
        <p className="text-slate-600 mb-6">
          {isSharedView
            ? '친구의 걱정을 모두 위로해줬어요. 고마워요!'
            : '당신이 보낸 따뜻한 위로를 확인해보세요.'}
        </p>

        <div
          id="worry-summary-content"
          className="max-h-[50vh] overflow-y-auto space-y-4 bg-slate-50 p-4 rounded-lg text-left"
        >
          {clearedWorries.map((item, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 break-words"
            >
              <p className="text-sm text-slate-500">걱정:</p>
              <p className="font-semibold text-slate-800 mb-2">"{item.worryText}"</p>
              <hr className="my-2 border-slate-200" />
              <p className="text-sm text-green-600">따뜻한 위로:</p>
              <p className="font-semibold text-green-800">"{item.comfortText}"</p>
            </div>
          ))}
        </div>

        {pdfError && (
          <p className="mt-4 text-sm text-rose-600 bg-rose-50 rounded-xl py-2 px-3">{pdfError}</p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={isSharedView ? onStartOwnTree : onClose}
            className="px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
          >
            {/* 친구의 나무를 다 위로하고 나면 갈 곳이 없어 빈 화면에 갇혔었습니다. */}
            {isSharedView ? '나도 걱정 나무 만들기' : '새로운 걱정 추가하기'}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white focus:ring-indigo-300"
          >
            {isGeneratingPdf ? 'PDF 생성 중...' : 'PDF로 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorrySummary;

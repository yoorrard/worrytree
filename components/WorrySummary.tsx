import React, { useState } from 'react';

interface ClearedWorry {
  worryText: string;
  comfortText: string;
}

interface WorrySummaryProps {
  clearedWorries: ClearedWorry[];
  isSharedView: boolean;
  onClose: () => void;
}

// Add types for window properties to avoid TypeScript errors
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

const WorrySummary: React.FC<WorrySummaryProps> = ({ clearedWorries, isSharedView, onClose }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;
    const originalContent = document.getElementById('worry-summary-content');

    if (!jsPDF || !html2canvas || !originalContent) {
      alert("PDF 생성에 필요한 요소를 찾을 수 없습니다.");
      return;
    }

    setIsGeneratingPdf(true);

    // Create an off-screen container for a clone of the content.
    // This isolates the capture process from the live DOM, preventing layout issues.
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    // Set a fixed width based on the original element to ensure consistent layout.
    container.style.width = `${originalContent.offsetWidth}px`;
    container.style.backgroundColor = '#f8fafc'; // Match the capture background

    const clone = originalContent.cloneNode(true) as HTMLElement;
    
    // Apply styles to the clone for optimal and predictable rendering.
    clone.style.fontFamily = 'Arial, sans-serif'; // Use a web-safe font.
    clone.style.maxHeight = 'none'; // Ensure all content is visible.
    clone.style.overflowY = 'visible';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      // Run html2canvas on the stable, off-screen clone.
      const canvas = await html2canvas(clone, { 
          scale: 2,
          useCORS: true,
          backgroundColor: '#f8fafc',
      });

      // Once captured, the off-screen elements are no longer needed.
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      const doc = new jsPDF('p', 'mm');

      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save('worry-tree-summary.pdf');
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF를 생성하는 데 실패했습니다.");
      // Ensure the container is removed even if an error occurs.
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-sky-100/80 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl border border-green-300 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-green-800 mb-2">모든 걱정을 해결했어요!</h2>
        <p className="text-slate-600 mb-6">{isSharedView ? "친구의 걱정을 모두 위로해줬어요. 고마워요!" : "당신이 보낸 따뜻한 위로를 확인해보세요."}</p>
        
        <div id="worry-summary-content" className="max-h-[50vh] overflow-y-auto space-y-4 bg-slate-50 p-4 rounded-lg text-left">
          {clearedWorries.map((item, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 break-words">
              <p className="text-sm text-slate-500">걱정:</p>
              <p className="font-semibold text-slate-800 mb-2">"{item.worryText}"</p>
              <hr className="my-2 border-slate-200" />
              <p className="text-sm text-green-600">따뜻한 위로:</p>
              <p className="font-semibold text-green-800">"{item.comfortText}"</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 text-white focus:ring-teal-300"
          >
            {isSharedView ? '닫기' : '새로운 걱정 추가하기'}
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
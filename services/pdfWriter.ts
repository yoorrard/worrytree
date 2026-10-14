/**
 * JPEG로 그린 쪽들을 PDF 파일 하나로 묶습니다.
 *
 * PDF는 JPEG 데이터를 다시 풀지 않고 그대로 품을 수 있어서(DCTDecode),
 * 압축 라이브러리 없이 아래 몇십 줄로 올바른 PDF를 만들 수 있습니다.
 * 예전에 쓰던 jsPDF(약 360KB)를 다시 들일 필요가 없습니다.
 */

export interface PdfPage {
  /** 쪽 전체를 그린 JPEG 데이터 */
  jpeg: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
}

export interface PdfMeta {
  title: string;
  createdAt: Date;
}

/** A4 크기(포인트 단위, 1pt = 1/72인치) */
export const A4_POINTS = { width: 595.28, height: 841.89 };

const encoder = new TextEncoder();

/**
 * PDF 문서 정보에 한글 제목을 넣으려면 UTF-16BE(앞에 FEFF)를 16진수로 적어야 합니다.
 * 그래야 PDF 보기 프로그램의 창 제목에 "따뜻한 위로 기록"이 제대로 보입니다.
 */
const pdfTextString = (text: string) => {
  let hex = 'FEFF';
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const pdfDate = (d: Date) =>
  `D:${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
  `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;

export const buildPdf = (pages: PdfPage[], meta: PdfMeta): Blob => {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObject = (num: number) => {
    offsets[num] = length;
    push(`${num} 0 obj\n`);
  };

  // 객체 번호: 1 문서, 2 쪽 목록, 3 문서 정보, 그 뒤로 쪽마다 [쪽, 그림, 그리기 명령]
  const pageObj = (i: number) => 4 + i * 3;
  const imageObj = (i: number) => 5 + i * 3;
  const contentObj = (i: number) => 6 + i * 3;
  const objectCount = 3 + pages.length * 3;
  const { width: W, height: H } = A4_POINTS;

  push('%PDF-1.4\n');
  // 이진 데이터가 들어 있다는 표시(전송 중 줄바꿈 변환 방지)
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  beginObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  beginObject(2);
  const kids = pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ');
  push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  beginObject(3);
  push(
    `<< /Title ${pdfTextString(meta.title)} /Producer (Worry Tree) ` +
      `/CreationDate (${pdfDate(meta.createdAt)}) >>\nendobj\n`,
  );

  pages.forEach((page, i) => {
    beginObject(pageObj(i));
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] ` +
        `/Resources << /XObject << /Im${i} ${imageObj(i)} 0 R >> /ProcSet [/PDF /ImageC] >> ` +
        `/Contents ${contentObj(i)} 0 R >>\nendobj\n`,
    );

    beginObject(imageObj(i));
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    push('\nendstream\nendobj\n');

    // 그림을 쪽 전체 크기로 늘려 그리는 명령
    const draw = `q\n${W} 0 0 ${H} 0 0 cm\n/Im${i} Do\nQ`;
    beginObject(contentObj(i));
    push(`<< /Length ${encoder.encode(draw).length} >>\nstream\n${draw}\nendstream\nendobj\n`);
  });

  // 각 객체가 파일의 몇 번째 바이트에서 시작하는지 적은 목차(xref).
  // 한 줄이 정확히 20바이트여야 해서 끝을 " \n"으로 맞춥니다.
  const xrefOffset = length;
  push(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= objectCount; n++) {
    push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 3 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
};

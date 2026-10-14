import { ClearedWorry, monsterColors } from '../types';
import { A4_POINTS, buildPdf, PdfPage } from './pdfWriter';

/**
 * 위로 기록을 A4 PDF로 만듭니다.
 *
 * 예전에는 화면의 목록을 html2canvas로 한 장 길게 찍은 뒤, A4 높이마다
 * 기계적으로 잘라 jsPDF로 붙였습니다. 그래서
 *   - 카드와 글줄이 쪽 경계에서 반으로 잘렸고
 *   - 종이 가장자리까지 여백 없이 꽉 찼고
 *   - 제목·날짜 없이 목록만 들어갔고
 *   - 해상도가 낮아(약 145DPI) 인쇄하면 글자가 흐렸고
 *   - 라이브러리 약 740KB를 내려받아야 했습니다.
 *
 * 이제는 브라우저 기본 Canvas로 A4 한 쪽씩 직접 그리고, 카드가 쪽 경계에
 * 걸리면 통째로 다음 쪽으로 넘깁니다. 그린 쪽들은 pdfWriter 가 PDF 하나로
 * 묶습니다. 추가 라이브러리가 없습니다.
 *
 * 쪽은 그림으로 들어가므로 PDF 안의 글자를 선택·검색할 수는 없습니다.
 * 한글 글꼴을 PDF에 심으려면 수 MB의 글꼴 파일이나 별도 라이브러리가
 * 필요해서, 비용 없는 운영 원칙에 맞춰 그림 방식을 택했습니다.
 */

/** 쪽을 그리는 논리 좌표계. A4 비율(210:297)에 맞춥니다. */
const PAGE_W = 1400;
const PAGE_H = Math.round((PAGE_W * 297) / 210);

/**
 * 실제 캔버스 배율. 1400 × 1.25 = 1750px 이 210mm 에 들어가므로 약 212DPI 입니다.
 * 254DPI·품질 0.9 와 200DPI로 확대 비교했을 때 글자 선명도 차이가 보이지 않았고,
 * 용량은 쪽당 약 30% 가볍습니다. iOS 캔버스 한계(약 1,670만 픽셀)의 4분의 1입니다.
 */
const RENDER_SCALE = 1.25;
const JPEG_QUALITY = 0.85;

const FONT_STACK = "'Jua', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
const font = (px: number) => `${px}px ${FONT_STACK}`;

/** 인쇄할 때 잉크를 아끼도록 쪽 바탕은 흰색으로 두고 색은 포인트에만 씁니다. */
const COLOR = {
  page: '#ffffff',
  title: '#166534',
  subtitle: '#475569',
  muted: '#64748b',
  faint: '#94a3b8',
  worry: '#1e293b',
  comfortLabel: '#16a34a',
  comfort: '#166534',
  card: '#fbfefc',
  cardBorder: '#bbf7d0',
  divider: '#cbd5e1',
  rule: '#dcfce7',
};

const MARGIN_X = 96;
const MARGIN_TOP = 88;
const CARD_WIDTH = PAGE_W - MARGIN_X * 2;
const CARD_PADDING = 36;
const CARD_GAP = 24;
const CARD_RADIUS = 32;
const ICON_SIZE = 72;
const ICON_GAP = 24;
const WORRY_TEXT_OFFSET = CARD_PADDING + ICON_SIZE + ICON_GAP;
const WORRY_TEXT_WIDTH = CARD_WIDTH - WORRY_TEXT_OFFSET - CARD_PADDING;
const COMFORT_TEXT_WIDTH = CARD_WIDTH - CARD_PADDING * 2;
const DIVIDER_SPACE = 18;

/** A4에 인쇄했을 때 본문이 16~17pt 정도가 되는 크기입니다. */
const TYPE = {
  label: { size: 26, lineHeight: 34 },
  worry: { size: 40, lineHeight: 56 },
  comfort: { size: 38, lineHeight: 54 },
  title: { size: 72, lineHeight: 92 },
  subtitle: { size: 34, lineHeight: 48 },
  date: { size: 28, lineHeight: 40 },
  continued: { size: 40, lineHeight: 56 },
  footer: { size: 24, lineHeight: 36 },
};

/**
 * 긴 글이 카드 하나를 끝없이 늘리지 않도록 줄 수를 제한합니다.
 * 이 제한 덕분에 가장 큰 카드도 첫 쪽(머리글 아래)에 반드시 들어갑니다.
 */
const MAX_WORRY_LINES = 6;
const MAX_COMFORT_LINES = 10;

const FOOTER_HEIGHT = 24 + TYPE.footer.lineHeight + 72;
const TREE_MAX_WIDTH = 440;
const TREE_MAX_HEIGHT = 240;

type Ctx = CanvasRenderingContext2D;

/**
 * 눈에 보이는 글자 하나씩 나눕니다.
 * Array.from 은 코드 단위로 자르기 때문에 👍🏻 이나 👨‍👩‍👧 같은 이모지가 반으로
 * 쪼개져 깨진 기호로 그려집니다. 지원하는 브라우저에서는 Intl.Segmenter 를 씁니다.
 */
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('ko', { granularity: 'grapheme' })
    : null;
const graphemes = (text: string): string[] =>
  segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);

/**
 * 글자를 주어진 폭에 맞춰 여러 줄로 나눕니다.
 * 한국어는 띄어쓰기 단위로 줄을 바꾸는 편이 읽기 좋으므로 낱말 단위를 우선하고,
 * 한 낱말이 한 줄보다 길 때만 글자 단위로 자릅니다.
 */
const wrapText = (ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] => {
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth;
  const lines: string[] = [];

  const paragraphs = text
    .replace(/\r/g, '')
    .split('\n')
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      if (fits(word)) {
        line = word;
        continue;
      }
      for (const ch of graphemes(word)) {
        if (line && !fits(line + ch)) {
          lines.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
    }
    if (line) lines.push(line);
  }

  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && !fits(`${last}…`)) last = graphemes(last).slice(0, -1).join('');
  kept[maxLines - 1] = `${last}…`;
  return kept;
};

/** 오래된 Safari에는 ctx.roundRect 가 없어서 직접 그립니다. */
const roundedRectPath = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** 글자를 줄 높이 안에서 세로 가운데에 놓습니다. */
const drawLine = (ctx: Ctx, text: string, x: number, y: number, size: number, lineHeight: number) => {
  ctx.fillText(text, x, y + (lineHeight - size) / 2);
};

/** 앱 속 걱정 괴물(components/icons.tsx)과 같은 모양을 캔버스에 그립니다. */
const MONSTER_BODY = 'M 50,10 C 20,10 10,40 10,60 C 10,90 30,100 50,90 C 70,100 90,90 90,60 C 90,40 80,10 50,10 Z';
const MONSTER_SMILE = 'M 45,65 Q 50,75 55,65';

const drawMonster = (ctx: Ctx, x: number, y: number, size: number, color: string) => {
  const body = new Path2D(MONSTER_BODY);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);

  ctx.fillStyle = color;
  ctx.fill(body);
  // 흰 종이 위에서는 하이라이트가 강하면 흰 눈이 몸통에 묻힙니다. 윗부분만 살짝 밝힙니다.
  const shine = ctx.createRadialGradient(40, 28, 2, 40, 28, 30);
  shine.addColorStop(0, 'rgba(255,255,255,0.45)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fill(body);
  ctx.strokeStyle = 'rgba(15,23,42,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke(body);

  ctx.fillStyle = '#ffffff';
  for (const [cx, cy] of [[38, 45], [62, 45]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1f2937';
  for (const [cx, cy] of [[39, 46], [63, 46]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D(MONSTER_SMILE));
  ctx.restore();
};

interface CardLayout {
  color: string;
  worryLines: string[];
  comfortLines: string[];
  rowHeight: number;
  height: number;
}

const measureCard = (ctx: Ctx, item: ClearedWorry, index: number): CardLayout => {
  ctx.font = font(TYPE.worry.size);
  const worryLines = wrapText(ctx, item.worryText, WORRY_TEXT_WIDTH, MAX_WORRY_LINES);
  ctx.font = font(TYPE.comfort.size);
  const comfortLines = wrapText(ctx, item.comfortText, COMFORT_TEXT_WIDTH, MAX_COMFORT_LINES);

  const rowHeight = Math.max(ICON_SIZE, TYPE.label.lineHeight + worryLines.length * TYPE.worry.lineHeight);
  const height =
    CARD_PADDING +
    rowHeight +
    DIVIDER_SPACE * 2 +
    TYPE.label.lineHeight +
    comfortLines.length * TYPE.comfort.lineHeight +
    CARD_PADDING;

  return {
    color: item.color ?? monsterColors[index % monsterColors.length],
    worryLines,
    comfortLines,
    rowHeight,
    height,
  };
};

const drawCard = (ctx: Ctx, card: CardLayout, y: number) => {
  const x = MARGIN_X;

  // 인쇄물에서는 그림자보다 또렷한 테두리가 깔끔합니다.
  ctx.fillStyle = COLOR.card;
  roundedRectPath(ctx, x, y, CARD_WIDTH, card.height, CARD_RADIUS);
  ctx.fill();
  ctx.strokeStyle = COLOR.cardBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  drawMonster(ctx, x + CARD_PADDING, y + CARD_PADDING, ICON_SIZE, card.color);

  let ty = y + CARD_PADDING;
  const textX = x + WORRY_TEXT_OFFSET;
  ctx.fillStyle = COLOR.muted;
  ctx.font = font(TYPE.label.size);
  drawLine(ctx, '걱정', textX, ty, TYPE.label.size, TYPE.label.lineHeight);
  ty += TYPE.label.lineHeight;

  ctx.fillStyle = COLOR.worry;
  ctx.font = font(TYPE.worry.size);
  for (const line of card.worryLines) {
    drawLine(ctx, line, textX, ty, TYPE.worry.size, TYPE.worry.lineHeight);
    ty += TYPE.worry.lineHeight;
  }

  let cy = y + CARD_PADDING + card.rowHeight + DIVIDER_SPACE;
  ctx.save();
  ctx.strokeStyle = COLOR.divider;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(x + CARD_PADDING, cy);
  ctx.lineTo(x + CARD_WIDTH - CARD_PADDING, cy);
  ctx.stroke();
  ctx.restore();
  cy += DIVIDER_SPACE;

  const comfortX = x + CARD_PADDING;
  ctx.fillStyle = COLOR.comfortLabel;
  ctx.font = font(TYPE.label.size);
  drawLine(ctx, '따뜻한 위로', comfortX, cy, TYPE.label.size, TYPE.label.lineHeight);
  cy += TYPE.label.lineHeight;

  ctx.fillStyle = COLOR.comfort;
  ctx.font = font(TYPE.comfort.size);
  for (const line of card.comfortLines) {
    drawLine(ctx, line, comfortX, cy, TYPE.comfort.size, TYPE.comfort.lineHeight);
    cy += TYPE.comfort.lineHeight;
  }
};

interface HeaderContent {
  tree: HTMLImageElement | null;
  title: string;
  subtitleLines: string[];
  date: string;
}

const treeBannerSize = (tree: HTMLImageElement) => {
  const aspect = tree.naturalWidth / tree.naturalHeight || 16 / 9;
  let width = TREE_MAX_WIDTH;
  let height = width / aspect;
  if (height > TREE_MAX_HEIGHT) {
    height = TREE_MAX_HEIGHT;
    width = height * aspect;
  }
  return { width, height };
};

const firstHeaderHeight = (header: HeaderContent) =>
  MARGIN_TOP +
  (header.tree ? treeBannerSize(header.tree).height + 24 : 0) +
  TYPE.title.lineHeight +
  header.subtitleLines.length * TYPE.subtitle.lineHeight +
  TYPE.date.lineHeight +
  48;

const CONTINUED_HEADER_HEIGHT = MARGIN_TOP + TYPE.continued.lineHeight + 40;

const drawFirstHeader = (ctx: Ctx, header: HeaderContent) => {
  const centerX = PAGE_W / 2;
  let y = MARGIN_TOP;
  ctx.textAlign = 'center';

  if (header.tree) {
    const { width, height } = treeBannerSize(header.tree);
    ctx.drawImage(header.tree, centerX - width / 2, y, width, height);
    y += height + 24;
  }

  ctx.fillStyle = COLOR.title;
  ctx.font = font(TYPE.title.size);
  drawLine(ctx, header.title, centerX, y, TYPE.title.size, TYPE.title.lineHeight);
  y += TYPE.title.lineHeight;

  ctx.fillStyle = COLOR.subtitle;
  ctx.font = font(TYPE.subtitle.size);
  for (const line of header.subtitleLines) {
    drawLine(ctx, line, centerX, y, TYPE.subtitle.size, TYPE.subtitle.lineHeight);
    y += TYPE.subtitle.lineHeight;
  }

  ctx.fillStyle = COLOR.faint;
  ctx.font = font(TYPE.date.size);
  drawLine(ctx, header.date, centerX, y, TYPE.date.size, TYPE.date.lineHeight);
  ctx.textAlign = 'left';
};

const drawContinuedHeader = (ctx: Ctx, title: string) => {
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR.title;
  ctx.font = font(TYPE.continued.size);
  drawLine(ctx, `${title} · 이어서`, PAGE_W / 2, MARGIN_TOP, TYPE.continued.size, TYPE.continued.lineHeight);
  ctx.textAlign = 'left';
};

const drawFooter = (ctx: Ctx, page: number, pageCount: number) => {
  const y = PAGE_H - FOOTER_HEIGHT + 24;
  ctx.strokeStyle = COLOR.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y - 12);
  ctx.lineTo(PAGE_W - MARGIN_X, y - 12);
  ctx.stroke();

  ctx.fillStyle = COLOR.faint;
  ctx.font = font(TYPE.footer.size);
  ctx.textAlign = 'left';
  drawLine(ctx, '걱정 나무에서 건넨 위로', MARGIN_X, y + 8, TYPE.footer.size, TYPE.footer.lineHeight);
  ctx.textAlign = 'right';
  drawLine(ctx, `${page} / ${pageCount}`, PAGE_W - MARGIN_X, y + 8, TYPE.footer.size, TYPE.footer.lineHeight);
  ctx.textAlign = 'left';
};

/**
 * 웹폰트(Jua)를 캔버스에서 쓰려면 미리 내려받아 둬야 합니다.
 * 한글 웹폰트는 글자 범위별로 쪼개져 있으므로 실제로 쓸 글자를 넘겨
 * 필요한 조각만 받게 합니다. 오프라인이거나 느리면 기다리지 않고
 * 기기의 한글 글꼴로 그립니다.
 */
const loadFont = async (text: string) => {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  try {
    await Promise.race([
      document.fonts.load(font(40), text),
      new Promise(resolve => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // 글꼴을 못 받아도 기본 한글 글꼴로 그릴 수 있습니다.
  }
};

const loadImage = async (src: string): Promise<HTMLImageElement | null> => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
};

const canvasToJpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('쪽 그림 변환 실패'));
          return;
        }
        blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)), reject);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface ComfortPdfOptions {
  items: ClearedWorry[];
  isSharedView: boolean;
  /** 첫 쪽 머리에 넣을 나무 그림. 없거나 못 불러오면 빼고 그립니다. */
  treeSrc?: string;
  now?: Date;
}

export interface ComfortPdf {
  file: File;
  pageCount: number;
}

const TITLE = '따뜻한 위로 기록';

const renderPdf = async (options: ComfortPdfOptions, tree: HTMLImageElement | null): Promise<ComfortPdf> => {
  const { items, isSharedView } = options;
  const now = options.now ?? new Date();

  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) throw new Error('캔버스를 쓸 수 없는 환경입니다.');

  const subtitle = isSharedView
    ? `친구의 걱정 ${items.length}개를 모두 위로했어요`
    : `걱정 ${items.length}개를 모두 위로하고 떠나보냈어요`;
  measureCtx.font = font(TYPE.subtitle.size);
  const header: HeaderContent = {
    tree,
    title: TITLE,
    subtitleLines: wrapText(measureCtx, subtitle, CARD_WIDTH, 2),
    date: new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(now),
  };

  const cards = items.map((item, i) => measureCard(measureCtx, item, i));

  // 카드를 쪽에 나눠 담습니다. 카드가 쪽 경계에 걸리면 통째로 다음 쪽으로
  // 넘겨서, 예전처럼 글줄이 반으로 잘리는 일이 없게 합니다.
  const contentBottom = PAGE_H - FOOTER_HEIGHT;
  const pages: CardLayout[][] = [];
  let current: CardLayout[] = [];
  let y = firstHeaderHeight(header);
  for (const card of cards) {
    const gap = current.length ? CARD_GAP : 0;
    if (current.length && y + gap + card.height > contentBottom) {
      pages.push(current);
      current = [];
      y = CONTINUED_HEADER_HEIGHT;
    }
    y += (current.length ? CARD_GAP : 0) + card.height;
    current.push(card);
  }
  pages.push(current);

  const pdfPages: PdfPage[] = [];
  for (const [pageIndex, pageCards] of pages.entries()) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE_W * RENDER_SCALE);
    canvas.height = Math.round(PAGE_H * RENDER_SCALE);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 쓸 수 없는 환경입니다.');
    ctx.scale(RENDER_SCALE, RENDER_SCALE);
    ctx.textBaseline = 'top';

    // JPEG에는 투명이 없어 칠하지 않은 곳은 검게 나옵니다. 바탕을 먼저 칠합니다.
    ctx.fillStyle = COLOR.page;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    let cardY: number;
    if (pageIndex === 0) {
      drawFirstHeader(ctx, header);
      cardY = firstHeaderHeight(header);
    } else {
      drawContinuedHeader(ctx, TITLE);
      cardY = CONTINUED_HEADER_HEIGHT;
    }
    for (const card of pageCards) {
      drawCard(ctx, card, cardY);
      cardY += card.height + CARD_GAP;
    }
    drawFooter(ctx, pageIndex + 1, pages.length);

    pdfPages.push({ jpeg: await canvasToJpeg(canvas), pixelWidth: canvas.width, pixelHeight: canvas.height });

    // 큰 캔버스는 메모리를 많이 차지하므로 바로 비워 줍니다(특히 iOS).
    canvas.width = 0;
    canvas.height = 0;
  }

  const blob = buildPdf(pdfPages, { title: TITLE, createdAt: now });
  // 파일명은 영문으로 둡니다. 한글이 한 글자라도 섞이면 일부 브라우저가 이름을
  // 버리고 확장자 없는 'download' 로 저장해 버려, 파일을 열기 어려워집니다.
  const dateStamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const file = new File([blob], `worry-tree-comfort-${dateStamp}.pdf`, { type: 'application/pdf' });
  return { file, pageCount: pages.length };
};

/** 위로 기록을 A4 PDF 파일 하나로 만듭니다. 쪽이 여러 장이어도 파일은 하나입니다. */
export const createComfortPdf = async (options: ComfortPdfOptions): Promise<ComfortPdf> => {
  const allText = [
    `${TITLE} 걱정 이어서 건넨 친구의 개를 모두 위로했어요 하고 떠나보냈어요 년월일 나무에서 0123456789/·…`,
    ...options.items.flatMap(i => [i.worryText, i.comfortText]),
  ].join(' ');

  const [, tree] = await Promise.all([
    loadFont(allText),
    options.treeSrc ? loadImage(options.treeSrc) : Promise.resolve(null),
  ]);

  try {
    return await renderPdf(options, tree);
  } catch (error) {
    // 나무 그림이 다른 출처에서 와 캔버스가 '오염'되면 저장이 막힙니다.
    // 그럴 때는 나무 그림만 빼고 다시 그립니다.
    if (tree && error instanceof DOMException && error.name === 'SecurityError') {
      return renderPdf(options, null);
    }
    throw error;
  }
};

export type ShareResult = 'shared' | 'cancelled' | 'unavailable';

/**
 * 휴대폰에서는 공유 시트를 엽니다. '파일에 저장'으로 보관하거나 메신저로
 * 친구·선생님께 바로 보낼 수 있습니다. 쪽이 여러 장이어도 파일은 하나입니다.
 *
 * 공유 시트는 버튼을 누른 직후에만 열 수 있어서, PDF는 미리 만들어 두고
 * 여기서는 곧바로 공유를 호출합니다.
 *
 * PC이거나 공유를 쓸 수 없으면 'unavailable' 을 돌려주고, 그때는 다운로드합니다.
 */
export const shareFile = async (file: File): Promise<ShareResult> => {
  const files = [file];
  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files });

  if (!isTouchDevice || !canShareFiles) return 'unavailable';
  try {
    await navigator.share({ files });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    // 권한 문제 등으로 공유가 막히면 다운로드로 대신합니다.
    return 'unavailable';
  }
};

/** 파일을 내려받습니다. */
export const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** 테스트와 점검에 쓰는 쪽 크기 정보 */
export const PDF_LAYOUT = { PAGE_W, PAGE_H, RENDER_SCALE, A4_POINTS };

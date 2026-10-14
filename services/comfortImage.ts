import { ClearedWorry, monsterColors } from '../types';

/**
 * 위로 기록을 PNG 이미지로 그립니다.
 *
 * 예전에는 화면의 목록을 html2canvas로 찍어 jsPDF로 PDF를 만들었습니다.
 * 라이브러리 세 개(약 580KB)를 내려받아야 했고, 결과물은 화면을 그대로 찍은
 * 모양이라 스크롤 상자·버튼 같은 화면 요소의 흔적이 남았습니다.
 * 휴대폰에서는 PDF를 열고 보관하기도 번거로웠습니다.
 *
 * 이제는 브라우저에 기본으로 들어 있는 Canvas로 저장용 이미지를 직접 그립니다.
 * 추가 라이브러리가 없고, 학생이 사진첩에 넣어두거나 메신저로 보내기 좋은
 * 모양으로 나옵니다.
 */

export const IMAGE_WIDTH = 1080;

/**
 * 한 장의 최대 높이(px).
 * iOS Safari는 캔버스 하나의 넓이가 약 1,670만 픽셀을 넘으면 그리지 못합니다.
 * 1080 × 10000 은 그 절반쯤이라 오래된 기기에서도 안전합니다.
 * 위로가 아주 많으면 여러 장으로 나눕니다.
 */
const MAX_PAGE_HEIGHT = 10000;

const FONT_STACK = "'Jua', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
const font = (px: number) => `${px}px ${FONT_STACK}`;

const COLOR = {
  background: '#e0f2fe',
  title: '#166534',
  subtitle: '#475569',
  muted: '#64748b',
  faint: '#94a3b8',
  worry: '#1e293b',
  comfortLabel: '#16a34a',
  comfort: '#166534',
  card: '#ffffff',
  cardBorder: '#bbf7d0',
  divider: '#cbd5e1',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

const OUTER_X = 64;
const CARD_WIDTH = IMAGE_WIDTH - OUTER_X * 2;
const CARD_PADDING = 44;
const CARD_GAP = 32;
const CARD_RADIUS = 36;
const ICON_SIZE = 76;
const ICON_GAP = 28;
const WORRY_TEXT_OFFSET = CARD_PADDING + ICON_SIZE + ICON_GAP;
const WORRY_TEXT_WIDTH = CARD_WIDTH - WORRY_TEXT_OFFSET - CARD_PADDING;
const COMFORT_TEXT_WIDTH = CARD_WIDTH - CARD_PADDING * 2;
const DIVIDER_SPACE = 26;

const TYPE = {
  label: { size: 26, lineHeight: 38 },
  worry: { size: 38, lineHeight: 54 },
  comfort: { size: 36, lineHeight: 52 },
  title: { size: 68, lineHeight: 88 },
  subtitle: { size: 34, lineHeight: 48 },
  date: { size: 28, lineHeight: 40 },
  continued: { size: 40, lineHeight: 56 },
  footer: { size: 26, lineHeight: 38 },
};

/** 긴 글이 카드 하나를 끝없이 늘리지 않도록 줄 수를 제한합니다. */
const MAX_WORRY_LINES = 6;
const MAX_COMFORT_LINES = 10;

/** 바닥글 높이. 여러 장일 때만 쪽 번호 줄이 붙습니다. */
const footerHeight = (pageCount: number) => 24 + TYPE.footer.lineHeight * (pageCount > 1 ? 2 : 1) + 56;
// 쪽 나누기를 정할 때는 쪽 번호가 붙는다고 보고 넉넉하게 잡습니다.
const FOOTER_HEIGHT = footerHeight(2);

type Ctx = CanvasRenderingContext2D;

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
      for (const ch of Array.from(word)) {
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
  while (last && !fits(`${last}…`)) last = Array.from(last).slice(0, -1).join('');
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
const MONSTER_BODY = new Path2D(
  'M 50,10 C 20,10 10,40 10,60 C 10,90 30,100 50,90 C 70,100 90,90 90,60 C 90,40 80,10 50,10 Z',
);
const MONSTER_SMILE = new Path2D('M 45,65 Q 50,75 55,65');

const drawMonster = (ctx: Ctx, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);

  ctx.fillStyle = color;
  ctx.fill(MONSTER_BODY);
  // 앱에서는 초록 나뭇잎 위라 밝게 빛나도 괜찮지만, 흰 카드 위에서는
  // 하이라이트가 강하면 흰 눈이 몸통에 묻힙니다. 윗부분만 살짝 밝힙니다.
  const shine = ctx.createRadialGradient(40, 28, 2, 40, 28, 30);
  shine.addColorStop(0, 'rgba(255,255,255,0.45)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fill(MONSTER_BODY);
  ctx.strokeStyle = 'rgba(15,23,42,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke(MONSTER_BODY);

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
  ctx.stroke(MONSTER_SMILE);
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
  const x = OUTER_X;

  ctx.save();
  ctx.shadowColor = COLOR.shadow;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = COLOR.card;
  roundedRectPath(ctx, x, y, CARD_WIDTH, card.height, CARD_RADIUS);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = COLOR.cardBorder;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, x, y, CARD_WIDTH, card.height, CARD_RADIUS);
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
  let width = 600;
  let height = width / aspect;
  if (height > 340) {
    height = 340;
    width = height * aspect;
  }
  return { width, height };
};

const firstHeaderHeight = (header: HeaderContent) =>
  72 +
  (header.tree ? treeBannerSize(header.tree).height + 28 : 0) +
  TYPE.title.lineHeight +
  header.subtitleLines.length * TYPE.subtitle.lineHeight +
  TYPE.date.lineHeight +
  52;

const CONTINUED_HEADER_HEIGHT = 64 + TYPE.continued.lineHeight + 40;

const drawFirstHeader = (ctx: Ctx, header: HeaderContent) => {
  const centerX = IMAGE_WIDTH / 2;
  let y = 72;
  ctx.textAlign = 'center';

  if (header.tree) {
    const { width, height } = treeBannerSize(header.tree);
    ctx.drawImage(header.tree, centerX - width / 2, y, width, height);
    y += height + 28;
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
  drawLine(ctx, `${title} · 이어서`, IMAGE_WIDTH / 2, 64, TYPE.continued.size, TYPE.continued.lineHeight);
  ctx.textAlign = 'left';
};

const drawFooter = (ctx: Ctx, pageHeight: number, page: number, pageCount: number) => {
  let y = pageHeight - footerHeight(pageCount) + 24;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR.faint;
  ctx.font = font(TYPE.footer.size);
  drawLine(ctx, '걱정 나무에서 건넨 위로', IMAGE_WIDTH / 2, y, TYPE.footer.size, TYPE.footer.lineHeight);
  y += TYPE.footer.lineHeight;
  if (pageCount > 1) {
    drawLine(ctx, `${page} / ${pageCount}`, IMAGE_WIDTH / 2, y, TYPE.footer.size, TYPE.footer.lineHeight);
  }
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

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('이미지 변환 실패'))), 'image/png');
  });

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface ComfortImageOptions {
  items: ClearedWorry[];
  isSharedView: boolean;
  /** 머리에 넣을 나무 그림. 없거나 못 불러오면 빼고 그립니다. */
  treeSrc?: string;
  now?: Date;
}

const renderPages = async (
  options: ComfortImageOptions,
  tree: HTMLImageElement | null,
): Promise<File[]> => {
  const { items, isSharedView } = options;
  const now = options.now ?? new Date();

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) throw new Error('캔버스를 쓸 수 없는 환경입니다.');

  const title = '따뜻한 위로 기록';
  const subtitle = isSharedView
    ? `친구의 걱정 ${items.length}개를 모두 위로했어요`
    : `걱정 ${items.length}개를 모두 위로하고 떠나보냈어요`;
  measureCtx.font = font(TYPE.subtitle.size);
  const header: HeaderContent = {
    tree,
    title,
    subtitleLines: wrapText(measureCtx, subtitle, CARD_WIDTH, 2),
    date: new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(now),
  };

  const cards = items.map((item, i) => measureCard(measureCtx, item, i));

  // 카드를 쪽에 나눠 담습니다. 카드 하나가 두 쪽에 걸쳐 잘리지 않게 합니다.
  const pages: { cards: CardLayout[]; height: number }[] = [];
  let current = { cards: [] as CardLayout[], height: firstHeaderHeight(header) };
  for (const card of cards) {
    const gap = current.cards.length ? CARD_GAP : 0;
    if (current.cards.length && current.height + gap + card.height + FOOTER_HEIGHT > MAX_PAGE_HEIGHT) {
      pages.push(current);
      current = { cards: [], height: CONTINUED_HEADER_HEIGHT };
    }
    current.height += (current.cards.length ? CARD_GAP : 0) + card.height;
    current.cards.push(card);
  }
  pages.push(current);

  const dateStamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const files: File[] = [];

  for (const [pageIndex, page] of pages.entries()) {
    const height = Math.ceil(page.height + footerHeight(pages.length));
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 쓸 수 없는 환경입니다.');
    ctx.textBaseline = 'top';

    ctx.fillStyle = COLOR.background;
    ctx.fillRect(0, 0, IMAGE_WIDTH, height);

    let y: number;
    if (pageIndex === 0) {
      drawFirstHeader(ctx, header);
      y = firstHeaderHeight(header);
    } else {
      drawContinuedHeader(ctx, title);
      y = CONTINUED_HEADER_HEIGHT;
    }

    for (const card of page.cards) {
      drawCard(ctx, card, y);
      y += card.height + CARD_GAP;
    }

    drawFooter(ctx, height, pageIndex + 1, pages.length);

    // 파일명은 영문으로 둡니다. 한글이 한 글자라도 섞이면 일부 브라우저가 이름을
    // 버리고 확장자 없는 'download' 로 저장해 버려, 파일을 열기 어려워집니다.
    const suffix = pages.length > 1 ? `-${pageIndex + 1}` : '';
    const blob = await canvasToBlob(canvas);
    files.push(new File([blob], `worry-tree-comfort-${dateStamp}${suffix}.png`, { type: 'image/png' }));

    // 큰 캔버스는 메모리를 많이 차지하므로 바로 비워 줍니다(특히 iOS).
    canvas.width = 0;
    canvas.height = 0;
  }

  return files;
};

/** 위로 기록을 PNG 파일(여러 장일 수 있음)로 만듭니다. */
export const renderComfortImages = async (options: ComfortImageOptions): Promise<File[]> => {
  const allText = [
    '따뜻한 위로 기록 걱정 이어서 건넨 친구의 개를 모두 위로했어요 하고 떠나보냈어요 년월일 나무에서 0123456789/·…',
    ...options.items.flatMap(i => [i.worryText, i.comfortText]),
  ].join(' ');

  const [, tree] = await Promise.all([
    loadFont(allText),
    options.treeSrc ? loadImage(options.treeSrc) : Promise.resolve(null),
  ]);

  try {
    return await renderPages(options, tree);
  } catch (error) {
    // 나무 그림이 다른 출처에서 와 캔버스가 '오염'되면 저장이 막힙니다.
    // 그럴 때는 나무 그림만 빼고 다시 그립니다.
    if (tree && error instanceof DOMException && error.name === 'SecurityError') {
      return renderPages(options, null);
    }
    throw error;
  }
};

export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

const downloadFile = (file: File) => {
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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 만든 이미지를 저장합니다.
 *
 * 휴대폰에서는 공유 시트를 엽니다. 거기서 '이미지 저장'을 누르면 사진첩에 바로
 * 들어가고, 메신저로 친구에게 보낼 수도 있습니다. (휴대폰 브라우저에서 파일을
 * 내려받으면 사진첩이 아니라 '파일' 앱 구석에 들어가 찾기 어렵습니다.)
 * PC에서는 평소처럼 다운로드 폴더에 내려받습니다.
 *
 * 공유 시트는 버튼을 누른 직후에만 열 수 있어서, 이미지는 미리 만들어 두고
 * 이 함수에서는 곧바로 공유를 호출합니다.
 */
export const saveImages = async (files: File[]): Promise<SaveResult> => {
  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files });

  if (isTouchDevice && canShareFiles) {
    try {
      await navigator.share({ files });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // 권한 문제 등으로 공유가 막히면 다운로드로 대신합니다.
    }
  }

  for (const [i, file] of files.entries()) {
    // 여러 장을 한꺼번에 내려받으면 브라우저가 일부를 막을 수 있어 간격을 둡니다.
    if (i > 0) await wait(400);
    downloadFile(file);
  }
  return 'downloaded';
};

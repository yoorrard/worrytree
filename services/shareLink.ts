import LZString from 'lz-string';
import { Worry, monsterColors } from '../types';
import { placeWorry } from './treeShape';

/**
 * 공유 링크의 인코딩과 디코딩을 한곳에 모아둔 모듈.
 *
 * 예전에는 만드는 쪽(ShareModal)과 읽는 쪽(App)이 서로 다른 파일에 흩어져 있어서
 * 한쪽 포맷만 바뀌어도 조용히 깨질 수 있었습니다. 같은 포맷을 다루는 코드는
 * 반드시 붙어 있어야 합니다.
 *
 * ── 현재 포맷 (?d=) ─────────────────────────────────────────────
 *   걱정 내용만 구분자로 이어 붙인 뒤 압축합니다.
 *   자리·기울기·색은 보내지 않고 본문에서 계산합니다(treeShape.placeWorry).
 *   보내는 쪽과 받는 쪽이 같은 값을 얻으므로 화면은 똑같으면서
 *   링크는 약 30% 짧아지고, 그만큼 QR 코드도 성깁니다.
 *
 * ── 예전 포맷 (?data=) ──────────────────────────────────────────
 *   [[텍스트, top, left, 회전각, 색상 인덱스], ...]
 *   이미 배포된 링크가 있으므로 계속 읽을 수 있게 남겨둡니다.
 *   좌표는 무시하고 본문으로 다시 배치합니다 — 나무 그림이 바뀌어도
 *   괴물이 나뭇잎 밖 허공에 뜨지 않습니다.
 */

/** 걱정 사이를 나누는 문자. 본문에서는 제거하므로 섞일 일이 없습니다. */
const SEPARATOR = String.fromCharCode(31);

/** 걱정 하나의 텍스트 최대 길이. 링크가 무한정 길어지는 것을 막습니다. */
export const MAX_WORRY_TEXT_LENGTH = 100;

/** 공유 링크에 담을 수 있는 걱정의 최대 개수. */
export const MAX_SHARED_WORRIES = 60;

export class ShareLinkError extends Error {}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** 링크를 망가뜨리는 제어문자를 걸러내고 길이를 제한합니다. */
export const sanitizeWorryText = (text: string): string =>
  // eslint-disable-next-line no-control-regex
  text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_WORRY_TEXT_LENGTH);

/** 서버 없이 브라우저에서 충돌 없는 ID를 만듭니다. */
export const createWorryId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * 앱이 실제로 올라가 있는 디렉터리 URL.
 *
 * 예전에는 `location.origin + '/'` 를 하드코딩해서, 하위 경로
 * (예: GitHub Pages의 `/worrytree/`)에 배포하면 공유 링크가 전부 404였습니다.
 *   '/worrytree/'           -> 'https://id.github.io/worrytree/'
 *   '/worrytree/index.html' -> 'https://id.github.io/worrytree/'
 *   '/'                     -> 'https://example.com/'
 */
export const getAppBaseUrl = (): string => {
  const { origin, pathname } = window.location;
  return `${origin}${pathname.replace(/[^/]*$/, '')}`;
};

/**
 * 같은 내용의 걱정이 몇 번째인지 세어가며 Worry 객체를 만듭니다.
 * 자리·색은 본문에서 계산하므로 링크에 담을 필요가 없습니다.
 */
export const createWorry = (text: string, duplicateIndex: number): Worry => {
  const placement = placeWorry(text, duplicateIndex);
  return {
    id: createWorryId(),
    text,
    isFalling: false,
    position: { top: placement.top, left: placement.left, rotate: placement.rotate },
    color: monsterColors[placement.colorIndex],
  };
};

const buildWorries = (texts: string[]): Worry[] => {
  const seen = new Map<string, number>();
  return texts.map(text => {
    const duplicateIndex = seen.get(text) ?? 0;
    seen.set(text, duplicateIndex + 1);
    return createWorry(text, duplicateIndex);
  });
};

/** 걱정 목록을 압축해 공유 URL을 만듭니다. */
export const buildShareUrl = (worries: Worry[]): string => {
  const payload = worries
    .slice(0, MAX_SHARED_WORRIES)
    .map(w => sanitizeWorryText(w.text))
    .filter(Boolean)
    .join(SEPARATOR);

  const compressed = LZString.compressToEncodedURIComponent(payload);
  if (!compressed) {
    throw new ShareLinkError('걱정을 압축하는 중에 문제가 생겼어요.');
  }
  return `${getAppBaseUrl()}?d=${compressed}`;
};

const readTexts = (raw: string[]): string[] => {
  const texts = raw.map(sanitizeWorryText).filter(Boolean).slice(0, MAX_SHARED_WORRIES);
  if (texts.length === 0) {
    throw new ShareLinkError('링크에 담긴 걱정이 하나도 없어요.');
  }
  return texts;
};

const decompress = (raw: string): string => {
  const text = LZString.decompressFromEncodedURIComponent(raw);
  if (!text) {
    throw new ShareLinkError('링크가 중간에 잘렸거나 올바르지 않아요.');
  }
  return text;
};

/** 현재 방식(`?d=`): 걱정 내용만 담긴 링크. */
export const decodeSharedWorries = (dataParam: string): Worry[] =>
  buildWorries(readTexts(decompress(dataParam).split(SEPARATOR)));

/**
 * 예전 방식(`?data=`): 좌표까지 담겨 있던 링크.
 * 좌표는 무시하고 본문으로 다시 배치합니다. 그 사이 나무 그림이 바뀌었더라도
 * 괴물이 나뭇잎 위에 제대로 매달립니다.
 */
export const decodeLegacySharedWorries = (dataParam: string): Worry[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decompress(dataParam));
  } catch {
    throw new ShareLinkError('링크가 중간에 잘렸거나 올바르지 않아요.');
  }
  if (!Array.isArray(parsed)) {
    throw new ShareLinkError('링크에 담긴 걱정 나무의 형식이 올바르지 않아요.');
  }
  return buildWorries(
    readTexts(parsed.map(entry => (Array.isArray(entry) && typeof entry[0] === 'string' ? entry[0] : ''))),
  );
};

/**
 * 예전 방식(`?worryId=`)의 링크. 외부 저장소에서 내려받습니다.
 * 새 링크는 더 이상 이 경로를 쓰지 않지만, 이미 공유된 링크를 살려두기 위해 남깁니다.
 */
export const fetchLegacySharedWorries = async (
  worryId: string,
  store: string | null,
): Promise<Worry[]> => {
  const url =
    store === 'kv'
      ? `https://kvstore.io/api/worry-tree-app-v1/${worryId}`
      : `https://jsonblob.com/api/jsonBlob/${worryId}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ShareLinkError('걱정 나무를 불러오지 못했어요. 인터넷 연결을 확인해주세요.');
  }
  if (!response.ok) {
    throw new ShareLinkError('링크가 만료되었거나 더 이상 유효하지 않아요.');
  }
  const body = await response.json();
  if (!Array.isArray(body)) {
    throw new ShareLinkError('링크에 담긴 걱정 나무의 형식이 올바르지 않아요.');
  }
  return buildWorries(
    readTexts(body.map((entry: unknown) => (Array.isArray(entry) && typeof entry[0] === 'string' ? entry[0] : ''))),
  );
};

import LZString from 'lz-string';
import { Worry, monsterColors } from '../types';

/**
 * 공유 링크의 인코딩과 디코딩을 한곳에 모아둔 모듈.
 *
 * 예전에는 만드는 쪽(ShareModal)과 읽는 쪽(App)이 서로 다른 파일에 흩어져 있어서
 * 한쪽 포맷만 바뀌어도 조용히 깨질 수 있었습니다. 같은 포맷을 다루는 코드는
 * 반드시 붙어 있어야 합니다.
 *
 * 압축 포맷(변경 금지 — 이미 배포된 링크가 이 형태를 씁니다):
 *   [[텍스트, top(%), left(%), 회전각(deg), 색상 인덱스], ...]
 * ID는 저장하지 않고 불러올 때 새로 만듭니다(링크 길이 절약).
 */

/** 걱정 하나의 텍스트 최대 길이. 링크가 무한정 길어지는 것을 막습니다. */
export const MAX_WORRY_TEXT_LENGTH = 100;

/** 공유 링크에 담을 수 있는 걱정의 최대 개수. */
export const MAX_SHARED_WORRIES = 60;

export class ShareLinkError extends Error {}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

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

/** 걱정 목록을 압축해 공유 URL을 만듭니다. */
export const buildShareUrl = (worries: Worry[]): string => {
  const packed = worries.slice(0, MAX_SHARED_WORRIES).map(w => {
    const rotateMatch = w.position.transform.match(/-?[\d.]+/);
    const colorIndex = monsterColors.indexOf(w.color);
    return [
      w.text.slice(0, MAX_WORRY_TEXT_LENGTH),
      Math.round(parseFloat(w.position.top)) || 0,
      Math.round(parseFloat(w.position.left)) || 0,
      rotateMatch ? Math.round(parseFloat(rotateMatch[0])) : 0,
      colorIndex > -1 ? colorIndex : 0,
    ];
  });

  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
  if (!compressed) {
    throw new ShareLinkError('걱정을 압축하는 중에 문제가 생겼어요.');
  }
  return `${getAppBaseUrl()}?data=${compressed}`;
};

/**
 * 압축 포맷 한 줄을 Worry로 되돌립니다.
 * 링크는 누구나 손댈 수 있으므로 값을 그대로 믿지 않고 전부 검증·보정합니다.
 * 되살릴 수 없는 항목은 null을 돌려주고 조용히 건너뜁니다.
 */
const unpackWorry = (entry: unknown): Worry | null => {
  if (!Array.isArray(entry)) return null;

  const text = typeof entry[0] === 'string' ? entry[0].trim() : '';
  if (!text) return null;

  const num = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

  const top = clamp(num(entry[1], 40), 0, 100);
  const left = clamp(num(entry[2], 50), 0, 100);
  const rotate = clamp(num(entry[3], 0), -45, 45);
  const colorIndex = clamp(Math.trunc(num(entry[4], 0)), 0, monsterColors.length - 1);

  return {
    id: createWorryId(),
    text: text.slice(0, MAX_WORRY_TEXT_LENGTH),
    position: { top: `${top}%`, left: `${left}%`, transform: `rotate(${rotate}deg)` },
    color: monsterColors[colorIndex],
    isFalling: false,
  };
};

const unpackAll = (parsed: unknown): Worry[] => {
  if (!Array.isArray(parsed)) {
    throw new ShareLinkError('링크에 담긴 걱정 나무의 형식이 올바르지 않아요.');
  }
  const worries = parsed
    .slice(0, MAX_SHARED_WORRIES)
    .map(unpackWorry)
    .filter((w): w is Worry => w !== null);

  if (worries.length === 0) {
    throw new ShareLinkError('링크에 담긴 걱정이 하나도 없어요.');
  }
  return worries;
};

/** `?data=` 파라미터(현재 방식)를 걱정 목록으로 되돌립니다. */
export const decodeSharedWorries = (dataParam: string): Worry[] => {
  const json = LZString.decompressFromEncodedURIComponent(dataParam);
  if (!json) {
    throw new ShareLinkError('링크가 중간에 잘렸거나 올바르지 않아요.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ShareLinkError('링크가 중간에 잘렸거나 올바르지 않아요.');
  }
  return unpackAll(parsed);
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
  return unpackAll(await response.json());
};

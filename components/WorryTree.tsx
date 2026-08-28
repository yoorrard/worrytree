import React from 'react';
import TreeIllustration from './TreeIllustration';
import { TREE_ASPECT_RATIO, TREE_STAGE_WIDTH } from '../types';

/**
 * 사용자가 직접 넣은 나무 이미지를 빌드 시점에 찾아옵니다.
 *
 * `assets/tree.*` 파일이 있으면 Vite가 번들에 포함하고 파일명에 해시를 붙여주므로
 * (= 브라우저가 영구 캐시할 수 있어 재방문 시 트래픽 0),
 * 파일이 없으면 이 객체는 비어 있고 기본 SVG 나무가 그려집니다.
 * 런타임 404나 별도 설정 없이 "파일을 넣으면 바뀐다"가 성립합니다.
 */
const treeAssets = import.meta.glob<string>('../assets/tree.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

// 여러 형식이 동시에 있어도 항상 같은 파일이 선택되도록 우선순위를 고정합니다.
const FORMAT_PRIORITY = ['.webp', '.svg', '.png', '.jpg', '.jpeg'];
const customTreeSrc: string | undefined = Object.entries(treeAssets)
  .sort(([a], [b]) => {
    const rank = (file: string) =>
      FORMAT_PRIORITY.findIndex(ext => file.toLowerCase().endsWith(ext));
    return rank(a) - rank(b);
  })
  .map(([, url]) => url)[0];

interface WorryTreeProps {
  children: React.ReactNode;
}

/**
 * 나무 그림과 걱정 괴물이 공유하는 "무대".
 *
 * 예전에는 괴물의 좌표(%)가 화면 전체를 기준으로 계산돼서, 가로로 넓은 데스크톱에서는
 * 가운데 좁게 그려진 나무를 벗어나 허공에 뜨는 괴물이 생겼습니다.
 * 이제 나무와 괴물이 같은 고정 비율 상자를 기준으로 하므로 기기와 무관하게
 * 항상 나뭇잎 위에 매달립니다.
 */
const WorryTree: React.FC<WorryTreeProps> = ({ children }) => {
  return (
    <div className="absolute inset-0 flex items-end justify-center">
      <div
        className="relative"
        style={{ width: TREE_STAGE_WIDTH, aspectRatio: TREE_ASPECT_RATIO }}
      >
        <div className="absolute inset-0 z-10 pointer-events-none select-none">
          {customTreeSrc ? (
            <img
              src={customTreeSrc}
              alt="걱정을 매다는 나무"
              className="w-full h-full object-contain object-bottom"
              draggable={false}
            />
          ) : (
            <TreeIllustration />
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default WorryTree;

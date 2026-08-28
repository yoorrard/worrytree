import React from 'react';
import TreeIllustration from './TreeIllustration';
import { customTreeSrc, stageWidthCss } from '../services/treeShape';
import { STAGE_ASPECT } from '../types';

interface WorryTreeProps {
  children: React.ReactNode;
}

/**
 * 나무 그림과 걱정 괴물이 공유하는 '무대'.
 *
 * 예전에는 괴물의 좌표(%)가 화면 전체를 기준이라, 가로로 넓은 화면에서는
 * 가운데 좁게 그려진 나무를 벗어나 허공에 뜨는 괴물이 생겼습니다.
 * 이제 나무와 괴물이 같은 상자를 기준으로 하고, 그 상자의 비율은
 * 실제로 쓰이는 그림에서 가져옵니다.
 */
const WorryTree: React.FC<WorryTreeProps> = ({ children }) => {
  // 좁은 화면에서는 아래쪽 입력·버튼이 나무를 덮으므로 그만큼 띄웁니다.
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-36 sm:pb-0">
      <div
        className="relative"
        style={{ width: stageWidthCss, aspectRatio: `${STAGE_ASPECT}` }}
      >
        <div className="absolute inset-0 z-10 pointer-events-none select-none">
          {customTreeSrc ? (
            <img
              src={customTreeSrc}
              alt="걱정을 매다는 나무"
              className="w-full h-full object-cover object-bottom"
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

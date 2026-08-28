import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import TreeIllustration from './TreeIllustration';
import { canopySqueeze, customTreeSrc, stageWidthCss, treeShape } from '../services/treeShape';

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
 *
 * 좁은 화면에서는 무대가 화면보다 넓어져 나무가 좌우로 잘립니다. 이때
 * `--canopy-squeeze` 값을 재서 내려보내면, 괴물들이 화면 안쪽으로 모여
 * 잘리지 않으면서도 보이는 나뭇잎 위에 고르게 퍼집니다.
 */
const WorryTree: React.FC<WorryTreeProps> = ({ children }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [squeeze, setSqueeze] = useState(1);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setSqueeze(canopySqueeze(stage.offsetWidth, window.innerWidth));
  }, []);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // 화면 회전·창 크기 변경·주소창 접힘까지 모두 따라가야 합니다.
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
      <div
        ref={stageRef}
        className="relative flex-shrink-0"
        style={
          {
            width: stageWidthCss,
            aspectRatio: `${treeShape.aspect}`,
            '--canopy-squeeze': squeeze,
          } as React.CSSProperties
        }
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

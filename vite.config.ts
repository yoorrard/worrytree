import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      // 상대 경로로 빌드하면 루트(/)든 하위 경로(/worrytree/)든
      // 설정 변경 없이 같은 산출물을 그대로 올릴 수 있습니다.
      // GitHub Pages·Cloudflare Pages·Netlify 등 정적 호스팅 전반에서 동작합니다.
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        // 정적 호스팅의 대역폭을 아끼기 위해 에셋 인라인 임계값을 낮춰
        // 큰 이미지가 JS 번들에 base64로 박히지 않게 합니다.
        assetsInlineLimit: 4096,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

# 나무 이미지 넣는 곳

이 폴더에 `tree.webp` (또는 `tree.png` / `tree.jpg` / `tree.svg`) 가 있으면
앱이 자동으로 그 이미지를 나무로 사용합니다. 파일이 없으면 기본 SVG 나무가 그려집니다.
코드는 한 줄도 고칠 필요가 없습니다.

`tree.meta.json` 은 그림의 비율과 나뭇잎 범위를 담고 있으며,
아래 명령이 그림과 함께 만들어 줍니다.

```bash
npm run tree -- ~/Downloads/내가만든나무.png --remove-white
```

자세한 규격은 프로젝트 루트 README.md의 "나무 이미지 교체하기"를 참고하세요.

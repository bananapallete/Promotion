# MIDAS 26주년 프로모션지 · 설문지 생성기

한 화면에서 **프로모션지(A4)** 와 **설문지(A4)** 를 동시에 편집하고 PDF로 출력할 수 있는
React + Vite 기반 웹 앱입니다.

## 주요 기능

- 상단 메뉴바: 언어(국/영문) 전환, 다크/라이트 모드 전환, 초기화, PDF 출력
- 좌측 프로모션지 / 우측 설문지 동시 편집 뷰
- Header: Label·날짜 텍스트 수정, Products 아이콘 노출/숨김(숨긴 아이콘은 PDF에도 표시되지 않음)
- Body: Sale / Study / Gift 섹션 on-off 토글
  - 섹션이 하나라도 꺼지면 나머지 섹션 블록이 M → L 사이즈로 자동 확장
- Sale: 텍스트·할인율(%) 수정 (Enter로 줄바꿈)
- Study: 텍스트 수정 (Enter로 줄바꿈)
- Gift: 사은품 이미지 교체(교체 전 "디자이너에게 검수를 받으시길 바랍니다" 확인 팝업), QR 코드 이미지 교체, 텍스트 수정
- Notice: 텍스트 길이에 따라 높이가 자동 조절(최대 100px)되며, 늘어난 만큼 Gift 이미지/QR 영역 높이가 줄어듭니다
- 설문지: 헤더 타이틀/서브텍스트 수정, "관심 제품 선택" 항목 추가/삭제/텍스트 수정
- 모든 수정 내용은 브라우저 로컬 스토리지에 자동 저장됩니다

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
npm run lint     # oxlint 정적 분석
```

## PDF 출력

상단 메뉴바의 **PDF 출력** 버튼은 브라우저 인쇄창을 엽니다. "대상"을 **PDF로 저장**으로
선택하면 프로모션지·설문지가 각각 A4 한 페이지씩 인쇄됩니다. 편집 UI(토글, 업로드 버튼 등)는
인쇄물에는 표시되지 않습니다.

## 알려진 제한 사항

- 폰트는 Pretendard Variable(국문)과 Poppins(영문/숫자)를 npm 패키지로 번들링해 오프라인에서도
  동작합니다.

## Figma 에셋

Figma MCP(`node-id=108-7974`)에서 노드 단위로 정확히 매칭해 받은 실제 에셋을
`src/assets/figma/`에 반영했습니다.

- `header-bg.png` / `header-gift-accent.png` — 헤더 배경 사진 및 선물상자 액센트
- `badge-gold.png` / `badge-silver.png` — Sale 혜택 배지(금/은 봉투)
- `gift-laptop.png` — 사은품(고성능 노트북) 기본 이미지
- `qr-code.svg` — QR코드 기본 이미지 (원본은 흰색 fill이라 흰 배경에서 보이도록 `#141414`로 재색칠)
- `study-laptop.png` / `study-graduation-cap.png` — Study 섹션 아이콘

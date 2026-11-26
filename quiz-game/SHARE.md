# 친구들과 테스트하기 (외부 공유)

게임 서버(`server/index.js`)가 실시간으로 돌아야 여럿이 같이 할 수 있다. 데모 링크(솔로)는 혼자만 하는 체험용이다.

## A. 지금 바로 (내 노트북이 서버, 가장 빠름)
```bash
cd quiz-game && npm install && npm run build
HOST_KEY=비밀키 npm start            # http://localhost:3000
# 다른 터미널에서 (cloudflared 설치 필요: brew install cloudflared)
cloudflared tunnel --url http://localhost:3000
```
출력되는 `https://….trycloudflare.com` 주소를 친구에게 보낸다.
- 폰 참가: `주소/play` · 빔프로젝터: `주소/screen` · 진행자: `주소/host` (키 입력)
- `PUBLIC_URL=https://…trycloudflare.com` 을 서버 실행 때 같이 주면 화면의 QR이 그 주소로 나온다.
- 노트북이 꺼지거나 터미널을 닫으면 끊긴다.

## B. 항상 켜 두기 (Render 같은 Node 호스팅)
0. (가장 쉬운 방법) 저장소 루트의 `render.yaml`을 쓴다: Render에서 New → Blueprint로 이 저장소를 열면 아래 설정이 자동으로 채워진다. `HOST_KEY`만 직접 입력.
1. 수동이면 GitHub 저장소를 연결해 Web Service를 만든다 (루트 디렉터리 `quiz-game`).
2. Build: `npm ci && npm run build` · Start: `npm start`
3. 환경변수: `HOST_KEY`(필수, 진행자 키), `PUBLIC_URL`(발급된 주소)
4. 웹소켓을 쓰므로 무료 플랜의 "잠들기"로 첫 접속이 느릴 수 있다. 파티 직전에 한 번 열어 둔다.

## 퀴즈 문제 넣기
`design/quiz-template.csv`를 구글 시트에 붙여 편집 → 파일 > 다운로드 > CSV →
```bash
node tools/quiz_csv.mjs 내문제.csv server/quizzes.json
QUIZ_FILE=server/quizzes.json HOST_KEY=비밀키 npm start
```
(`현실` 유형 문제는 진행자 화면에서 점수를 입력 → 확인 → 공개하기로 진행한다)

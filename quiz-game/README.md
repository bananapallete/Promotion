# 퀴즈 게임 (테스트 맵)

캐릭터를 직접 움직여 O/X · 2×2 객관식 구역에 서서 답하는 실시간 퀴즈 게임입니다.

## 실행

```bash
cd quiz-game
npm install
npm run dev        # http://localhost:3000
npm test           # 게임 규칙 단위 테스트
```

| 주소 | 용도 |
|---|---|
| `/screen` | 빔프로젝터용 큰 화면 (QR 표시) |
| `/host` | 호스트 컨트롤 (문제 출제, 더미 봇) |
| `/play` | 참가자 폰 (같은 와이파이면 `http://<내 IP>:3000/play`) |

PC에서 테스트할 때는 `/play`에서 WASD/방향키 이동, Shift 달리기, Space/J 공격을 쓸 수 있습니다.

## 폴더

- `shared/constants.js` 맵 크기·구역·스프라이트 상수 (서버/클라이언트 공용)
- `server/characters.json` 캐릭터 성능표 (체력, 속도, 공격력, 사거리, 밀림 등 전부 여기서 수정)
- `server/quizzes.test.json` 테스트 문제
- `server/game.js` 규칙 전부 (이동, 충돌, 공격, 기절/무적, 달리기, 구역 판정, 점수)
- `art/source/<캐릭터>/` 원본 스프라이트 스트립 → `python3 -I tools/build_sheets.py art/source/blue public/characters/blue` 로 시트 생성

## 배포

```bash
npm run build && HOST_KEY=비밀키 PUBLIC_URL=https://내주소 npm start
```

`HOST_KEY`를 설정하면 `/host`에 키가 필요합니다. 설정하지 않으면 누구나 호스트가 될 수 있습니다.

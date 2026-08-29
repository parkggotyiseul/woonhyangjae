# 운향재 (雲香齋) 홈페이지

자연의 요소를 향으로 옮기는 하이엔드 디퓨저 브랜드. 한 요소를 정해 그 안의 층위를
파고든다 — 일곱 개의 장 중 셋(나무·꽃·돌)만 이름을 공개했고, 남은 넷은 비워 두었다.
운영자는 비개발자 1인이다. **설명은 한국어로, 전문용어는 풀어서** 쓴다.

## 이 사이트의 목적

파는 곳이 아니라 **믿게 하는 곳**이다. 실제 판매는 스마트스토어에서 일어나고,
홈페이지는 "이 브랜드는 진짜다"를 증명해 구매 버튼까지 데려가는 역할만 맡는다.

우선순위: ① 신뢰 형성 ② 구매 전환 ③ B2B 문의 수집

## 절대 넣지 않는 것

팝업 할인 배너 · 카운트다운 타이머 · "지금 구매하세요" 류 CTA · 리뷰 별점 위젯 ·
실시간 구매 알림 · 밝은 플랫레이 제품컷 · 자동 재생 캐러셀.
하나만 들어가도 12만원대 가격의 근거가 무너진다.

## 톤 & 비주얼 원칙

1. **스크롤이 곧 서사** — 메뉴를 뒤지게 하지 않는다. 홈 한 장에 브랜드→철학→제품→구매가 다 담긴다.
2. **정보보다 여백** — 한 화면에 한 문장, 한 이미지. 여백이 곧 가격 신호다.
3. **흑백 위의 단 하나의 색** — 전 페이지 흑백, 유일한 컬러는 마호가니 브라운 용액.

색: Deep Ink `#1C1A17` · Mahogany `#8B5E3C` · Warm Oak `#B8946A` · Cream `#F7F3EE`
서체: Noto Serif KR + Cormorant Garamond

---

## 저장소 / 서버

| 구분 | 값 |
|---|---|
| 로컬 작업 폴더 | `~/woonhyangjae` |
| GitHub | `parkggotyiseul/woonhyangjae` (**public**) — CLI 계정 `Jundroid87`이 협업자로 write 권한 |
| 서버 접속 | `ssh -i woonhyangjae.pem ubuntu@ssl.woonhyangjae.com` (키는 로컬 폴더 안, git 제외됨) |
| 서버 저장소 | `~/git/woonhyangjae` |
| 인프라 | AWS EC2 + Cloudflare(프록시) |

## 배포 (3단계)

로컬에서 고치고 → 푸시 → 서버에서 받아 반영. 명령은 **한 줄씩 따로** 실행한다
(pull과 docker를 한 줄로 묶으면 권한 필터에 막힌다).

```bash
git -C ~/woonhyangjae push origin main
```
```bash
ssh -i ~/woonhyangjae/woonhyangjae.pem ubuntu@ssl.woonhyangjae.com "cd ~/git/woonhyangjae && git pull origin main"
```
```bash
ssh -i ~/woonhyangjae/woonhyangjae.pem ubuntu@ssl.woonhyangjae.com "cd ~/git/woonhyangjae && sudo -n docker compose up -d"
```

- HTML/CSS/JS만 바꿨다면 3번째 줄은 생략 가능하다 (`site/`가 볼륨 마운트라 즉시 반영).
  단, **자산 캐시 버전을 올려야 브라우저에 반영된다** — 아래 참고.
- `docker` 명령에는 반드시 `sudo -n`을 붙인다. ubuntu 계정은 docker 그룹이 아니다.
- 배포 후 확인: `curl -s -o /dev/null -w "%{http_code}" https://woonhyangjae.com/`

## 손으로 고치지 않는 것 두 가지 (tools/)

### 1. 머리말 · 꼬리말

메뉴와 푸터는 14장 모두 똑같다. 한 장씩 고치면 반드시 어긋난다.
**원본은 `tools/shell.header.html` · `tools/shell.footer.html` 뿐이다.**
고친 뒤 아래를 돌리면 전 페이지에 퍼진다.

```bash
node tools/sync-shell.js
```

현재 페이지 표시(`aria-current`)와 첫 화면의 투명 머리말은 스크립트가 알아서 붙인다.
반영 전에 무엇이 바뀌는지만 보려면 `node tools/sync-shell.js --check`.

### 2. 자산 캐시 버전

Cloudflare가 캐시하므로 CSS/JS를 고치면 **모든 HTML의 `?v=` 값을 같이 올린다.**
안 올리면 방문자에게 예전 파일이 계속 보인다.

```bash
node tools/bump-assets.js
```

오늘 날짜 + 알파벳으로 자동 증가한다 (`20260821a` → `20260821b`).
`site/` 와 `site/admin/` 을 함께 바꾼다.

## 구조

```
site/            정적 사이트 (컨테이너가 그대로 서빙)
  *.html         페이지 20장 (404 · 회원 5장 포함)
  assets/data/catalog.js   ★ 제품·컬렉션 데이터 원본
  assets/js/page-*.js      페이지별 스크립트
  admin/         관리자 화면 (HTTP Basic 인증으로 보호)
tools/           머리말·꼬리말 동기화, 캐시 번호 올리기, 카탈로그 대조 (위 참고)
nginx/site.conf  컨테이너 내부 nginx (정적 파일 전담)
deploy/          호스트 nginx 설정 · TLS · Let's Encrypt 스크립트
docker-compose.yml
```

**제품·컬렉션을 추가/수정할 땐 `site/assets/data/catalog.js` 하나만 고친다.**
HTML은 건드리지 않는다. 나중에 DB로 옮길 때도 이 구조를 그대로 쓴다.
컬렉션의 공개 단계는 `reveal` 값으로 정한다.

| 값 | 사이트에서 보이는 모습 |
|---|---|
| `open` | 진행 중 — 한자 · 이름 · 이야기 · 제품까지 전부 |
| `named` | 이름과 이야기까지. 제품은 아직 없다 |
| `veiled` | **빈 자리** — 이름도 한자도 나오지 않는다 |

관리자 → 상품 → 컬렉션 표에서 바꾼다. `status` 는 옛 화면이 쓰는 값이라
관리자가 `reveal` 과 함께 자동으로 맞춰 준다.

### 카탈로그는 세 곳에 있다

```bash
node tools/check-catalog.js --live
```

1. `site/assets/data/catalog.js` — API 가 죽었을 때 쓰는 기본값
2. `server/src/seed-catalog.json` — 서버가 처음 켜질 때 심는 씨앗
3. 도커 볼륨의 `catalog.json` — **실제 운영 데이터** (관리자가 고치는 곳)

1 과 2 는 항상 같아야 한다. 3 은 관리자가 고치므로 값은 달라도 되지만
**구조(항목 목록)가 달라지면 한쪽이 조용히 깨진다.** 위 명령이 그것을 잡아 준다.

씨앗을 고쳤을 때 운영 데이터에 반영하려면 — **관리자가 고쳐 둔 내용이 날아가므로**
`check-catalog.js --live` 로 값이 같은지 먼저 확인할 것:

```bash
ssh -i ~/woonhyangjae/woonhyangjae.pem ubuntu@ssl.woonhyangjae.com "sudo -n docker run --rm -v woonhyangjae_api-data:/d -v /home/ubuntu/git/woonhyangjae/server/src:/s:ro alpine sh -c 'cp /d/catalog.json /d/catalog.before-reseed.json; cp /s/seed-catalog.json /d/catalog.json'"
```

## 웹서버 구성

두 겹이다. 헷갈리지 말 것.

- **호스트 nginx** — HTTPS 종단, www→apex 정리, 보안 헤더, `127.0.0.1:8080`으로 프록시
- **컨테이너 nginx** — 정적 파일만 서빙. TLS·리다이렉트는 전혀 모른다

인증서는 Let's Encrypt, `certbot.timer`로 자동 갱신된다. 최초 세팅은 `deploy/setup-ssl.sh`.

## CSP (콘텐츠 보안 정책)가 엄격하다

호스트 nginx가 강한 CSP를 걸어둔 상태다. 그래서:

- **인라인 `<script>`, 인라인 `style="..."`, `onclick=` 같은 속성을 쓸 수 없다.** 전부 외부 파일로 뺀다.
- 외부 스크립트는 기본 차단. Google Fonts와 Cloudflare Web Analytics만 허용돼 있다.
- 광고 픽셀(GA4, Meta, 카카오) 등을 붙이려면 `deploy/woonhyangjae.com.conf`의
  CSP 줄에 해당 도메인을 먼저 추가해야 한다. 안 하면 조용히 차단된다.

## 관리자 페이지

`/admin/` — HTTP Basic 인증으로 막혀 있다. 계정 파일은 서버의 `/etc/nginx/.htpasswd-admin`.
비밀번호 변경: `printf 'admin:%s\n' "$(openssl passwd -apr1)" | sudo tee /etc/nginx/.htpasswd-admin`

화면은 세 묶음이다.

| 묶음 | 화면 |
|---|---|
| 매일 하는 일 | 오늘 · 주문 · 배송 · 문의 |
| 키우는 일 | 영업 · 고객 · 분석 |
| 가꾸는 일 | 상품 · 사진 · 설정 |

**숫자는 혼자 두지 않는다.** 오늘 매출 옆에는 어제가, 이번 달 옆에는 지난달이,
분석의 모든 값 옆에는 직전 같은 기간이 붙는다. 늘었는지 줄었는지가 없으면
숫자는 판단에 쓰이지 못한다.

- **영업** — 공간 제안 · 도매 문의를 새 문의 → 상담 중 → 견적 보냄 → 성사 / 보류로 옮긴다.
  상담 메모를 남길 수 있고, 명단을 CSV 로 내려받는다.
- **고객** — VIP(누적 50만원↑) · 재구매 · 한 번 구매 · 휴면(6개월↑)으로 나눠 본다.
  화면에 보이는 사람들의 이메일을 한 번에 복사할 수 있다 (뉴스레터용).
- **분석** — 유입 경로별로 방문뿐 아니라 **주문 · 매출 · 구매 전환율**까지 본다.
  주문에 실린 방문 식별자(sid)로 잇는다. 어느 채널에 돈을 쓸지 여기서 정한다.

**데이터는 서버에 저장된다.** 기기를 바꿔도 그대로다. 상품·가격·재고·사진을
관리자에서 고치면 사이트에 바로 반영된다 (배포 불필요).

## 운영 API (server/)

Node + Express. 네이티브 모듈 없이 JSON 파일로 저장한다 — 1GB 서버에 맞춘 선택이다.

| 항목 | 위치 |
|---|---|
| 소스 | `server/src/` (index.js · store.js · auth.js · sms.js · analytics.js) |
| 데이터 | 도커 볼륨 `woonhyangjae_api-data` → 컨테이너의 `/data` |
| 저장물 | 카탈로그 · 주문 · 문의 · 알림신청 · **회원 · 로그인 상태** · 업로드 이미지 · 분석 이벤트 |
| 인증 | `/api/admin/*` 는 nginx Basic 인증. 앱에는 로그인 코드가 없다 |

**백업 대상은 이 볼륨 하나다.**
```bash
sudo -n docker run --rm -v woonhyangjae_api-data:/d -v /home/ubuntu:/out alpine tar czf /out/whj-backup.tgz -C /d .
```

서버 코드를 고쳤으면 반드시 `--build` 를 붙인다.
```bash
ssh ... "cd ~/git/woonhyangjae && sudo -n docker compose up -d --build"
```

`site/assets/data/catalog.js` 는 이제 **API 가 죽었을 때 쓰는 기본값**이다.
운영 데이터의 원본은 서버에 있다. 프론트는 `/api/catalog` 를 먼저 읽고,
실패하면 이 파일로 화면을 채운다.

## 회원

**가입은 구매의 관문이 아니다.** 비회원 주문은 그대로 열어 둔다.
계정은 다음에 또 찾을 때 주소를 다시 적지 않으려고 만드는 것이다.
주문서에서 로그인 상태면 이름·연락처·배송지가 저절로 채워질 뿐이다.

| 화면 | 주소 |
|---|---|
| 로그인 | `/login.html` (`?next=` 로 돌아갈 곳 지정) |
| 회원가입 | `/join.html` |
| 비밀번호 찾기 | `/forgot.html` |
| 새 비밀번호 | `/reset.html?t=토큰` |
| 내 정보 | `/account.html` — 주문 내역 · 회원 정보 · 배송지 · 비밀번호 |

### 비밀번호와 로그인 상태

- 비밀번호는 **원문을 어디에도 남기지 않는다.** Node 내장 `scrypt` 로 해시만 저장한다.
  bcrypt 대신 쓴 이유는 설치가 필요 없고 메모리를 많이 쓰도록 설계돼 GPU 공격에 강해서다.
- 로그인 상태는 서버가 들고 있다(`sessions.json`). 브라우저에는 임의의 긴 문자열
  하나만 **HttpOnly · Secure · SameSite=Lax** 쿠키로 준다. 스크립트가 읽지 못하고,
  서버에서 지우면 즉시 끊긴다.
- 비밀번호를 바꾸면 **다른 기기의 로그인은 모두 끊는다.**
- 로그인 실패는 15분에 8번까지. 그 뒤로는 잠시 막는다.
- **어떤 이메일이 가입돼 있는지 알려 주지 않는다.** 로그인 실패 문구가 늘 같고,
  비밀번호 찾기도 가입 여부와 무관하게 같은 답을 준다.

### 지저분한 가입을 막는 넷

본인확인기관(PASS · 아이핀)은 **사업자 등록과 계약**이 있어야 붙는다.
그전까지도 손댈 수 있는 자리가 넷 있고, 어뷰징의 대부분은 여기서 걸린다.

1. **한 휴대폰 번호에 계정 하나** — 010 · 011 등 휴대폰만 받는다. 집전화 · 070 은 거절
2. **버리는 메일 주소 차단** — mailinator · 10minutemail 등 (`auth.js` 의 `THROWAWAY`)
3. **점과 + 로 늘린 주소를 하나로 본다** — `k.kot+a@gmail.com` 과 `kkot@gmail.com` 은 같은 사람
4. **한 자리에서 계정을 쏟아 내는 것 막기** — IP 기준 속도 제한

### 휴대폰 문자 인증 — 열쇠만 넣으면 켜진다

구조는 다 되어 있다. 여섯 자리 · 5분 · 세 번까지, 번호도 해시로 저장한다.
**문자를 보낼 수 있을 때만** 인증을 요구한다 — 보내지도 못하면서 요구하면
아무도 가입하지 못하기 때문이다.

```bash
# docker-compose.yml 의 api 서비스 environment 에
SMS_PROVIDER=solapi
SMS_KEY=발급받은_키
SMS_SECRET=발급받은_시크릿
SMS_FROM=발신번호          # 사전 등록된 번호여야 한다
VERIFY_PHONE=1            # 이 값이 1 이고 위가 다 채워져야 켜진다
```

솔라피(구 쿨에스엠에스)를 기본으로 둔 이유는 국내 발송이고, 개인도 가입할 수
있으며, 건당 선불이라 시작 비용이 거의 없어서다. 다른 곳을 쓰더라도
`server/src/sms.js` 의 `send()` 하나만 바꾸면 된다.

켜져 있는지 확인: `GET /api/auth/verify/state` → `{ required, ready }`

### ⚠ 메일 발송이 아직 없다

비밀번호 재설정 링크를 자동으로 보내지 못한다. 대신 **관리자 → 고객** 화면에
"보내야 할 비밀번호 재설정 링크"가 뜬다. 운영자가 복사해 직접 보내야 한다.
링크는 30분 뒤 만료되고 한 번 쓰면 다시 못 쓴다.

SMTP 를 붙이는 날 `server/src/index.js` 의 `/api/auth/forgot` 안,
`auth.createReset(user.id)` 다음 줄에 발송 한 줄만 넣으면 된다.

### 탈퇴

계정과 저장된 배송지는 지운다. **주문 기록은 남긴다** — 전자상거래법상
거래 기록은 보관 의무가 있다. 주문에 남은 이름·연락처가 그 부분이다.

## 분석

GA4 없이 자체 수집한다 (`site/assets/js/track.js`). 쿠키를 쓰지 않고 개인정보도
저장하지 않는다. 관리자 분석 탭에서 유입 경로 · 구매 퍼널 · 상품별 조회 대비
구매율 · 스크롤 완주율 · 시간대 · 기기를 본다.

## 보안

- `*.pem`, `*.key`, `.env`는 `.gitignore`로 막아뒀다. **공개 저장소이므로 절대 커밋하지 않는다.**
- 커밋 전 `git status`로 무엇이 올라가는지 확인한다.

## 남은 과제

- [x] 문의 폼 실제 전송 — 서버로 접수되고 관리자 문의 탭에 뜬다
- [x] 관리자 데이터를 실제 저장소로 이관 — 운영 API + 도커 볼륨
- [x] 사진 업로드 — 관리자 사진 보관함, 제품별 5칸 슬롯
- [ ] **가격 확정** — 현재 150,000원은 임시값이다
- [ ] **사업자 정보 입력** — 등록번호 · 통신판매업 신고 · 주소는 법적 필수
- [ ] 제품 사진 촬영 (제품컷 · 연출컷) — 지금은 SVG 일러스트가 자리를 채우고 있다
- [ ] 결제 연동 — 주문서까지는 완결되나 실제 결제는 아직 없다
      (스마트스토어 링크 또는 PG. PG 는 사업자 정보가 있어야 심사 가능)
- [ ] **메일 발송(SMTP) 연결** — 지금은 비밀번호 재설정 링크를 운영자가 직접 보낸다
- [ ] **문자 발송(SMS) 연결** — 열쇠만 넣으면 휴대폰 본인확인이 켜진다 (위 참고)
- [ ] 본인확인기관(PASS · 아이핀) — 사업자 등록 뒤에 검토
- [ ] 네이버 서치어드바이저 · 구글 서치콘솔 등록
- [ ] 개인정보처리방침 · 이용약관 페이지

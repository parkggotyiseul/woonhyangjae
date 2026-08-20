# 운향재 (雲香齋) 홈페이지

자연의 요소를 향으로 옮기는 디퓨저 브랜드. 구정마루 40년 목재 헤리티지를 근거로 삼는다.
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

## 자산 캐시 버전

Cloudflare가 캐시하므로 CSS/JS를 고치면 **모든 HTML의 `?v=` 값을 같이 올린다.**
현재 형식: `?v=20260820d` (날짜 + 알파벳). 안 올리면 방문자에게 예전 파일이 계속 보인다.

## 구조

```
site/            정적 사이트 (컨테이너가 그대로 서빙)
  *.html         페이지 12장
  assets/data/catalog.js   ★ 제품·컬렉션 데이터 원본
  assets/js/page-*.js      페이지별 스크립트
  admin/         관리자 화면 (HTTP Basic 인증으로 보호)
nginx/site.conf  컨테이너 내부 nginx (정적 파일 전담)
deploy/          호스트 nginx 설정 · TLS · Let's Encrypt 스크립트
docker-compose.yml
```

**제품·컬렉션을 추가/수정할 땐 `site/assets/data/catalog.js` 하나만 고친다.**
HTML은 건드리지 않는다. 나중에 DB로 옮길 때도 이 구조를 그대로 쓴다.
`status: "active"` = 진행 중인 장, `"upcoming"` = Coming Soon.

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
현재 데이터는 브라우저 `localStorage`에 저장된다. **아직 진짜 백엔드가 아니다** —
브라우저를 바꾸거나 캐시를 지우면 사라진다. DB 연동은 다음 단계 과제.

## 보안

- `*.pem`, `*.key`, `.env`는 `.gitignore`로 막아뒀다. **공개 저장소이므로 절대 커밋하지 않는다.**
- 커밋 전 `git status`로 무엇이 올라가는지 확인한다.

## 남은 과제

- [ ] 문의 폼 실제 전송 연결 (지금은 메일 앱을 여는 방식이라 모바일에서 유실됨)
- [ ] 관리자 데이터를 localStorage → 실제 저장소로 이관
- [ ] 스마트스토어 구매 링크 연결
- [ ] GA4 / 네이버 서치어드바이저 / 구글 서치콘솔 등록 (CSP 수정 동반)
- [ ] 개인정보처리방침 · 이용약관 페이지

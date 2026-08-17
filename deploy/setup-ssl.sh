#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  운향재 — 호스트 nginx + Let's Encrypt 초기 설정
#  루트 권한 필요:  sudo ./deploy/setup-ssl.sh
#
#  하는 일:
#   1) certbot 설치 확인, ACME webroot 준비
#   2) 인증서 발급 전용 임시 HTTP 서버 블록 기동
#   3) webroot 방식으로 인증서 발급 (apex + www)
#   4) 최종 TLS 설정 배치 후 nginx reload
#   5) 자동 갱신 훅 등록
#
#  전제: woonhyangjae.com 의 A/AAAA 레코드가 이 서버를 향해야 한다.
#        (Cloudflare 프록시 사용 시 80포트 패스스루가 되어야 함 — 기본 동작)
# ══════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="woonhyangjae.com"
EMAIL="${CERTBOT_EMAIL:-whwnsdh3@gmail.com}"
WEBROOT="/var/www/certbot"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log(){ printf '\033[0;36m▸ %s\033[0m\n' "$*"; }
die(){ printf '\033[0;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "루트 권한이 필요합니다: sudo $0"

# ── 1. 준비 ───────────────────────────────────────────────
command -v certbot >/dev/null || {
  log "certbot 설치"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot
}

mkdir -p "$WEBROOT/.well-known/acme-challenge"
chown -R www-data:www-data "$WEBROOT"

mkdir -p /etc/nginx/snippets
install -m 644 "$REPO_DIR/deploy/woonhyangjae-tls.conf"   /etc/nginx/snippets/woonhyangjae-tls.conf
install -m 644 "$REPO_DIR/deploy/cloudflare-realip.conf"  /etc/nginx/snippets/cloudflare-realip.conf

# ── 2. 발급용 임시 HTTP 블록 ──────────────────────────────
if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  log "인증서 발급용 임시 HTTP 서버 블록 배치"
  cat > /etc/nginx/conf.d/00-acme-bootstrap.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    location ^~ /.well-known/acme-challenge/ {
        root $WEBROOT;
        default_type "text/plain";
    }
    location / { return 503; }
}
EOF
  nginx -t && systemctl reload nginx

  # ── 3. 발급 ─────────────────────────────────────────────
  log "Let's Encrypt 인증서 발급 ($DOMAIN, www.$DOMAIN)"
  certbot certonly \
    --webroot -w "$WEBROOT" \
    -d "$DOMAIN" -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos --no-eff-email \
    --non-interactive --keep-until-expiring

  rm -f /etc/nginx/conf.d/00-acme-bootstrap.conf
else
  log "기존 인증서 발견 — 발급 생략"
fi

# ── 4. 최종 설정 배치 ─────────────────────────────────────
log "사이트 설정 배치"
install -m 644 "$REPO_DIR/deploy/$DOMAIN.conf" "/etc/nginx/sites-available/$DOMAIN.conf"
ln -sfn "/etc/nginx/sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
rm -f /etc/nginx/conf.d/00-acme-test.conf

nginx -t || die "nginx 설정 검증 실패"
systemctl reload nginx

# ── 5. 자동 갱신 ──────────────────────────────────────────
log "갱신 훅 등록"
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
# 인증서가 갱신되면 nginx가 새 인증서를 집어들게 한다.
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

systemctl enable --now certbot.timer 2>/dev/null || true

log "완료. 갱신 리허설:  sudo certbot renew --dry-run"
certbot certificates 2>/dev/null | grep -A3 "$DOMAIN" || true

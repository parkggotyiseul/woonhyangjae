/* 문자 발송

   보내는 곳은 갈아 끼울 수 있게 떼어 두었다. 지금은 아무 데도 계약돼 있지
   않아서 "없음" 상태로 돈다. 열쇠를 넣으면 그날부터 실제로 나간다.

   환경 변수
   ─────────────────────────────────────────────────────────
     SMS_PROVIDER   solapi | none        (기본 none)
     SMS_KEY        발급받은 API 키
     SMS_SECRET     발급받은 API 시크릿
     SMS_FROM       발신번호 (사전 등록된 번호여야 한다)

   솔라피(구 쿨에스엠에스)를 기본으로 둔 이유는 국내 발송이고, 개인도
   가입할 수 있으며, 건당 선불이라 시작 비용이 거의 없기 때문이다.
   다른 곳을 쓰더라도 send() 하나만 바꾸면 된다. */
'use strict';

const crypto = require('crypto');

const PROVIDER = process.env.SMS_PROVIDER || 'none';
const KEY = process.env.SMS_KEY || '';
const SECRET = process.env.SMS_SECRET || '';
const FROM = (process.env.SMS_FROM || '').replace(/[^0-9]/g, '');

function ready() {
  return PROVIDER !== 'none' && !!KEY && !!SECRET && !!FROM;
}

/* 솔라피 인증 헤더 — HMAC-SHA256(날짜 + 무작위값) */
function solapiAuth() {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const sig = crypto.createHmac('sha256', SECRET).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${KEY}, date=${date}, salt=${salt}, signature=${sig}`;
}

async function send(to, text) {
  if (!ready()) {
    const e = new Error('문자 발송이 아직 연결되지 않았습니다.');
    e.code = 'SMS_NOT_READY';
    throw e;
  }

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: solapiAuth() },
    body: JSON.stringify({
      message: { to: String(to).replace(/[^0-9]/g, ''), from: FROM, text }
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const e = new Error('문자를 보내지 못했습니다.');
    e.detail = res.status + ' ' + body.slice(0, 200);
    throw e;
  }
  return true;
}

module.exports = { ready, send, PROVIDER };

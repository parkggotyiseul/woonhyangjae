/* 회원 — 비밀번호 · 로그인 상태 · 재설정 토큰

   원칙
   ─────────────────────────────────────────────────────────
   · 비밀번호는 어디에도 원문으로 남기지 않는다. scrypt 로 해시만 저장한다.
     bcrypt 대신 scrypt 를 쓴 이유는 Node 에 이미 들어 있어 설치가 필요 없고,
     메모리를 많이 쓰도록 설계돼 있어 GPU 로 몰아치는 공격에 강하기 때문이다.
   · 로그인 상태는 서버가 들고 있다. 브라우저에는 임의의 긴 문자열 하나만
     쿠키로 준다. 그 문자열만으로는 아무 정보도 알 수 없고, 서버에서 지우면
     즉시 끊긴다.
   · 비교는 반드시 timingSafeEqual 로 한다. 앞자리부터 하나씩 맞춰 보는
     공격을 막기 위해서다.
   · 같은 사람에게 "이 이메일은 없는 계정입니다" 같은 말을 하지 않는다.
     어떤 이메일이 가입돼 있는지 알려 주는 것 자체가 정보 유출이다. */
'use strict';

const crypto = require('crypto');
const store = require('./store');

const SESSION_DAYS = 30;
const RESET_MINUTES = 30;

/* ── 비밀번호 ─────────────────────────────────────────── */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(plain), salt, SCRYPT.keylen, SCRYPT);
  return 'scrypt$' + SCRYPT.N + '$' + SCRYPT.r + '$' + SCRYPT.p + '$' +
    salt.toString('base64') + '$' + key.toString('base64');
}

function verifyPassword(plain, stored) {
  try {
    const [alg, N, r, p, salt, key] = String(stored || '').split('$');
    if (alg !== 'scrypt') return false;
    const want = Buffer.from(key, 'base64');
    const got = crypto.scryptSync(String(plain), Buffer.from(salt, 'base64'), want.length,
      { N: +N, r: +r, p: +p });
    return crypto.timingSafeEqual(want, got);
  } catch (e) {
    return false;
  }
}

/* 최소한의 강도만 막는다. 규칙을 잘게 요구할수록 사람들은 더 나쁜 비밀번호를
   만든다. 길이를 우선하고, 너무 흔한 것만 걸러 낸다. */
const COMMON = [
  '12345678', '123456789', '1234567890', 'password', 'qwerty123',
  'abc123456', '11111111', '00000000', 'iloveyou', 'admin123'
];
function checkPassword(pw) {
  pw = String(pw || '');
  if (pw.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  if (pw.length > 100) return '비밀번호가 너무 깁니다.';
  if (COMMON.indexOf(pw.toLowerCase()) >= 0) return '너무 흔한 비밀번호입니다. 다른 것으로 정해 주세요.';
  if (/^(.)\1+$/.test(pw)) return '같은 글자만으로는 정할 수 없습니다.';
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length;
  if (kinds < 2) return '영문 · 숫자 · 기호 중 두 가지 이상을 섞어 주세요.';
  return null;
}

/* ── 사람이 읽을 수 있는 값 다듬기 ────────────────────── */

function normEmail(v) { return String(v || '').trim().toLowerCase().slice(0, 160); }
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function normPhone(v) { return String(v || '').replace(/[^0-9]/g, '').slice(0, 11); }

/* ── 로그인 상태 ──────────────────────────────────────── */

function newToken() { return crypto.randomBytes(32).toString('base64url'); }

function createSession(userId, meta) {
  const list = store.getSessions();
  const now = Date.now();
  const s = {
    token: newToken(),
    userId,
    at: new Date(now).toISOString(),
    expires: new Date(now + SESSION_DAYS * 86400000).toISOString(),
    agent: String((meta && meta.agent) || '').slice(0, 120)
  };
  /* 오래된 것은 이 참에 치운다. 따로 도는 청소 작업을 두지 않기 위해서다. */
  const alive = list.filter((x) => new Date(x.expires) > now);
  alive.push(s);
  store.saveSessions(alive);
  return s;
}

function readSession(token) {
  if (!token) return null;
  const s = store.getSessions().filter((x) => x.token === token)[0];
  if (!s) return null;
  if (new Date(s.expires) <= Date.now()) return null;
  return s;
}

function dropSession(token) {
  if (!token) return;
  store.saveSessions(store.getSessions().filter((x) => x.token !== token));
}

function dropAllSessions(userId) {
  store.saveSessions(store.getSessions().filter((x) => x.userId !== userId));
}

/* ── 비밀번호 재설정 토큰 ─────────────────────────────── */

function createReset(userId) {
  const now = Date.now();
  const list = store.getResets().filter((x) => new Date(x.expires) > now && x.userId !== userId);
  const r = {
    token: newToken(),
    userId,
    at: new Date(now).toISOString(),
    expires: new Date(now + RESET_MINUTES * 60000).toISOString(),
    used: false
  };
  list.push(r);
  store.saveResets(list);
  return r;
}

function readReset(token) {
  if (!token) return null;
  const r = store.getResets().filter((x) => x.token === token)[0];
  if (!r || r.used) return null;
  if (new Date(r.expires) <= Date.now()) return null;
  return r;
}

function useReset(token) {
  const list = store.getResets();
  const i = list.findIndex((x) => x.token === token);
  if (i < 0) return;
  list[i].used = true;
  store.saveResets(list);
}

/* ── 시도 횟수 제한 ───────────────────────────────────
   같은 열쇠(이메일 또는 주소)로 짧은 시간에 여러 번 틀리면 잠깐 쉬게 한다.
   서버가 하나뿐이므로 메모리에 둔다. 재시작하면 풀리지만 그것으로 충분하다. */
const tries = new Map();
const WINDOW = 15 * 60 * 1000;
const LIMIT = 8;

function tooMany(key) {
  const now = Date.now();
  const rec = tries.get(key);
  if (!rec || now - rec.first > WINDOW) return false;
  return rec.n >= LIMIT;
}
function noteFail(key) {
  const now = Date.now();
  const rec = tries.get(key);
  if (!rec || now - rec.first > WINDOW) tries.set(key, { first: now, n: 1 });
  else rec.n += 1;
  /* 지도가 무한히 자라지 않도록 가끔 청소한다 */
  if (tries.size > 5000) {
    for (const [k, v] of tries) if (now - v.first > WINDOW) tries.delete(k);
  }
}
function clearFails(key) { tries.delete(key); }

/* ── 쿠키 ─────────────────────────────────────────────
   HttpOnly 라 자바스크립트가 읽지 못한다. 스크립트가 끼어들어도 훔쳐 갈 수 없다.
   SameSite=Lax 는 다른 사이트에서 넘어오는 요청에 쿠키를 붙이지 않는다는 뜻이다. */
const COOKIE = 'whj_s';

function setCookie(res, token) {
  res.append('Set-Cookie', COOKIE + '=' + token +
    '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + (SESSION_DAYS * 86400));
}
function clearCookie(res) {
  res.append('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}
function readCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return '';
}

/* 요청에 실린 로그인 정보를 붙여 준다. 없으면 그냥 비워 둔다. */
function attachUser(req, res, next) {
  req.session = readSession(readCookie(req));
  req.user = req.session ? store.findUserById(req.session.userId) : null;
  if (req.session && !req.user) {           // 탈퇴한 계정의 남은 쿠키
    dropSession(req.session.token);
    req.session = null;
    clearCookie(res);
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });
  next();
}

/* 화면에 내보내도 되는 것만 골라서 준다. 해시는 절대 나가지 않는다. */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, email: u.email, name: u.name, phone: u.phone || '',
    address: u.address || null,
    marketing: !!u.marketing,
    at: u.at
  };
}

module.exports = {
  hashPassword, verifyPassword, checkPassword,
  normEmail, validEmail, normPhone,
  createSession, readSession, dropSession, dropAllSessions,
  createReset, readReset, useReset,
  tooMany, noteFail, clearFails,
  setCookie, clearCookie, readCookie, attachUser, requireUser, publicUser,
  RESET_MINUTES
};

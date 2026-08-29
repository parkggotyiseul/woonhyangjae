/* 운향재 운영 API
   /api/*  — nginx 가 이 컨테이너로 프록시한다.
   관리자 경로(/api/admin/*)는 nginx 의 Basic 인증이 앞단에서 막아준다.
   그래서 여기에는 별도의 로그인 코드가 없다. 인증을 nginx 한 곳에서만 관리한다. */
'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const store = require('./store');
const auth = require('./auth');
const sms = require('./sms');
const analytics = require('./analytics');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

/* 쿠키가 있을 때만 로그인 상태를 찾아 붙인다. 손님에게는 파일을 읽지 않는다.
   주문 라우트보다 앞에 있어야 주문에 회원 번호가 남는다. */
app.use(auth.attachUser);

const PORT = Number(process.env.PORT || 8090);

/* ── 업로드 ────────────────────────────────────────────
   원본 파일명을 그대로 쓰지 않는다. 한글·공백·확장자 위조를 피하고
   경로 탈출을 원천 차단하기 위해 서버가 이름을 새로 짓는다. */
const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, store.UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED[file.mimetype] || '.bin';
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = crypto.randomBytes(4).toString('hex');
      const slug = String(req.body.slug || 'img').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'img';
      cb(null, `${stamp}-${slug}-${rand}${ext}`);
    }
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED[file.mimetype])
});

/* ═══ 공개 API ═══════════════════════════════════════ */

app.get('/api/health', (req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

/* 프론트가 읽는 카탈로그 */
app.get('/api/catalog', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(store.getCatalog());
});

/* 분석 이벤트 수집 — 개인 식별 정보는 받지 않는다 */
app.post('/api/track', (req, res) => {
  const b = req.body || {};
  const type = String(b.type || '').slice(0, 24);
  if (!type) return res.status(400).json({ ok: false });

  store.addEvent({
    at: new Date().toISOString(),
    type,
    sid: String(b.sid || '').slice(0, 40),
    path: String(b.path || '').slice(0, 120),
    ref: String(b.ref || '').slice(0, 200),
    mobile: !!b.mobile,
    dwell: Number(b.dwell) || 0,
    depth: Number(b.depth) || 0,
    step: String(b.step || '').slice(0, 24),
    slug: String(b.slug || '').slice(0, 60)
  });
  res.status(204).end();
});

/* 주문 접수 */
app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  if (!b.buyer || !b.lines || !b.lines.length) {
    return res.status(400).json({ ok: false, message: '주문 정보가 올바르지 않습니다.' });
  }
  const order = {
    id: 'WHJ' + Date.now().toString().slice(-9),
    at: new Date().toISOString(),
    channel: 'own',
    /* 로그인 상태로 주문했다면 회원 번호를 남긴다. 비회원 주문은 빈 값이다. */
    userId: (req.user && req.user.id) || '',
    status: 'received',
    buyer: b.buyer,
    shipping: b.shipping || {},
    gift: b.gift || null,
    pay: b.pay || '',
    lines: b.lines,
    totals: b.totals || {},
    invoice: '',
    courier: '',
    memo: ''
  };
  store.addOrder(order);
  res.json({ ok: true, id: order.id });
});

/* 주문 조회 — 주문번호 + 주문자명이 함께 맞아야 열어준다 */
app.get('/api/orders/:id', (req, res) => {
  const name = String(req.query.name || '').trim();
  const o = store.getOrders().find((x) => x.id === req.params.id);
  if (!o || !name || o.buyer.name !== name) {
    return res.status(404).json({ ok: false, message: '주문을 찾을 수 없습니다.' });
  }
  res.json({ ok: true, order: o });
});

/* 출시 알림 신청 */
app.post('/api/subscribe', (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: '이메일 주소를 확인해 주세요.' });
  }
  store.addSubscriber(email, String((req.body || {}).target || ''));
  res.json({ ok: true });
});

/* 문의 접수 */
app.post('/api/inquiries', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.message) {
    return res.status(400).json({ ok: false, message: '필수 항목을 확인해 주세요.' });
  }
  const item = {
    id: 'Q' + Date.now().toString().slice(-9),
    at: new Date().toISOString(),
    status: 'open',
    type: String(b.type || 'etc'),
    name: String(b.name).slice(0, 60),
    email: String(b.email).slice(0, 120),
    phone: String(b.phone || '').slice(0, 40),
    company: String(b.company || '').slice(0, 80),
    space: String(b.space || '').slice(0, 40),
    quantity: String(b.quantity || '').slice(0, 40),
    message: String(b.message).slice(0, 4000)
  };
  store.addInquiry(item);
  res.json({ ok: true, id: item.id });
});

/* ═══ 회원 ═════════════════════════════════════════════

   비회원 주문은 그대로 둔다. 계정은 "다음에 또 살 때 편하려고" 만드는 것이지,
   물건을 사기 위한 관문이 아니다. 주문서에서 회원이면 정보가 채워질 뿐이다.

   같은 사람에게 어떤 이메일이 가입돼 있는지 알려 주지 않는다. 로그인 실패와
   비밀번호 찾기 응답이 늘 같은 이유다.                                    */

/* 문자를 보낼 수 있을 때만 인증을 요구한다.
   보내지도 못하면서 요구하면 아무도 가입하지 못한다. */
const VERIFY_PHONE = process.env.VERIFY_PHONE === '1' && sms.ready();

function clientKey(req) {
  return (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
}

/* 가입 */
app.post('/api/auth/join', (req, res) => {
  const b = req.body || {};
  const email = auth.normEmail(b.email);
  const name = String(b.name || '').trim().slice(0, 40);
  const phone = auth.normPhone(b.phone);
  const pw = String(b.password || '');

  if (!name) return res.status(400).json({ ok: false, field: 'name', message: '성함을 입력해 주세요.' });
  if (!auth.validEmail(email)) return res.status(400).json({ ok: false, field: 'email', message: '이메일 주소를 확인해 주세요.' });
  if (auth.throwawayEmail(email)) {
    return res.status(400).json({ ok: false, field: 'email',
      message: '잠시 쓰고 버리는 메일 주소로는 가입하실 수 없습니다.' });
  }
  if (!auth.validMobile(phone)) {
    return res.status(400).json({ ok: false, field: 'phone', message: '휴대폰 번호를 확인해 주세요.' });
  }
  const bad = auth.checkPassword(pw);
  if (bad) return res.status(400).json({ ok: false, field: 'password', message: bad });
  if (!b.agreeTerms || !b.agreePrivacy) {
    return res.status(400).json({ ok: false, field: 'agree', message: '필수 약관에 동의해 주세요.' });
  }

  /* 한 자리에서 계정을 쏟아 내는 것을 막는다 */
  const joinKey = 'join:' + clientKey(req);
  if (auth.tooMany(joinKey)) {
    return res.status(429).json({ ok: false, message: '가입 시도가 너무 잦습니다. 잠시 뒤에 다시 해 주세요.' });
  }
  auth.noteFail(joinKey);

  /* 같은 주소를 점과 + 로 늘린 것까지 하나로 본다 */
  const identity = auth.emailIdentity(email);
  const users = store.getUsers();
  if (users.some((u) => auth.emailIdentity(u.email) === identity)) {
    return res.status(409).json({ ok: false, field: 'email', message: '이미 가입된 이메일입니다. 로그인해 주세요.' });
  }
  /* 한 휴대폰 번호에 계정 하나 */
  if (users.some((u) => u.phone === phone)) {
    return res.status(409).json({ ok: false, field: 'phone',
      message: '이미 가입에 쓰인 번호입니다. 비밀번호를 잊으셨다면 재설정해 주세요.' });
  }

  /* 본인확인을 켜 두었다면, 인증을 마친 표가 있어야 가입된다 */
  let verified = false;
  if (VERIFY_PHONE) {
    if (!auth.useVerifyToken(phone, String(b.verifyToken || ''))) {
      return res.status(400).json({ ok: false, field: 'phone', message: '휴대폰 인증을 먼저 마쳐 주세요.' });
    }
    verified = true;
  }

  const now = new Date().toISOString();
  const user = store.addUser({
    id: 'U' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    email, name, phone,
    password: auth.hashPassword(pw),
    address: null,
    marketing: !!b.marketing,
    phoneVerified: verified,
    agreedAt: now,
    at: now
  });

  const sess = auth.createSession(user.id, { agent: req.headers['user-agent'] });
  auth.setCookie(res, sess.token);
  res.json({ ok: true, user: auth.publicUser(user) });
});

/* ── 휴대폰 본인확인 ────────────────────────────────────

   본인확인기관(PASS · 아이핀)은 사업자 등록과 계약이 있어야 붙는다.
   그 전 단계로 문자 인증을 둔다. 실물 번호 하나에 계정 하나가 되므로
   지저분한 아이디가 쏟아지는 것은 여기서 대부분 막힌다.

   발송처가 연결돼 있지 않으면 인증을 켜지 않는다. 켜 두고 못 보내면
   아무도 가입하지 못하기 때문이다(VERIFY_PHONE 가 그 스위치다).      */
app.get('/api/auth/verify/state', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, required: VERIFY_PHONE, ready: sms.ready() });
});

app.post('/api/auth/verify/send', async (req, res) => {
  if (!VERIFY_PHONE) {
    return res.status(400).json({ ok: false, message: '지금은 휴대폰 인증을 받지 않습니다.' });
  }
  const phone = auth.normPhone((req.body || {}).phone);
  if (!auth.validMobile(phone)) {
    return res.status(400).json({ ok: false, field: 'phone', message: '휴대폰 번호를 확인해 주세요.' });
  }
  if (store.getUsers().some((u) => u.phone === phone)) {
    return res.status(409).json({ ok: false, field: 'phone',
      message: '이미 가입에 쓰인 번호입니다. 비밀번호를 잊으셨다면 재설정해 주세요.' });
  }
  if (auth.sentRecently(phone, 60)) {
    return res.status(429).json({ ok: false, message: '방금 보내 드렸습니다. 1분 뒤에 다시 받아 주세요.' });
  }
  const key = 'sms:' + clientKey(req);
  if (auth.tooMany(key)) {
    return res.status(429).json({ ok: false, message: '요청이 너무 잦습니다. 잠시 뒤에 다시 해 주세요.' });
  }
  auth.noteFail(key);

  const code = auth.issueCode(phone);
  try {
    await sms.send(phone, '[운향재] 인증번호 ' + code + ' — ' + auth.CODE_MINUTES + '분 안에 입력해 주세요.');
  } catch (e) {
    return res.status(503).json({ ok: false, message: '문자를 보내지 못했습니다. 잠시 뒤에 다시 해 주세요.' });
  }
  res.json({ ok: true, minutes: auth.CODE_MINUTES });
});

app.post('/api/auth/verify/check', (req, res) => {
  const b = req.body || {};
  const phone = auth.normPhone(b.phone);
  const r = auth.checkCode(phone, String(b.code || ''));
  if (!r.ok) return res.status(400).json({ ok: false, field: 'code', message: r.message });
  res.json({ ok: true, verifyToken: r.token, minutes: auth.VERIFY_MINUTES });
});

/* 로그인 */
app.post('/api/auth/login', (req, res) => {
  const b = req.body || {};
  const email = auth.normEmail(b.email);
  const key = 'login:' + email + ':' + clientKey(req);

  if (auth.tooMany(key)) {
    return res.status(429).json({ ok: false, message: '시도가 너무 잦습니다. 15분 뒤에 다시 해 주세요.' });
  }

  const user = store.findUserByEmail(email);
  const ok = user && auth.verifyPassword(String(b.password || ''), user.password);
  if (!ok) {
    auth.noteFail(key);
    /* 어느 쪽이 틀렸는지 말하지 않는다 */
    return res.status(401).json({ ok: false, message: '이메일 또는 비밀번호가 맞지 않습니다.' });
  }

  auth.clearFails(key);
  const sess = auth.createSession(user.id, { agent: req.headers['user-agent'] });
  auth.setCookie(res, sess.token);
  res.json({ ok: true, user: auth.publicUser(user) });
});

/* 로그아웃 */
app.post('/api/auth/logout', (req, res) => {
  if (req.session) auth.dropSession(req.session.token);
  auth.clearCookie(res);
  res.json({ ok: true });
});

/* 지금 누구인가 */
app.get('/api/auth/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, user: auth.publicUser(req.user) });
});

/* 내 정보 고치기 */
app.patch('/api/auth/me', auth.requireUser, (req, res) => {
  const b = req.body || {};
  const patch = {};
  if ('name' in b) {
    const name = String(b.name || '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ ok: false, field: 'name', message: '성함을 입력해 주세요.' });
    patch.name = name;
  }
  if ('phone' in b) {
    const phone = auth.normPhone(b.phone);
    if (phone && phone.length < 10) return res.status(400).json({ ok: false, field: 'phone', message: '연락처를 확인해 주세요.' });
    patch.phone = phone;
  }
  if ('marketing' in b) patch.marketing = !!b.marketing;
  if ('address' in b) {
    const a = b.address || {};
    patch.address = a && (a.addr || a.zip) ? {
      receiver: String(a.receiver || '').slice(0, 40),
      zip: String(a.zip || '').slice(0, 10),
      addr: String(a.addr || '').slice(0, 200),
      memo: String(a.memo || '').slice(0, 200)
    } : null;
  }
  const u = store.updateUser(req.user.id, patch);
  res.json({ ok: true, user: auth.publicUser(u) });
});

/* 비밀번호 바꾸기 — 지금 것을 확인한 뒤에만 */
app.post('/api/auth/password', auth.requireUser, (req, res) => {
  const b = req.body || {};
  if (!auth.verifyPassword(String(b.current || ''), req.user.password)) {
    return res.status(400).json({ ok: false, field: 'current', message: '지금 비밀번호가 맞지 않습니다.' });
  }
  const bad = auth.checkPassword(String(b.next || ''));
  if (bad) return res.status(400).json({ ok: false, field: 'next', message: bad });

  store.updateUser(req.user.id, { password: auth.hashPassword(String(b.next)) });
  /* 다른 기기에 남아 있던 로그인은 모두 끊고, 지금 이 기기만 다시 열어 준다. */
  auth.dropAllSessions(req.user.id);
  const sess = auth.createSession(req.user.id, { agent: req.headers['user-agent'] });
  auth.setCookie(res, sess.token);
  res.json({ ok: true, message: '비밀번호를 바꿨습니다. 다른 기기의 로그인은 모두 끊었습니다.' });
});

/* 탈퇴 */
app.delete('/api/auth/me', auth.requireUser, (req, res) => {
  const b = req.body || {};
  if (!auth.verifyPassword(String(b.password || ''), req.user.password)) {
    return res.status(400).json({ ok: false, field: 'password', message: '비밀번호가 맞지 않습니다.' });
  }
  auth.dropAllSessions(req.user.id);
  store.removeUser(req.user.id);
  auth.clearCookie(res);
  res.json({ ok: true });
});

/* 비밀번호 재설정 요청 —
   메일 발송이 아직 연결되지 않았다. 토큰은 만들어 두고 관리자 화면에
   "보내야 할 재설정 링크"로 띄운다. 운영자가 직접 전해 주면 된다.
   SMTP 가 붙는 날 이 자리에 발송 한 줄만 넣으면 된다. */
app.post('/api/auth/forgot', (req, res) => {
  const email = auth.normEmail((req.body || {}).email);
  const key = 'forgot:' + clientKey(req);
  if (auth.tooMany(key)) {
    return res.status(429).json({ ok: false, message: '시도가 너무 잦습니다. 잠시 뒤에 다시 해 주세요.' });
  }
  auth.noteFail(key);

  const user = store.findUserByEmail(email);
  if (user) auth.createReset(user.id);

  /* 가입 여부와 상관없이 같은 답을 준다 */
  res.json({ ok: true, message: '재설정 안내를 보내 드립니다. 메일함을 확인해 주세요.' });
});

/* 재설정 토큰이 살아 있는지 */
app.get('/api/auth/reset', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: !!auth.readReset(String(req.query.t || '')) });
});

/* 새 비밀번호로 바꾸기 */
app.post('/api/auth/reset', (req, res) => {
  const b = req.body || {};
  const r = auth.readReset(String(b.token || ''));
  if (!r) return res.status(400).json({ ok: false, message: '만료되었거나 이미 사용한 링크입니다. 다시 요청해 주세요.' });
  const bad = auth.checkPassword(String(b.password || ''));
  if (bad) return res.status(400).json({ ok: false, field: 'password', message: bad });

  store.updateUser(r.userId, { password: auth.hashPassword(String(b.password)) });
  auth.useReset(r.token);
  auth.dropAllSessions(r.userId);
  res.json({ ok: true, message: '비밀번호를 바꿨습니다. 새 비밀번호로 로그인해 주세요.' });
});

/* 내 주문 내역 */
app.get('/api/auth/orders', auth.requireUser, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = req.user.email;
  const list = store.getOrders().filter((o) =>
    o.userId === req.user.id || ((o.buyer && o.buyer.email || '').toLowerCase() === email));
  res.json({ ok: true, orders: list });
});

/* ═══ 관리자 API — 앞단 nginx Basic 인증으로 보호된다 ═══ */

app.get('/api/admin/summary', (req, res) => {
  const catalog = store.getCatalog();
  const orders = store.getOrders();
  const inquiries = store.getInquiries();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const lowStock = [];
  for (const p of catalog.products || []) {
    for (const v of p.variants || []) {
      if (v.stock <= 5) lowStock.push({ name: p.nameKo || p.number, option: v.name, stock: v.stock });
    }
  }

  /* 취소·환불 건은 매출에서 뺀다 */
  const live = orders.filter((o) => o.status !== 'canceled');
  const sum = (list) => list.reduce((a, o) => a + ((o.totals && o.totals.total) || 0), 0);
  const onDay = (d) => live.filter((o) => (o.at || '').slice(0, 10) === d);
  const onMonth = (m) => live.filter((o) => (o.at || '').slice(0, 7) === m);

  const shift = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const prevMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  /* 최근 14일 매출 — 대시보드의 작은 막대 그래프에 쓴다 */
  const trend = [];
  for (let i = 13; i >= 0; i--) {
    const d = shift(i);
    const list = onDay(d);
    trend.push({ date: d, revenue: sum(list), orders: list.length });
  }

  /* 영업 파이프라인 — 공간 제안과 도매 문의만 따로 센다 */
  const deals = inquiries.filter((q) => q.type === 'b2b' || q.type === 'wholesale');
  const stageOf = (q) => q.stage || (q.status === 'open' ? 'new' : 'closed');
  const dealStages = {};
  for (const q of deals) dealStages[stageOf(q)] = (dealStages[stageOf(q)] || 0) + 1;

  res.json({
    pending: {
      newOrders: orders.filter((o) => o.status === 'received').length,
      toShip: orders.filter((o) => o.status === 'ready').length,
      openInquiries: inquiries.filter((q) => q.status === 'open').length,
      openDeals: deals.filter((q) => stageOf(q) !== 'closed' && stageOf(q) !== 'won').length,
      lowStock: lowStock.length
    },
    lowStock,
    today: { revenue: sum(onDay(today)), orders: onDay(today).length },
    yesterday: { revenue: sum(onDay(shift(1))), orders: onDay(shift(1)).length },
    month: { revenue: sum(onMonth(month)), orders: onMonth(month).length },
    lastMonth: { revenue: sum(onMonth(prevMonth)), orders: onMonth(prevMonth).length },
    trend,
    deals: { total: deals.length, stages: dealStages },
    subscribers: store.getSubscribers().length,
    recentOrders: orders.slice(0, 5)
  });
});

app.get('/api/admin/catalog', (req, res) => res.json(store.getCatalog()));

app.put('/api/admin/catalog', (req, res) => {
  const c = req.body;
  if (!c || !Array.isArray(c.collections) || !Array.isArray(c.products)) {
    return res.status(400).json({ ok: false, message: '카탈로그 형식이 올바르지 않습니다.' });
  }
  store.saveCatalog(c);
  res.json({ ok: true });
});

app.get('/api/admin/orders', (req, res) => res.json(store.getOrders()));

app.patch('/api/admin/orders/:id', (req, res) => {
  const allowed = ['status', 'invoice', 'courier', 'memo'];
  const patch = {};
  for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
  const o = store.updateOrder(req.params.id, patch);
  if (!o) return res.status(404).json({ ok: false });
  res.json({ ok: true, order: o });
});

/* 송장 일괄 등록 — [{ id, courier, invoice }] */
app.post('/api/admin/orders/invoices', (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  let done = 0;
  for (const r of rows) {
    if (!r.id || !r.invoice) continue;
    const o = store.updateOrder(r.id, {
      invoice: String(r.invoice), courier: String(r.courier || ''), status: 'shipped'
    });
    if (o) done++;
  }
  res.json({ ok: true, updated: done });
});

app.get('/api/admin/inquiries', (req, res) => res.json(store.getInquiries()));
/* status 는 답장했는지 여부, stage 는 영업이 어디까지 갔는지다.
   memo 는 통화 내용처럼 다음에 볼 때 필요한 한 줄을 남기는 자리다. */
app.patch('/api/admin/inquiries/:id', (req, res) => {
  const b = req.body || {};
  const patch = {};
  if ('status' in b) patch.status = String(b.status || 'open');
  if ('stage' in b) patch.stage = String(b.stage || 'new').slice(0, 20);
  if ('memo' in b) patch.memo = String(b.memo || '').slice(0, 2000);
  const q = store.updateInquiry(req.params.id, patch);
  if (!q) return res.status(404).json({ ok: false });
  res.json({ ok: true, inquiry: q });
});

app.get('/api/admin/subscribers', (req, res) => res.json(store.getSubscribers()));

/* 회원 명단 — 비밀번호 해시는 절대 내보내지 않는다 */
app.get('/api/admin/users', (req, res) => {
  res.json(store.getUsers().map((u) => auth.publicUser(u)));
});

/* 아직 쓰이지 않은 비밀번호 재설정 요청.
   메일 발송이 붙기 전까지는 운영자가 이 링크를 직접 전해 준다. */
app.get('/api/admin/resets', (req, res) => {
  const now = Date.now();
  const users = store.getUsers();
  const list = store.getResets()
    .filter((r) => !r.used && new Date(r.expires) > now)
    .map((r) => {
      const u = users.filter((x) => x.id === r.userId)[0];
      return {
        email: u ? u.email : '(탈퇴한 회원)',
        name: u ? u.name : '',
        at: r.at,
        expires: r.expires,
        url: 'https://woonhyangjae.com/reset.html?t=' + r.token
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  res.json(list);
});

app.get('/api/admin/analytics', (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  res.json(analytics.summarize(days));
});

/* 이미지 업로드 · 목록 · 삭제 */
app.post('/api/admin/uploads', upload.array('files', 10), (req, res) => {
  const files = (req.files || []).map((f) => ({
    name: f.filename, url: `/uploads/${f.filename}`, size: f.size
  }));
  if (!files.length) {
    return res.status(400).json({ ok: false, message: '이미지 파일만 올릴 수 있습니다 (JPG · PNG · WebP · AVIF · SVG).' });
  }
  res.json({ ok: true, files });
});

app.get('/api/admin/uploads', (req, res) => res.json(store.listUploads()));

app.delete('/api/admin/uploads/:name', (req, res) => {
  const ok = store.removeUpload(req.params.name);
  res.status(ok ? 200 : 404).json({ ok });
});

/* multer 등에서 던진 오류를 사람이 읽을 수 있는 메시지로 */
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, message: '이미지 한 장은 12MB 까지 올릴 수 있습니다.' });
  }
  console.error('[api]', err && err.message);
  res.status(500).json({ ok: false, message: '서버에서 처리하지 못했습니다.' });
});

/* 하루 한 번 오래된 이벤트 정리 */
store.pruneEvents();
setInterval(() => store.pruneEvents(), 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[api] listening on ${PORT}, data at ${store.DATA_DIR}`);
});

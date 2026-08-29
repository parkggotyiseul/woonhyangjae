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
const analytics = require('./analytics');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

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

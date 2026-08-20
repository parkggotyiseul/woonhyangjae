/* 파일 기반 저장소.
   제품 수십 개 · 주문 수천 건 규모에서는 DB 엔진 없이 JSON 파일로 충분하다.
   네이티브 모듈을 끌어들이지 않아 1GB 서버에서 빌드와 운영이 가볍다.
   나중에 규모가 커지면 이 파일의 함수 시그니처만 유지한 채 내부를 RDB 로 바꾸면 된다. */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const EVENT_DIR = path.join(DATA_DIR, 'events');

for (const dir of [DATA_DIR, UPLOAD_DIR, EVENT_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

/* ── 원자적 쓰기 ────────────────────────────────────────
   임시 파일에 쓰고 rename 한다. 쓰는 도중 프로세스가 죽어도
   기존 파일이 반쯤 덮여 깨지는 일이 없다. */
function writeJson(file, value) {
  const full = path.join(DATA_DIR, file);
  const tmp = `${full}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, full);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch (e) {
    return fallback;
  }
}

/* ── 카탈로그 ─────────────────────────────────────────── */
function getCatalog() {
  let c = readJson('catalog.json', null);
  if (!c) {
    c = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-catalog.json'), 'utf8'));
    writeJson('catalog.json', c);
  }
  return c;
}
function saveCatalog(c) {
  // 되돌릴 수 있도록 직전 버전을 남긴다
  const prev = readJson('catalog.json', null);
  if (prev) writeJson('catalog.prev.json', prev);
  writeJson('catalog.json', c);
  return c;
}

/* ── 주문 ─────────────────────────────────────────────── */
function getOrders() { return readJson('orders.json', []); }
function saveOrders(list) { writeJson('orders.json', list); return list; }

function addOrder(order) {
  const list = getOrders();
  list.unshift(order);
  saveOrders(list);
  return order;
}
function updateOrder(id, patch) {
  const list = getOrders();
  const i = list.findIndex((o) => o.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
  saveOrders(list);
  return list[i];
}

/* ── 알림 신청자 ──────────────────────────────────────── */
function getSubscribers() { return readJson('subscribers.json', []); }
function addSubscriber(email, target) {
  const list = getSubscribers();
  if (list.some((s) => s.email === email && s.target === target)) return list;
  list.push({ email, target: target || '', at: new Date().toISOString() });
  writeJson('subscribers.json', list);
  return list;
}

/* ── 문의 ─────────────────────────────────────────────── */
function getInquiries() { return readJson('inquiries.json', []); }
function addInquiry(item) {
  const list = getInquiries();
  list.unshift(item);
  writeJson('inquiries.json', list);
  return item;
}
function updateInquiry(id, patch) {
  const list = getInquiries();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  writeJson('inquiries.json', list);
  return list[i];
}

/* ── 분석 이벤트 ──────────────────────────────────────────
   날짜별 JSONL 로 append 한다. 조회는 필요한 날짜 파일만 읽는다.
   개인 식별 정보는 저장하지 않는다 — IP 도, 쿠키도 쓰지 않는다. */
function eventFile(date) {
  return path.join(EVENT_DIR, `${date}.jsonl`);
}
function addEvent(ev) {
  const date = new Date().toISOString().slice(0, 10);
  fs.appendFileSync(eventFile(date), JSON.stringify(ev) + '\n', 'utf8');
}
function readEvents(days) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const f = eventFile(d.toISOString().slice(0, 10));
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line)); } catch (e) { /* 깨진 줄은 건너뛴다 */ }
    }
  }
  return out;
}
/* 오래된 이벤트 파일 정리 — 기본 90일 보관 */
function pruneEvents(keepDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  for (const f of fs.readdirSync(EVENT_DIR)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (m && new Date(m[1]) < cutoff) {
      try { fs.unlinkSync(path.join(EVENT_DIR, f)); } catch (e) {}
    }
  }
}

/* ── 업로드 이미지 ────────────────────────────────────── */
function listUploads() {
  return fs.readdirSync(UPLOAD_DIR)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const st = fs.statSync(path.join(UPLOAD_DIR, f));
      return { name: f, url: `/uploads/${f}`, size: st.size, at: st.mtime.toISOString() };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
function removeUpload(name) {
  // 경로 탈출 방지 — 파일명만 허용한다
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return false;
  const p = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}

module.exports = {
  DATA_DIR, UPLOAD_DIR,
  getCatalog, saveCatalog,
  getOrders, saveOrders, addOrder, updateOrder,
  getSubscribers, addSubscriber,
  getInquiries, addInquiry, updateInquiry,
  addEvent, readEvents, pruneEvents,
  listUploads, removeUpload
};

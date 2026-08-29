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

/* ── 카탈로그 ───────────────────────────────────────────

   운영 데이터는 볼륨의 catalog.json 이다. 씨앗은 처음 한 번만 심긴다.
   그래서 씨앗의 컬렉션 글(장의 이름 · 이야기 · 공개 단계)을 고쳐도
   이미 돌고 있는 서버에는 영영 반영되지 않는 문제가 있었다.
   운영 데이터를 손으로 덮어쓰면 관리자가 고친 가격·재고까지 날아간다.

   그래서 컬렉션 글에만 판 번호를 붙였다. 씨앗의 번호가 더 크면
   컬렉션 부분만 갈아 끼우고, 제품·가격·재고는 그대로 둔다.
   장의 이름이나 순서, 공개 단계를 바꿀 때 씨앗의 _collectionsVersion 을
   한 칸 올리면 다음 배포에서 저절로 따라온다. */
function readSeed() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-catalog.json'), 'utf8'));
}

function getCatalog() {
  let c = readJson('catalog.json', null);
  if (!c) {
    c = readSeed();
    writeJson('catalog.json', c);
    return c;
  }

  const seed = readSeed();
  const have = Number(c._collectionsVersion) || 0;
  const want = Number(seed._collectionsVersion) || 0;
  if (want > have) {
    writeJson('catalog.prev.json', c);       // 되돌릴 수 있게 남긴다
    c.collections = seed.collections;
    c._collectionNote = seed._collectionNote;
    c._collectionsVersion = want;
    // 관리자가 채운 값이 있으면 그것을 살리고, 빈 자리만 씨앗으로 메운다
    c.brand = Object.assign({}, seed.brand, c.brand);
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

/* ── 회원 ─────────────────────────────────────────────────
   비밀번호는 해시만 들어간다. 원문은 어디에도 남지 않는다.
   탈퇴하면 이 목록에서 지운다 — 주문 기록에는 이름과 연락처가 남지만
   그것은 거래 기록이라 전자상거래법상 보관 의무가 있는 부분이다. */
function getUsers() { return readJson("users.json", []); }
function saveUsers(list) { writeJson("users.json", list); return list; }
function findUserByEmail(email) {
  return getUsers().filter((u) => u.email === email)[0] || null;
}
function findUserById(id) {
  return getUsers().filter((u) => u.id === id)[0] || null;
}
function addUser(u) {
  const list = getUsers();
  list.push(u);
  saveUsers(list);
  return u;
}
function updateUser(id, patch) {
  const list = getUsers();
  const i = list.findIndex((u) => u.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
  saveUsers(list);
  return list[i];
}
function removeUser(id) {
  saveUsers(getUsers().filter((u) => u.id !== id));
}

/* 로그인 상태와 비밀번호 재설정 토큰 */
function getSessions() { return readJson("sessions.json", []); }
function saveSessions(list) { writeJson("sessions.json", list); return list; }
function getResets() { return readJson("resets.json", []); }
function getVerifications() { return readJson("verifications.json", []); }
function saveVerifications(list) { writeJson("verifications.json", list); return list; }
function saveResets(list) { writeJson("resets.json", list); return list; }

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
  getUsers, saveUsers, findUserByEmail, findUserById, addUser, updateUser, removeUser,
  getSessions, saveSessions, getResets, saveResets,
  getVerifications, saveVerifications,
  addEvent, readEvents, pruneEvents,
  listUploads, removeUpload
};

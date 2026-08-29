/* 마케터가 실제로 판단에 쓰는 숫자만 뽑는다.

   두 구간을 한 번에 계산한다. 고른 기간(예: 최근 30일)과 그 직전 30일이다.
   "지난달보다 늘었는가"를 볼 수 없으면 숫자는 판단에 쓰이지 못한다.

   유입 경로별 매출은 주문에 실린 sid 로 잇는다. 방문의 첫 페이지에서 알아낸
   경로를 그 방문에 붙여 두고, 그 방문에서 주문이 나오면 매출을 그 경로에 얹는다.
   쿠키는 쓰지 않는다. sid 는 방문자 브라우저의 sessionStorage 에만 산다. */
'use strict';

const store = require('./store');

const FUNNEL = ['view_home', 'view_product', 'add_to_cart', 'begin_checkout', 'purchase'];
const FUNNEL_LABEL = {
  view_home: '사이트 방문',
  view_product: '제품 상세 조회',
  add_to_cart: '장바구니 담기',
  begin_checkout: '주문서 진입',
  purchase: '주문 완료'
};

function iso(d) { return d.toISOString().slice(0, 10); }

/* offset 일 전을 끝으로 하는 days 일짜리 구간 */
function windowOf(days, offset) {
  const to = new Date();
  to.setDate(to.getDate() - offset);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  const list = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    list.push(iso(d));
  }
  return { from: iso(from), to: iso(to), days: list };
}

function sourceOf(ref) {
  if (!ref) return '직접 유입';
  let host = '';
  try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return '기타'; }
  if (/woonhyangjae\.com$/.test(host)) return '내부 이동';
  if (/instagram|facebook|threads/.test(host)) return '인스타그램 · 메타';
  if (/naver/.test(host)) return '네이버';
  if (/google/.test(host)) return '구글';
  if (/daum|kakao/.test(host)) return '카카오 · 다음';
  if (/youtube/.test(host)) return '유튜브';
  return host;
}

/* 한 구간의 숫자를 모은다. */
function collect(events, orders, win) {
  const inWin = (day) => day >= win.from && day <= win.to;

  const sessions = new Set();
  const sessionsByDay = {};
  const pageViews = {};
  const pageDwell = {};
  const devices = {};
  const hours = new Array(24).fill(0);
  const productViews = {};
  const productCarts = {};
  const funnelSessions = {};
  const scrollBuckets = { 25: new Set(), 50: new Set(), 75: new Set(), 100: new Set() };
  const scrollBase = new Set();
  const sidSource = {};                 // 방문 → 유입 경로 (첫 페이지 기준)
  const sourceSessions = {};

  FUNNEL.forEach((k) => { funnelSessions[k] = new Set(); });
  win.days.forEach((d) => { sessionsByDay[d] = new Set(); });

  for (const e of events) {
    const day = (e.at || '').slice(0, 10);
    if (!inWin(day)) continue;
    const sid = e.sid || '';
    if (sid) {
      sessions.add(sid);
      if (sessionsByDay[day]) sessionsByDay[day].add(sid);
    }

    if (e.type === 'page') {
      const p = e.path || '/';
      pageViews[p] = (pageViews[p] || 0) + 1;
      if (e.dwell > 0) {
        pageDwell[p] = pageDwell[p] || { total: 0, n: 0 };
        pageDwell[p].total += Math.min(e.dwell, 1800);   // 이상치 상한 30분
        pageDwell[p].n += 1;
      }
      const src = sourceOf(e.ref);
      if (sid && !sidSource[sid] && src !== '내부 이동') sidSource[sid] = src;
      const dev = e.mobile ? '모바일' : '데스크톱';
      devices[dev] = (devices[dev] || 0) + 1;
      const h = new Date(e.at).getHours();
      if (!isNaN(h)) hours[h] += 1;
      if (sid) scrollBase.add(sid);
    }

    if (e.type === 'scroll' && sid) {
      const b = Number(e.depth);
      if (scrollBuckets[b]) scrollBuckets[b].add(sid);
    }
    if (e.type === 'funnel' && sid && funnelSessions[e.step]) funnelSessions[e.step].add(sid);
    if (e.type === 'product_view' && e.slug) productViews[e.slug] = (productViews[e.slug] || 0) + 1;
    if (e.type === 'add_to_cart' && e.slug) productCarts[e.slug] = (productCarts[e.slug] || 0) + 1;
  }

  for (const sid of Object.keys(sidSource)) {
    const s = sidSource[sid];
    sourceSessions[s] = (sourceSessions[s] || 0) + 1;
  }

  /* 주문 — 구간 안의 것만 */
  const winOrders = orders.filter((o) => inWin((o.at || '').slice(0, 10)) && o.status !== 'canceled');
  const revenue = winOrders.reduce((a, o) => a + ((o.totals && o.totals.total) || 0), 0);

  /* 유입 경로별 주문 · 매출 */
  const sourceOrders = {};
  const sourceRevenue = {};
  for (const o of winOrders) {
    const s = sidSource[o.sid] || '경로 미상';
    sourceOrders[s] = (sourceOrders[s] || 0) + 1;
    sourceRevenue[s] = (sourceRevenue[s] || 0) + ((o.totals && o.totals.total) || 0);
  }

  /* 첫 구매인가 다시 온 구매인가 — 구간 시작 이전 주문 이력으로 가른다 */
  const before = new Set();
  for (const o of orders) {
    if ((o.at || '').slice(0, 10) >= win.from) continue;
    const k = (o.buyer && (o.buyer.email || o.buyer.phone)) || '';
    if (k) before.add(k);
  }
  let firstTime = 0, repeat = 0;
  const seen = new Set();
  for (const o of winOrders) {
    const k = (o.buyer && (o.buyer.email || o.buyer.phone)) || '';
    if (before.has(k) || seen.has(k)) repeat++; else firstTime++;
    if (k) seen.add(k);
  }

  /* 제품별 조회 → 담기 → 구매 */
  const purchased = {};
  const productRevenue = {};
  for (const o of winOrders) {
    for (const l of o.lines || []) {
      purchased[l.slug] = (purchased[l.slug] || 0) + l.qty;
      productRevenue[l.slug] = (productRevenue[l.slug] || 0) + l.amount;
    }
  }

  return {
    win,
    sessions, sessionsByDay, pageViews, pageDwell, devices, hours,
    productViews, productCarts, funnelSessions, scrollBuckets, scrollBase,
    sidSource, sourceSessions, sourceOrders, sourceRevenue,
    winOrders, revenue, firstTime, repeat, purchased, productRevenue,
    totals: {
      sessions: sessions.size,
      pageViews: Object.values(pageViews).reduce((a, b) => a + b, 0),
      orders: winOrders.length,
      revenue,
      aov: winOrders.length ? Math.round(revenue / winOrders.length) : 0,
      conversion: sessions.size
        ? +(funnelSessions.purchase.size / sessions.size * 100).toFixed(2) : 0
    }
  };
}

/* 늘었나 줄었나. 직전이 0 이면 비교 자체가 뜻이 없으므로 null 로 둔다. */
function delta(now, was) {
  if (!was) return now ? null : 0;
  return +(((now - was) / was) * 100).toFixed(1);
}

function summarize(days) {
  const events = store.readEvents(days * 2);
  const orders = store.getOrders();

  const cur = collect(events, orders, windowOf(days, 0));
  const prev = collect(events, orders, windowOf(days, days));

  const base = cur.scrollBase.size || 1;
  const funnelTop = cur.funnelSessions.view_home.size || cur.sessions.size || 1;

  const productKeys = Array.from(new Set(
    Object.keys(cur.productViews).concat(Object.keys(cur.productCarts), Object.keys(cur.purchased))
  ));

  const sourceKeys = Array.from(new Set(
    Object.keys(cur.sourceSessions).concat(Object.keys(cur.sourceOrders))
  ));

  return {
    range: { days, from: cur.win.from, to: cur.win.to },
    prevRange: { from: prev.win.from, to: prev.win.to },

    totals: cur.totals,
    prev: prev.totals,
    delta: {
      sessions: delta(cur.totals.sessions, prev.totals.sessions),
      pageViews: delta(cur.totals.pageViews, prev.totals.pageViews),
      orders: delta(cur.totals.orders, prev.totals.orders),
      revenue: delta(cur.totals.revenue, prev.totals.revenue),
      aov: delta(cur.totals.aov, prev.totals.aov),
      conversion: delta(cur.totals.conversion, prev.totals.conversion)
    },

    daily: cur.win.days.map((d) => {
      const dayOrders = cur.winOrders.filter((o) => (o.at || '').slice(0, 10) === d);
      return {
        date: d,
        sessions: cur.sessionsByDay[d].size,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((a, o) => a + ((o.totals && o.totals.total) || 0), 0)
      };
    }),

    buyers: {
      first: cur.firstTime,
      repeat: cur.repeat,
      repeatRate: cur.winOrders.length
        ? +(cur.repeat / cur.winOrders.length * 100).toFixed(1) : 0
    },

    pages: Object.keys(cur.pageViews).map((p) => ({
      path: p,
      views: cur.pageViews[p],
      avgDwell: cur.pageDwell[p] ? Math.round(cur.pageDwell[p].total / cur.pageDwell[p].n) : 0
    })).sort((a, b) => b.views - a.views).slice(0, 12),

    /* 방문 수가 아니라 그 경로가 실제로 얼마를 벌어 줬는지까지 본다 */
    sources: sourceKeys.map((k) => {
      const s = cur.sourceSessions[k] || 0;
      const o = cur.sourceOrders[k] || 0;
      return {
        name: k,
        sessions: s,
        orders: o,
        revenue: cur.sourceRevenue[k] || 0,
        conversion: s ? +(o / s * 100).toFixed(1) : 0
      };
    }).sort((a, b) => (b.revenue - a.revenue) || (b.sessions - a.sessions)).slice(0, 12),

    devices: Object.keys(cur.devices).map((k) => ({ name: k, count: cur.devices[k] })),

    hours: cur.hours.map((n, i) => ({ hour: i, count: n })),

    scroll: [25, 50, 75, 100].map((b) => ({
      depth: b,
      rate: +(cur.scrollBuckets[b].size / base * 100).toFixed(1)
    })),

    funnel: FUNNEL.map((k) => ({
      step: k,
      label: FUNNEL_LABEL[k],
      sessions: cur.funnelSessions[k].size,
      rate: +(cur.funnelSessions[k].size / funnelTop * 100).toFixed(1)
    })),

    products: productKeys.map((s) => {
      const v = cur.productViews[s] || 0;
      const c = cur.productCarts[s] || 0;
      const p = cur.purchased[s] || 0;
      return {
        slug: s,
        views: v,
        carts: c,
        purchased: p,
        revenue: cur.productRevenue[s] || 0,
        cartRate: v ? +(c / v * 100).toFixed(1) : 0,
        buyRate: v ? +(p / v * 100).toFixed(1) : 0
      };
    }).sort((a, b) => b.views - a.views)
  };
}

module.exports = { summarize };

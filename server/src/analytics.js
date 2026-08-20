/* 마케터가 실제로 쓰는 숫자만 뽑는다.
   방문자 · 유입 경로 · 인기 제품 · 전환 퍼널 · 스크롤 완주율 · 시간대.
   쿠키를 쓰지 않고, 세션 식별자는 방문자 브라우저의 sessionStorage 에만 산다. */
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

function dayList(days) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
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

function summarize(days) {
  const events = store.readEvents(days);
  const orders = store.getOrders();
  const daysArr = dayList(days);

  const sessions = new Set();
  const sessionsByDay = {};
  const pageViews = {};
  const pageDwell = {};
  const sources = {};
  const devices = {};
  const hours = new Array(24).fill(0);
  const productViews = {};
  const productCarts = {};
  const funnelSessions = {};
  const scrollBuckets = { 25: new Set(), 50: new Set(), 75: new Set(), 100: new Set() };
  const scrollBase = new Set();

  FUNNEL.forEach((k) => { funnelSessions[k] = new Set(); });
  daysArr.forEach((d) => { sessionsByDay[d] = new Set(); });

  for (const e of events) {
    const day = (e.at || '').slice(0, 10);
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
        pageDwell[p].total += Math.min(e.dwell, 1800); // 이상치 상한 30분
        pageDwell[p].n += 1;
      }
      const src = sourceOf(e.ref);
      if (src !== '내부 이동') sources[src] = (sources[src] || 0) + 1;
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

    if (e.type === 'funnel' && sid && funnelSessions[e.step]) {
      funnelSessions[e.step].add(sid);
    }

    if (e.type === 'product_view' && e.slug) {
      productViews[e.slug] = (productViews[e.slug] || 0) + 1;
    }
    if (e.type === 'add_to_cart' && e.slug) {
      productCarts[e.slug] = (productCarts[e.slug] || 0) + 1;
    }
  }

  /* 제품별 조회 → 담기 → 구매 */
  const purchased = {};
  const revenue = {};
  const since = new Date();
  since.setDate(since.getDate() - days);
  for (const o of orders) {
    if (new Date(o.at) < since) continue;
    for (const l of o.lines || []) {
      purchased[l.slug] = (purchased[l.slug] || 0) + l.qty;
      revenue[l.slug] = (revenue[l.slug] || 0) + l.amount;
    }
  }

  const productKeys = Array.from(new Set(
    Object.keys(productViews).concat(Object.keys(productCarts), Object.keys(purchased))
  ));

  const base = scrollBase.size || 1;
  const funnelTop = funnelSessions.view_home.size || sessions.size || 1;

  return {
    range: { days, from: daysArr[0], to: daysArr[daysArr.length - 1] },

    totals: {
      sessions: sessions.size,
      pageViews: Object.values(pageViews).reduce((a, b) => a + b, 0),
      orders: orders.filter((o) => new Date(o.at) >= since).length,
      revenue: orders.filter((o) => new Date(o.at) >= since)
        .reduce((a, o) => a + (o.totals ? o.totals.total : 0), 0),
      conversion: sessions.size
        ? +(funnelSessions.purchase.size / sessions.size * 100).toFixed(2) : 0
    },

    daily: daysArr.map((d) => ({
      date: d,
      sessions: sessionsByDay[d].size,
      orders: orders.filter((o) => (o.at || '').slice(0, 10) === d).length,
      revenue: orders.filter((o) => (o.at || '').slice(0, 10) === d)
        .reduce((a, o) => a + (o.totals ? o.totals.total : 0), 0)
    })),

    pages: Object.keys(pageViews).map((p) => ({
      path: p,
      views: pageViews[p],
      avgDwell: pageDwell[p] ? Math.round(pageDwell[p].total / pageDwell[p].n) : 0
    })).sort((a, b) => b.views - a.views).slice(0, 12),

    sources: Object.keys(sources).map((k) => ({ name: k, count: sources[k] }))
      .sort((a, b) => b.count - a.count).slice(0, 10),

    devices: Object.keys(devices).map((k) => ({ name: k, count: devices[k] })),

    hours: hours.map((n, i) => ({ hour: i, count: n })),

    scroll: [25, 50, 75, 100].map((b) => ({
      depth: b,
      rate: +(scrollBuckets[b].size / base * 100).toFixed(1)
    })),

    funnel: FUNNEL.map((k) => ({
      step: k,
      label: FUNNEL_LABEL[k],
      sessions: funnelSessions[k].size,
      rate: +(funnelSessions[k].size / funnelTop * 100).toFixed(1)
    })),

    products: productKeys.map((s) => {
      const v = productViews[s] || 0;
      const c = productCarts[s] || 0;
      const p = purchased[s] || 0;
      return {
        slug: s,
        views: v,
        carts: c,
        purchased: p,
        revenue: revenue[s] || 0,
        cartRate: v ? +(c / v * 100).toFixed(1) : 0,
        buyRate: v ? +(p / v * 100).toFixed(1) : 0
      };
    }).sort((a, b) => b.views - a.views)
  };
}

module.exports = { summarize };

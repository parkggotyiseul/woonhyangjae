#!/usr/bin/env node
/* 카탈로그가 세 곳에 있다. 셋이 어긋나면 화면과 관리자가 서로 다른 말을 한다.

     1) site/assets/data/catalog.js   API 가 죽었을 때 쓰는 기본값 (브라우저가 읽는다)
     2) server/src/seed-catalog.json  서버가 처음 켜질 때 심는 씨앗
     3) 서버 볼륨의 catalog.json      실제 운영 데이터 (관리자가 고치는 곳)

   1 과 2 는 항상 같아야 한다. 다르면 API 가 죽었을 때 화면이 딴판이 된다.
   3 은 관리자가 고치는 살아 있는 데이터라 달라도 되지만, 구조(키 목록)까지
   달라지면 관리자 화면이나 사이트 한쪽이 조용히 깨진다.

   쓰는 법
   ─────────────────────────────────────────────────────────
     node tools/check-catalog.js              1 과 2 만 비교
     node tools/check-catalog.js --live       운영 서버(3)까지 함께 비교

   1 과 2 가 다르면 종료 코드 1 로 끝난다.                                     */

'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const SITE = path.join(root, 'site', 'assets', 'data', 'catalog.js');
const SEED = path.join(root, 'server', 'src', 'seed-catalog.json');

function readSite() {
  const raw = fs.readFileSync(SITE, 'utf8');
  return JSON.parse(raw.replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, ''));
}

/* 값이 아니라 "어떤 항목이 있는가"만 비교한다. 관리자가 값을 고치는 건 정상이다. */
function shape(v, at, out) {
  out = out || [];
  at = at || '';
  if (Array.isArray(v)) {
    out.push(at + '[]');
    if (v.length) shape(v[0], at + '[0]', out);
  } else if (v && typeof v === 'object') {
    for (const k of Object.keys(v).sort()) shape(v[k], at + '.' + k, out);
  } else {
    out.push(at);
  }
  return out;
}

function diffList(a, b) {
  const A = new Set(a), B = new Set(b);
  return {
    onlyA: a.filter((k) => !B.has(k)),
    onlyB: b.filter((k) => !A.has(k))
  };
}

const site = readSite();
const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

let bad = false;

if (JSON.stringify(site) === JSON.stringify(seed)) {
  console.log('✔ 사이트 기본값 == 서버 씨앗 (완전히 같음)');
} else {
  bad = true;
  console.log('✘ 사이트 기본값과 서버 씨앗이 다르다');
  const d = diffList(shape(seed), shape(site));
  if (d.onlyA.length) console.log('   씨앗에만 있는 항목: ' + d.onlyA.join(', '));
  if (d.onlyB.length) console.log('   사이트에만 있는 항목: ' + d.onlyB.join(', '));
  if (!d.onlyA.length && !d.onlyB.length) console.log('   구조는 같고 값만 다르다 — 한쪽을 복사해 맞출 것');
}

if (!process.argv.includes('--live')) process.exit(bad ? 1 : 0);

https.get('https://woonhyangjae.com/api/catalog', (res) => {
  let body = '';
  res.on('data', (c) => (body += c));
  res.on('end', () => {
    let live;
    try { live = JSON.parse(body); }
    catch (e) { console.log('✘ 운영 서버 응답을 읽지 못했다 (' + res.statusCode + ')'); process.exit(1); }

    const d = diffList(shape(seed), shape(live));
    if (!d.onlyA.length && !d.onlyB.length) {
      console.log('✔ 운영 데이터 구조가 씨앗과 같다');
    } else {
      bad = true;
      console.log('✘ 운영 데이터 구조가 씨앗과 다르다 — 사이트나 관리자 한쪽이 깨질 수 있다');
      if (d.onlyA.length) console.log('   씨앗에만 있는 항목: ' + d.onlyA.slice(0, 20).join(', '));
      if (d.onlyB.length) console.log('   운영에만 있는 항목: ' + d.onlyB.slice(0, 20).join(', '));
    }

    const sc = (seed.collections || []).map((c) => c.id + ':' + (c.reveal || '?')).join(' ');
    const lc = (live.collections || []).map((c) => c.id + ':' + (c.reveal || '?')).join(' ');
    console.log('   씨앗 장 : ' + sc);
    console.log('   운영 장 : ' + lc);
    if (sc !== lc) console.log('   → 운영 데이터를 관리자에서 갱신하거나 씨앗을 다시 심어야 한다');

    process.exit(bad ? 1 : 0);
  });
}).on('error', (e) => { console.log('✘ 운영 서버에 닿지 못했다: ' + e.message); process.exit(1); });

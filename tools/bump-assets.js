#!/usr/bin/env node
/* CSS·JS 를 고쳤을 때 모든 페이지의 캐시 번호(?v=)를 한꺼번에 올린다.

   왜 필요한가
   ─────────────────────────────────────────────────────────
   Cloudflare 가 CSS·JS 를 오래 붙들고 있다. 파일을 고쳐도 방문자에게는
   예전 것이 계속 보인다. 주소 뒤 ?v= 값을 바꿔야 새 파일로 받아 간다.
   14장을 손으로 고치면 한 장을 빠뜨리고, 그 한 장만 화면이 깨진다.

   쓰는 법
   ─────────────────────────────────────────────────────────
     node tools/bump-assets.js            오늘 날짜로 다음 글자 (…a → …b)
     node tools/bump-assets.js 20260901a  값을 직접 지정

   site/ 와 site/admin/ 의 모든 html 을 한 번에 바꾼다.                        */

'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dirs = [path.join(root, 'site'), path.join(root, 'site', 'admin')];
const files = [];
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith('.html')) files.push(path.join(d, f));
}

/* 지금 쓰이는 값 중 가장 흔한 것을 현재 버전으로 본다. */
const seen = {};
for (const f of files) {
  const m = fs.readFileSync(f, 'utf8').match(/\?v=([0-9]{8}[a-z]?)/g) || [];
  for (const v of m) seen[v.slice(3)] = (seen[v.slice(3)] || 0) + 1;
}
const cur = Object.keys(seen).sort((a, b) => seen[b] - seen[a])[0] || '';

function nextVersion() {
  const d = new Date();
  const today =
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  if (cur.slice(0, 8) !== today) return today + 'a';
  const letter = cur.slice(8) || 'a';
  const next = String.fromCharCode(letter.charCodeAt(0) + 1);
  if (next > 'z') { console.error('하루에 26번을 넘겼다. 값을 직접 지정할 것.'); process.exit(1); }
  return today + next;
}

const to = process.argv[2] || nextVersion();
if (!/^[0-9]{8}[a-z]$/.test(to)) {
  console.error('형식이 맞지 않다. 예: 20260901a');
  process.exit(1);
}

let n = 0;
for (const f of files) {
  const before = fs.readFileSync(f, 'utf8');
  const after = before.replace(/\?v=[0-9]{8}[a-z]?/g, '?v=' + to);
  if (after !== before) { fs.writeFileSync(f, after); n++; }
}
console.log((cur || '(없음)') + ' → ' + to + ' · ' + n + '개 파일');

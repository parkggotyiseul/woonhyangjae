#!/usr/bin/env node
/* 머리말(header)과 꼬리말(footer)을 모든 페이지에 똑같이 맞춰 넣는다.

   왜 필요한가
   ─────────────────────────────────────────────────────────
   페이지가 14장이고 머리말·꼬리말은 100줄 가까이 된다. 메뉴 하나를 고치려고
   14곳을 손으로 고치면 반드시 한 곳이 어긋난다. 원본은 아래 두 파일 하나뿐이고,
   이 스크립트가 나머지에 복사한다.

     tools/shell.header.html   머리말 원본 (언어 안내줄까지 포함)
     tools/shell.footer.html   꼬리말 원본

   쓰는 법
   ─────────────────────────────────────────────────────────
     node tools/sync-shell.js          실제로 반영
     node tools/sync-shell.js --check  바뀔 파일만 확인 (고치지 않음)

   현재 페이지 표시(aria-current)는 파일 이름을 보고 이 스크립트가 다시 붙인다.
   원본 파일에는 넣지 않는다.                                                   */

'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const siteDir = path.join(root, 'site');
const check = process.argv.includes('--check');

const header = fs.readFileSync(path.join(__dirname, 'shell.header.html'), 'utf8');
const footer = fs.readFileSync(path.join(__dirname, 'shell.footer.html'), 'utf8');

const HEADER_RE = /<header class="site-header[\s\S]*?<\/header>\n(?:<div class="lang-note"[^\n]*\n)?/;
const FOOTER_RE = /<footer class="site-footer">[\s\S]*?<\/footer>\n/;

/* 현재 보고 있는 페이지의 메뉴에 표시를 남긴다. 머리말 안에서만 찾는다. */
function markCurrent(html, file) {
  const href = '/' + file;
  const m = html.match(/<header class="site-header[\s\S]*?<\/header>/);
  if (!m) return html;
  const marked = m[0].replace(
    new RegExp('<a href="' + href.replace(/[.]/g, '\\.') + '"(?![^>]*aria-current)', 'g'),
    '<a href="' + href + '" aria-current="page"'
  );
  return html.replace(m[0], marked);
}


/* 첫 화면(index)만 머리말이 투명하게 히어로 위에 얹힌다.
   나머지 페이지는 처음부터 배경이 있는 상태(is-stuck)로 시작한다. */
function setStuck(html, file) {
  const stuck = file !== "index.html";
  return html.replace(
    /<header class="site-header[^"]*"/,
    '<header class="site-header' + (stuck ? " is-stuck" : "") + '"'
  );
}

let changed = 0;
let skipped = [];

for (const file of fs.readdirSync(siteDir).filter((f) => f.endsWith('.html'))) {
  const p = path.join(siteDir, file);
  const before = fs.readFileSync(p, 'utf8');

  if (!HEADER_RE.test(before) || !FOOTER_RE.test(before)) { skipped.push(file); continue; }

  let after = before.replace(HEADER_RE, header).replace(FOOTER_RE, footer);
  after = markCurrent(after, file);
  after = setStuck(after, file);

  if (after === before) continue;
  changed++;
  console.log((check ? '바뀔 예정: ' : '반영: ') + file);
  if (!check) fs.writeFileSync(p, after);
}

if (skipped.length) console.log('머리말·꼬리말이 없어 건너뜀: ' + skipped.join(', '));
console.log(changed ? changed + '개 파일' : '전부 최신 상태');

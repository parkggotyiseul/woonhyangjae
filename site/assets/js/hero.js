/* 운향재 — 랜딩 첫 화면의 영상
   ────────────────────────────────────────────────────────
   영상을 넣는 방법

   1) 영상 파일을 준비합니다. 권장 사양
        형식   MP4 (H.264) — 필요하면 WebM 을 함께 두면 더 가볍습니다
        길이   8~15초, 소리 없이 끊김 없이 도는 것
        크기   가로 1920px, 파일 8MB 이내 (모바일에서도 바로 떠야 합니다)
        내용   달, 산, 한지, 창살, 나뭇결처럼 느리게 움직이는 정경
               사람이 나오거나 장면이 빠르게 바뀌면 글자가 안 읽힙니다

   2) 관리자 → 사진 에 올린 뒤 주소를 복사하거나,
      site/assets/video/hero.mp4 로 파일을 직접 올립니다.

   3) 관리자 → 설정 에서 "랜딩 영상 주소"에 그 주소를 넣습니다.
      (카탈로그의 brand.heroVideo 값입니다)

   영상이 없으면 SVG 로 그린 정경이 그대로 남습니다.
   그래서 영상이 준비되기 전에도 화면이 비지 않습니다. */
window.WHJ.ready(function () {
  var W = window.WHJ;
  var host = document.getElementById('heroMedia');
  if (!host) return;

  var brand = (W.catalog && W.catalog.brand) || {};
  var src = brand.heroVideo;
  if (!src) return;

  /* 데이터를 아끼는 설정이거나 모션을 줄이도록 설정한 사람에게는 틀지 않는다 */
  var save = navigator.connection && navigator.connection.saveData;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (save || reduce) return;

  var v = document.createElement('video');
  v.src = src;
  v.autoplay = true;
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('aria-hidden', 'true');
  if (brand.heroPoster) v.poster = brand.heroPoster;

  /* 첫 프레임을 그릴 수 있을 때 비로소 SVG 를 덮는다.
     로딩이 느려도 빈 화면이 보이지 않는다. */
  v.addEventListener('canplay', function () {
    var art = host.querySelector('.hero-art');
    if (art) art.remove();
  }, { once: true });

  v.addEventListener('error', function () { v.remove(); });

  host.appendChild(v);
});

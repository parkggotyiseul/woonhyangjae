/* 운향재 카탈로그 — 프론트 전체가 이 파일 하나를 읽어 렌더링됩니다.
   컬렉션·제품 추가는 이 파일만 수정하면 되고 HTML은 건드리지 않습니다.
   기획서 CH10 데이터 모델(Collection → Product → PhotoSpot / Variant)과 1:1 대응하며,
   2단계에서 DB·API로 이관할 때 이 구조를 그대로 씁니다. */
window.WHJ_CATALOG =
{
  "brand": {
    "nameKo": "운향재",
    "nameHanja": "雲香齋",
    "nameEn": "WOONHYANGJAE",
    "tagline": "자연의 요소를 향으로 옮기다",
    "taglineEn": "ELEMENTS TRANSLATED INTO SCENT",
    "thesis": "자연이 감춘 것에서, 향이 시작됩니다.",
    "company": "YYY컴퍼니",
    "ceo": "박꽃이슬",
    "email": "hello@woonhyangjae.com",
    "b2bEmail": "partner@woonhyangjae.com",
    "bizNumber": "000-00-00000",
    "mailOrderNumber": "0000-서울-0000",
    "address": "—",
    "phone": "—",
    "heroVideo": "",
    "heroPoster": ""
  },

  "_collectionNote": "진행 중인 장은 status:active, 앞으로의 장은 upcoming. 순서는 order 값으로 정합니다.",
  "collections": [
    {
      "id": "wood",
      "order": 1,
      "code": "01",
      "hanja": "木",
      "en": "WOOD",
      "ko": "나무",
      "title": "나무가 기억하는 시간",
      "titleEn": "The Time That Wood Remembers",
      "subtitle": "감춘 것에서 온 향",
      "description": "뿌리, 심재, 수피, 꽃. 나무는 가장 많은 층을 가진 요소입니다. 땅속에서 자란 것과 잘라야 보이는 것, 잠깐 피었다 지는 것이 전부 다른 냄새를 냅니다.",
      "status": "active",
      "statusLabel": "진행중"
    },
    { "id": "water", "order": 2, "code": "02", "hanja": "水", "en": "WATER", "ko": "물", "subtitle": "지나간 자리에 남는 향", "description": "물 자체는 냄새가 없습니다. 그러나 비 온 뒤의 공기, 계곡의 이끼, 안개 낀 새벽, 오래된 우물. 물이 지나간 자리마다 다른 냄새가 남습니다.", "status": "upcoming", "statusLabel": "예정" },
    { "id": "flower", "order": 3, "code": "03", "hanja": "花", "en": "FLOWER", "ko": "꽃", "subtitle": "짧게 머문 것의 향", "description": "가장 짧게 피었다 지지만 가장 오래 기억됩니다. 일 년에 일주일만 존재하는 것, 지고 난 뒤에야 선명해지는 장면을 다루는 컬렉션.", "status": "upcoming", "statusLabel": "예정" },
    { "id": "stone", "order": 4, "code": "04", "hanja": "石", "en": "STONE", "ko": "돌", "subtitle": "견딘 시간의 향", "description": "미네랄, 이끼 낀 바위, 햇볕에 달궈진 돌담, 서늘한 석실. 가장 오래 견디고 가장 늦게 변하는 요소입니다.", "status": "upcoming", "statusLabel": "예정" },
    { "id": "earth", "order": 5, "code": "05", "hanja": "土", "en": "EARTH", "ko": "흙", "subtitle": "모든 것이 돌아가는 곳", "description": "마른 흙, 비에 젖은 흙, 갈아엎은 밭, 낙엽이 삭은 부엽토. 가장 원초적이고 가장 보편적인 냄새의 층입니다.", "status": "upcoming", "statusLabel": "예정" },
    { "id": "fire", "order": 6, "code": "06", "hanja": "火", "en": "FIRE", "ko": "불", "subtitle": "타고 남은 것의 향", "description": "모닥불의 연기, 화로의 숯, 사그라든 재. 불은 사라지면서 가장 강한 흔적을 남기는 유일한 요소입니다.", "status": "upcoming", "statusLabel": "예정" },
    { "id": "house", "order": 7, "code": "07", "hanja": "家", "en": "HOUSE", "ko": "집", "subtitle": "머문 시간이 밴 향", "description": "오래된 책장, 다림질한 리넨, 부엌의 잔향, 겨울 아침의 온돌. 자연이 아니라 삶이 만든 냄새입니다.", "status": "upcoming", "statusLabel": "예정" }
  ],

  "_productNote": "badges 는 SHOP 카드에 표시되는 표식입니다. soldCount 는 인기순, releasedAt 은 최신순 정렬 기준입니다.",
  "products": [
    {
      "id": "mukhyanghun",
      "slug": "mukhyanghun",
      "collectionId": "wood",
      "number": "001",
      "nameKo": "묵향헌",
      "nameHanja": "墨香軒",
      "nameEn": "Mukhyanghun",
      "caption": "Drawn from Walnut",
      "signature": "공간에 스며든 짙은 여운",
      "species": "호두나무",
      "layer": "심재",
      "badges": ["BEST"],
      "soldCount": 128,
      "releasedAt": "2026-03-01",
      "story": [
        "오래 쓴 나무 가구에는 냄새가 뱁니다.",
        "아버지의 책상, 어머니의 장롱, 할머니 댁 마루 냄새.",
        "가족이 드나들고 계절이 지나는 동안",
        "나무는 그 모든 걸 조용히 품습니다."
      ],
      "storyLast": "집은 향으로 기억됩니다.",
      "notes": {
        "top": "베르가못 · 엘레미 · 핑크 페퍼",
        "heart": "스웨이드 · 시나몬 · 벤조인",
        "base": "월넛 우드 · 바닐라 · 앰버 · 산달우드"
      },
      "mood": "중후 · 권위 · 원목 앰버",
      "spaces": ["서재", "집무실", "거실", "현관"],
      "status": "onsale",
      "statusLabel": "판매중",
      "accent": "#6B4A2F",
      "photoSpots": [
        { "slot": "01", "role": "요소 클로즈업", "alt": "호두나무 나이테 단면", "src": "" },
        { "slot": "02", "role": "제품 단독", "alt": "묵향헌 리드 디퓨저 정면", "src": "" },
        { "slot": "03", "role": "공간 배치", "alt": "서재에 놓인 묵향헌", "src": "" },
        { "slot": "04", "role": "디테일 매크로", "alt": "우드캡의 나무 결과 형압 디테일", "src": "" },
        { "slot": "05", "role": "언박싱", "alt": "반쯤 열린 싸바리 박스", "src": "" }
      ],
      "variants": [
        { "id": "mukhyanghun-200", "name": "200ml", "sku": "WHJ-W001-200", "price": 150000, "stock": 40 }
      ]
    },
    {
      "id": "neuru",
      "slug": "neuru",
      "collectionId": "wood",
      "number": "002",
      "nameKo": "느루",
      "nameHanja": "",
      "nameEn": "Neuru",
      "caption": "Rooted in Zelkova",
      "signature": "시간을 등진 고요",
      "species": "느티나무",
      "layer": "뿌리",
      "badges": ["DESIGNER'S PICK"],
      "soldCount": 96,
      "releasedAt": "2026-06-01",
      "story": [
        "동네마다 느티나무 한 그루쯤은 있었습니다.",
        "여름이면 그 아래 평상이 놓이고,",
        "아이들은 해가 지면 이름이 불려 집으로 돌아갔습니다.",
        "떠난 사람도, 남은 사람도 모두 그 그늘을 기억합니다."
      ],
      "storyLast": "우리는 그 그늘에서 컸습니다.",
      "notes": {
        "top": "베르가못 · 주니퍼 베리 · 핑크 페퍼",
        "heart": "오리스 · 프랑킨센스 · 시더우드",
        "base": "베티버 · 통카빈 · 오크모스 · 머스크"
      },
      "mood": "차분 · 클래식 · 스모키 파우더리 우드",
      "spaces": ["서재", "갤러리", "라운지", "침실"],
      "status": "onsale",
      "statusLabel": "판매중",
      "accent": "#8A7A56",
      "photoSpots": [
        { "slot": "01", "role": "요소 클로즈업", "alt": "흙을 뚫고 나온 느티나무 뿌리", "src": "" },
        { "slot": "02", "role": "제품 단독", "alt": "느루 리드 디퓨저 정면", "src": "" },
        { "slot": "03", "role": "공간 배치", "alt": "라운지에 놓인 느루", "src": "" },
        { "slot": "04", "role": "디테일 매크로", "alt": "용액을 빨아올린 리드 스틱", "src": "" },
        { "slot": "05", "role": "2종 병치", "alt": "묵향헌과 느루가 나란히 놓인 모습", "src": "" }
      ],
      "variants": [
        { "id": "neuru-200", "name": "200ml", "sku": "WHJ-W002-200", "price": 150000, "stock": 40 }
      ]
    },
    {
      "id": "wood-003",
      "slug": "wood-003",
      "collectionId": "wood",
      "number": "003",
      "nameKo": "",
      "nameHanja": "",
      "nameEn": "",
      "caption": "",
      "signature": "세 번째 향을 준비하고 있습니다",
      "species": "",
      "layer": "나무의 마지막 층",
      "badges": [],
      "soldCount": 0,
      "releasedAt": "",
      "story": [
        "나무의 마지막 층입니다.",
        "일 년에 일주일만 존재하는 것,",
        "가장 짧게 머물다",
        "가장 오래 기억되는 것."
      ],
      "storyLast": "",
      "notes": { "top": "", "heart": "", "base": "" },
      "mood": "",
      "spaces": [],
      "status": "coming",
      "statusLabel": "Coming Soon",
      "accent": "#3A342E",
      "photoSpots": [
        { "slot": "01", "role": "COMING SOON 비주얼", "alt": "암전 처리된 실루엣", "src": "" }
      ],
      "variants": []
    }
  ],

  "sets": [
    {
      "id": "wood-set",
      "slug": "wood-set",
      "collectionId": "wood",
      "nameKo": "나무의 두 층",
      "nameEn": "Two Layers of Wood",
      "signature": "묵향헌과 느루, 전용 기프트 박스",
      "badges": ["GIFT"],
      "soldCount": 41,
      "releasedAt": "2026-06-15",
      "items": ["mukhyanghun", "neuru"],
      "status": "onsale",
      "statusLabel": "판매중",
      "variants": [
        { "id": "wood-set-2", "name": "2종 세트", "sku": "WHJ-W-SET2", "price": 300000, "stock": 20 }
      ]
    }
  ],

  "_partnerNote": "품질 페이지의 전문가 그룹 섹션. 실제 계약된 파트너만 표기합니다.",
  "partners": [
    {
      "id": "fragrance",
      "step": "FRAGRANCE",
      "ko": "조향",
      "title": "서울향료",
      "lead": "대한민국 1티어 향료 기업",
      "body": "국내 향료 산업의 1세대이자 지금도 최고 수준의 조향 역량을 보유한 기업입니다. 대기업 브랜드들이 쓰는 바로 그 원료로, 같은 기준의 안정성 검증을 거쳐 만들어집니다."
    },
    {
      "id": "filling",
      "step": "FILLING",
      "ko": "배합 · 충전",
      "title": "대기업 납품 충전 전문사",
      "lead": "검증된 생산 라인",
      "body": "대기업 납품 이력을 가진 국내 충전 전문 업체에서 배합과 충전, 품질 검사를 일괄 진행합니다. 배치가 바뀌어도 부향률 20%가 흔들리지 않는 이유입니다."
    },
    {
      "id": "package",
      "step": "PACKAGE",
      "ko": "패키지",
      "title": "하이엔드 패키지 전문사",
      "lead": "형압과 싸바리를 다루는 손",
      "body": "명품 브랜드의 지기구조를 제작해 온 국내 전문사와 함께합니다. 2단 싸바리와 블라인드 형압은 기계로만은 완성되지 않아, 마지막 검수는 사람 손을 거칩니다."
    }
  ],

  "_faqNote": "문의 페이지의 자주 묻는 질문. 상세페이지에서도 같은 데이터를 씁니다.",
  "faq": [
    { "q": "향이 너무 강합니다", "a": "부향률 20% 제품입니다. 스틱 개수를 줄이면 발향 강도가 낮아집니다. 처음에는 절반만 꽂아 사용해 보시기를 권합니다." },
    { "q": "얼마나 오래 쓸 수 있나요", "a": "스틱 개수와 환기량, 공간 크기에 따라 달라집니다. 스틱을 적게 꽂을수록 오래 사용하실 수 있습니다." },
    { "q": "원목 가구 위에 둬도 되나요", "a": "원목 표면 착색 테스트를 통과했습니다. 다만 용액이 직접 접촉하는 것은 피해 주시고, 흘렀을 경우 마른 천으로 닦아내 주세요." },
    { "q": "아이나 반려동물이 있어도 되나요", "a": "손이 닿지 않는 높이에 배치해 주세요. 섭취 시 위험할 수 있으며, 넘어지지 않는 안정된 자리를 권장합니다." },
    { "q": "리필이 있나요", "a": "리필 상품을 준비하고 있습니다. 출시 시 알림을 신청하실 수 있습니다." },
    { "q": "향이 변한 것 같습니다", "a": "직사광선에 노출되면 변색과 변질이 일어날 수 있습니다. 조명과 햇빛을 피한 자리에 두시기를 권합니다." },
    { "q": "기프트 포장은 어떻게 되나요", "a": "전용 리본과 메시지 카드를 함께 보내드립니다. 주문서에서 가격이 표기되지 않은 명세서를 선택하실 수 있습니다." },
    { "q": "배송은 얼마나 걸리나요", "a": "영업일 기준 2~3일 내 출고되며, 출고 시 송장번호를 안내드립니다." }
  ],

  "shipping": {
    "fee": 3000,
    "freeThreshold": 100000,
    "notice": "영업일 기준 2~3일 내 출고됩니다."
  },

  "curation": {
    "spaces": [
      { "id": "living", "ko": "거실", "en": "LIVING", "desc": "가족이 모이고 손님이 오는 공간. 따뜻하고 포용적인 향이 적합합니다.", "recommend": ["mukhyanghun"] },
      { "id": "study", "ko": "서재", "en": "STUDY", "desc": "생각이 머무는 곳. 향이 사고를 방해하지 않으면서 공간의 밀도를 높여야 합니다.", "recommend": ["neuru", "mukhyanghun"] },
      { "id": "bedroom", "ko": "침실", "en": "BEDROOM", "desc": "하루를 닫는 공간. 자극이 없고 부드럽게 가라앉는 성격이어야 합니다.", "recommend": ["neuru"] },
      { "id": "entrance", "ko": "현관", "en": "ENTRANCE", "desc": "외부에서 들어온 사람이 처음 맞는 공기. 첫인상을 결정합니다.", "recommend": ["mukhyanghun"] },
      { "id": "dressing", "ko": "드레스룸", "en": "DRESSING", "desc": "옷에 향이 배는 공간이므로 무겁지 않아야 합니다.", "recommend": ["neuru"] }
    ],
    "moods": [
      { "id": "quiet", "ko": "고요하게", "desc": "말수가 줄어드는 공간. 소리가 가라앉는 공기.", "recommend": ["neuru"] },
      { "id": "weighty", "ko": "묵직하게", "desc": "자세를 고쳐 앉게 되는 공간. 격이 있는 공기.", "recommend": ["mukhyanghun"] },
      { "id": "bright", "ko": "화사하게", "desc": "기분이 밝아지는 공간. 가벼워지는 공기.", "recommend": ["neuru"] },
      { "id": "warm", "ko": "따뜻하게", "desc": "포근하게 감싸는 공간. 안심되는 공기.", "recommend": ["mukhyanghun"] },
      { "id": "clear", "ko": "정돈되게", "desc": "생각이 맑아지는 공간. 흐트러짐 없는 공기.", "recommend": ["neuru"] }
    ],
    "types": [
      { "id": "alone", "ko": "혼자 있는 시간이 편안합니다", "desc": "고요와 밀도를 원하는 사람. 방해받지 않는 공기.", "recommend": ["neuru"] },
      { "id": "together", "ko": "사람이 모이는 공간이 좋습니다", "desc": "밝고 열린 공기. 함께 있을 때 기분이 오르는 향.", "recommend": ["mukhyanghun"] },
      { "id": "order", "ko": "구조와 질서를 중시합니다", "desc": "흐트러짐 없는 무게. 격이 있는 공간.", "recommend": ["mukhyanghun"] },
      { "id": "feel", "ko": "그날의 분위기를 따라갑니다", "desc": "기분에 맞춰 여러 향을 번갈아 쓰는 사람.", "recommend": ["neuru"] }
    ]
  }
};

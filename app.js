/* ============ What2Eat — app logic ============ */

const $ = (id) => document.getElementById(id);

const state = {
  radius: 1000, // meters, user-adjustable
  lat: null,
  lon: null,
  restaurants: [],   // all found nearby
  category: "any",
  spinning: false,
  lastPickId: null,
};

/* Craving categories — the mainstream cuisine split (Chinese, Japanese,
   Korean, Western, SE Asian) plus noodles and café/sweets, matched against
   real OSM cuisine/amenity tags. A place can belong to several categories
   (e.g. a ramen shop is japanese + noodle). */
const CATEGORIES = {
  chinese: (r) => /chinese|cantonese|sichuan|szechuan|hunan|dim_sum|dumpling|hotpot|hot_pot|wonton|peking|beijing|shanghai|taiwanese|hong_kong|hokkien|teochew|hainanese|zi_char|congee|bao/.test(r.cuisineRaw),
  japanese: (r) => /japanese|sushi|ramen|izakaya|teppanyaki|donburi|tonkatsu|yakitori|yakiniku|okonomiyaki|takoyaki|kaiseki|omakase|udon|soba/.test(r.cuisineRaw),
  korean: (r) => /korean|kimchi|bibimbap|bulgogi|samgyeopsal/.test(r.cuisineRaw),
  western: (r) => /western|italian|pizza|pasta|french|american|burger|steak|sandwich|spanish|german|british|fish_and_chips|mexican|tex-mex|mediterranean|greek|portuguese|grill|bbq|barbecue/.test(r.cuisineRaw),
  sea: (r) => /thai|vietnamese|malaysian|malay|indonesian|singaporean|filipino|laotian|burmese|khmer|cambodian|peranakan|nyonya|laksa|satay|pho/.test(r.cuisineRaw),
  noodle: (r) => /noodle|ramen|udon|soba|pho|laksa|vermicelli|lamian|ban_mian|banmian|mee/.test(r.cuisineRaw),
  cafe: (r) => r.amenity === "cafe" || /dessert|ice_cream|cake|bakery|bubble_tea|juice|tea|coffee|waffle|pancake|donut|toast/.test(r.cuisineRaw),
};

/* ---------------------------------------------------
   i18n — English / 中文
--------------------------------------------------- */
const LANG_KEY = "w2e-lang";
let lang = localStorage.getItem(LANG_KEY) || (navigator.language?.startsWith("zh") ? "zh" : "en");

const I18N = {
  en: {
    locale: "en-US",
    langBtn: "🌐 中文",
    subtitle: "Can't decide? Let the food genie pick for you! ✨",
    locTitle: '<span class="step-badge">1</span> Where are you? 📍',
    locHint: (r) => `We'll peek at restaurants within <strong>${r}</strong> of you.`,
    radiusLabel: "📏 Search within",
    customOpt: "Custom…",
    addrPlaceholder: "…or type an address / place",
    addrSearching: "🔍 Looking up that address…",
    addrFail: "Couldn't find that address 😢 — try another one?",
    btnLocate: '<span class="btn-emoji">🧭</span> Find me!',
    budgetTitle: '<span class="step-badge">2</span> What are you craving? 🍽️',
    chips: { any: "Anything", chinese: "Chinese", japanese: "Japanese", korean: "Korean", western: "Western", sea: "SE Asian", noodle: "Noodles", cafe: "Café & sweets" },
    typeLabels: { restaurant: "🍽️ Restaurant", fast_food: "🍔 Fast food", cafe: "☕ Café", food_court: "🏬 Food court" },
    spinTitle: '<span class="step-badge">3</span> Ready? 🎰',
    btnSpin: '<span class="btn-emoji">🎲</span> Pick my meal!',
    btnMap: '<span class="btn-emoji">🗺️</span> Guide me there',
    btnCheckin: '<span class="btn-emoji">📸</span> I ate here!',
    btnReroll: '<span class="btn-emoji">🔄</span> Nope, again!',
    listToggle: "👀 Peek at all nearby spots",
    diaryTitle: "📖 Food Diary",
    btnReport: '<span class="btn-emoji">✨</span> Monthly report',
    diaryEmpty: "No yummy memories yet — go eat something and check in! 🥺",
    footer: 'Made with 🧡 &amp; hunger · data from <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>',
    pendingCheckin: "📸 Check in!",
    pendingSkip: "Skip",
    checkinTitle: "📸 Yummy check-in",
    photoCta: "🍽️<br />Tap to add a food pic!",
    notePlaceholder: "One-line food memory… (optional)",
    btnSave: '<span class="btn-emoji">💾</span> Save to my diary',
    finding: '<span class="spinner">🌀</span> Finding you…',
    noGeo: "Your browser doesn't support location 😢 — type an address below instead 👇",
    locDeniedSafari: "Location was denied before, so Safari won't ask again 🙈 Easiest: just type an address below 👇 To re-enable: tap the letters “AA” on the left side of the address bar → Website Settings → Location → Allow. Can't find it? Go to Settings → Privacy & Security → Location Services → turn on Safari Websites.",
    locDeniedMacSafari: "Location was denied 🙈 Easiest: just type an address below 👇 To re-enable: Safari menu → Settings → Websites → Location → set this site to Allow, then refresh.",
    locDeniedChrome: "Location was denied before, so the browser won't ask again 🙈 Easiest: just type an address below 👇 To re-enable: tap the small 🔒 lock next to the web address → Permissions → Location → Allow, then refresh.",
    inAppTip: "💡 Looks like you're inside an app's built-in browser (WeChat, Instagram…) — location often doesn't work there. Tap the ⋯ menu and choose “Open in Browser”, or simply type an address below!",
    locUnavail: "Couldn't figure out where you are 😵 — try typing an address below 👇",
    locTimeout: "Location took too long ⏰ — try again?",
    locFail: "Something went wrong 😢",
    gotYou: "✅ Got you! Now sniffing out yummy places nearby…",
    dbFail: "Couldn't reach the restaurant database 😢 — check your internet and try again.",
    noResto: (r) => `No restaurants found within ${r} 🏜️ — try a bigger radius?`,
    found: (n, r, place) => place
      ? `🎉 Found ${n} tasty spots within ${r} of ${place}!`
      : `🎉 Found ${n} tasty spots within ${r}!`,
    unitM: "m", unitKm: "km",
    matchSome: (n) => `${n} spot${n > 1 ? "s" : ""} match your craving 🤤`,
    matchNone: "No exact matches — I'll pick from everything nearby 😉",
    budgetLabels: { cheap: "🪙 Thrifty $", mid: "💵 Comfy $$", fancy: "💎 Treat $$$", any: "🤷 Any" },
    walkMeta: (min) => `About a ${min} min walk — your tummy can make it! 💪`,
    pendingHow: (emoji, name) => `${emoji} You went to ${name} — how was it?`,
    delConfirm: "Delete this food memory? 🥺",
    reportHero: (m) => `Your delicious ${m} story 💌`,
    statMeals: "meals recorded 🍽️",
    statPlaces: "places explored 🗺️",
    statKm: "km walked for food 🚶",
    statYums: "happy tummies 😋",
    topSpot: (name) => `Top spot: <strong>${name}</strong>`,
    topLove: (n) => ` — ${n} visits! true love 💕`,
    favCuisine: (c) => `Favorite cuisine: <strong>${c}</strong>`,
    badgeTitle: "This month you were a…",
    photosTitle: "📸 Your food memories",
    closing: "Same time next month? Keep eating happy! 🧡",
    reportEmpty: "No food memories this month…<br />time to make some! 🥢",
    personalities: {
      noodle: "🍜 Noodle Knight", sushi: "🍣 Sushi Samurai", pizza: "🍕 Pizza Royalty",
      burger: "🍔 Burger Boss", cafe: "☕ Café Dreamer", sweet: "🍰 Sweet Tooth Star",
      spice: "🍲 Spice Adventurer", dumpling: "🥟 Dumpling Devotee",
      gourmet: "💎 Gourmet Royalty", savvy: "🪙 Savvy Foodie", curious: "🍽️ Curious Muncher",
    },
  },
  zh: {
    locale: "zh-CN",
    langBtn: "🌐 EN",
    subtitle: "选择困难？让美食精灵帮你决定吧！✨",
    locTitle: '<span class="step-badge">1</span> 你在哪里呀？📍',
    locHint: (r) => `我们会帮你找 <strong>${r}</strong> 内的美味餐厅～`,
    radiusLabel: "📏 搜索范围",
    customOpt: "自定义…",
    addrPlaceholder: "…或者输入地址 / 地点",
    addrSearching: "🔍 正在查找这个地址…",
    addrFail: "找不到这个地址 😢——换一个试试？",
    btnLocate: '<span class="btn-emoji">🧭</span> 定位我！',
    budgetTitle: '<span class="step-badge">2</span> 今天想吃点啥？🍽️',
    chips: { any: "都可以", chinese: "中餐", japanese: "日料", korean: "韩餐", western: "西餐", sea: "东南亚", noodle: "粉面", cafe: "咖啡甜点" },
    typeLabels: { restaurant: "🍽️ 正餐馆", fast_food: "🍔 快餐", cafe: "☕ 咖啡馆", food_court: "🏬 美食广场" },
    spinTitle: '<span class="step-badge">3</span> 准备好了吗？🎰',
    btnSpin: '<span class="btn-emoji">🎲</span> 帮我选一家！',
    btnMap: '<span class="btn-emoji">🗺️</span> 带我去！',
    btnCheckin: '<span class="btn-emoji">📸</span> 我吃过啦！',
    btnReroll: '<span class="btn-emoji">🔄</span> 换一家！',
    listToggle: "👀 看看附近所有好店",
    diaryTitle: "📖 美食日记",
    btnReport: '<span class="btn-emoji">✨</span> 月度报告',
    diaryEmpty: "还没有美味回忆——快去吃点好吃的再来打卡吧！🥺",
    footer: '用 🧡 和饥饿感制作 · 数据来自 <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>',
    pendingCheckin: "📸 打卡！",
    pendingSkip: "跳过",
    checkinTitle: "📸 美味打卡",
    photoCta: "🍽️<br />点这里上传美食照片！",
    notePlaceholder: "一句话记录这顿饭…（选填）",
    btnSave: '<span class="btn-emoji">💾</span> 存进我的日记',
    finding: '<span class="spinner">🌀</span> 正在定位…',
    noGeo: "你的浏览器不支持定位 😢——在下面输入地址也可以哦 👇",
    locDeniedSafari: "之前拒绝过定位，Safari 不会再弹窗了 🙈 最省事：直接在下面输入地址 👇 想重新开启：点地址栏左边的「AA」字母按钮 → 网站设置 → 位置 → 允许；找不到的话，去 手机设置 → 隐私与安全性 → 定位服务 → 打开「Safari 网站」。",
    locDeniedMacSafari: "定位被拒绝了 🙈 最省事：直接在下面输入地址 👇 想重新开启：Safari 菜单 → 设置 → 网站 → 位置 → 把本站设为「允许」，然后刷新。",
    locDeniedChrome: "之前拒绝过定位，浏览器不会再弹窗了 🙈 最省事：直接在下面输入地址 👇 想重新开启：点网址左边的 🔒 小锁图标 → 权限 → 位置 → 允许，然后刷新页面。",
    inAppTip: "💡 你好像是在 App 内置浏览器里打开的（微信 / 小红书等）——定位弹窗经常被拦截。点右上角 ⋯ 菜单选「在浏览器中打开」，或者直接在下面输入地址～",
    locUnavail: "找不到你在哪里 😵——试试在下面输入地址 👇",
    locTimeout: "定位超时啦 ⏰ 再试一次？",
    locFail: "出了点小问题 😢",
    gotYou: "✅ 找到你啦！正在搜寻附近的美味…",
    dbFail: "连不上餐厅数据库 😢——检查一下网络再试试吧。",
    noResto: (r) => `${r} 内没有找到餐厅 🏜️——把范围调大一点？`,
    found: (n, r, place) => place
      ? `🎉 在 ${place} 附近 ${r} 内找到 ${n} 家好店！`
      : `🎉 在 ${r} 内找到 ${n} 家好店！`,
    unitM: "米", unitKm: "公里",
    matchSome: (n) => `有 ${n} 家店符合你的口味 🤤`,
    matchNone: "没有完全符合口味的——我会从附近所有店里帮你挑 😉",
    budgetLabels: { cheap: "🪙 省钱 $", mid: "💵 小康 $$", fancy: "💎 犒劳 $$$", any: "🤷 随意" },
    walkMeta: (min) => `步行大约 ${min} 分钟——肚子撑得住！💪`,
    pendingHow: (emoji, name) => `${emoji} 你去了 ${name}——好吃吗？`,
    delConfirm: "要删除这条美味回忆吗？🥺",
    reportHero: (m) => `你的${m}美味故事 💌`,
    statMeals: "顿饭已记录 🍽️",
    statPlaces: "家店探索过 🗺️",
    statKm: "公里为美食而走 🚶",
    statYums: "次幸福干饭 😋",
    topSpot: (name) => `最爱去：<strong>${name}</strong>`,
    topLove: (n) => `——去了 ${n} 次！真爱无疑 💕`,
    favCuisine: (c) => `最爱菜系：<strong>${c}</strong>`,
    badgeTitle: "这个月的你是…",
    photosTitle: "📸 你的美食回忆",
    closing: "下个月同一时间见？继续开心干饭！🧡",
    reportEmpty: "这个月还没有美食记录…<br />快去创造一些吧！🥢",
    personalities: {
      noodle: "🍜 拉面骑士", sushi: "🍣 寿司武士", pizza: "🍕 披萨贵族",
      burger: "🍔 汉堡大亨", cafe: "☕ 咖啡馆梦想家", sweet: "🍰 甜品小达人",
      spice: "🍲 香辣冒险家", dumpling: "🥟 饺子铁粉",
      gourmet: "💎 精致美食家", savvy: "🪙 省钱美食家", curious: "🍽️ 好奇小吃货",
    },
  },
};

const T = () => I18N[lang];
const budgetLabel = (b) => T().budgetLabels[b] || "";
const typeLabel = (a) => T().typeLabels[a] || "🍽️";

function applyLang() {
  const d = T();
  document.documentElement.lang = d.locale;
  const set = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; };
  set(".subtitle", d.subtitle);
  set("#step-location .card-title", d.locTitle);
  set("#step-location .card-hint", d.locHint(fmtRadius()));
  set("#browser-tip", d.inAppTip);
  set("#radius-label", d.radiusLabel);
  document.querySelector('#radius-select option[value="custom"]').textContent = d.customOpt;
  $("addr-input").placeholder = d.addrPlaceholder;
  set("#btn-locate", d.btnLocate);
  set("#step-budget .card-title", d.budgetTitle);
  for (const k of Object.keys(d.chips))
    set(`.budget-chip[data-cat="${k}"] .chip-label`, d.chips[k]);
  set("#step-spin .card-title", d.spinTitle);
  set("#btn-spin", d.btnSpin);
  set("#btn-map", d.btnMap);
  set("#btn-checkin", d.btnCheckin);
  set("#btn-reroll", d.btnReroll);
  set("#list-toggle span:first-child", d.listToggle);
  set("#diary-card .card-title", d.diaryTitle);
  set("#btn-report", d.btnReport);
  set("#diary-empty", d.diaryEmpty);
  set(".footer", d.footer);
  set("#btn-pending-checkin", d.pendingCheckin);
  set("#btn-pending-dismiss", d.pendingSkip);
  set("#checkin-modal .modal-title", d.checkinTitle);
  set("#photo-cta", d.photoCta);
  set("#btn-save-checkin", d.btnSave);
  $("note-input").placeholder = d.notePlaceholder;
  $("lang-toggle").textContent = d.langBtn;
}

function switchLang() {
  lang = lang === "en" ? "zh" : "en";
  localStorage.setItem(LANG_KEY, lang);
  applyLang();
  if (state.lastStatus) setStatus(state.lastStatus.cls, state.lastStatus.render);
  if (state.restaurants.length) updateMatchCount();
  renderDiary();
  showPendingBanner();
  if (state.currentPick && !$("result").classList.contains("hidden")) renderResultInfo(state.currentPick);
  if (!$("report-modal").classList.contains("hidden")) renderReport();
}

/* ---------------------------------------------------
   Floating emoji background
--------------------------------------------------- */
const FOOD_EMOJIS = ["🍜", "🍣", "🍕", "🍔", "🌮", "🍰", "🍙", "🥟", "🍦", "🧋", "🍩", "🥐", "🍛", "🍤"];

function spawnFloaties() {
  const holder = document.querySelector(".floaties");
  for (let i = 0; i < 16; i++) {
    const el = document.createElement("span");
    el.className = "floaty";
    el.textContent = FOOD_EMOJIS[i % FOOD_EMOJIS.length];
    el.style.left = Math.random() * 100 + "vw";
    el.style.fontSize = 20 + Math.random() * 22 + "px";
    el.style.animationDuration = 14 + Math.random() * 16 + "s";
    el.style.animationDelay = -Math.random() * 20 + "s";
    holder.appendChild(el);
  }
}

/* ---------------------------------------------------
   Emoji + budget guessing from OSM tags
   (OSM rarely has real price data, so we estimate:
    fast_food / street food → cheap, cafés & casual → mid,
    fine dining cuisines → fancy)
--------------------------------------------------- */
const CUISINE_EMOJI = [
  [/sushi|japanese/, "🍣"], [/ramen|noodle/, "🍜"], [/pizza|italian/, "🍕"],
  [/burger/, "🍔"], [/mexican|taco/, "🌮"], [/chinese/, "🥡"],
  [/dessert|cake|ice_cream/, "🍰"], [/coffee|cafe/, "☕"], [/bubble_tea|tea/, "🧋"],
  [/korean/, "🍲"], [/thai|vietnamese/, "🍛"], [/indian|curry/, "🍛"],
  [/bakery|bread|sandwich/, "🥐"], [/seafood|fish/, "🍤"], [/bbq|barbecue|grill/, "🍖"],
  [/chicken/, "🍗"], [/breakfast|brunch/, "🥞"], [/vegetarian|vegan|salad/, "🥗"],
  [/dumpling/, "🥟"], [/hotpot|hot_pot/, "🍲"],
];

function emojiFor(tags) {
  const hay = ((tags.cuisine || "") + " " + (tags.amenity || "")).toLowerCase();
  for (const [re, emo] of CUISINE_EMOJI) if (re.test(hay)) return emo;
  if (tags.amenity === "cafe") return "☕";
  if (tags.amenity === "fast_food") return "🍟";
  return "🍽️";
}

const FANCY_HINTS = /fine_dining|french|steak|sushi|omakase|teppanyaki|kaiseki/;

function guessBudget(tags) {
  // Real OSM price hints first
  const priceTag = tags["price:range"] || tags.price_range || tags["cost:coffee"] || "";
  const dollars = (priceTag.match(/\$/g) || []).length;
  if (dollars === 1) return "cheap";
  if (dollars === 2) return "mid";
  if (dollars >= 3) return "fancy";

  const cuisine = (tags.cuisine || "").toLowerCase();
  if (tags.amenity === "fast_food" || tags.amenity === "food_court") return "cheap";
  if (FANCY_HINTS.test(cuisine)) return "fancy";
  if (tags.amenity === "cafe") return "cheap";
  return "mid";
}

/* ---------------------------------------------------
   Status line — stores a render function so the text
   can be re-translated when the language switches
--------------------------------------------------- */
function setStatus(cls, render) {
  state.lastStatus = { cls, render };
  const el = $("locate-status");
  el.className = "locate-status" + (cls ? " " + cls : "");
  el.innerHTML = render();
}

function failStatus(key) {
  setStatus("err", () => T()[key]);
  $("step-location").classList.add("shake");
  setTimeout(() => $("step-location").classList.remove("shake"), 500);
  highlightAddr(); // point users at the address fallback
}

/* ---------------------------------------------------
   Geolocation
--------------------------------------------------- */
// Pick the "location denied" message that matches this user's browser,
// so the instructions only mention buttons that actually exist for them.
function deniedKey() {
  const ua = navigator.userAgent;
  const safari = /Safari/i.test(ua) && !/Chrome|CriOS|EdgiOS|Edg|FxiOS|OPR/i.test(ua);
  if (!safari) return "locDeniedChrome";
  return /iPhone|iPad|iPod/.test(ua) ? "locDeniedSafari" : "locDeniedMacSafari";
}

async function locate() {
  setStatus("", () => T().finding);

  if (!navigator.geolocation) {
    failStatus("noGeo");
    return;
  }

  // If permission is already permanently denied, the browser will never
  // show a prompt — explain how to fix it instead of failing silently.
  try {
    const perm = await navigator.permissions?.query({ name: "geolocation" });
    if (perm?.state === "denied") {
      failStatus(deniedKey());
      return;
    }
  } catch { /* Safari < 16 has no permissions API — just proceed */ }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      state.lat = pos.coords.latitude;
      state.lon = pos.coords.longitude;
      // the address box is only a fallback input — leftover text would
      // masquerade as the current location, so clear it on GPS success
      $("addr-input").value = "";
      setStatus("ok", () => T().gotYou);
      await reverseGeocode();
      fetchRestaurants();
    },
    (err) => {
      const keys = { 1: deniedKey(), 2: "locUnavail", 3: "locTimeout" };
      failStatus(keys[err.code] || "locFail");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

function highlightAddr() {
  const input = $("addr-input");
  input.classList.remove("addr-attention");
  void input.offsetWidth; // restart animation
  input.classList.add("addr-attention");
  setTimeout(() => input.classList.remove("addr-attention"), 3500);
}

/* In-app browsers (WeChat, Instagram, Facebook, Xiaohongshu…) usually
   suppress the geolocation prompt entirely — warn users up front. */
function checkInAppBrowser() {
  const inApp = /MicroMessenger|WeChat|Weibo|QQ\/|Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|XiaoHongShu|xhsminiapp/i
    .test(navigator.userAgent);
  if (inApp) $("browser-tip").classList.remove("hidden");
}

/* ---------------------------------------------------
   Overpass API — restaurants within 1km
--------------------------------------------------- */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchRestaurants() {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|fast_food|cafe|food_court"](around:${state.radius},${state.lat},${state.lon});
      way["amenity"~"restaurant|fast_food|cafe|food_court"](around:${state.radius},${state.lat},${state.lon});
    );
    out center tags;
  `;

  let data = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, { method: "POST", body: "data=" + encodeURIComponent(query) });
      if (!res.ok) continue;
      data = await res.json();
      break;
    } catch { /* try next mirror */ }
  }

  if (!data) {
    setStatus("err", () => T().dbFail);
    return;
  }

  state.restaurants = (data.elements || [])
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const tags = el.tags || {};
      if (!lat || !lon || !tags.name) return null;
      const r = {
        id: el.type + el.id,
        name: tags.name,
        lat, lon,
        emoji: emojiFor(tags),
        budget: guessBudget(tags),
        cuisine: (tags.cuisine || "").split(";")[0].replace(/_/g, " "),
        cuisineRaw: (tags.cuisine || "").toLowerCase(),
        amenity: tags.amenity,
        dist: haversine(state.lat, state.lon, lat, lon),
      };
      r.cats = Object.keys(CATEGORIES).filter((k) => CATEGORIES[k](r));
      return r;
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist);

  if (state.restaurants.length === 0) {
    setStatus("err", () => T().noResto(fmtRadius()));
    return;
  }

  const n = state.restaurants.length;
  setStatus("ok", () => T().found(n, fmtRadius(), escapeHtml(state.placeName || "")));

  $("step-budget").classList.remove("hidden");
  $("step-spin").classList.remove("hidden");
  $("list-card").classList.remove("hidden");
  updateMatchCount();
  renderList();
  $("step-budget").scrollIntoView({ behavior: "smooth", block: "center" });
}

function fmtRadius() {
  const m = state.radius;
  return m < 1000
    ? `${m} ${T().unitM}`
    : `${parseFloat((m / 1000).toFixed(1))} ${T().unitKm}`;
}

function setRadius(meters) {
  state.radius = Math.round(Math.min(10000, Math.max(100, meters)));
  document.querySelector("#step-location .card-hint").innerHTML = T().locHint(fmtRadius());
  if (state.lat != null) fetchRestaurants(); // re-search with the new radius
}

/* Turn GPS coordinates back into a human-readable place name so the
   status line can say WHERE it searched, not just how many it found. */
async function reverseGeocode() {
  state.placeName = "";
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lon}&zoom=16&accept-language=${T().locale}`
    );
    const d = await res.json();
    const a = d.address || {};
    state.placeName =
      a.neighbourhood || a.suburb || a.quarter || a.road || a.city_district || a.city || d.name || "";
  } catch { /* no name is fine — the found message falls back */ }
}

/* ---------------------------------------------------
   Address search fallback (OSM Nominatim) — for when
   GPS is unavailable or permission can't be granted
--------------------------------------------------- */
async function searchAddress() {
  const q = $("addr-input").value.trim();
  if (!q) return;
  setStatus("", () => T().addrSearching);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=${T().locale}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const results = await res.json();
    if (!results.length) throw new Error("no match");
    state.lat = parseFloat(results[0].lat);
    state.lon = parseFloat(results[0].lon);
    const placeName = results[0].display_name.split(",").slice(0, 2).join(",");
    state.placeName = results[0].display_name.split(",")[0];
    setStatus("ok", () => `📍 ${escapeHtml(placeName)}`);
    fetchRestaurants();
  } catch {
    setStatus("err", () => T().addrFail);
    highlightAddr();
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ---------------------------------------------------
   Craving filter
--------------------------------------------------- */
function candidates() {
  if (state.category === "any") return state.restaurants;
  const matches = state.restaurants.filter((r) => r.cats.includes(state.category));
  return matches.length ? matches : state.restaurants; // graceful fallback
}

function updateMatchCount() {
  const strict = state.category === "any"
    ? state.restaurants.length
    : state.restaurants.filter((r) => r.cats.includes(state.category)).length;
  $("match-count").textContent = strict ? T().matchSome(strict) : T().matchNone;
}

/* ---------------------------------------------------
   Slot machine spin
--------------------------------------------------- */
function spin() {
  if (state.spinning) return;
  const pool = candidates();
  if (!pool.length) return;

  state.spinning = true;
  $("result").classList.add("hidden");
  const slotText = $("slot-text");
  slotText.classList.add("rolling");

  // pick winner (avoid instant repeat when possible)
  let winner = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && winner.id === state.lastPickId) {
    winner = pool[(pool.indexOf(winner) + 1) % pool.length];
  }
  state.lastPickId = winner.id;

  // roll through names, slowing down
  let ticks = 0;
  const totalTicks = 24;
  function tick() {
    ticks++;
    const r = pool[Math.floor(Math.random() * pool.length)];
    slotText.textContent = `${r.emoji} ${r.name}`;
    if (ticks < totalTicks) {
      setTimeout(tick, 40 + ticks * ticks * 0.55); // ease-out
    } else {
      slotText.classList.remove("rolling");
      slotText.textContent = `${winner.emoji} ${winner.name}`;
      state.spinning = false;
      showResult(winner);
    }
  }
  tick();
}

function renderResultInfo(r) {
  const tags = [];
  tags.push(`<span class="tag">${typeLabel(r.amenity)}</span>`);
  // show the place's craving categories in the current language,
  // matching the chips above; fall back to the raw OSM cuisine tag
  const catNames = (r.cats || []).map((k) => T().chips[k]).filter(Boolean);
  if (catNames.length) tags.push(`<span class="tag mint">${catNames.join(" · ")}</span>`);
  else if (r.cuisine) tags.push(`<span class="tag mint">${escapeHtml(r.cuisine)}</span>`);
  tags.push(`<span class="tag butter">📍 ${fmtDist(r.dist)}</span>`);
  $("result-tags").innerHTML = tags.join("");

  const walkMin = Math.max(1, Math.round(r.dist / 80)); // ~80 m/min stroll
  $("result-meta").textContent = T().walkMeta(walkMin);
}

function showResult(r) {
  state.currentPick = r;
  $("result-emoji").textContent = r.emoji;
  $("result-name").textContent = r.name;
  renderResultInfo(r);

  $("btn-map").href =
    `https://www.google.com/maps/dir/?api=1&origin=${state.lat},${state.lon}&destination=${r.lat},${r.lon}&travelmode=walking`;

  const card = $("result");
  card.classList.remove("hidden");
  card.style.animation = "none";
  void card.offsetWidth; // restart pop-in animation
  card.style.animation = "";
  burstConfetti();
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fmtDist(m) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function burstConfetti() {
  const holder = $("confetti");
  holder.innerHTML = "";
  const bits = ["🎉", "✨", "🌸", "⭐", "💖", "🍀"];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span");
    s.textContent = bits[i % bits.length];
    s.style.left = Math.random() * 100 + "%";
    s.style.animationDuration = 1.2 + Math.random() * 1.4 + "s";
    s.style.animationDelay = Math.random() * 0.4 + "s";
    holder.appendChild(s);
  }
  setTimeout(() => (holder.innerHTML = ""), 3200);
}

/* ---------------------------------------------------
   Nearby list
--------------------------------------------------- */
function renderList() {
  const ul = $("resto-list");
  ul.innerHTML = state.restaurants
    .map(
      (r) => `
      <li class="resto-item">
        <span class="r-emoji">${r.emoji}</span>
        <span class="r-name">${escapeHtml(r.name)}</span>
        <span class="r-dist">${fmtDist(r.dist)}</span>
      </li>`
    )
    .join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------------------------------------------
   Food Diary — IndexedDB storage
--------------------------------------------------- */
let dbPromise = null;
function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("what2eat-diary", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("visits", { keyPath: "id", autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function addVisit(visit) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("visits", "readwrite");
    tx.objectStore("visits").add(visit);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getVisits() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("visits", "readonly").objectStore("visits").getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.when.localeCompare(a.when)));
    req.onerror = () => reject(req.error);
  });
}

async function deleteVisit(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("visits", "readwrite");
    tx.objectStore("visits").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------------------------------------------
   Pending visit (set when "Guide me there" is clicked,
   survives page reloads via localStorage)
--------------------------------------------------- */
const PENDING_KEY = "w2e-pending";

function setPending(r) {
  if (!r) return;
  localStorage.setItem(PENDING_KEY, JSON.stringify({ ...r, startedAt: new Date().toISOString() }));
  showPendingBanner();
}

function getPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY)); } catch { return null; }
}

function clearPending() {
  localStorage.removeItem(PENDING_KEY);
  $("pending-banner").classList.add("hidden");
}

function showPendingBanner() {
  const p = getPending();
  if (!p) return;
  $("pending-text").textContent = T().pendingHow(p.emoji, p.name);
  $("pending-banner").classList.remove("hidden");
}

/* ---------------------------------------------------
   Check-in modal
--------------------------------------------------- */
const checkin = { resto: null, photo: null, mood: "😋" };

function openCheckin(r) {
  if (!r) return;
  checkin.resto = r;
  checkin.photo = null;
  checkin.mood = "😋";
  $("checkin-resto").textContent = `${r.emoji} ${r.name}`;
  $("photo-preview").classList.add("hidden");
  $("photo-cta").classList.remove("hidden");
  $("photo-input").value = "";
  $("note-input").value = "";
  document.querySelectorAll(".mood-chip").forEach((c) =>
    c.classList.toggle("selected", c.dataset.mood === "😋"));
  $("checkin-modal").classList.remove("hidden");
}

function closeCheckin() {
  $("checkin-modal").classList.add("hidden");
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

async function saveCheckin() {
  const r = checkin.resto;
  if (!r) return;
  const btn = $("btn-save-checkin");
  btn.disabled = true;
  await addVisit({
    name: r.name,
    emoji: r.emoji,
    cuisine: r.cuisine || "",
    budget: r.budget || "mid",
    amenity: r.amenity || "",
    cats: r.cats || [],
    dist: r.dist || 0,
    mood: checkin.mood,
    note: $("note-input").value.trim(),
    photo: checkin.photo,
    when: new Date().toISOString(),
  });
  btn.disabled = false;
  closeCheckin();
  if (getPending()?.id === r.id) clearPending();
  await renderDiary();
  $("diary-card").scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------------------------------------------------
   Diary list
--------------------------------------------------- */
async function renderDiary() {
  const visits = await getVisits();
  $("diary-empty").classList.toggle("hidden", visits.length > 0);
  $("diary-list").innerHTML = visits
    .map((v) => {
      const d = new Date(v.when);
      const dateStr = d.toLocaleDateString(T().locale, { month: "short", day: "numeric" });
      const thumb = v.photo
        ? `<img class="diary-thumb" src="${v.photo}" alt="food" />`
        : `<div class="diary-thumb-emoji">${v.emoji}</div>`;
      return `
      <li class="diary-item" data-id="${v.id}">
        ${thumb}
        <div class="diary-info">
          <div class="diary-name">${escapeHtml(v.name)}</div>
          <div class="diary-sub">${dateStr} · ${v.amenity ? typeLabel(v.amenity) : budgetLabel(v.budget)}</div>
          ${v.note ? `<div class="diary-note">“${escapeHtml(v.note)}”</div>` : ""}
        </div>
        <span class="diary-mood">${v.mood}</span>
        <button class="diary-del" title="Delete">🗑️</button>
      </li>`;
    })
    .join("");
}

/* ---------------------------------------------------
   Monthly report ✨
--------------------------------------------------- */
let reportMonth = null; // Date pinned to the 1st of the shown month

function monthKey(iso) { return iso.slice(0, 7); } // "2026-07"

const PERSONALITIES = [
  [/ramen|noodle/, "noodle"],
  [/sushi|japanese/, "sushi"],
  [/pizza|italian/, "pizza"],
  [/burger/, "burger"],
  [/coffee|cafe/, "cafe"],
  [/dessert|cake|ice cream|bubble tea/, "sweet"],
  [/hotpot|hot pot|korean|thai/, "spice"],
  [/chinese|dumpling/, "dumpling"],
];

function personalityFor(visits) {
  const cuisines = visits.map((v) => (v.cuisine || "").toLowerCase()).filter(Boolean);
  const counts = {};
  cuisines.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  for (const [re, key] of PERSONALITIES) if (re.test(top)) return T().personalities[key];
  const fancy = visits.filter((v) => v.budget === "fancy").length;
  const cheap = visits.filter((v) => v.budget === "cheap").length;
  if (fancy > visits.length / 2) return T().personalities.gourmet;
  if (cheap > visits.length / 2) return T().personalities.savvy;
  return T().personalities.curious;
}

async function openReport(month) {
  reportMonth = month || new Date();
  reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth(), 1);
  $("report-modal").classList.remove("hidden");
  await renderReport();
}

async function renderReport() {
  const visits = await getVisits();
  const key = `${reportMonth.getFullYear()}-${String(reportMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthVisits = visits.filter((v) => monthKey(v.when) === key);
  const monthName = reportMonth.toLocaleDateString(T().locale, { month: "long", year: "numeric" });
  const monthWord = reportMonth.toLocaleDateString(T().locale, { month: "long" });
  $("report-month").textContent = monthName;

  const now = new Date();
  $("report-next").disabled =
    reportMonth.getFullYear() === now.getFullYear() && reportMonth.getMonth() === now.getMonth();

  const body = $("report-body");
  if (monthVisits.length === 0) {
    body.innerHTML = `
      <div class="report-empty">
        <span class="big">🍃</span>
        ${T().reportEmpty}
      </div>`;
    return;
  }

  const unique = new Set(monthVisits.map((v) => v.name)).size;
  const walkedKm = (monthVisits.reduce((s, v) => s + (v.dist || 0), 0) * 2 / 1000).toFixed(1);
  const photos = monthVisits.filter((v) => v.photo);
  const yums = monthVisits.filter((v) => v.mood === "😍" || v.mood === "😋").length;

  // Rank spots: visit count first, then how happy the meals made you,
  // then whichever you discovered first — not just insertion order.
  const MOOD_PTS = { "😍": 3, "😋": 2, "🙂": 1, "🥲": 0 };
  const spots = {};
  monthVisits.forEach((v) => {
    const s = (spots[v.name] ??= { count: 0, mood: 0, emoji: v.emoji, first: v.when });
    s.count += 1;
    s.mood += MOOD_PTS[v.mood] ?? 1;
    if (v.when < s.first) s.first = v.when;
  });
  const [topName, top] = Object.entries(spots).sort(
    (a, b) =>
      b[1].count - a[1].count ||
      b[1].mood - a[1].mood ||
      a[1].first.localeCompare(b[1].first)
  )[0];
  const topCount = top.count;
  const topEmoji = top.emoji;

  const cuisineCounts = {};
  monthVisits.forEach((v) => { if (v.cuisine) cuisineCounts[v.cuisine] = (cuisineCounts[v.cuisine] || 0) + 1; });
  const topCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  body.innerHTML = `
    <p class="report-hero">${T().reportHero(monthWord)}</p>
    <div class="report-stats">
      <div class="stat-box"><div class="stat-num">${monthVisits.length}</div><div class="stat-label">${T().statMeals}</div></div>
      <div class="stat-box"><div class="stat-num">${unique}</div><div class="stat-label">${T().statPlaces}</div></div>
      <div class="stat-box"><div class="stat-num">${walkedKm}</div><div class="stat-label">${T().statKm}</div></div>
      <div class="stat-box"><div class="stat-num">${yums}</div><div class="stat-label">${T().statYums}</div></div>
    </div>
    <div class="report-row"><span class="row-emoji">${topEmoji}</span>
      <span>${T().topSpot(escapeHtml(topName))}${topCount > 1 ? T().topLove(topCount) : ""}</span></div>
    ${topCuisine ? `<div class="report-row"><span class="row-emoji">🥇</span><span>${T().favCuisine(escapeHtml(topCuisine))}</span></div>` : ""}
    <div class="report-badge">
      <div class="badge-title">${T().badgeTitle}</div>
      <div class="badge-name">${personalityFor(monthVisits)}</div>
    </div>
    ${photos.length ? `
      <p class="report-hero">${T().photosTitle}</p>
      <div class="photo-wall">${photos.slice(0, 9).map((v) => `<img src="${v.photo}" alt="${escapeHtml(v.name)}" title="${escapeHtml(v.name)}" />`).join("")}</div>` : ""}
    <p class="report-closing">${T().closing}</p>`;
}

/* ---------------------------------------------------
   Wire up
--------------------------------------------------- */
spawnFloaties();
applyLang();
checkInAppBrowser();
renderDiary();
showPendingBanner();

$("lang-toggle").addEventListener("click", switchLang);

$("btn-locate").addEventListener("click", locate);
$("btn-addr").addEventListener("click", searchAddress);
$("addr-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchAddress();
});

$("radius-select").addEventListener("change", (e) => {
  const v = e.target.value;
  if (v === "custom") {
    $("radius-custom").classList.remove("hidden");
    $("radius-input").value = state.radius / 1000;
    $("radius-input").focus();
  } else {
    $("radius-custom").classList.add("hidden");
    setRadius(Number(v));
  }
});
$("radius-input").addEventListener("change", (e) => {
  const km = parseFloat(e.target.value);
  if (km > 0) setRadius(km * 1000);
});

$("btn-spin").addEventListener("click", spin);
$("btn-reroll").addEventListener("click", spin);

$("cat-row").addEventListener("click", (e) => {
  const chip = e.target.closest(".budget-chip");
  if (!chip) return;
  document.querySelectorAll(".budget-chip").forEach((c) => c.classList.remove("selected"));
  chip.classList.add("selected");
  state.category = chip.dataset.cat;
  updateMatchCount();
});

$("list-toggle").addEventListener("click", () => {
  $("resto-list").classList.toggle("hidden");
  $("chevron").classList.toggle("open");
});

/* --- check-in / diary / report events --- */
$("btn-map").addEventListener("click", () => setPending(state.currentPick));
$("btn-checkin").addEventListener("click", () => openCheckin(state.currentPick));
$("btn-pending-checkin").addEventListener("click", () => openCheckin(getPending()));
$("btn-pending-dismiss").addEventListener("click", clearPending);

$("checkin-close").addEventListener("click", closeCheckin);
$("checkin-modal").addEventListener("click", (e) => {
  if (e.target === $("checkin-modal")) closeCheckin();
});

$("photo-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    checkin.photo = await compressImage(file);
    const img = $("photo-preview");
    img.src = checkin.photo;
    img.classList.remove("hidden");
    $("photo-cta").classList.add("hidden");
  } catch { /* keep placeholder */ }
});

$("mood-row").addEventListener("click", (e) => {
  const chip = e.target.closest(".mood-chip");
  if (!chip) return;
  document.querySelectorAll(".mood-chip").forEach((c) => c.classList.remove("selected"));
  chip.classList.add("selected");
  checkin.mood = chip.dataset.mood;
});

$("btn-save-checkin").addEventListener("click", saveCheckin);

$("diary-list").addEventListener("click", async (e) => {
  const del = e.target.closest(".diary-del");
  if (!del) return;
  const li = del.closest(".diary-item");
  if (confirm(T().delConfirm)) {
    await deleteVisit(Number(li.dataset.id));
    renderDiary();
  }
});

/* --- photo lightbox: click any food photo to see it full size --- */
function openLightbox(src) {
  $("lightbox-img").src = src;
  $("lightbox").classList.remove("hidden");
}
$("lightbox").addEventListener("click", () => $("lightbox").classList.add("hidden"));
$("report-body").addEventListener("click", (e) => {
  if (e.target.matches(".photo-wall img")) openLightbox(e.target.src);
});
$("diary-list").addEventListener("click", (e) => {
  if (e.target.classList.contains("diary-thumb")) openLightbox(e.target.src);
});

$("btn-report").addEventListener("click", () => openReport(new Date()));
$("report-close").addEventListener("click", () => $("report-modal").classList.add("hidden"));
$("report-modal").addEventListener("click", (e) => {
  if (e.target === $("report-modal")) $("report-modal").classList.add("hidden");
});
$("report-prev").addEventListener("click", () => {
  reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() - 1, 1);
  renderReport();
});
$("report-next").addEventListener("click", () => {
  reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 1);
  renderReport();
});

# 🍜 What2Eat — 今天吃什么？

> Can't decide what to eat? Let the food genie pick for you! ✨
> 选择困难？让美食精灵帮你决定吧！

A cute, interactive website that finds restaurants near you and randomly picks one based on your budget — then helps you remember every delicious moment with a food diary and monthly reports.

一个可爱的互动网站：定位你附近的餐厅，根据预算随机抽一家，还能打卡记录每一顿美味，生成充满仪式感的月度美食报告。

## ✨ Features · 功能

- **📍 Location-based search** — finds restaurants within a radius you choose (0.5–10 km, default 1 km) using your GPS location, or any address you type
  **按位置搜索** — 用 GPS 或手动输入地址，搜索自选范围内（0.5–10 公里，默认 1 公里）的餐厅
- **💰 Budget filter** — Thrifty $ / Comfy $$ / Treat day $$$ / Anything
  **预算筛选** — 省钱党 / 小康餐 / 犒劳日 / 都可以
- **🎰 Slot-machine picker** — a fun spinning animation lands on your fate, with confetti
  **老虎机抽选** — 转动动画 + 彩带庆祝，让命运决定这一餐
- **🗺️ Guide me there** — one click opens Google Maps walking directions
  **带我去** — 一键打开 Google 地图步行导航
- **📸 Check-in & Food Diary** — upload a photo of your meal, pick a mood, write a one-line memory; everything is saved locally in your browser
  **打卡 & 美食日记** — 上传美食照片、选心情、写一句话回忆，全部保存在你自己的浏览器里
- **📊 Monthly report** — meals recorded, places explored, km walked for food, top spot, favorite cuisine, a food personality badge, and a photo wall
  **月度报告** — 记录了几顿饭、探索了几家店、为美食走了多少公里、最爱去的店、食物人格徽章和照片墙
- **🌐 Bilingual** — switch between English and 中文 anytime; auto-detects your browser language
  **双语支持** — 中英文随时切换，自动匹配浏览器语言

## 🚀 Quick Start · 快速开始

It's a pure static site — no build step, no dependencies.

```bash
# any static server works, e.g.
python3 -m http.server 8642
# then open http://localhost:8642
```

> **Note:** browser geolocation only works on `localhost` or HTTPS. If GPS is unavailable, just type an address instead.
> **注意：** 浏览器定位只在 `localhost` 或 HTTPS 下可用。没有 GPS 时可以直接输入地址。

## 🛠️ Tech Stack · 技术栈

- Vanilla HTML / CSS / JavaScript — no frameworks
- [TomTom Search API](https://developer.tomtom.com/) + [Overpass API](https://overpass-api.de/) (OpenStreetMap) — restaurant data from both sources, merged and deduplicated; either one alone keeps the site working
- [Nominatim](https://nominatim.org/) — address geocoding &amp; reverse geocoding
- IndexedDB — local storage for diary entries and photos (compressed client-side)
- Fonts: [Baloo 2](https://fonts.google.com/specimen/Baloo+2), [Quicksand](https://fonts.google.com/specimen/Quicksand), [小赖字体 Xiaolai](https://github.com/lxgw/kose-font) via [中文网字计划](https://chinese-font.netlify.app/)

## 🔒 Privacy · 隐私

Your location is only used in your browser to query OpenStreetMap — it is never stored on any server. Diary entries and photos live entirely in your own browser (IndexedDB) and never leave your device.

你的位置只在浏览器里用于查询 OpenStreetMap，不会被存到任何服务器。日记和照片完全保存在你自己的设备上。

## 📄 License

[MIT](LICENSE) — data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

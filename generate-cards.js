// Generates cards/youtube-card.svg and cards/instagram-card.svg
// YouTube: pulled live from the channel's public RSS feed.
// Instagram: no public API, so it reads images you drop in /instagram (newest first).
const fs = require("fs");
const path = require("path");

const CHANNEL_ID = "UCuU-kHs9M2iYR3k238ZNMGA"; // @Krish_Hackz
const YT_URL = "https://www.youtube.com/@Krish_Hackz";
const IG_URL = "https://www.instagram.com/krish_hackz/";
const OUT = path.join(__dirname, "..", "cards");
const IG_DIR = path.join(__dirname, "..", "instagram");
const W = 420, H = 600, PAD = 28, INNER = W - PAD * 2;
const FONT = "'Segoe UI', Helvetica, Arial, sans-serif";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(n)).replace(".0K", "K");

function wrap(text, max = 24, lines = 2) {
  const words = text.split(/\s+/), out = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/.{0,2}$/, "…"); }
  return out;
}

async function toDataUri(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + " -> " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  return "data:image/jpeg;base64," + buf.toString("base64");
}

const defs = (id, c1, c2, c3) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>${c3 ? `<stop offset="0.5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>` : `<stop offset="1" stop-color="${c2}"/>`}
    </linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="28"/></clipPath>
  </defs>`;

const header = (icon, name, handle, label) => `
  <rect x="${PAD}" y="${PAD}" width="68" height="68" rx="18" fill="#fff" fill-opacity="0.2"/>
  ${icon}
  <text x="${PAD}" y="140" font-family="${FONT}" font-size="22" font-weight="700" fill="#fff">${name}</text>
  <text x="${PAD}" y="166" font-family="${FONT}" font-size="15" fill="#fff" fill-opacity="0.7">${handle}</text>
  <text x="${PAD}" y="206" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="1.5" fill="#fff" fill-opacity="0.55">${label}</text>`;

const ytIcon = `<rect x="${PAD + 14}" y="${PAD + 20}" width="40" height="28" rx="8" fill="#fff"/>
  <path d="M${PAD + 30} ${PAD + 27} L${PAD + 30} ${PAD + 41} L${PAD + 42} ${PAD + 34} Z" fill="#f00"/>`;
const igIcon = `<rect x="${PAD + 17}" y="${PAD + 17}" width="34" height="34" rx="10" fill="none" stroke="#fff" stroke-width="3.5"/>
  <circle cx="${PAD + 34}" cy="${PAD + 34}" r="8" fill="none" stroke="#fff" stroke-width="3.5"/>
  <circle cx="${PAD + 43.5}" cy="${PAD + 24.5}" r="2.2" fill="#fff"/>`;

async function youtubeCard() {
  const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`)).text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 3).map((m) => ({
    id: m[1].match(/<yt:videoId>(.*?)<\/yt:videoId>/)[1],
    title: m[1].match(/<title>(.*?)<\/title>/)[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
    views: +(m[1].match(/<media:statistics views="(\d+)"/) || [0, 0])[1],
  }));

  let rows = "";
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i], y = 222 + i * 116, x = PAD;
    const img = await toDataUri(`https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`);
    const lines = wrap(e.title);
    rows += `
  <a href="https://www.youtube.com/watch?v=${e.id}">
    <rect x="${x}" y="${y}" width="${INNER}" height="104" rx="16" fill="#fff" fill-opacity="0.12"/>
    <clipPath id="t${i}"><rect x="${x + 12}" y="${y + 16}" width="128" height="72" rx="10"/></clipPath>
    <image href="${img}" x="${x + 12}" y="${y + 16}" width="128" height="72" preserveAspectRatio="xMidYMid slice" clip-path="url(#t${i})"/>
    ${lines.map((l, j) => `<text x="${x + 152}" y="${y + 36 + j * 18}" font-family="${FONT}" font-size="14" font-weight="700" fill="#fff">${esc(l)}</text>`).join("")}
    <text x="${x + 152}" y="${y + 36 + lines.length * 18 + 6}" font-family="${FONT}" font-size="13" fill="#fff" fill-opacity="0.7">▶ ${fmt(e.views)} views</text>
  </a>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs("yt", "#ff0000", "#b30000")}
  <g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="url(#bg)"/></g>
  ${header(ytIcon, "YouTube", "@Krish_Hackz", "LATEST VIDEOS")}${rows}
</svg>`;
}

async function instagramCard() {
  let sharp; try { sharp = require("sharp"); } catch {}
  const files = fs.existsSync(IG_DIR)
    ? fs.readdirSync(IG_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().slice(0, 9)
    : [];
  const gap = 8, cell = (INNER - gap * 2) / 3;
  let grid = "";
  for (let i = 0; i < 9; i++) {
    const x = PAD + (i % 3) * (cell + gap), y = 222 + Math.floor(i / 3) * (cell + gap);
    if (files[i]) {
      const p = path.join(IG_DIR, files[i]);
      const buf = sharp
        ? await sharp(p).resize(240, 240, { fit: "cover" }).jpeg({ quality: 70 }).toBuffer()
        : fs.readFileSync(p);
      grid += `
  <clipPath id="g${i}"><rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="12"/></clipPath>
  <image href="data:image/jpeg;base64,${buf.toString("base64")}" x="${x}" y="${y}" width="${cell}" height="${cell}" preserveAspectRatio="xMidYMid slice" clip-path="url(#g${i})"/>`;
    } else {
      grid += `\n  <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="12" fill="#fff" fill-opacity="0.15"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs("ig", "#515bd4", "#dd2a7b", "#f58529")}
  <g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="url(#bg)"/></g>
  ${header(igIcon, "Instagram", "@krish_hackz", "LATEST POSTS")}${grid}
</svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try { fs.writeFileSync(path.join(OUT, "youtube-card.svg"), await youtubeCard()); console.log("youtube ok"); }
  catch (e) { console.error("youtube failed:", e.message); process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, "instagram-card.svg"), await instagramCard()); console.log("instagram ok");
})();

import { Router } from 'express';
import { XMLParser } from 'fast-xml-parser';

const router = Router();

const FEEDS = [
  { name: 'IGN',       url: 'https://feeds.ign.com/ign/all' },
  { name: 'Eurogamer', url: 'https://www.eurogamer.net/?format=rss' },
  { name: 'Kotaku',    url: 'https://kotaku.com/rss' },
];

const ITEMS_PER_FEED = 4;
const CACHE_TTL      = 20 * 60 * 1000; // 20 minutos

let cachedNews  = null;
let cachedAt    = 0;

const parser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  cdataPropName:       '__cdata',
  allowBooleanAttributes: true,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function text(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.__cdata) return val.__cdata;
  if (val['#text']) return val['#text'];
  return String(val);
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function imageFromHtml(html) {
  const m = String(html || '').match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}

function getImage(item) {
  // media:thumbnail
  const mt = item['media:thumbnail'];
  if (mt) {
    if (typeof mt === 'string') return mt || null;
    if (Array.isArray(mt)) return mt[0]?.['@_url'] || null;
    return mt['@_url'] || null;
  }
  // media:content
  const mc = item['media:content'];
  if (mc) {
    if (Array.isArray(mc)) return mc[0]?.['@_url'] || null;
    return mc['@_url'] || null;
  }
  // enclosure (tipo imagen)
  const enc = item.enclosure;
  if (enc && String(enc['@_type'] || '').startsWith('image')) {
    return enc['@_url'] || null;
  }
  // img incrustada en description
  return imageFromHtml(text(item.description));
}

function getLink(item) {
  const raw = item.link;
  if (!raw) return text(item.guid);
  // Atom-style: { '@_href': '...' }
  if (typeof raw === 'object' && raw['@_href']) return raw['@_href'];
  return text(raw);
}

// ── Fetch + parseo de un feed ─────────────────────────────────────────────────

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'PlayCraft/1.0 RSS Reader' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${feed.url}`);

  const xml = await res.text();
  const parsed = parser.parse(xml);

  // RSS 2.0
  const rawItems = parsed?.rss?.channel?.item ?? [];
  const items    = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.slice(0, ITEMS_PER_FEED).map(item => ({
    title:   stripHtml(text(item.title)).slice(0, 160) || '—',
    link:    getLink(item),
    summary: stripHtml(text(item.description)).slice(0, 220) || null,
    date:    text(item.pubDate) || null,
    image:   getImage(item),
    source:  feed.name,
  }));
}

// ── Endpoint ─────────────────────────────────────────────────────────────────

router.get('/', async (_req, res) => {
  const now = Date.now();

  if (cachedNews && now - cachedAt < CACHE_TTL) {
    return res.json(cachedNews);
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const news = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Solo actualizar caché si hay resultados (evita caché vacía por fallos transitorios)
  if (news.length > 0) {
    cachedNews = news;
    cachedAt   = now;
  }

  res.json(cachedNews ?? []);
});

export default router;

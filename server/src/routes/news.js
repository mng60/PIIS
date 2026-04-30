import { Router } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { fetchCompat } from '../lib/httpFetch.js';

const router = Router();

const FEEDS = [
  {
    name: 'IGN',
    url: 'https://www.ign.com/rss/articles/feed',
    fallbackUrls: ['https://feeds.ign.com/ign/all'],
  },
  {
    name: 'Eurogamer',
    url: 'https://www.eurogamer.net/feed',
    fallbackUrls: ['https://www.eurogamer.net/?format=rss'],
  },
  {
    name: 'Kotaku',
    url: 'https://kotaku.com/feed',
    fallbackUrls: ['https://kotaku.com/rss'],
  },
];

const ITEMS_PER_FEED = 4;
const CACHE_TTL = 20 * 60 * 1000;
const FEED_TIMEOUT_MS = 12_000;

let cachedNews = null;
let cachedAt = 0;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  allowBooleanAttributes: true,
});

function text(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.__cdata) return value.__cdata;
  if (value['#text']) return value['#text'];
  return String(value);
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function imageFromHtml(html) {
  const match = String(html || '').match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

function getImage(item) {
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    if (typeof mediaThumbnail === 'string') return mediaThumbnail || null;
    if (Array.isArray(mediaThumbnail)) return mediaThumbnail[0]?.['@_url'] || null;
    return mediaThumbnail['@_url'] || text(mediaThumbnail) || null;
  }

  const mediaContent = item['media:content'];
  if (mediaContent) {
    if (Array.isArray(mediaContent)) return mediaContent[0]?.['@_url'] || null;
    return mediaContent['@_url'] || null;
  }

  const enclosure = item.enclosure;
  if (enclosure && String(enclosure['@_type'] || '').startsWith('image')) {
    return enclosure['@_url'] || null;
  }

  return imageFromHtml(text(item.description || item.summary || item['content:encoded']));
}

function getLink(item) {
  const raw = item.link;
  if (!raw) return text(item.guid);

  if (Array.isArray(raw)) {
    const preferred = raw.find(entry => entry?.['@_rel'] === 'alternate' && entry?.['@_href']) || raw[0];
    return preferred?.['@_href'] || text(preferred);
  }

  if (typeof raw === 'object' && raw['@_href']) return raw['@_href'];
  return text(raw);
}

function getDate(item) {
  return text(item.pubDate || item.updated || item.published) || null;
}

function getSummary(item) {
  return stripHtml(
    text(item.description || item.summary || item['content:encoded'] || item.content)
  ).slice(0, 220) || null;
}

function getFeedItems(parsed) {
  const rssItems = parsed?.rss?.channel?.item;
  if (rssItems) return Array.isArray(rssItems) ? rssItems : [rssItems];

  const atomEntries = parsed?.feed?.entry;
  if (atomEntries) return Array.isArray(atomEntries) ? atomEntries : [atomEntries];

  return [];
}

function looksLikeXml(payload) {
  const sample = String(payload || '').trimStart();
  return sample.startsWith('<?xml') || sample.startsWith('<rss') || sample.startsWith('<feed');
}

function getContentType(response) {
  return response.headers?.get?.('content-type') || 'unknown';
}

async function fetchFeedUrl(feed, url) {
  const startedAt = Date.now();
  const response = await fetchCompat(url, {
    timeoutMs: FEED_TIMEOUT_MS,
    headers: {
      'User-Agent': 'PlayCraft/1.0 RSS Reader (+https://playcraft-sigma.vercel.app)',
      'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${url}`);
  }

  const contentType = getContentType(response);
  const xml = await response.text();
  if (!looksLikeXml(xml)) {
    throw new Error(`Respuesta no XML en ${url}`);
  }

  const parsed = parser.parse(xml);
  const items = getFeedItems(parsed);

  if (items.length === 0) {
    throw new Error(`Feed sin items en ${url}`);
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[news] feed ok source=${feed.name} status=${response.status} items=${Math.min(items.length, ITEMS_PER_FEED)} duration=${durationMs}ms type=${contentType}`
  );

  return items.slice(0, ITEMS_PER_FEED).map(item => ({
    title: stripHtml(text(item.title)).slice(0, 160) || '-',
    link: getLink(item),
    summary: getSummary(item),
    date: getDate(item),
    image: getImage(item),
    source: feed.name,
  }));
}

async function fetchFeed(feed) {
  const urls = [feed.url, ...(feed.fallbackUrls || [])];
  let lastError = null;

  for (const url of urls) {
    const startedAt = Date.now();
    try {
      return await fetchFeedUrl(feed, url);
    } catch (error) {
      lastError = error;
      const durationMs = Date.now() - startedAt;
      console.warn(`[news] feed fail source=${feed.name} url=${url} duration=${durationMs}ms error=${error.message}`);
    }
  }

  throw lastError || new Error(`No se pudo cargar el feed de ${feed.name}`);
}

router.get('/', async (_req, res) => {
  const now = Date.now();
  const startedAt = Date.now();

  if (cachedNews && now - cachedAt < CACHE_TTL) {
    return res.json(cachedNews);
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const okFeeds = results.filter(result => result.status === 'fulfilled').length;
  const failedFeeds = results.length - okFeeds;

  const news = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  if (news.length > 0) {
    cachedNews = news;
    cachedAt = now;
    console.log(
      `[news] response source=live items=${news.length} feeds_ok=${okFeeds} feeds_fail=${failedFeeds} duration=${Date.now() - startedAt}ms`
    );
    return res.json(news);
  }

  if (cachedNews) {
    console.warn(
      `[news] response source=stale-cache items=${cachedNews.length} feeds_ok=${okFeeds} feeds_fail=${failedFeeds} duration=${Date.now() - startedAt}ms`
    );
    return res.json(cachedNews);
  }

  console.error(
    `[news] response source=error feeds_ok=${okFeeds} feeds_fail=${failedFeeds} duration=${Date.now() - startedAt}ms`
  );
  return res.status(503).json({ error: 'No se pudieron obtener noticias de los feeds externos' });
});

export default router;

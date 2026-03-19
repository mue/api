import { Hono } from 'hono';
import { load } from 'cheerio';

const KV_KEY = 'v2_sponsors';
const KV_TTL = 3600;

async function fetchSponsors(env) {
  const data = await (
    await fetch(`https://github.com/sponsors/${env.SPONSORS_NAME}/sponsors_partial?page=1`, {
      signal: AbortSignal.timeout(5000),
    })
  ).text();

  const $ = load(data);
  const sponsors = [];

  $('.d-inline-block').each((_i, el) => {
    sponsors.push({
      img: $(el).attr('href').replace('/', ''),
      name: $(el).find('img').attr('alt'),
    });
  });

  return sponsors;
}

export default new Hono().get('/', async (c) => {
  const cached = await c.env.cache.get(KV_KEY, { type: 'json' });

  if (cached) {
    return c.json({ sponsors: cached });
  }

  const sponsors = await fetchSponsors(c.env);

  c.executionCtx.waitUntil(
    c.env.cache.put(KV_KEY, JSON.stringify(sponsors), { expirationTtl: KV_TTL }),
  );

  return c.json({ sponsors });
});

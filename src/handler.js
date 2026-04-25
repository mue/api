import { Hono } from 'hono';

import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { bodyLimit } from 'hono/body-limit';
import { requestId } from 'hono/request-id';
import { timeout } from 'hono/timeout';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { HTTPException } from 'hono/http-exception';

import { getDB } from '@/db';

import v1 from '@/v1';
import v2 from '@/v2';

const app = new Hono();

app.use('*', cors({ origin: '*' }));
app.use('*', requestId());
app.use('*', bodyLimit({ maxSize: 50 * 1024 }));
app.use('*', timeout(10000));
app.use('*', trimTrailingSlash());

app.use('*', async (c, next) => {
  c.set('db', getDB(c.env));
  const segment = new URL(c.req.url).pathname.split('/')[1];
  c.set('version', segment?.startsWith('v') ? parseInt(segment.slice(1)) : 1);
  await next();
});

app.use(
  '*',
  cache({
    cacheControl: 'public, s-max-age=86400, max-age=3600, stale-while-revalidate=3600',
    cacheName: 'api',
    wait: true,
  }),
);

app.route('/', v1);
app.route('/v2', v2);

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json(
    {
      error: err?.message,
      message: 'Internal Serverless Error',
    },
    500,
  );
});

export default app;

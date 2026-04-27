import { HTTPException } from 'hono/http-exception';

export async function safeFetchJson(url, opts) {
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new HTTPException(503, { message: 'Upstream service unavailable' });
  }

  if (!res.ok) {
    throw new HTTPException(503, { message: `Upstream error: ${res.status}` });
  }

  try {
    return await res.json();
  } catch {
    throw new HTTPException(503, { message: 'Invalid response from upstream service' });
  }
}

export async function safeFetchText(url, opts) {
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new HTTPException(503, { message: 'Upstream service unavailable' });
  }

  if (!res.ok) {
    throw new HTTPException(503, { message: `Upstream error: ${res.status}` });
  }

  return res.text();
}

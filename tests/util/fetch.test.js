import { describe, it, expect, vi, afterEach } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { safeFetchJson, safeFetchText } from '@/util/fetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch({ ok = true, status = 200, body = {}, throws = null, textBody = '' } = {}) {
  if (throws) {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(throws));
  } else {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok,
        status,
        json: vi.fn().mockResolvedValue(body),
        text: vi.fn().mockResolvedValue(textBody),
      }),
    );
  }
}

function mockFetchBadJson() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    }),
  );
}

describe('safeFetchJson', () => {
  it('returns parsed JSON on a 200 response', async () => {
    mockFetch({ body: { hello: 'world' } });
    expect(await safeFetchJson('https://example.com')).toEqual({ hello: 'world' });
  });

  it('passes options through to fetch', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) });
    vi.stubGlobal('fetch', spy);
    const opts = { signal: AbortSignal.timeout(1000) };
    await safeFetchJson('https://example.com', opts);
    expect(spy).toHaveBeenCalledWith('https://example.com', opts);
  });

  it('throws HTTPException(503) on network error', async () => {
    mockFetch({ throws: new Error('Network error') });
    await expect(safeFetchJson('https://example.com')).rejects.toBeInstanceOf(HTTPException);
    await expect(safeFetchJson('https://example.com')).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) on timeout (AbortError)', async () => {
    mockFetch({ throws: new DOMException('The operation was aborted.', 'AbortError') });
    await expect(safeFetchJson('https://example.com')).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) on a 404 response', async () => {
    mockFetch({ ok: false, status: 404 });
    await expect(safeFetchJson('https://example.com')).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) on a 500 response', async () => {
    mockFetch({ ok: false, status: 500 });
    await expect(safeFetchJson('https://example.com')).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) when response body is not valid JSON', async () => {
    mockFetchBadJson();
    await expect(safeFetchJson('https://example.com')).rejects.toMatchObject({ status: 503 });
  });
});

describe('safeFetchText', () => {
  it('returns text body on a 200 response', async () => {
    mockFetch({ textBody: '<html>hello</html>' });
    expect(await safeFetchText('https://example.com')).toBe('<html>hello</html>');
  });

  it('throws HTTPException(503) on network error', async () => {
    mockFetch({ throws: new Error('Network error') });
    await expect(safeFetchText('https://example.com')).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) on a non-OK response', async () => {
    mockFetch({ ok: false, status: 403 });
    await expect(safeFetchText('https://example.com')).rejects.toMatchObject({ status: 503 });
  });
});

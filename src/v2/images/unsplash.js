import { HTTPException } from 'hono/http-exception';

import { safeFetchJson } from '@/util/fetch';
import { UNSPLASH_API } from '@/constants';

export const NAMED_COLLECTIONS = {
  animals: 'nJDnd_8TN_g',
  architecture: 'e9-QAhrwZ5Q',
  landscapes: 'SxeKQtPuR0U',
  plants: 'y15m5OvaD98',
};

const sizes = {
  original: '',
  high: '&w=3840',
  normal: '&w=1920',
  datasaver: '&w=1280',
};

export const getUnsplashImage = async (query, quality, env) => {
  query.set('client_id', env.UNSPLASH_TOKEN);
  const excludedIds = new Set(
    (query.get('exclude') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
  query.delete('exclude');

  const ref = `?utm_source=${env.UNSPLASH_REFERRAL}&utm_medium=referral`;
  const size = sizes[quality];

  if (excludedIds.size > 0) {
    query.set('count', String(Math.min(30, Math.max(10, excludedIds.size + 4))));
  }

  const data = await safeFetchJson(`${UNSPLASH_API}/photos/random?${query.toString()}`, {
    signal: AbortSignal.timeout(5000),
  });
  const photos = Array.isArray(data) ? data : [data];
  const selected =
    photos.find((photo) => photo?.id && !excludedIds.has(photo.id)) ?? photos[0] ?? null;

  if (!selected) {
    throw new HTTPException(503, { message: 'No image returned from Unsplash' });
  }

  return {
    blur_hash: selected.blur_hash,
    camera: selected.exif?.model ?? null,
    category: null,
    colour: selected.color,
    description: selected.description ?? null,
    downloads: selected.downloads,
    file: selected.urls.raw + '&q=80&auto=format' + size,
    id: selected.id,
    likes: selected.likes,
    location: {
      latitude: selected.location?.position?.latitude ?? null,
      longitude: selected.location?.position?.longitude ?? null,
      name: selected.location?.name ?? null,
    },
    photo_page: selected.links.html + ref,
    photographer: selected.user.name,
    photographer_page: selected.user.links.html + ref,
    views: selected.views,
  };
};

import { UNSPLASH_API } from '@/constants.js';

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

  const ref = `?utm_source=${env.UNSPLASH_REFERRAL}&utm_medium=referral`;
  const size = sizes[quality];

  const data = await (
    await fetch(`${UNSPLASH_API}/photos/random?${query.toString()}`)
  ).json();

  return {
    blur_hash: data.blur_hash,
    camera: data.exif.model ?? null,
    category: null,
    colour: data.color,
    description: data.description ?? null,
    downloads: data.downloads,
    file: data.urls.raw + '&q=80&auto=format' + size,
    id: data.id,
    likes: data.likes,
    location: {
      latitude: data.location?.position?.latitude ?? null,
      longitude: data.location?.position?.longitude ?? null,
      name: data.location?.name ?? null,
    },
    photo_page: data.links.html + ref,
    photographer: data.user.name,
    photographer_page: data.user.links.html + ref,
    views: data.views,
  };
};

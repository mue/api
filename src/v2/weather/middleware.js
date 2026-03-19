import { LANGUAGE_MAP, SUPPORTED_LANGUAGES } from '@/v2/weather/constants.js';

export const withWeatherLanguage = async (c, next) => {
  const allowed = SUPPORTED_LANGUAGES;
  const map = LANGUAGE_MAP;

  let language = c.req.query('language');

  if (!language) {
    language = 'en';
  } else if (map.has(language)) {
    language = map.get(language);
  } else if (!allowed.includes(language)) {
    return c.json({ error: 'Unsupported language' }, 400);
  }

  c.set('language', language);
  await next();
};

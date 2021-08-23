const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');
const umami = require('../../../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/images/categories', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.public.images_categories, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/images/categories', req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  const { data } = await supabase
  .from('old_images')
  .select('category');

  let array = [];

  for (const key in data) {
    if (!array.includes(data[key].category)) {
      array.push(data[key].category);
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send(array);
};

const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/news', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.hello, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/news', req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=0, s-maxage=86400');

  return res.status(200).send({
    news: config.current_news
  });
};
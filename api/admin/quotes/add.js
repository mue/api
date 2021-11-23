const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');
const umami = require('../../../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/admin/quotes/add', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.admin.quotes_add, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/admin/quotes/add', req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  if (req.headers.authorization !== process.env.ADMIN_TOKEN) {
    if (config.umami === true) {
      await umami.error('/admin/quotes/add', req, 'unauthorised');
    }

    return res.status(401).send({ 
      message: 'Unauthorized' 
    });
  }

  const { error, data } = await supabase
  .from('quotes')
  .insert([{ 
    language: req.query.language,
    author: req.query.author,
    quote: req.query.quote
  }]);

  if (error) {
    if (config.umami === true) {
      await umami.error('/admin/quotes/add', req, 'failed');
    }

    return res.status(500).send({ 
      message: error 
    });
  }

  return res.status(200).send({
    id: data[0].id,
    message: 'Success'
  });
};

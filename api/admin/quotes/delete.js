const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');
const umami = require('../../../struct/umami');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/admin/quotes/delete', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.admin.quotes_delete, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/admin/quotes/delete', req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  if (req.headers.authorization !== process.env.ADMIN_TOKEN) {
    if (config.umami === true) {
      await umami.error('/admin/quotes/delete', req, 'unauthorised');
    }

    return res.status(401).send({ 
      message: 'Unauthorized' 
    });
  }

  const { error } = await supabase
  .from('quotes')
  .delete()
  .match({ 
    id: req.query.id 
  });

  if (error) {
    if (config.umami === true) {
      await umami.error('/admin/quotes/delete', req, 'failed');
    }

    return res.status(500).send({ 
      message: error 
    });
  }

  return res.status(200).send({
    message: 'Success'
  });
};

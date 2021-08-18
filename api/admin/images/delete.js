const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');

module.exports = async (req, res) => {
  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.admin.images_delete, req.headers['x-real-ip']);
    } catch (error) {
      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  if (req.headers.authorization !== process.env.ADMIN_TOKEN) { 
    return res.status(401).send({ 
      message: 'Unauthorized' 
    });
  }

  const { error } = await supabase
  .from('images')
  .delete()
  .match({ 
    id: req.query.id 
  });

  if (error) {
    return res.status(500).send({ 
      message: error 
    });
  }

  return res.status(200).send({
    message: 'Success'
  });
};

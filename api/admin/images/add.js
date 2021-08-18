const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');

module.exports = async (req, res) => {
  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.admin.images_add, req.headers['x-real-ip']);
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

  const { error, data } = await supabase
  .from('images')
  .insert([{ 
    filename: req.query.filename,
    photographer: req.query.photographer,
    category: req.query.category,
    location: req.query.location.charAt(0).toUpperCase() + req.query.location.slice(1), 
    camera: req.query.camera
  }]);

  if (error) {
    return res.status(500).send({ 
      message: error 
    });
  }

  return res.status(200).send({
    id: data[0].id,
    message: 'Success'
  });
};

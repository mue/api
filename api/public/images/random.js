const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');

module.exports = async (req, res) => {
  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.public.images_random, req.headers['x-real-ip']);
    } catch (error) {
      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  const { data } = await supabase
  .from('old_images')
  .select('file, photographer, location, camera');

  const random = data[Math.floor(Math.random() * data.length)];
  random.file = process.env.CDN_URL + random.file + '.jpg';

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send({
    category: random.category,
    file: random.file,
    photographer: random.photographer,
    location: random.location,
    camera: random.camera || null
  });
};

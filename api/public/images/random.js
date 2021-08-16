const config = require('../../../config.json');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

const rateLimit = require('lambda-rate-limiter')({
  interval: config.ratelimit_time * 1000
}).check;

module.exports = async (req, res) => {
  try {
    await rateLimit(100, req.headers['x-real-ip']);
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(429).send({ 
      message: 'Too many requests' 
    });
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

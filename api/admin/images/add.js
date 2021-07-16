const config = require('../../../config.json');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

const rateLimit = require('lambda-rate-limiter')({
  interval: config.ratelimit_time * 1000
}).check;

module.exports = async (req, res) => {
  try {
    await rateLimit(10, req.headers['x-real-ip']);
  } catch (error) {
    return res.status(429).send({ 
      message: 'Too many requests' 
    });
  }

  if (req.headers.authorization !== process.env.ADMIN_TOKEN) { 
    return res.status(401).send({ 
      message: 'Unauthorized' 
    });
  }

  const { error, data } = await supabase
  .from('newimages')
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

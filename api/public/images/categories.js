const config = require('../../../config.json');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TOKEN);

const rateLimit = require('lambda-rate-limiter')({
  interval: config.ratelimit_time * 1000
}).check;

module.exports = async (req, res) => {
  try {
    await rateLimit(50, req.headers['x-real-ip']);
  } catch (error) {
    return res.status(429).send({ 
      message: 'Too many requests' 
    });
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

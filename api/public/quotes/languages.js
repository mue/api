const config = require('../../../config.json');

const { PostgrestClient } = require('@supabase/postgrest-js');
const supabase = new PostgrestClient(`${process.env.SUPABASE_URL}/rest/v1`, {
  headers: {
    apikey: process.env.SUPABASE_TOKEN,
    Authorization: `Bearer ${process.env.SUPABASE_TOKEN}`
  },
  schema: 'public'
});

const rateLimit = require('lambda-rate-limiter')({
  interval: config.ratelimit.time * 1000
}).check;

module.exports = async (req, res) => {
  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.public.quotes_languages, req.headers['x-real-ip']);
    } catch (error) {
      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  const { data } = await supabase
  .from('old_quotes')
  .select('language');

  let array = [];

  for (const key in data) {
    if (!array.includes(data[key].language)) {
      array.push(data[key].language);
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send(array);
};

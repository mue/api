const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');
const umami = require('../../../struct/umami');

module.exports = async (req, res) => {
  const language = req.query.language ? req.query.language.replace('French', 'Français') : 'English';

  if (!config.quote_languages.supported.includes(language)) {
    if (config.umami === true) {
      await umami.error('/quotes/random/' + language, req, 'unsupported-language');
    }

    return res.status(401).send({
      message: config.quote_languages.error_message
    });
  }

  if (config.umami === true) {
    await umami.request('/quotes/random/' + language, req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.public.quotes_random, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/quotes/random/' + language, req, 'ratelimit');
      }
      
      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  const { data } = await supabase
  .from('old_quotes')
  .select('author, quote, language')
  .eq('language', language);

  const random = data[Math.floor(Math.random() * data.length)];

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send(random);
};

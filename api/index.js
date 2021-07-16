const config = require('../config.json');

const rateLimit = require('lambda-rate-limiter')({
  interval: config.ratelimit_time * 1000
}).check;

module.exports = async (req, res) => {
  try {
    await rateLimit(30, req.headers['x-real-ip']);
  } catch (error) {
    return res.status(429).send({ message: 'Too many requests' });
   }

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send(config.helloworld);
};

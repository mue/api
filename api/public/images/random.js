const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');
const umami = require('../../../struct/umami');
const crypto = require('crypto');

const sign = target => {
  const hmac = crypto.createHmac('sha256', Buffer.from(process.env.KEY, 'hex'));
  hmac.update(Buffer.from(process.env.SALT, 'hex'));
  hmac.update(target);
  return hmac.digest('base64url');
};

// const getURL = (id, options) => {
//   const origin = `s3://${process.env.BUCKET}/${id}.jpg`;
//   const path = options + Buffer.from(origin).toString('base64url');
//   const signature = sign(path);
//   const final = process.env.CDN_URL + '/' + signature + path;
//   return final;
// };

const getURL = (id, options) => {
  return 'https://muetab.s3.us-west-004.backblazeb2.com/' + id + '.jpg';
};

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/images/random', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.public.images_random, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/images/random', req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  const { data } = await supabase
    .from('old_images')
    .select('file, photographer, location, camera');

  const random = data[Math.floor(Math.random() * data.length)];

  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send({
    category: random.category,
    file:  getURL(random.file, '/pr:fhd/q:80/'),
    files: {
      original: getURL(random.file, '/q:90/'),
      qhd: getURL(random.file, '/pr:qhd/q:90/'),
      fhd: getURL(random.file, '/pr:fhd/q:80/'),
      hd: getURL(random.file, '/pr:hd/q:70/'),
    },
    photographer: random.photographer,
    location: random.location,
    camera: random.camera || null
  });
};

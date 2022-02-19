const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

const fetch = require('node-fetch');
const ChromeWebStore = require('webextension-store-meta/lib/chrome-web-store');
const Amo = require('webextension-store-meta/lib/amo');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/versions', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.hello, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/versions', req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  const edge = await (await fetch('https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/aepnglgjfokepefimhbnibfjekidhmja')).json();
  const chrome = (await ChromeWebStore.load({ id: config.chrome_extension.split('//')[1], qs: { hl: 'en' } })).meta();
  const firefox = (await Amo.load({ id: config.firefox_extension })).meta();

  const edgeVersion = JSON.parse(edge.manifest).version;

  res.setHeader('Cache-Control', 'max-age=0, s-maxage=86400');
  return res.status(200).send({
    browsers: {
      edge: edgeVersion,
      chrome: chrome.version,
      firefox: firefox.version,
      whale: edgeVersion
    },
    api: config.hello_world.version
  });
};

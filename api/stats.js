const config = require('../config.json');

const rateLimit = require('../struct/ratelimiter');
const umami = require('../struct/umami');

const fetch = require('node-fetch');
const ChromeWebStore = require('webextension-store-meta/lib/chrome-web-store');

module.exports = async (req, res) => {
  if (config.umami === true) {
    await umami.request('/stats', req);
  }

  if (config.ratelimit.enabled) {
    try {
      await rateLimit(config.ratelimit.limits.hello, req.headers['x-real-ip']);
    } catch (error) {
      if (config.umami === true) {
        await umami.error('/stats', req, 'ratelimit');
      }

      return res.status(429).send({ 
        message: 'Too many requests' 
      });
    }
  }

  const roundToNearest = (num) => { 
    const length = num.toString().length;
    if (length === 4) {
      return Math.round(num / 1000) * 1000;
    } else if (length === 2) {
      return Math.round(num / 10) * 10;
    } else { // 3
      return Math.round(num / 100) * 100; 
    }
  };

  const [repo, releases, edge, chrome] = await Promise.all([
    (await (await fetch('https://api.github.com/repos/mue/mue')).json()),
    (await (await fetch('https://api.github.com/repos/mue/mue/releases')).json()),
    (await (await fetch('https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/' + config.edge_extension.split('//')[1])).json()),
    (await ChromeWebStore.load({ id: config.chrome_extension.split('//')[1], qs: { hl: 'en' } })).meta()
  ]);

  res.setHeader('Cache-Control', 'max-age=0, s-maxage=86400');
  return res.status(200).send({
    stars: roundToNearest(repo.stargazers_count),
    releases: roundToNearest(releases.length),
    users: roundToNearest(chrome.users + edge.activeInstallCount)
  });
};

const fetch = require('node-fetch');
const parser = require('ua-parser-js');

module.exports = class Umami {
  static getReferrer(req) {
    const referrer = req.headers['referer'] || req.headers['referrer'] || req.headers['origin'];
    const ua = new parser(req.headers['user-agent']);

    if (referrer.startsWith('moz-extension://')) {
      return 'https://firefox.muetab.com';
    } else if (referrer === 'chrome-extension://bngmbednanpcfochchhgbkookpiaiaid') {
      switch (ua.getBrowser().name) {
        case 'Chrome':
          return 'https://chrome.muetab.com';
        case 'Edge':
          return 'https://edge.muetab.com';
        case 'Whale':
          return 'https://whale.muetab.com';
        default:
          return 'https://chromium.muetab.com';
      }
    } else {
      return referrer;
    }
  }

  static async request(url, req) {
    await fetch(process.env.UMAMI_URL + '/api/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent']
      },
      body: JSON.stringify({
        type: 'pageview',
        payload: {
          website: process.env.UMAMI_ID,
          url: url,
          language: '',
          screen: '',
          referrer: this.getReferrer(req)
        }
      })
    });
  }

  static async error(url, req, error) { 
    await fetch(process.env.UMAMI_URL + '/api/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent'],
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: process.env.UMAMI_ID,
          url: url,
          event_type: 'error',
          event_value: error,
          referrer: this.getReferrer(req)
        }
      })
    });
  }
};

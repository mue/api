import parser from 'ua-parser-js';
import extensions from './extensions';

export default class Umami {
	constructor(url, id, ctx) {
		this.url = url;
		this.id = id;
		this.ctx = ctx;
	}

	getReferrer(req) {
		const referrer = req.headers.referer || req.headers.referrer || req.headers.origin;
		const ua = new parser(req.headers['user-agent']);

		if (referrer) {
			if (referrer.startsWith('moz-extension://')) {
				return 'https://firefox.muetab.com';
			} else if (Object.values(extensions).includes(referrer)) {
				switch (ua.getBrowser().name) {
				case 'Chrome':
					return 'https://chrome.muetab.com';
				case 'Edge':
					return referrer === extensions.chrome
						? 'https://chromeonedge.muetab.com'
						: 'https://edge.muetab.com';
				case 'Whale':
					return referrer === extensions.chrome
						? 'https://chromeonwhale.muetab.com'
						: 'https://whale.muetab.com';
				default:
					return 'https://chromium.muetab.com';
				}
			} else {
				return referrer;
			}
		}
	}

	/**
	 * @param {Request} req
	 */
	async request(req) {
		this.ctx.waitUntil(
			fetch(this.url + '/api/collect', {
				body: JSON.stringify({
					payload: {
						language: req.headers['accept-language']
							? req.headers['accept-language'].split(',')[0]
							: '',
						referrer: this.getReferrer(req),
						screen: '1920x1080',
						type: 'pageview',
						url: new URL(req.url).pathname,
						website: this.id,
					},
				}),
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': req.headers['user-agent'],
				},
				method: 'POST',
			}),
		);
	}

	/**
	 * @param {Request} req
	 * @param {string} error
	 */
	async error(req, error) {
		this.ctx.waitUntil(
			fetch(this.url + '/api/collect', {
				body: JSON.stringify({
					payload: {
						event_type: 'error',
						event_value: error,
						referrer: this.getReferrer(req),
						url: new URL(req.url).pathname,
						website: this.id,
					},
					type: 'event',
				}),
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': req.headers['user-agent'],
				},
				method: 'POST',
			}),
		);
	}
}

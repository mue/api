const config = require('../../../config.json');

const supabase = require('../../../struct/postgrest');
const rateLimit = require('../../../struct/ratelimiter');
const umami = require('../../../struct/umami');

const sizes = {
	original: 'original',
	high: 'qhd',
	normal: 'fhd',
	datasaver: 'hd',
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

	const { data } = await supabase.rpc('getRandomImage').single();
	const { accept } = req.getHeaders();
	const format = accept?.includes('avif') ? 'avif' : 'webp';
	console.log(req.getHeaders(), accept, format)
	const qualities = Object.entries(sizes).reduce((obj, [k, v]) => {
		obj[k] = `https://cdn.muetab/img/${v}/${data.id}.${format}`;
		return obj;
	}, {});

	res.setHeader('Access-Control-Allow-Origin', '*');

	return res.status(200).send({
		category: random.category,
		file: (req.query ? qualities[req.query.quality] : null) ?? qualities['normal'],
		photographer: random.photographer,
		location: random.location,
		camera: random.camera || null
	});
};

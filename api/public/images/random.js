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

	const { data, error } = await supabase.rpc('getRandomImage').single();
	console.log(data, error);
	const format = req.headers.accept?.includes('avif') ? 'avif' : 'webp';
	const qualities = Object.entries(sizes).reduce((obj, [k, v]) => {
		obj[k] = `https://cdn.muetab.com/img/${v}/${data.id}.${format}`;
		return obj;
	}, {});

	res.setHeader('Access-Control-Allow-Origin', '*');

	return res.status(200).send({
		camera: data.camera,
		category: data.category,
		file: (req.query ? qualities[req.query.quality] : null) ?? qualities.normal,
		location: data.locationName,
		photographer: data.photographer,
	});
};

const sizes = {
	original: '',
	high: '?w=3840', // eslint-disable-line sort-keys
	normal: '?w=1920',
	datasaver: '?w=1280', // eslint-disable-line sort-keys
};

export const getPexelsImage = async (quality, ...rest) => {
	const [env] = rest;
	const size = sizes[quality];
	const url = `https://api.pexels.com/v1/collections/${env.PEXELS_COLLECTION}?per_page=80&page=${Math.floor(Math.random() * 2) + 1}`;
	let data = await (await fetch(url, { headers: { Authorization: env.PEXELS_TOKEN } })).json();
	data = data.media[Math.floor(Math.random() * data.media.length) + 1];
	return {
		colour: data.average_color,
		file: data.src.original + size,
		id: data.id,
		photo_page: data.url,
		photographer: data.photographer,
		photographer_page: data.photographer_url,
	};
};
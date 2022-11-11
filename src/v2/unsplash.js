const collections = {
	animals: 'nJDnd_8TN_g',
	architecture: 'e9-QAhrwZ5Q',
	landscapes: 'SxeKQtPuR0U',
	plants: 'y15m5OvaD98',
};
const sizes = {
	original: '',
	high: '&w=3840', // eslint-disable-line sort-keys
	normal: '&w=1920',
	datasaver: '&w=1280', // eslint-disable-line sort-keys
};

export const getUnsplashImage = async (category, quality, ...rest) => {
	const [env, ctx] = rest;
	const ref = `?utm_source=${env.UNSPLASH_REFERRAL}&utm_medium=referral`;
	const collection = collections[category];
	const size = sizes[quality];
	const data = await (await fetch(`https://api.unsplash.com/photos/random?client_id=${env.UNSPLASH_TOKEN}&collections=${collection}`)).json();
	ctx.waitUntil(fetch(`${data.links.download_location}&client_id=${env.UNSPLASH_TOKEN}`)); // api requirement
	return {
		blur_hash: data.blur_hash,
		camera: data.exif.model ?? null,
		category,
		colour: data.color,
		description: data.description ?? null,
		downloads: data.downloads,
		file: data.urls.raw + '&q=80&auto=format' + size,
		id: data.id,
		likes: data.likes,
		location: {
			latitude: data.location?.position?.latitude ?? null,
			longitude: data.location?.position?.longitude ?? null,
			name: data.location?.name ?? null,
		},
		photo_page: data.links.html + ref,
		photographer: data.user.name,
		photographer_page: data.user.links.html + ref, // api requirement
		views: data.views,
	};
};
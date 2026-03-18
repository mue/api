export const withWeatherLanguage = async (c, next) => {
	const allowed = ['en', 'de', 'es', 'fr', 'nl', 'no', 'ru', 'zh_cn', 'id', 'tr', 'pt', 'bn'];
	const map = new Map([
		['de_DE', 'de'],
		['en_GB', 'en'],
		['en_US', 'en'],
		['zh_CN', 'zh_cn'],
		['pt_BR', 'pt'],
		['es_419', 'es'],
		['tr_TR', 'tr'],
		['id_ID', 'id'],
	]);

	let language = c.req.query('language');

	if (!language) {
		language = 'en';
	} else if (map.has(language)) {
		language = map.get(language);
	} else if (!allowed.includes(language)) {
		return c.json({ error: 'Unsupported language' }, 400);
	}

	c.set('language', language);
	await next();
};

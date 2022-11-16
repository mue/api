import cheerio from 'cheerio';

export const getSponsors = async () => {
	const data = await (
		await fetch(`https://github.com/sponsors/${env.SPONSORS_NAME}/sponsors_partial?page=1`)
	).text();
	const $ = cheerio.load(data);
	const sponsors = [];
	$('.d-inline-block').each((i, el) => {
		sponsors.push({
			name: $(el).find('img').attr('alt'),
			img: $(el).attr('href').replace('/', ''),
		});
	});
	return {
		sponsors,
	};
};

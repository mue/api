import { Hono } from 'hono';
import { load } from 'cheerio';

export default new Hono()
	.get('/', async (c) => {
		const data = await (
			await fetch(
				`https://github.com/sponsors/${c.env.SPONSORS_NAME}/sponsors_partial?page=1`,
			)
		).text();

		const $ = load(data);
		const sponsors = [];

		$('.d-inline-block').each((_i, el) => {
			sponsors.push({
				img: $(el).attr('href').replace('/', ''),
				name: $(el).find('img').attr('alt'),
			});
		});

		return c.json({ sponsors });
	});

import { Hono } from 'hono';

export default new Hono()
	.get('/languages', (c) => c.json(['English', 'French']))
	.get('/random', async (c) => {
		const language = c.req.query('language')?.replace('French', 'Français') || 'English';

		const { data } = await c
			.get('supabase')
			.rpc('get_random_old_quote', { _language: language })
			.single();

		return c.json(data);
	});

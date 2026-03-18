import { Hono } from 'hono';
import marketplace from './marketplace/index';
import images from './images';
import quotes from './quotes';
import news from './news';

export default new Hono()
	.get('/', (c) => c.text('Hello World! API docs: https://docs.muetab.com/api/introduction'))
	.route('/', marketplace)
	.route('/images', images)
	.route('/quotes', quotes)
	.get('/news', (c) => c.json({ news }));

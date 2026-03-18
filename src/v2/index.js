import { Hono } from 'hono';

import marketplace from './marketplace/index';
import images from './images/index';
import weather from './weather/index';
import quotes from './quotes';

export default new Hono()
	.route('/marketplace', marketplace)
	.route('/images', images)
	.route('/', weather)
	.route('/quotes', quotes);